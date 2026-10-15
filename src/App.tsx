import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chat, Credentials, LoginForm, Message, Notice } from './types';
import {
  createGreenApi,
  extractIncomingMessage,
  normalizeChatId,
  formatPhone,
} from './api/greenApi';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

const CREDENTIALS_KEY = 'tg-chat.credentials';
const CHATS_KEY = 'tg-chat.chats';
const POLL_INTERVAL_MS = 5000;

function loadJSON<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    void 0;
  }
}

let messageSeq = 0;
const nextMessageId = (): string => `local-${Date.now()}-${messageSeq++}`;

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    loadJSON<Credentials>(CREDENTIALS_KEY),
  );
  const [chats, setChats] = useState<Record<string, Chat>>(
    () => loadJSON<Record<string, Chat>>(CHATS_KEY) ?? {},
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const chatsRef = useRef(chats);
  chatsRef.current = chats;

  const updateChats = useCallback(
    (updater: (prev: Record<string, Chat>) => Record<string, Chat>) => {
      setChats((prev) => {
        const next = updater(prev);
        saveJSON(CHATS_KEY, next);
        return next;
      });
    },
    [],
  );

  const upsertMessage = useCallback(
    (chatId: string, message: Message) => {
      updateChats((prev) => {
        const chat: Chat = prev[chatId] ?? { chatId, title: formatPhone(chatId), messages: [] };
        const messages = chat.messages.some((m) => m.id === message.id)
          ? chat.messages.map((m) => (m.id === message.id ? message : m))
          : [...chat.messages, message];
        return {
          ...prev,
          [chatId]: { ...chat, messages, lastMessage: message },
        };
      });
    },
    [updateChats],
  );

  const ensureChat = useCallback(
    (chatId: string, title: string): string => {
      updateChats((prev) => {
        if (prev[chatId]) return prev;
        return {
          ...prev,
          [chatId]: { chatId, title: title || formatPhone(chatId), messages: [] },
        };
      });
      return chatId;
    },
    [updateChats],
  );

  const handleLogin = useCallback(async (form: LoginForm): Promise<void> => {
    setNotice(null);
    const api = createGreenApi(form);
    try {
      await api.receiveNotification();
    } catch (error) {
      setNotice({
        type: 'error',
        text: `Не удалось подключиться: ${error instanceof Error ? error.message : String(error)}`,
      });
      return;
    }
    const creds: Credentials = {
      idInstance: form.idInstance.trim(),
      apiTokenInstance: form.apiTokenInstance.trim(),
      apiUrl: form.apiUrl.trim() || undefined,
    };
    saveJSON(CREDENTIALS_KEY, creds);
    setCredentials(creds);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(CREDENTIALS_KEY);
    setCredentials(null);
    setActiveChatId(null);
    setNotice(null);
  }, []);

  const handleCreateChat = useCallback(
    (raw: string): string | null => {
      const chatId = normalizeChatId(raw);
      if (!chatId) {
        setNotice({ type: 'error', text: 'Введите номер телефона получателя.' });
        return null;
      }
      ensureChat(chatId, formatPhone(chatId));
      setActiveChatId(chatId);
      return chatId;
    },
    [ensureChat],
  );

  const handleSendMessage = useCallback(
    async (chatId: string, text: string): Promise<void> => {
      if (!credentials) return;
      const api = createGreenApi(credentials);

      const localMessage: Message = {
        id: nextMessageId(),
        chatId,
        text,
        direction: 'out',
        timestamp: Math.floor(Date.now() / 1000),
        status: 'sending',
      };
      upsertMessage(chatId, localMessage);

      try {
        const result = await api.sendMessage(chatId, text);
        upsertMessage(chatId, {
          ...localMessage,
          status: 'sent',
          idMessage: result?.idMessage,
        });
      } catch (error) {
        upsertMessage(chatId, { ...localMessage, status: 'error' });
        setNotice({
          type: 'error',
          text: `Не удалось отправить сообщение: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
    [credentials, upsertMessage],
  );

  useEffect(() => {
    if (!credentials) return undefined;

    const api = createGreenApi(credentials);
    let cancelled = false;
    let inFlight = false;

    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const notification = await api.receiveNotification();
        if (notification?.receiptId) {
          const incoming = extractIncomingMessage(notification);
          if (incoming?.chatId && incoming.text != null) {
            const title = incoming.senderName || formatPhone(incoming.chatId);
            ensureChat(incoming.chatId, title);
            upsertMessage(incoming.chatId, {
              id: nextMessageId(),
              chatId: incoming.chatId,
              text: incoming.text,
              direction: 'in',
              timestamp: incoming.timestamp,
              status: 'received',
            });
          }
          await api.deleteNotification(notification.receiptId);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({
            type: 'error',
            text: `Ошибка получения сообщений: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      } finally {
        inFlight = false;
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [credentials, ensureChat, upsertMessage]);

  if (!credentials) {
    return <Login onLogin={handleLogin} initialError={notice?.text} />;
  }

  const chatList: Chat[] = Object.values(chats).sort((a, b) => {
    const ta = a.lastMessage?.timestamp ?? 0;
    const tb = b.lastMessage?.timestamp ?? 0;
    return tb - ta;
  });

  const activeChat: Chat | null = activeChatId ? (chats[activeChatId] ?? null) : null;

  return (
    <div className="app">
      {notice && (
        <div className={`toast toast--${notice.type}`}>
          <span>{notice.text}</span>
          <button className="toast__close" onClick={() => setNotice(null)} aria-label="Закрыть">
            ✕
          </button>
        </div>
      )}
      <Sidebar
        chats={chatList}
        activeChatId={activeChatId}
        idInstance={credentials.idInstance}
        onSelectChat={setActiveChatId}
        onCreateChat={handleCreateChat}
        onLogout={handleLogout}
      />
      <ChatWindow
        chat={activeChat}
        onSendMessage={handleSendMessage}
        onBack={() => setActiveChatId(null)}
      />
    </div>
  );
}
