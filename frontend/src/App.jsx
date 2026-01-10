import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Logs from './components/Logs';
import { instagramApi } from './services/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'settings', 'logs'

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await instagramApi.checkSession();
      if (response.data.isLoggedIn) {
        setIsLoggedIn(true);
        setAccount(response.data.account);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (data) => {
    setIsLoggedIn(true);
    setAccount({ username: data.username || data.account?.username });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAccount(null);
    setCurrentView('dashboard');
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

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">
                Instagram DM Panel
              </h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'dashboard'
                      ? 'bg-instagram-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Дашборд
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'settings'
                      ? 'bg-instagram-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Настройки
                </button>
                <button
                  onClick={() => setCurrentView('logs')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'logs'
                      ? 'bg-instagram-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Логи
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                @{account?.username}
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary text-sm"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>
        {currentView === 'dashboard' && (
          <Dashboard account={account} onLogout={handleLogout} />
        )}
        {currentView === 'settings' && <Settings />}
        {currentView === 'logs' && <Logs />}
      </main>
    </div>
  );
}

export default App;
