# 🪟 Установка на Windows

## Проблема с better-sqlite3

На Windows пакет `better-sqlite3` требует Visual Studio Build Tools для компиляции нативных модулей. Я уже заменил его на `sqlite3`, который имеет prebuilt binaries для Windows и не требует компиляции.

## Быстрый старт на Windows

### 1. Установка Node.js

Скачайте и установите Node.js v18 или выше с официального сайта:
https://nodejs.org/

### 2. Клонирование репозитория

```powershell
git clone <repo-url>
cd insta
```

### 3. Установка Backend

```powershell
cd backend
npm install
```

**Важно:** Если установка `sqlite3` не удалась, попробуйте:

```powershell
# Опция 1: Установить с флагом rebuild
npm install sqlite3 --build-from-source

# Опция 2: Использовать prebuilt binaries
npm install sqlite3 --sqlite=/path/to/sqlite
```

### 4. Настройка окружения

Скопируйте `.env.example` в `.env`:

```powershell
copy .env.example .env
```

Отредактируйте `.env` в любом текстовом редакторе:

```env
PORT=3001
NODE_ENV=development
DB_PATH=./instagram_dm.db
MAX_DM_PER_HOUR=30
MIN_DELAY_SECONDS=10
MAX_DELAY_SECONDS=90
ENCRYPTION_KEY=your_random_32_character_key
HEADLESS=true
BROWSER_DATA_DIR=./.browser-data
```

Сгенерируйте случайный ключ шифрования (PowerShell):

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### 5. Установка Frontend

```powershell
cd ..\frontend
npm install
```

### 6. Запуск приложения

**Вариант 1: Два терминала**

Terminal 1 (Backend):
```powershell
cd backend
npm run dev
```

Terminal 2 (Frontend):
```powershell
cd frontend
npm run dev
```

**Вариант 2: Используя PowerShell Job**

```powershell
# Запустить backend в фоне
Start-Job -ScriptBlock { cd backend; npm run dev }

# Запустить frontend
cd frontend
npm run dev
```

### 7. Открыть в браузере

Откройте `http://localhost:3000`

## Решение распространенных проблем

### Ошибка: "Cannot find module 'sqlite3'"

**Решение:**
```powershell
cd backend
npm install sqlite3 --save
```

### Ошибка: "EPERM: operation not permitted"

**Решение:** Запустите PowerShell или CMD от имени администратора.

### Puppeteer не может скачать Chrome

**Решение:**
```powershell
# Установить Puppeteer с пропуском скачивания Chrome
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install puppeteer

# Или указать путь к существующему Chrome
set PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

### Firewall блокирует Node.js

**Решение:** Разрешите Node.js в Windows Firewall при первом запуске.

### Порт 3000 или 3001 уже занят

**Решение:** Измените порт в `.env` (backend) или `vite.config.js` (frontend).

Backend `.env`:
```env
PORT=3002
```

Frontend `vite.config.js`:
```javascript
export default defineConfig({
  server: {
    port: 3003
  }
})
```

## Использование с WSL (рекомендуется)

Если у вас Windows 10/11, рекомендуется использовать WSL2:

```powershell
# Установить WSL2
wsl --install

# Перезагрузить компьютер

# Обновить WSL
wsl --update

# Запустить Ubuntu
wsl

# Далее следуйте инструкциям для Linux из README.md
```

## Деплой на Windows Server

### Вариант 1: PM2

```powershell
npm install -g pm2
cd backend
pm2 start src/server.js --name instagram-dm
pm2 save
pm2 startup
```

### Вариант 2: Windows Service (с node-windows)

```powershell
npm install -g node-windows

# Создайте install-service.js
```

```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Instagram DM Panel',
  description: 'Instagram DM automation service',
  script: 'C:\\path\\to\\insta\\backend\\src\\server.js'
});

svc.on('install', () => {
  svc.start();
});

svc.install();
```

```powershell
node install-service.js
```

## Советы для Windows

1. **Используйте PowerShell 7+** вместо CMD для лучшей совместимости
2. **Отключите антивирус** временно, если он блокирует npm install
3. **Запускайте от администратора** если возникают проблемы с правами
4. **Используйте WSL2** для лучшей производительности и совместимости

## Альтернативные пути решения проблемы с sqlite3

Если у вас продолжаются проблемы со `sqlite3`, можно использовать другие БД:

### Вариант 1: JSON файл (простой, для тестирования)

Замените SQLite на простое хранилище в JSON файле.

### Вариант 2: MongoDB

```powershell
# Установить MongoDB
# Скачать с https://www.mongodb.com/try/download/community

npm install mongoose

# Обновить код для использования MongoDB
```

### Вариант 3: PostgreSQL

```powershell
# Установить PostgreSQL
# Скачать с https://www.postgresql.org/download/windows/

npm install pg

# Обновить код для использования PostgreSQL
```

## Успешная установка

После успешной установки вы увидите:

```
Backend:
🚀 Server running on port 3001
📝 Environment: development
🗄️  Database: ./instagram_dm.db

✅ Instagram DM Panel Backend is ready!

Frontend:
VITE v5.0.0  ready in 300 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

Удачи! 🎉
