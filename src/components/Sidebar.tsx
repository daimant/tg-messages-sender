import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Chat, Message } from '../types';
import { formatTime } from '../api/greenApi';

const AVATAR_COLORS = [
  '#e17076', '#7bc862', '#e5ca77', '#a695e7', '#68a5e6',
  '#65aadd', '#6ec9cb', '#8a85c8', '#e79f5b', '#74b566',
];

interface AvatarProps {
  name?: string;
  size?: number;
}

export function Avatar({ name, size = 46 }: AvatarProps) {
  const key = String(name ?? '?');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const initial = key.replace(/\D/g, '').slice(-2) || '?';

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  idInstance: string;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (raw: string) => string | null;
  onLogout: () => void;
}

export default function Sidebar({
  chats,
  activeChatId,
  idInstance,
  onSelectChat,
  onCreateChat,
  onLogout,
}: SidebarProps) {
  const [phone, setPhone] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phone.trim()) return;
    onCreateChat(phone);
    setPhone('');
    setShowNewChat(false);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <button
          className="icon-btn icon-btn--accent"
          onClick={() => setShowNewChat((v) => !v)}
          title="Новый чат"
          aria-label="Новый чат"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>

        <div className="sidebar__account" title={`idInstance: ${idInstance}`}>
          <span className="sidebar__account-name">Мои чаты</span>
          <span className="sidebar__account-id">{idInstance}</span>
        </div>

        <button
          className="icon-btn"
          onClick={onLogout}
          title="Выйти"
          aria-label="Выйти"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>

      {showNewChat && (
        <form className="new-chat" onSubmit={handleSubmit}>
          <input
            className="field__input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Номер получателя, напр. +7 999 123-45-67"
            autoFocus
          />
          <button className="btn btn--primary new-chat__btn" type="submit">
            Создать
          </button>
        </form>
      )}

      <div className="sidebar__list">
        {chats.length === 0 && (
          <div className="sidebar__empty">
            Пока нет чатов.
            <br />
            Нажмите ✏️ и введите номер получателя.
          </div>
        )}
        {chats.map((chat) => {
          const last: Message | undefined = chat.lastMessage;
          const lastText = last
            ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}`
            : 'Нет сообщений';
          return (
            <button
              key={chat.chatId}
              className={`chat-item ${chat.chatId === activeChatId ? 'chat-item--active' : ''}`}
              onClick={() => onSelectChat(chat.chatId)}
            >
              <Avatar name={chat.title} />
              <span className="chat-item__body">
                <span className="chat-item__row">
                  <span className="chat-item__title">{chat.title}</span>
                  {last && <span className="chat-item__time">{formatTime(last.timestamp)}</span>}
                </span>
                <span className="chat-item__row">
                  <span className="chat-item__preview">{lastText}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
