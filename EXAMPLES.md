# Примеры использования

## Базовый сценарий использования

### 1. Первоначальная настройка

```bash
# Установка зависимостей
./setup.sh

# Или вручную
cd backend && npm install
cd ../frontend && npm install
```

### 2. Настройка переменных окружения

Отредактируйте `backend/.env`:

```env
PORT=3001
NODE_ENV=development
DB_PATH=./instagram_dm.db
MAX_DM_PER_HOUR=25
MIN_DELAY_SECONDS=15
MAX_DELAY_SECONDS=60
ENCRYPTION_KEY=your_secure_random_key_here
HEADLESS=true
```

### 3. Запуск приложения

**Вариант 1: Раздельный запуск (для разработки)**

Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

**Вариант 2: Одновременный запуск**

```bash
npm run dev
```

### 4. Авторизация

1. Откройте `http://localhost:3000`
2. Введите Instagram username и password
3. После успешного входа cookies сохранятся автоматически

### 5. Настройка шаблона сообщения

Перейдите в "Настройки" и установите:

```
Шаблон сообщения:
"Привет! 👋 Спасибо за ваш комментарий! Рады видеть вас в нашем сообществе. Если есть вопросы - пишите!"

Максимум сообщений в час: 25
Минимальная задержка: 15 секунд
Максимальная задержка: 60 секунд
```

### 6. Мониторинг

Система автоматически начнет:
- Отслеживать комментарии на последних 5 постах
- Добавлять новые комментарии в очередь
- Отправлять DM с заданными задержками

## Продвинутые сценарии

### Персонализированные сообщения

Хотя текущая версия не поддерживает переменные, вы можете вручную модифицировать `dm_template` в БД или коде:

```javascript
// backend/src/services/comment-tracker.service.js

const personalizedMessage = settings.dm_template
  .replace('{username}', comment.username);
```

### Отправка DM только на определенные посты

Модифицируйте массив `postsToTrack`:

```javascript
// Вместо автоматического получения постов
const posts = await instagramService.getRecentPosts(username, 5);

// Используйте конкретные URL
const posts = [
  'https://www.instagram.com/p/ABC123/',
  'https://www.instagram.com/reel/XYZ789/'
];
```

### Фильтрация комментариев

Добавьте фильтрацию в `comment-tracker.service.js`:

```javascript
// Игнорировать комментарии короче 5 символов
if (comment.text.length < 5) {
  continue;
}

// Игнорировать комментарии с определенными словами
const spamKeywords = ['spam', 'bot', 'fake'];
if (spamKeywords.some(keyword => comment.text.toLowerCase().includes(keyword))) {
  continue;
}
```

### Интеграция с webhook

Добавьте эндпоинт для уведомлений:

```javascript
// backend/src/controllers/webhook.controller.js
export const webhookController = async (req, res) => {
  const { event, data } = req.body;

  if (event === 'dm_sent') {
    // Отправить уведомление в Slack, Telegram, Discord и т.д.
    await sendNotification(data);
  }

  res.json({ success: true });
};
```

### Использование с прокси

Модифицируйте `instagram.service.js`:

```javascript
this.browser = await puppeteer.launch({
  headless: config.browser.headless,
  args: [
    '--proxy-server=your-proxy:port',
    '--no-sandbox',
    // ... другие аргументы
  ]
});
```

## Примеры API запросов

### С использованием curl

```bash
# Login
curl -X POST http://localhost:3001/api/instagram/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Get status
curl http://localhost:3001/api/status

# Update settings
curl -X PUT http://localhost:3001/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "automation_enabled": true,
    "dm_template": "New message template",
    "max_dm_per_hour": 30
  }'

# Get DM logs
curl http://localhost:3001/api/logs/dm?limit=50
```

### С использованием JavaScript (fetch)

```javascript
// Login
const login = async () => {
  const response = await fetch('http://localhost:3001/api/instagram/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'your_username',
      password: 'your_password'
    })
  });

  const data = await response.json();
  console.log(data);
};

// Get status
const getStatus = async () => {
  const response = await fetch('http://localhost:3001/api/status');
  const data = await response.json();
  console.log(data);
};
```

### С использованием Python

```python
import requests

# Login
response = requests.post(
    'http://localhost:3001/api/instagram/login',
    json={
        'username': 'your_username',
        'password': 'your_password'
    }
)
print(response.json())

# Get status
response = requests.get('http://localhost:3001/api/status')
print(response.json())
```

## Советы по безопасному использованию

### Начните с малых лимитов

```env
MAX_DM_PER_HOUR=15  # Начните с 15-20
MIN_DELAY_SECONDS=20
MAX_DELAY_SECONDS=120
```

### Используйте тестовый аккаунт

Сначала протестируйте на тестовом аккаунте Instagram, чтобы понять, как работает система.

### Постепенно увеличивайте активность

День 1: 10 DM
День 2-3: 15 DM
День 4-7: 20 DM
Неделя 2+: 25-30 DM

### Делайте перерывы

```javascript
// Добавьте логику для перерывов
const currentHour = new Date().getHours();

// Не отправлять DM ночью (с 00:00 до 08:00)
if (currentHour < 8) {
  logger.info('Night time, pausing queue');
  queueService.pause();
  return;
}
```

### Мониторинг здоровья аккаунта

Регулярно проверяйте:
- Нет ли предупреждений от Instagram
- Работает ли отправка DM
- Нет ли временных блокировок

## Типичные ошибки и решения

### "Session expired"

**Решение:** Войдите заново через панель управления.

### DM не отправляются

**Возможные причины:**
1. Достигнут лимит `max_dm_per_hour`
2. Instagram временно ограничил отправку DM
3. Изменилась структура DOM Instagram

**Решение:** Проверьте логи, снизьте лимиты, обновите селекторы.

### Браузер не запускается в headless режиме

**Решение:**
```env
HEADLESS=false
```

Или установите зависимости:
```bash
sudo apt-get install -y chromium libxss1 libasound2
```

### Высокое потребление памяти

**Решение:** Перезапускайте браузер периодически:

```javascript
// Каждые 2 часа
setInterval(async () => {
  await instagramService.close();
  await instagramService.initBrowser();
}, 2 * 60 * 60 * 1000);
```

## Бэкап и восстановление

### Бэкап базы данных

```bash
# Копировать базу данных
cp backend/instagram_dm.db backup/instagram_dm_$(date +%Y%m%d).db

# Или использовать SQLite dump
sqlite3 backend/instagram_dm.db .dump > backup/dump.sql
```

### Восстановление

```bash
# Восстановить из копии
cp backup/instagram_dm_20240110.db backend/instagram_dm.db

# Или из dump
sqlite3 backend/instagram_dm.db < backup/dump.sql
```

## Мониторинг в продакшене

### PM2 с логами

```bash
pm2 start backend/src/server.js --name instagram-dm --log-date-format "YYYY-MM-DD HH:mm:ss"
pm2 logs instagram-dm
```

### Cron для проверки здоровья

```bash
# Добавить в crontab
*/5 * * * * curl -f http://localhost:3001/api/health || systemctl restart instagram-dm
```

---

Удачи в использовании! 🚀
