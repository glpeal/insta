# 📱 Instagram DM Panel - Автоматизированная панель управления Direct Messages

Веб-панель для автоматического отслеживания комментариев на постах Instagram и отправки персонализированных Direct Messages комментаторам.

## ⚠️ Предупреждение

**Использование этого инструмента может привести к блокировке вашего Instagram аккаунта.** Instagram активно борется с автоматизацией и может временно или навсегда заблокировать аккаунты, использующие боты и скрипты.

Используйте на свой страх и риск. Рекомендуется:
- Использовать на тестовом аккаунте
- Соблюдать лимиты (не более 30-40 DM в час)
- Делать случайные задержки между действиями
- Не использовать на важных коммерческих аккаунтах

## 🚀 Возможности

- ✅ Безопасная авторизация через Instagram Web (Puppeteer)
- ✅ Сохранение сессии для последующих запусков
- ✅ Автоматическое отслеживание новых комментариев на постах/Reels
- ✅ Отправка кастомных DM каждому комментатору (однократно)
- ✅ Система очередей с rate limiting
- ✅ Настраиваемые задержки и лимиты
- ✅ Полное логирование всех действий
- ✅ Веб-панель управления (React + Tailwind CSS)
- ✅ ON/OFF переключатель для рассылки
- ✅ Редактирование шаблона сообщения без перезапуска

## 🛠 Технологический стек

### Backend
- **Node.js** (v18+) + Express.js
- **Puppeteer** для автоматизации Instagram
- **SQLite** для хранения данных (легко мигрировать на PostgreSQL)
- **In-memory очередь** (можно заменить на BullMQ + Redis)

### Frontend
- **React** (v18+) + Vite
- **Tailwind CSS** для стилизации
- **Axios** для API запросов

## 📦 Установка

### Требования

- Node.js v18 или выше
- npm или yarn
- Chrome/Chromium (Puppeteer установит автоматически)

### Шаг 1: Клонирование репозитория

```bash
git clone <your-repo-url>
cd insta
```

### Шаг 2: Установка зависимостей Backend

```bash
cd backend
npm install
```

### Шаг 3: Настройка окружения

Создайте файл `.env` в папке `backend`:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
PORT=3001
NODE_ENV=development

DB_PATH=./instagram_dm.db

MAX_DM_PER_HOUR=30
MIN_DELAY_SECONDS=10
MAX_DELAY_SECONDS=90

ENCRYPTION_KEY=your_random_32_character_key_here

HEADLESS=true
BROWSER_DATA_DIR=./.browser-data
```

**Важно:** Измените `ENCRYPTION_KEY` на случайную строку для безопасного шифрования cookies.

### Шаг 4: Установка зависимостей Frontend

```bash
cd ../frontend
npm install
```

## 🎯 Запуск

### Режим разработки

Откройте два терминала:

**Терминал 1 - Backend:**
```bash
cd backend
npm run dev
```

Backend запустится на `http://localhost:3001`

**Терминал 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend запустится на `http://localhost:3000`

Откройте браузер и перейдите на `http://localhost:3000`

### Режим продакшена

**Backend:**
```bash
cd backend
npm start
```

**Frontend (сборка):**
```bash
cd frontend
npm run build
```

Статические файлы будут в папке `frontend/dist`. Разверните их на любом веб-сервере (Nginx, Apache) или используйте:

```bash
npm run preview
```

## 📖 Использование

### 1. Первый запуск - Авторизация

1. Откройте панель в браузере
2. Введите Instagram username и password
3. Нажмите "Войти"
4. Если требуется 2FA - следуйте инструкциям

После успешного входа, cookies сохранятся в зашифрованном виде в базе данных.

### 2. Последующие запуски

При следующем запуске можно использовать "Восстановить сохраненную сессию" - введите только username, пароль не потребуется.

### 3. Настройка автоматизации

Перейдите в раздел **"Настройки"**:

- **Шаблон сообщения**: Текст DM, который будет отправлен
- **Лимит сообщений в час**: Рекомендуется 20-40
- **Задержки**: Случайная задержка между отправками (10-90 сек по умолчанию)
- **Автоматическая рассылка**: Включить/выключить

Нажмите "Сохранить настройки".

### 4. Мониторинг

**Дашборд** показывает:
- Статус подключения к Instagram
- Состояние автоматизации (активна/пауза)
- Количество задач в очереди
- Статистику отправленных сообщений

**Логи** содержат:
- **Отправленные DM**: История всех отправленных сообщений
- **Отслеженные комментарии**: Все найденные комментарии
- **Системные логи**: Технические события и ошибки

