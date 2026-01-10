import { useState, useEffect } from 'react';
import { logsApi } from '../services/api';

const Logs = () => {
  const [activeTab, setActiveTab] = useState('dm'); // 'dm', 'comments', 'system'
  const [dmLogs, setDmLogs] = useState([]);
  const [comments, setComments] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const [dmRes, commentsRes, systemRes] = await Promise.all([
        logsApi.getDmLogs(),
        logsApi.getTrackedComments(),
        logsApi.getSystemLogs()
      ]);

      setDmLogs(dmRes.data.logs);
      setComments(commentsRes.data.comments);
      setSystemLogs(systemRes.data.logs);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      sent: 'badge-success',
      pending: 'badge-warning',
      failed: 'badge-error',
      retry: 'badge-info'
    };
    return badges[status] || 'badge-info';
  };

  const getLevelBadge = (level) => {
    const badges = {
      info: 'badge-info',
      warning: 'badge-warning',
      error: 'badge-error'
    };
    return badges[level] || 'badge-info';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-instagram-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка логов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Логи и история</h2>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('dm')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dm'
                ? 'border-instagram-primary text-instagram-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Отправленные DM ({dmLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comments'
                ? 'border-instagram-primary text-instagram-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Отслеженные комментарии ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-instagram-primary text-instagram-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Системные логи ({systemLogs.length})
          </button>
        </div>
      </div>

      {/* DM Logs */}
      {activeTab === 'dm' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Получатель
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Сообщение
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Время
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dmLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      Нет отправленных сообщений
                    </td>
                  </tr>
                ) : (
                  dmLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          @{log.recipient_username}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate max-w-xs">
                          {log.message_template}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusBadge(log.status)}`}>
                          {log.status}
                        </span>
                        {log.error_message && (
                          <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.sent_at || log.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comments */}
      {activeTab === 'comments' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Комментарий
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    DM отправлен
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Обнаружен
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      Нет отслеженных комментариев
                    </td>
                  </tr>
                ) : (
                  comments.map((comment) => (
                    <tr key={comment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          @{comment.commenter_username}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {comment.comment_text}
                        </div>
                        <a
                          href={comment.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-instagram-primary hover:underline"
                        >
                          Открыть пост
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${comment.dm_sent ? 'badge-success' : 'badge-warning'}`}>
                          {comment.dm_sent ? 'Да' : 'Нет'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(comment.detected_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Logs */}
      {activeTab === 'system' && (
        <div className="card space-y-2">
          {systemLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Нет системных логов</p>
          ) : (
            systemLogs.map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`badge ${getLevelBadge(log.level)}`}>
                        {log.level}
                      </span>
                      <span className="text-sm text-gray-900">{log.message}</span>
                    </div>
                    {log.details && (
                      <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                        {log.details}
                      </pre>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Logs;
