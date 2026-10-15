import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Chat, Message, MessageStatus } from '../types';
import { formatTime } from '../api/greenApi';
import { Avatar } from './Sidebar';

const STATUS_ICONS: Partial<Record<MessageStatus, string>> = {
  sending: '🕓',
  sent: '✓',
  error: '⚠️',
};

function MessageBubble({ message }: { message: Message }) {
  const isOut = message.direction === 'out';
  return (
    <div className={`message ${isOut ? 'message--out' : 'message--in'}`}>
      <div className="message__bubble">
        <div className="message__text">{message.text}</div>
        <div className="message__meta">
          {formatTime(message.timestamp)}
          {isOut && message.status && (
            <span
              className={`message__status ${message.status === 'error' ? 'message__status--error' : ''}`}
              title={message.status === 'error' ? 'Не отправлено' : 'Отправлено'}
            >
              {STATUS_ICONS[message.status] ?? ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChatWindowProps {
  chat: Chat | null;
  onSendMessage: (chatId: string, text: string) => Promise<void>;
  onBack?: () => void;
}

export default function ChatWindow({ chat, onSendMessage, onBack }: ChatWindowProps) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const messages = chat?.messages ?? [];

  useEffect(() => {
    setText('');
    textareaRef.current?.focus();
  }, [chat?.chatId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat?.chatId, messages.length]);

  const submit = () => {
    const value = text.trim();
    if (!value || !chat) return;
    void onSendMessage(chat.chatId, value);
    setText('');
    textareaRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  if (!chat) {
    return (
      <main className="chat chat--empty">
        <div className="chat__placeholder">
          <div className="chat__placeholder-icon">✈️</div>
          <p>Выберите чат или создайте новый, указав номер получателя.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="chat">
      <header className="chat__header">
        {onBack && (
          <button className="icon-btn chat__back" onClick={onBack} aria-label="Назад">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <Avatar name={chat.title} size={40} />
        <div className="chat__header-info">
          <div className="chat__header-title">{chat.title}</div>
          <div className="chat__header-subtitle">Telegram · GREEN-API</div>
        </div>
      </header>

      <div className="chat__messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat__hint">
            Напишите сообщение — получатель ответит прямо в Telegram, и ответ появится здесь.
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <form className="chat__input" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat__textarea"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
        />
        <button
          className="chat__send"
          type="submit"
          disabled={!text.trim()}
          title="Отправить"
          aria-label="Отправить"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.993.993 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
          </svg>
        </button>
      </form>
    </main>
  );
}