### 5. Тестовая отправка

В разделе "Настройки" внизу есть форма для отправки тестового сообщения конкретному пользователю.

## 🔧 Настройка

### Изменение лимитов

Отредактируйте `.env` или измените через веб-панель:

```env
MAX_DM_PER_HOUR=30        # Максимум сообщений в час
MIN_DELAY_SECONDS=10       # Минимальная задержка между DM
MAX_DELAY_SECONDS=90       # Максимальная задержка
```

### Headless режим

По умолчанию браузер работает в headless режиме (без GUI). Для отладки можно отключить:

```env
HEADLESS=false
```

### База данных

По умолчанию используется SQLite (`instagram_dm.db`). Для масштабирования можно мигрировать на PostgreSQL:

1. Установите `pg` пакет
2. Измените `backend/src/database/db.js`
3. Обновите connection string в `.env`

### Очередь задач

Текущая реализация использует in-memory очередь. Для продакшена рекомендуется BullMQ + Redis:

1. Установите Redis
2. Установите `bullmq` и `ioredis`
3. Замените `backend/src/services/queue.service.js`

## 🚢 Деплой

### VPS (Ubuntu/Debian)

```bash
# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка зависимостей для Puppeteer
sudo apt-get install -y \
  chromium-browser \
  libxss1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libgtk-3-0

# Клонирование и установка
git clone <repo>
cd insta/backend
npm install
cd ../frontend
npm install && npm run build

# Запуск с PM2
npm install -g pm2
cd ../backend
pm2 start src/server.js --name instagram-dm-backend
pm2 save
pm2 startup
```

### Render / Railway / Heroku

1. Создайте `Procfile` в корне:
```
web: cd backend && npm start
```

2. Настройте environment variables через панель управления

3. Для frontend используйте статический хостинг (Vercel, Netlify) или добавьте:

```javascript
// backend/src/server.js
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
```

### Docker

Создайте `Dockerfile`:

```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y chromium
WORKDIR /app
COPY . .
RUN cd backend && npm install
RUN cd frontend && npm install && npm run build
EXPOSE 3001
CMD ["node", "backend/src/server.js"]
```

## 📁 Структура проекта

```
insta/
├── backend/
│   ├── src/
│   │   ├── config/           # Конфигурация
│   │   ├── controllers/      # API контроллеры
│   │   ├── database/         # БД схема и helpers
│   │   ├── middleware/       # Express middleware
│   │   ├── services/         # Бизнес-логика
│   │   │   ├── instagram.service.js      # Instagram автоматизация
│   │   │   ├── queue.service.js          # Система очередей
│   │   │   └── comment-tracker.service.js # Отслеживание комментариев
│   │   ├── utils/            # Утилиты
│   │   └── server.js         # Точка входа
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/       # React компоненты
│   │   ├── services/         # API клиент
│   │   ├── styles/           # CSS
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
└── README.md
```

## 🔐 Безопасность

- ✅ Пароли не хранятся в открытом виде
- ✅ Cookies шифруются с помощью AES-256-GCM
- ✅ Rate limiting на API endpoints
- ✅ Helmet.js для безопасности HTTP заголовков
- ✅ CORS настроен
- ⚠️ Используйте HTTPS в продакшене
- ⚠️ Настройте firewall и ограничьте доступ к API

## 🐛 Отладка и решение проблем

### Browser не запускается

```bash
# Ubuntu/Debian
sudo apt-get install -y chromium-browser libxss1 libasound2

# Или установите вручную Chrome
```

### Ошибка "Session expired"

Сессия Instagram истекла. Войдите заново через панель.

### DM не отправляются

1. Проверьте логи в веб-панели (раздел "Логи" → "Системные логи")
2. Убедитесь, что automation_enabled = true
3. Проверьте лимиты (возможно достигнут max_dm_per_hour)
4. Instagram может временно ограничить отправку DM

### Комментарии не отслеживаются

1. Убедитесь, что вы успешно авторизованы
2. Проверьте, что у вас есть посты для отслеживания
3. Instagram может менять структуру DOM - потребуется обновить селекторы

## 🤝 Вклад в проект

Pull requests приветствуются! Для значительных изменений сначала откройте issue для обсуждения.

## 📝 Лицензия

MIT License - используйте на свой страх и риск.

## 📞 Поддержка

Для вопросов и багов создавайте issues в репозитории.

---

**Disclaimer:** Этот проект создан в образовательных целях. Автор не несет ответственности за блокировку аккаунтов или другие последствия использования. Используйте ответственно и соблюдайте Terms of Service Instagram.
