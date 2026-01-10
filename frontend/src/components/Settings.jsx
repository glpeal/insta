import { useState, useEffect } from 'react';
import { settingsApi, instagramApi } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [testDm, setTestDm] = useState({ username: '', message: '' });
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsApi.get();
      setSettings(response.data.settings);
      setTestDm(prev => ({ ...prev, message: response.data.settings.dm_template }));
      setLoading(false);
    } catch (err) {
      setError('Не удалось загрузить настройки');
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      await settingsApi.update(settings);
      setSuccess('Настройки успешно сохранены');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestDm = async (e) => {
    e.preventDefault();
    setSendingTest(true);
    setSuccess('');
    setError('');

    try {
      const response = await instagramApi.sendTestDm(testDm.username, testDm.message);
      if (response.data.success) {
        setSuccess('Тестовое сообщение отправлено');
        setTestDm({ username: '', message: settings.dm_template });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Не удалось отправить сообщение');
      }
    } catch (err) {
      setError('Ошибка отправки тестового сообщения');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-instagram-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Настройки</h2>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Main Settings */}
      <form onSubmit={handleSave} className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Основные настройки</h3>

        <div className="space-y-6">
          {/* DM Template */}
          <div>
            <label className="label">Шаблон сообщения</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Введите текст сообщения..."
              value={settings?.dm_template || ''}
              onChange={(e) => setSettings({ ...settings, dm_template: e.target.value })}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Это сообщение будет отправлено пользователям, которые оставили комментарий
            </p>
          </div>

          {/* Max DM per hour */}
          <div>
            <label className="label">Максимум сообщений в час</label>
            <input
              type="number"
              className="input"
              min="1"
              max="100"
              value={settings?.max_dm_per_hour || 30}
              onChange={(e) => setSettings({ ...settings, max_dm_per_hour: parseInt(e.target.value) })}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Рекомендуется: 20-40 сообщений в час для безопасности
            </p>
          </div>

          {/* Delay range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Минимальная задержка (сек)</label>
              <input
                type="number"
                className="input"
                min="5"
                max="300"
                value={settings?.min_delay_seconds || 10}
                onChange={(e) => setSettings({ ...settings, min_delay_seconds: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="label">Максимальная задержка (сек)</label>
              <input
                type="number"
                className="input"
                min="10"
                max="600"
                value={settings?.max_delay_seconds || 90}
                onChange={(e) => setSettings({ ...settings, max_delay_seconds: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Случайная задержка между отправкой сообщений для имитации человеческого поведения
          </p>

          {/* Automation toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Автоматическая рассылка</p>
              <p className="text-sm text-gray-600">
                Включить/выключить автоматическую отправку сообщений
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, automation_enabled: !settings.automation_enabled })}
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

          <button type="submit" className="btn btn-primary w-full" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </form>

      {/* Test DM */}
      <form onSubmit={handleSendTestDm} className="card">
        <h3 className="text-lg font-semibold mb-4">Отправить тестовое сообщение</h3>

        <div className="space-y-4">
          <div>
            <label className="label">Instagram Username получателя</label>
            <input
              type="text"
              className="input"
              placeholder="username"
              value={testDm.username}
              onChange={(e) => setTestDm({ ...testDm, username: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Сообщение</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Текст сообщения..."
              value={testDm.message}
              onChange={(e) => setTestDm({ ...testDm, message: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-secondary w-full" disabled={sendingTest}>
            {sendingTest ? 'Отправка...' : 'Отправить тестовое сообщение'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
