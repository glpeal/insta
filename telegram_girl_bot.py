#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram Userbot - Девушка ИИ
Автоматический бот для общения от лица девушки
"""

import asyncio
import json
import random
import re
import ssl
import time
import os
import base64
import tempfile
from datetime import datetime, timedelta
from collections import defaultdict
import aiohttp
import aiofiles

# Telethon для работы с Telegram аккаунтом
from telethon import TelegramClient, events
from telethon.tl.types import (
    DocumentAttributeAudio,
    DocumentAttributeVideo,
    MessageMediaPhoto,
    MessageMediaDocument
)
from telethon.tl.functions.messages import SetTypingRequest
from telethon.tl.types import SendMessageTypingAction

# ==================== НАСТРОЙКИ ====================

# Telegram API credentials (получить на https://my.telegram.org)
API_ID = 12345678  # Замени на свой API_ID
API_HASH = "your_api_hash_here"  # Замени на свой API_HASH
PHONE = "+79001234567"  # Замени на свой номер телефона

# API ИИ
AI_API_URL = "http://api.onlysq.ru/ai/v2"
AI_MODEL = "gemini-3-flash"

# Файл для хранения данных
DATA_FILE = "bot_data.json"

# ==================== СИСТЕМНЫЙ ПРОМПТ ====================

SYSTEM_PROMPT = """Ты - обычная девушка 20-23 лет, общаешься в телеграме с друзьями и знакомыми.

ПРАВИЛА ОБЩЕНИЯ:
- Пиши с маленькой буквы (кроме начала предложения после точки/!/?/...)
- Отвечай кратко, 1-3 предложения максимум
- Не используй много эмодзи, максимум 1-2 на сообщение и то редко
- Пиши как обычный человек в переписке, не как бот
- Никогда не говори что ты ИИ/бот/программа
- Не используй никакие команды, не предлагай помощь как ассистент
- Общайся расслабленно, иногда лениво

СЛЕНГ (используй естественно, не в каждом сообщении):
- "чо" (в добром контексте), "че" (раздраженно), "что" (нейтрально), "шо"
- "хехехе", "хохохо", "АХАХХАХА" (смех)
- "оке", "ок", "окей" (согласие)
- "лан", "лады", "ладненько", "ладно" (согласие)
- "блин", "блииин", "ну блин"
- "кста", "кстати"
- "норм", "нормик", "нормас"
- "хз", "хзхз"

