import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { LoginForm } from '../types';

interface LoginProps {
  onLogin: (form: LoginForm) => Promise<void>;
  initialError?: string;
}

export default function Login({ onLogin, initialError }: LoginProps) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState(initialError ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!idInstance.trim() || !apiTokenInstance.trim()) {
      setError('Заполните idInstance и apiTokenInstance.');
      return;
    }

    setLoading(true);
    try {
      await onLogin({ idInstance, apiTokenInstance, apiUrl });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <div className="login__logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="currentColor">
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
          </svg>
        </div>

        <h1 className="login__title">Вход</h1>
        <p className="login__subtitle">
          Введите учётные данные инстанса из личного кабинета{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            GREEN-API
          </a>
          .
        </p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            type="text"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            placeholder="1101000001"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            placeholder="••••••••••••••••"
          />
        </label>

        <details className="login__advanced">
          <summary>Дополнительно</summary>
          <label className="field">
            <span className="field__label">apiUrl (необязательно)</span>
            <input
              className="field__input"
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.greenapi.com"
            />
          </label>
        </details>

        {error && <div className="login__error">{error}</div>}

        <button className="btn btn--primary login__submit" type="submit" disabled={loading}>
          {loading ? 'Подключение…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
