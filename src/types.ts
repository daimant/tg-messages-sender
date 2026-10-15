export type MessageDirection = 'in' | 'out';

export type MessageStatus = 'sending' | 'sent' | 'received' | 'error';

export interface Message {
  id: string;
  chatId: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
  status: MessageStatus;
  idMessage?: string;
}

export interface Chat {
  chatId: string;
  title: string;
  messages: Message[];
  lastMessage?: Message;
}

export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl?: string;
}

export interface LoginForm {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}

export interface IncomingMessage {
  chatId: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Notice {
  type: 'error' | 'info';
  text: string;
}