ЭМОЦИИ ЧЕРЕЗ СКОБКИ:
- ) или )) или ))) - улыбка, хорошее настроение
- ( или (( - грусть, расстройство
- Используй скобки вместо смайликов часто

ТВОЙ ХАРАКТЕР:
- Немного ленивая, но добрая
- Иногда саркастичная
- Любишь посплетничать
- Интересуешься музыкой, фильмами, сериалами
- Иногда жалуешься на жизнь, работу/учебу
- Можешь быть рассеянной

ВАЖНО:
- Если просят рассказать длинную историю - рассказывай подробно
- Если отправили голосовое/фото/видео - комментируй по контексту
- Не будь слишком вежливой и формальной
- Можешь иногда "тупить" или переспрашивать"""

# ==================== КЛАССЫ И ФУНКЦИИ ====================

class UserData:
    """Данные о пользователе для отслеживания общения"""
    def __init__(self, user_id):
        self.user_id = user_id
        self.message_count = 0
        self.last_message_time = None
        self.first_message_time = None
        self.is_friend = False  # Частый собеседник
        self.conversation_history = []  # История сообщений для контекста
        self.ignore_until = None  # Игнорировать до этого времени
        self.last_proactive_message = None  # Последнее проактивное сообщение

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'message_count': self.message_count,
            'last_message_time': self.last_message_time.isoformat() if self.last_message_time else None,
            'first_message_time': self.first_message_time.isoformat() if self.first_message_time else None,
            'is_friend': self.is_friend,
            'conversation_history': self.conversation_history[-20:],  # Храним последние 20 сообщений
            'ignore_until': self.ignore_until.isoformat() if self.ignore_until else None,
            'last_proactive_message': self.last_proactive_message.isoformat() if self.last_proactive_message else None
        }

    @classmethod
    def from_dict(cls, data):
        user = cls(data['user_id'])
        user.message_count = data.get('message_count', 0)
        user.last_message_time = datetime.fromisoformat(data['last_message_time']) if data.get('last_message_time') else None
        user.first_message_time = datetime.fromisoformat(data['first_message_time']) if data.get('first_message_time') else None
        user.is_friend = data.get('is_friend', False)
        user.conversation_history = data.get('conversation_history', [])
        user.ignore_until = datetime.fromisoformat(data['ignore_until']) if data.get('ignore_until') else None
        user.last_proactive_message = datetime.fromisoformat(data['last_proactive_message']) if data.get('last_proactive_message') else None
        return user


class BotState:
    """Состояние бота"""
    def __init__(self):
        self.users = {}  # user_id -> UserData
        self.is_sleeping = False
        self.sleep_until = None
        self.wake_up_time = datetime.now().replace(hour=9, minute=0)
        self.sleep_time = datetime.now().replace(hour=23, minute=30)
        self.load_data()

    def load_data(self):
        """Загрузка данных из файла"""
        try:
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for user_id, user_data in data.get('users', {}).items():
                        self.users[int(user_id)] = UserData.from_dict(user_data)
                    if data.get('sleep_until'):
                        self.sleep_until = datetime.fromisoformat(data['sleep_until'])
                        self.is_sleeping = self.sleep_until > datetime.now()
        except Exception as e:
            print(f"Ошибка загрузки данных: {e}")

    def save_data(self):
        """Сохранение данных в файл"""
        try:
            data = {
                'users': {str(uid): user.to_dict() for uid, user in self.users.items()},
                'sleep_until': self.sleep_until.isoformat() if self.sleep_until else None
            }
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Ошибка сохранения данных: {e}")

    def get_user(self, user_id):
        """Получить или создать данные пользователя"""
        if user_id not in self.users:
            self.users[user_id] = UserData(user_id)
        return self.users[user_id]

    def check_sleep_schedule(self):
        """Проверка режима сна по расписанию"""
        now = datetime.now()
        hour = now.hour

        # Ночное время (с 23:30 до 9:00)
        if hour >= 23 or hour < 9:
            if not self.is_sleeping:
                # Случайное время пробуждения 8:00-10:30
                wake_hour = random.randint(8, 10)
                wake_minute = random.randint(0, 59)
                tomorrow = now + timedelta(days=1) if hour >= 23 else now
                self.sleep_until = tomorrow.replace(hour=wake_hour, minute=wake_minute, second=0)
                self.is_sleeping = True
                return True
        else:
            if self.is_sleeping and (not self.sleep_until or now > self.sleep_until):
                self.is_sleeping = False

        return self.is_sleeping


# Глобальное состояние
bot_state = BotState()

# SSL контекст без проверки сертификата
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE


async def download_media(client, message, temp_dir):
    """Скачивание медиа из сообщения"""
    try:
        path = await client.download_media(message, temp_dir)
        return path
    except Exception as e:
        print(f"Ошибка скачивания медиа: {e}")
        return None


async def transcribe_voice(file_path):
    """Транскрибация голосового сообщения через API"""
    try:
        with open(file_path, 'rb') as f:
            audio_data = base64.b64encode(f.read()).decode('utf-8')

        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            payload = {
                "model": AI_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Расшифруй это голосовое сообщение. Напиши только текст того, что говорит человек, без комментариев."
                            },
                            {
                                "type": "audio",
                                "data": audio_data
                            }
                        ]
                    }
                ]
            }

            async with session.post(AI_API_URL, json=payload, timeout=60) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return result.get('answer', result.get('response', ''))
    except Exception as e:
        print(f"Ошибка транскрибации: {e}")
    return None


async def analyze_image(file_path, user_message=""):
    """Анализ изображения через API"""
    try:
        with open(file_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')

        # Определяем тип файла
        ext = os.path.splitext(file_path)[1].lower()
        mime_types = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'}
        mime_type = mime_types.get(ext, 'image/jpeg')

        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            payload = {
                "model": AI_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Опиши что на этом изображении кратко (1-2 предложения). Сообщение от человека: {user_message}" if user_message else "Опиши что на этом изображении кратко (1-2 предложения)."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{image_data}"
                                }
                            }
                        ]
                    }
                ]
            }

            async with session.post(AI_API_URL, json=payload, timeout=60) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return result.get('answer', result.get('response', ''))
    except Exception as e:
        print(f"Ошибка анализа изображения: {e}")
    return None


async def get_media_duration(message):
    """Получить длительность медиа (голосовое/видео) в секундах"""
    try:
        if message.media:
            if hasattr(message.media, 'document'):
                for attr in message.media.document.attributes:
                    if isinstance(attr, (DocumentAttributeAudio, DocumentAttributeVideo)):
                        return attr.duration
    except:
        pass
    return 0


async def call_ai_api(messages, user_data):
    """Вызов API ИИ"""
    try:
        # Формируем историю
        history = []

        # Системный промпт
        history.append({
            "role": "system",
            "content": SYSTEM_PROMPT
        })

        # Добавляем историю переписки
        for msg in user_data.conversation_history[-15:]:
            history.append(msg)

        # Добавляем текущее сообщение
        for msg in messages:
            history.append(msg)

        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            payload = {
                "model": AI_MODEL,
                "messages": history
            }

            async with session.post(AI_API_URL, json=payload, timeout=120) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    answer = result.get('answer', result.get('response', result.get('content', '')))

                    # Если ответ в формате списка
                    if isinstance(answer, list):
                        answer = ' '.join([str(a) for a in answer])

                    return answer
                else:
                    print(f"API Error: {resp.status}")
                    return None
    except Exception as e:
        print(f"Ошибка вызова API: {e}")
        return None


def should_ignore_person(user_data):
    """Проверка, нужно ли игнорировать человека"""
    # Если установлено время игнорирования
    if user_data.ignore_until and datetime.now() < user_data.ignore_until:
        return True

    # Если последнее сообщение было более 10 дней назад - не писать первыми
    if user_data.last_message_time:
        days_since = (datetime.now() - user_data.last_message_time).days
        if days_since >= 10:
            return True

    return False


def calculate_response_delay(message_text, is_voice=False, is_video=False, media_duration=0):
    """Расчет задержки перед ответом для реалистичности"""
    base_delay = random.uniform(3, 15)  # Базовая задержка 3-15 секунд

    # Для голосовых - время прослушивания
    if is_voice and media_duration > 0:
        base_delay += media_duration + random.uniform(2, 5)

    # Для видео
    if is_video and media_duration > 0:
        if media_duration > 600:  # Больше 10 минут
            return -1  # Флаг что видео слишком длинное
        base_delay += min(media_duration, 120) + random.uniform(5, 15)

    # Длинное сообщение - больше времени на чтение
    if message_text:
        words = len(message_text.split())
        reading_time = words * 0.3  # ~0.3 сек на слово
        base_delay += reading_time

    # Случайная задержка "занятости"
    if random.random() < 0.15:  # 15% шанс
        base_delay += random.uniform(30, 180)  # Дополнительно 0.5-3 минуты

    return min(base_delay, 300)  # Максимум 5 минут


def split_long_message(text):
    """Разбивка длинного сообщения на несколько"""
    if len(text) < 150:
        return [text]

    messages = []

    # Разбиваем по предложениям
    sentences = re.split(r'(?<=[.!?])\s+', text)

    current_msg = ""
    for sentence in sentences:
        if len(current_msg) + len(sentence) < random.randint(80, 200):
            current_msg += (" " if current_msg else "") + sentence
        else:
            if current_msg:
                messages.append(current_msg.strip())
            current_msg = sentence

    if current_msg:
        messages.append(current_msg.strip())

    # Если получилось слишком много - объединяем
    if len(messages) > 6:
        combined = []
        for i in range(0, len(messages), 2):
            if i + 1 < len(messages):
                combined.append(messages[i] + " " + messages[i+1])
            else:
                combined.append(messages[i])
        messages = combined

    return messages if messages else [text]


def generate_ignore_response():
    """Генерация ответа когда нужно уйти/игнорировать"""
    responses = [
        ("блин, мне надо отойти ненадолго", random.randint(15, 45)),
        ("ой подожди, мне тут позвонили", random.randint(10, 30)),
        ("секунду, я скоро", random.randint(5, 20)),
        ("мне надо пойти поесть, потом напишу)", random.randint(30, 90)),
        ("подожди чутка, дела", random.randint(20, 60)),
        ("ой, мне надо убраться немного", random.randint(30, 60)),
        ("сори, отвлеклась", random.randint(10, 25)),
        ("погоди, ща вернусь", random.randint(10, 30)),
    ]

    response, minutes = random.choice(responses)
    return response, timedelta(minutes=minutes)


def generate_sleep_response():
    """Генерация ответа про сон"""
    responses = [
        "ладно, я спать пойду уже, устала(",
        "всё, я сплю, пока)",
        "оке, я спать, завтра напишу",
        "блин глаза слипаются, пойду спать",
        "лан я отрубаюсь, споки)",
        "ну всё, я баиньки",
        "сорри, засыпаю уже, завтра договорим",
    ]
    return random.choice(responses)


def generate_wakeup_message():
    """Генерация сообщения после пробуждения"""
    messages = [
        "привееет, проснулась только",
        "доброе утро)",
        "ууу только встала",
        "прив, сорри что не отвечала, спала",
    ]
    return random.choice(messages)


def generate_proactive_message():
    """Генерация проактивного сообщения другу"""
    messages = [
        "ну чо как ты там?",
        "как делишки?)",
        "чо делаешь?",
        "ты живой вообще? хехе",
        "эй, ты тут?",
        "скучно чото, ты как?",
        "ну как оно?",
        "чо нового?",
    ]
    return random.choice(messages)


def check_ignore_trigger(ai_response):
    """Проверка нужно ли установить игнор после этого ответа"""
    ignore_keywords = [
        "надо отойти", "отойду", "мне пора", "позже напишу",
        "потом напишу", "отвлеклась", "занята", "дела",
        "пойду", "убраться", "поесть", "позвонили"
    ]

    response_lower = ai_response.lower()
    for keyword in ignore_keywords:
        if keyword in response_lower:
            return True, random.randint(10, 60)  # Игнор на 10-60 минут

    return False, 0


# ==================== ГЛАВНЫЙ КЛАСС БОТА ====================

class GirlBot:
    def __init__(self):
        self.client = TelegramClient('girl_session', API_ID, API_HASH)
        self.temp_dir = tempfile.mkdtemp()

    async def start(self):
        """Запуск бота"""
        await self.client.start(phone=PHONE)
        print("Бот запущен!")
        print(f"Временная папка: {self.temp_dir}")

        # Регистрируем обработчик сообщений
        @self.client.on(events.NewMessage(incoming=True))
        async def handler(event):
            await self.handle_message(event)

        # Запускаем фоновые задачи
        asyncio.create_task(self.proactive_messages_loop())
        asyncio.create_task(self.periodic_save_loop())

        print("Обработчики зарегистрированы, ожидание сообщений...")
        await self.client.run_until_disconnected()

    async def handle_message(self, event):
        """Обработка входящего сообщения"""
        try:
            # Игнорируем групповые чаты и каналы
            if event.is_group or event.is_channel:
                print(f"[DEBUG] Пропуск группового сообщения")
                return

            sender = await event.get_sender()
            if not sender or sender.bot:
                print(f"[DEBUG] Пропуск: sender={sender}, bot={sender.bot if sender else 'N/A'}")
                return

            # ЛОГИРОВАНИЕ
            print(f"\n{'='*50}")
            print(f"[НОВОЕ СООБЩЕНИЕ]")
            print(f"  От: {sender.first_name} (ID: {sender.id})")
            print(f"  Текст: {event.message.message[:100] if event.message.message else '[медиа/пусто]'}")

            user_id = sender.id
            user_data = bot_state.get_user(user_id)

            # Обновляем данные пользователя
            now = datetime.now()
            if not user_data.first_message_time:
                user_data.first_message_time = now
            user_data.last_message_time = now
            user_data.message_count += 1

            # Проверяем дружбу (частое общение)
            if user_data.message_count >= 20:
                user_data.is_friend = True

            # Проверяем режим сна
            if bot_state.check_sleep_schedule():
                if not bot_state.is_sleeping:
                    # Только что заснули - отправляем сообщение
                    await self.send_typing(event.chat_id)
                    await asyncio.sleep(random.uniform(2, 5))
                    await event.respond(generate_sleep_response())
                    bot_state.is_sleeping = True
                    bot_state.save_data()
                return

            # Проверяем игнор
            if user_data.ignore_until and now < user_data.ignore_until:
                # Ещё игнорируем, но если время почти вышло - можно ответить
                remaining = (user_data.ignore_until - now).total_seconds()
                if remaining > 60:  # Больше минуты
                    return
                user_data.ignore_until = None

            # Получаем текст и медиа
            message_text = event.message.message or ""
            is_voice = False
            is_video = False
            is_photo = False
            media_duration = 0
            media_description = ""

            # Обрабатываем медиа
            if event.message.media:
                media_duration = await get_media_duration(event.message)

                # Голосовое сообщение
                if hasattr(event.message.media, 'document'):
                    doc = event.message.media.document
                    for attr in doc.attributes:
                        if isinstance(attr, DocumentAttributeAudio):
                            if attr.voice:
                                is_voice = True
                                break
                        elif isinstance(attr, DocumentAttributeVideo):
                            if hasattr(attr, 'round_message') and attr.round_message:
                                is_video = True  # Видеосообщение (кружок)
                            else:
                                is_video = True
                            break

                # Фото
                if isinstance(event.message.media, MessageMediaPhoto):
                    is_photo = True

            # Рассчитываем задержку
            delay = calculate_response_delay(message_text, is_voice, is_video, media_duration)

            # Если видео слишком длинное
            if delay == -1:
                await asyncio.sleep(random.uniform(5, 15))
                await self.send_typing(event.chat_id)
                await asyncio.sleep(random.uniform(2, 4))
                responses = [
                    "ой это слишком длинное, я потом посмотрю",
                    "блин, это долгое какое-то, давай потом гляну",
                    "сорри не могу щас такое длинное смотреть(",
                ]
                await event.respond(random.choice(responses))
                user_data.ignore_until = now + timedelta(minutes=random.randint(30, 120))
                bot_state.save_data()
                return

            # Задержка перед ответом
            await asyncio.sleep(delay)

            # Обрабатываем медиа если есть
            if is_voice:
                file_path = await download_media(self.client, event.message, self.temp_dir)
                if file_path:
                    transcription = await transcribe_voice(file_path)
                    if transcription:
                        media_description = f"[Голосовое сообщение: {transcription}]"
                    else:
                        media_description = "[Голосовое сообщение, не удалось расшифровать]"
                    try:
                        os.remove(file_path)
                    except:
                        pass

            elif is_photo:
                file_path = await download_media(self.client, event.message, self.temp_dir)
                if file_path:
                    description = await analyze_image(file_path, message_text)
                    if description:
                        media_description = f"[Фото: {description}]"
                    else:
                        media_description = "[Фото отправлено]"
                    try:
                        os.remove(file_path)
                    except:
                        pass

            elif is_video:
                media_description = f"[Видео, длительность: {media_duration} сек]"

            # Формируем запрос к ИИ
            user_content = message_text
            if media_description:
                user_content = f"{media_description}\n{message_text}" if message_text else media_description

            if not user_content.strip():
                user_content = "[Пустое сообщение или стикер]"

            messages = [{"role": "user", "content": user_content}]

            # Получаем ответ от ИИ
            print(f"[DEBUG] Отправка запроса к API...")
            ai_response = await call_ai_api(messages, user_data)
            print(f"[DEBUG] Ответ API: {ai_response[:200] if ai_response else 'ПУСТО/ОШИБКА'}")

            if not ai_response:
                # Если API не ответило, отправляем что-то нейтральное
                print(f"[WARN] API не ответило, используем fallback")
                fallback_responses = ["хм", "ага", "понятно", "ну ок", ")"]
                ai_response = random.choice(fallback_responses)

            # Сохраняем в историю
            user_data.conversation_history.append({"role": "user", "content": user_content})
            user_data.conversation_history.append({"role": "assistant", "content": ai_response})

            # Ограничиваем историю
            if len(user_data.conversation_history) > 30:
                user_data.conversation_history = user_data.conversation_history[-20:]

            # Проверяем нужно ли установить игнор
            should_ignore, ignore_minutes = check_ignore_trigger(ai_response)
            if should_ignore:
                user_data.ignore_until = now + timedelta(minutes=ignore_minutes)

            # Случайный шанс уйти
            if random.random() < 0.05:  # 5% шанс
                ignore_msg, ignore_time = generate_ignore_response()
                ai_response += f"\n{ignore_msg}"
                user_data.ignore_until = now + ignore_time

            # Разбиваем на сообщения
            response_parts = split_long_message(ai_response)

            # Отправляем сообщения
            for i, part in enumerate(response_parts):
                # Печатаем перед каждым сообщением
                await self.send_typing(event.chat_id)

                # Задержка на "печатание"
                typing_time = len(part) * random.uniform(0.03, 0.08)
                typing_time = min(typing_time, 10)  # Максимум 10 секунд
                await asyncio.sleep(typing_time)

                await event.respond(part)
                print(f"[ОТПРАВЛЕНО] {part}")

                # Пауза между сообщениями
                if i < len(response_parts) - 1:
                    await asyncio.sleep(random.uniform(0.5, 2))

            print(f"{'='*50}\n")
            # Сохраняем данные
            bot_state.save_data()

        except Exception as e:
            print(f"[ERROR] Ошибка обработки сообщения: {e}")
            import traceback
            traceback.print_exc()

    async def send_typing(self, chat_id):
        """Отправка статуса печатания"""
        try:
            await self.client(SetTypingRequest(
                peer=chat_id,
                action=SendMessageTypingAction()
            ))
        except Exception as e:
            print(f"Ошибка отправки статуса печатания: {e}")

    async def proactive_messages_loop(self):
        """Фоновая задача для проактивных сообщений друзьям"""
        while True:
            try:
                await asyncio.sleep(random.randint(1800, 7200))  # 30 мин - 2 часа

                # Проверяем что не спим
                if bot_state.is_sleeping:
                    continue

                now = datetime.now()

                # Ищем друзей которым можно написать
                for user_id, user_data in bot_state.users.items():
                    if not user_data.is_friend:
                        continue

                    # Проверяем что не игнорируем
                    if user_data.ignore_until and now < user_data.ignore_until:
                        continue

                    # Проверяем что не писали проактивно недавно
                    if user_data.last_proactive_message:
                        hours_since = (now - user_data.last_proactive_message).total_seconds() / 3600
                        if hours_since < 6:  # Минимум 6 часов между проактивными
                            continue

                    # Проверяем что общались недавно
                    if user_data.last_message_time:
                        days_since = (now - user_data.last_message_time).days
                        if days_since >= 10:  # Более 10 дней - не пишем первыми
                            continue
                        if days_since < 1:  # Если общались сегодня - можем написать
                            if random.random() < 0.1:  # 10% шанс
                                try:
                                    message = generate_proactive_message()
                                    await self.client.send_message(user_id, message)
                                    user_data.last_proactive_message = now
                                    bot_state.save_data()
                                    break  # Одно проактивное сообщение за раз
                                except:
                                    pass

            except Exception as e:
                print(f"Ошибка в proactive_messages_loop: {e}")

    async def periodic_save_loop(self):
        """Периодическое сохранение данных"""
        while True:
            await asyncio.sleep(300)  # Каждые 5 минут
            bot_state.save_data()


# ==================== ЗАПУСК ====================

async def manual_auth(client):
    """Ручная авторизация с явной отправкой кода"""
    from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, FloodWaitError

    print("\n[*] Подключение к Telegram...")
    await client.connect()

    if await client.is_user_authorized():
        print("[+] Уже авторизован!")
        return True

    phone_code_hash = None

    while True:
        print()
        print("Выбери способ получения кода:")
        print("  1 - Отправить код в Telegram (по умолчанию)")
        print("  2 - Отправить код по SMS")
        print("  3 - Позвонить (код скажут голосом)")
        print("  0 - Выход")
        print()

        choice = input("Твой выбор [1]: ").strip() or "1"

        if choice == "0":
            return False

        try:
            print(f"\n[*] Отправка кода на номер {PHONE}...")

            if choice == "2":
                # Сначала обычный запрос, потом resend для SMS
                if phone_code_hash is None:
                    result = await client.send_code_request(PHONE)
                    phone_code_hash = result.phone_code_hash
                # Повторная отправка через SMS
                from telethon.tl.functions.auth import ResendCodeRequest
                result = await client(ResendCodeRequest(PHONE, phone_code_hash))
                phone_code_hash = result.phone_code_hash
                print("[+] SMS отправлено!")

            elif choice == "3":
                # Звонок
                if phone_code_hash is None:
                    result = await client.send_code_request(PHONE)
                    phone_code_hash = result.phone_code_hash
                from telethon.tl.functions.auth import ResendCodeRequest
                result = await client(ResendCodeRequest(PHONE, phone_code_hash))
                phone_code_hash = result.phone_code_hash
                print("[+] Сейчас позвонят!")

            else:
                # Обычная отправка в Telegram
                result = await client.send_code_request(PHONE)
                phone_code_hash = result.phone_code_hash
                print("[+] Код отправлен в Telegram!")

            print(f"[*] Тип: {result.type}")
            print()
            print("[!] Код - это 5 ЦИФР")
            print("[!] Проверь:")
            print("    - Приложение Telegram (сообщение от 'Telegram')")
            print("    - SMS на телефон")
            print()

            code = input("Введи 5 цифр кода (или 'r' чтобы отправить заново): ").strip()

            if code.lower() == 'r':
                continue

            if not code.isdigit() or len(code) != 5:
                print("[-] Код должен быть 5 цифр!")
                continue

            try:
                await client.sign_in(PHONE, code, phone_code_hash=phone_code_hash)
                print("[+] Успешная авторизация!")
                return True

            except PhoneCodeInvalidError:
                print("[-] Неверный код! Попробуй ещё раз")
                continue

            except SessionPasswordNeededError:
                print("[!] Требуется пароль 2FA")
                password = input("Введи пароль: ").strip()
                await client.sign_in(password=password)
                print("[+] Успешная авторизация с 2FA!")
                return True

        except FloodWaitError as e:
            print(f"[-] Слишком много попыток! Подожди {e.seconds} секунд")
            return False

        except Exception as e:
            print(f"[-] Ошибка: {e}")
            print("[*] Попробуй другой способ")
            continue

    return False


async def test_ai_api():
    """Тест подключения к AI API"""
    print("\n[*] Тестирование AI API...")
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            payload = {
                "model": AI_MODEL,
                "messages": [
                    {"role": "user", "content": "Привет, скажи 'работает' одним словом"}
                ]
            }
            async with session.post(AI_API_URL, json=payload, timeout=30) as resp:
                print(f"[DEBUG] API статус: {resp.status}")
                if resp.status == 200:
                    result = await resp.json()
                    print(f"[DEBUG] API ответ: {result}")
                    answer = result.get('answer', result.get('response', result.get('content', '')))
                    if answer:
                        print(f"[+] AI API работает! Ответ: {answer[:100]}")
                        return True
                    else:
                        print(f"[-] API вернул пустой ответ: {result}")
                else:
                    text = await resp.text()
                    print(f"[-] API вернул ошибку {resp.status}: {text[:200]}")
    except Exception as e:
        print(f"[-] Ошибка подключения к API: {e}")
    return False


async def main():
    print("=" * 50)
    print("Telegram Girl Bot - Запуск")
    print("=" * 50)
    print()
    print(f"  API_ID = {API_ID}")
    print(f"  API_HASH = {API_HASH}")
    print(f"  PHONE = {PHONE}")
    print(f"  AI_API = {AI_API_URL}")
    print(f"  MODEL = {AI_MODEL}")

    # Тестируем API
    if not await test_ai_api():
        print("\n[!] ВНИМАНИЕ: AI API не работает!")
        print("[!] Бот будет отвечать fallback-фразами")
        input("Нажми Enter чтобы продолжить или Ctrl+C для выхода...")

    # Удаляем старую сессию если есть проблемы
    session_file = "girl_session.session"
    if os.path.exists(session_file):
        print(f"\n[?] Найдена старая сессия. Удалить? (y/n)")
        if input().strip().lower() == 'y':
            os.remove(session_file)
            print("[+] Сессия удалена")

    # Создаем клиент с параметрами устройства
    client = TelegramClient(
        'girl_session',
        API_ID,
        API_HASH,
        device_model="Samsung Galaxy S21",
        system_version="Android 12",
        app_version="9.4.0",
        lang_code="ru",
        system_lang_code="ru-RU"
    )

    # Ручная авторизация
    if not await manual_auth(client):
        print("[-] Не удалось авторизоваться")
        await client.disconnect()
        return

    print("\n[+] Бот запущен и слушает сообщения...")
    print("[*] Для остановки нажми Ctrl+C")
    print()

    # Создаем бота с уже авторизованным клиентом
    bot = GirlBot()
    bot.client = client

    # Регистрируем обработчик
    @client.on(events.NewMessage(incoming=True))
    async def handler(event):
        await bot.handle_message(event)

    # Запускаем фоновые задачи
    asyncio.create_task(bot.proactive_messages_loop())
    asyncio.create_task(bot.periodic_save_loop())

    await client.run_until_disconnected()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] Бот остановлен")
        bot_state.save_data()
