# Telegram Chat (GREEN-API)

Веб-интерфейс для отправки и получения текстовых сообщений в Telegram через сервис
[GREEN-API](https://green-api.com/telegram). Интерфейс повторяет внешний вид чата
[web.telegram.org](https://web.telegram.org/) (тёмная тема).

## Возможности

- Вход по учётным данным инстанса GREEN-API (`idInstance`, `apiTokenInstance`)
- Создание чата по номеру телефона получателя
- Отправка текстовых сообщений — метод
  [SendMessage](https://green-api.com/telegram/docs/api/sending/SendMessage/)
- Получение ответов через HTTP API (опрос очереди) — методы
  [ReceiveNotification / DeleteNotification](https://green-api.com/telegram/docs/api/receiving/technology-http-api/)
- Только текстовые сообщения, минимум функций

## Требования

- Node.js 18+
- Инстанс GREEN-API: **Telegram** (продукт GREEN-API: Telegram), авторизованный
  по QR в личном кабинете

## Запуск

```bash
npm install
npm run dev
```

Приложение откроется на http://localhost:5173.

## Настройка инстанса

1. Зарегистрируйтесь в [личном кабинете GREEN-API](https://console.green-api.com).
2. Создайте инстанс продукта **GREEN-API: Telegram** и авторизуйте его по QR-коду.
3. Скопируйте `idInstance` и `apiTokenInstance` из личного кабинета.
4. В личном кабинете (или методом SetSettings) включите получение уведомлений
   о входящих сообщениях (`incomingWebhook = yes`, `webhookUrl` — пустой,
   т.к. используется технология HTTP API).
5. Введите учётные данные в форму входа приложения.

## Как это работает

- Отправка: `POST {apiUrl}/v3/tgInstance{idInstance}/sendMessage/{apiTokenInstance}`
  с телом `{"chatId": "79991234567@c.us", "message": "..."}`.
- Получение: приложение раз в 5 секунд опрашивает
  `GET .../receiveNotification/{apiTokenInstance}`. Каждое полученное уведомление
  подтверждается вызовом `DELETE .../deleteNotification/{apiTokenInstance}/{receiptId}`,
  иначе оно останется в очереди.
- Чаты и сообщения хранятся локально в браузере (localStorage), история между
  сессиями сохраняется.

## Формат chatId

| Ввод пользователя          | chatId для API             |
| -------------------------- | -------------------------- |
| `+7 999 123-45-67`         | `79991234567@c.us`         |
| `79991234567`              | `79991234567@c.us`         |
| `@username`                | `@username`                |
| `-1001234567890` (группа)  | `-1001234567890`           |

## Структура проекта

```
src/
├── main.tsx                 # точка входа
├── App.tsx                  # состояние, опрос уведомлений, отправка
├── types.ts                 # общие типы
├── vite-env.d.ts            # типы Vite
├── api/greenApi.ts          # API-клиент GREEN-API и утилиты
├── components/
│   ├── Login.tsx            # экран входа
│   ├── Sidebar.tsx          # список чатов + создание нового чата
│   └── ChatWindow.tsx       # окно переписки и поле ввода
└── styles.scss              # тёмная тема в стиле Telegram Web (SCSS)
```

## Примечания

- API GREEN-API поддерживает CORS, поэтому запросы выполняются напрямую из браузера.
- Ограничение на длину текстового сообщения — 4096 символов.
- Для просмотра ответов убедитесь, что у инстанса включены уведомления
  о входящих сообщениях (см. «Настройка инстанса»).
