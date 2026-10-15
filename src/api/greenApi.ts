import type { Credentials, IncomingMessage } from '../types';

const DEFAULT_API_URL = 'https://api.greenapi.com';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface SendMessageResponse {
  idMessage?: string;
}

export interface GreenApiNotification {
  receiptId?: number;
  typeWebhook?: string;
  body?: Record<string, unknown> | null;
}

export interface GreenApiClient {
  sendMessage: (chatId: string, message: string) => Promise<SendMessageResponse | null>;
  receiveNotification: () => Promise<GreenApiNotification | null>;
  deleteNotification: (receiptId: number) => Promise<unknown>;
}

export function normalizeChatId(input: string): string {
  const value = input.trim();
  if (!value) return '';

  if (value.startsWith('@')) return value;

  let digits = value.replace(/\D/g, '');
  if (/^8\d{10}$/.test(digits)) {
    digits = `7${digits.slice(1)}`;
  }
  if (/^\d{6,15}$/.test(digits)) {
    return `${digits}@c.us`;
  }
  if (/^-?\d{6,20}$/.test(value)) {
    return value;
  }
  return value;
}

export function formatPhone(raw?: string | null): string {
  const value = String(raw ?? '');
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    const p = digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
    return `+${p[0]} ${p.slice(1, 4)} ${p.slice(4, 7)}-${p.slice(7, 9)}-${p.slice(9)}`;
  }
  return digits ? `+${digits}` : value;
}

export function formatTime(timestampSec?: number | null): string {
  if (!timestampSec) return '';
  const date = new Date(timestampSec * 1000);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function createGreenApi({ idInstance, apiTokenInstance, apiUrl }: Credentials): GreenApiClient {
  const base = (apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');

  const request = async <T>(
    method: string,
    options: { httpMethod?: HttpMethod; body?: unknown } = {},
  ): Promise<T | null> => {
    const url = `${base}/v3/tgInstance${idInstance}/${method}/${apiTokenInstance}`;
    const response = await fetch(url, {
      method: options.httpMethod ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      throw new Error('Неверный idInstance или apiTokenInstance (401).');
    }
    if (response.status === 466) {
      throw new Error('Инстанс не авторизован. Авторизуйте его в личном кабинете GREEN-API.');
    }

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const body = data as Record<string, unknown> | null;
      const detail = body?.message ?? body?.error ?? text ?? response.statusText;
      throw new Error(`Ошибка API (${response.status}): ${String(detail)}`);
    }
    return data as T | null;
  };

  return {
    sendMessage: (chatId, message) =>
      request<SendMessageResponse>('sendMessage', {
        httpMethod: 'POST',
        body: { chatId, message },
      }),

    receiveNotification: () => request<GreenApiNotification>('receiveNotification'),

    deleteNotification: (receiptId) =>
      request(`deleteNotification/${receiptId}`, { httpMethod: 'DELETE' }),
  };
}

export function extractIncomingMessage(
  notification: GreenApiNotification | null,
): IncomingMessage | null {
  const body = (notification?.body ?? {}) as Record<string, unknown>;
  const type = (body.typeWebhook ?? notification?.typeWebhook) as string | undefined;

  if (type !== 'incomingMessageReceived' && type !== 'messageReceived') {
    return null;
  }

  const messageData = (body.messageData ?? body.message ?? {}) as Record<string, unknown>;
  const textMessageData = messageData.textMessageData as Record<string, unknown> | undefined;
  const extendedTextMessageData = messageData.extendedTextMessageData as
    | Record<string, unknown>
    | undefined;
  const text = (textMessageData?.textMessage ?? extendedTextMessageData?.text) as
    | string
    | null
    | undefined;

  if (text == null) return null;

  const nestedMessage = body.message as Record<string, unknown> | undefined;
  const senderData = (body.senderData ?? nestedMessage?.senderData ?? {}) as Record<
    string,
    unknown
  >;

  return {
    chatId: String(senderData.chatId ?? senderData.sender ?? body.chatId ?? ''),
    sender: String(senderData.sender ?? senderData.chatId ?? ''),
    senderName: String(senderData.senderName ?? senderData.senderContactName ?? ''),
    text,
    timestamp: Number(body.timestamp ?? Math.floor(Date.now() / 1000)),
  };
}
