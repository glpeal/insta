import { useState, useEffect } from 'react';
import { statusApi, settingsApi, instagramApi } from '../services/api';

const Dashboard = ({ account, onLogout }) => {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        statusApi.get(),
        settingsApi.get()
      ]);

      setStatus(statusRes.data.status);
      setSettings(settingsRes.data.settings);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const toggleAutomation = async () => {
    try {
      const newValue = !settings.automation_enabled;
      await settingsApi.update({ automation_enabled: newValue });
      setSettings({ ...settings, automation_enabled: newValue });
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await instagramApi.logout();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-instagram-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Instagram DM Panel
              </h1>
              {status?.instagram?.isLoggedIn && (
                <span className="badge badge-success">
                  @{account?.username || status?.instagram?.account?.username}
                </span>
              )}
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Connection Status */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Статус подключения</h3>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                status?.instagram?.isLoggedIn ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-gray-700">
                {status?.instagram?.isLoggedIn ? 'Подключен' : 'Не подключен'}
              </span>
            </div>
          </div>

          {/* Automation Status */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Автоматизация</h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">
                {settings?.automation_enabled ? 'Активна' : 'Пауза'}
              </span>
              <button
                onClick={toggleAutomation}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings?.automation_enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.automation_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Queue Status */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Очередь</h3>
            <div className="space-y-1">
              <p className="text-gray-700">
                В очереди: <span className="font-semibold">{status?.queue?.queueLength || 0}</span>
              </p>
              <p className="text-gray-700">
                Отправлено за час: <span className="font-semibold">{status?.queue?.sentThisHour || 0}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tracking Status */}
        <div className="card mb-8">
          <h3 className="text-lg font-semibold mb-4">Отслеживание комментариев</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Статус:</p>
              <p className="text-lg font-semibold">
                {status?.tracker?.isTracking ? (
                  <span className="text-green-600">Активно</span>
                ) : (
                  <span className="text-gray-500">Неактивно</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Отслеживается постов:</p>
              <p className="text-lg font-semibold">{status?.tracker?.postsCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Settings Preview */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Текущие настройки</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Лимит сообщений в час:</p>
              <p className="font-semibold">{settings?.max_dm_per_hour}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Задержка между сообщениями:</p>
              <p className="font-semibold">
                {settings?.min_delay_seconds}-{settings?.max_delay_seconds} секунд
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Шаблон сообщения:</p>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-800">{settings?.dm_template}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
