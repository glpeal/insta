import { useState } from 'react';
import { instagramApi } from '../services/api';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restoreSession, setRestoreSession] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;

      if (restoreSession) {
        response = await instagramApi.restoreSession(username);
      } else {
        response = await instagramApi.login(username, password);
      }

      if (response.data.success) {
        onLoginSuccess(response.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-instagram-primary via-instagram-secondary to-instagram-tertiary">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Instagram DM Panel
          </h1>
          <p className="text-gray-600">
            Автоматическая рассылка сообщений комментаторам
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Instagram Username</label>
            <input
              type="text"
              className="input"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {!restoreSession && (
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!restoreSession}
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="restore-session"
              className="mr-2"
              checked={restoreSession}
              onChange={(e) => setRestoreSession(e.target.checked)}
            />
            <label htmlFor="restore-session" className="text-sm text-gray-600">
              Восстановить сохраненную сессию
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Подключение...' : restoreSession ? 'Восстановить сессию' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>⚠️ Используйте на свой риск</p>
          <p className="mt-1">Instagram может заблокировать аккаунт за автоматизацию</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
