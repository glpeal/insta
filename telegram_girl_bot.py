#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram Userbot - Девушка ИИ
"""

import asyncio
import json
import random
import os
import ssl
import tempfile
from datetime import datetime, timedelta
import aiohttp

from telethon import TelegramClient, events
from telethon.tl.types import (
    DocumentAttributeAudio,
    DocumentAttributeVideo,
    MessageMediaPhoto,
)
from telethon.tl.functions.messages import SetTypingRequest, ReadHistoryRequest
from telethon.tl.types import SendMessageTypingAction

# ==================== НАСТРОЙКИ ====================

API_ID = 12345678  # Замени на свой
API_HASH = "your_api_hash_here"  # Замени на свой
PHONE = "+79001234567"  # Замени на свой

DATA_FILE = "bot_data.json"

# Бесплатный AI API (Pollinations.ai)
AI_API_URL = "https://text.pollinations.ai/openai"

# SSL без проверки
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# ==================== СИСТЕМНЫЙ ПРОМПТ ====================

SYSTEM_PROMPT = """Ты - обычная девушка 20-23 лет, общаешься в телеграме.

ПРАВИЛА:
- Пиши с маленькой буквы
- Отвечай кратко, 1-3 предложения
- Мало эмодзи
- Никогда не говори что ты ИИ/бот
- Общайся расслабленно

СЛЕНГ (используй иногда):
- чо, че, шо
- хехехе, АХАХХАХА
- оке, ок, окей
- лан, лады, ладно
- блин, кста, норм, хз

ЭМОЦИИ:
- ) или )) - улыбка
- ( или (( - грусть

ХАРАКТЕР:
- Немного ленивая, но добрая
- Иногда саркастичная
- Любишь музыку, фильмы, сериалы"""

# ==================== ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ ====================

class UserData:
    def __init__(self, user_id):
        self.user_id = user_id
        self.message_count = 0
        self.last_message_time = None
        self.first_message_time = None
        self.is_friend = False
        self.conversation_history = []
        self.ignore_until = None
        self.last_proactive_message = None

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'message_count': self.message_count,
            'last_message_time': self.last_message_time.isoformat() if self.last_message_time else None,
            'first_message_time': self.first_message_time.isoformat() if self.first_message_time else None,
            'is_friend': self.is_friend,
            'conversation_history': self.conversation_history[-20:],
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
    def __init__(self):
        self.users = {}
        self.is_sleeping = False
        self.sleep_until = None
        self.load_data()

    def load_data(self):
        try:
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for user_id, user_data in data.get('users', {}).items():
                        self.users[int(user_id)] = UserData.from_dict(user_data)
        except Exception as e:
            print(f"Ошибка загрузки: {e}")

    def save_data(self):
        try:
            data = {'users': {str(uid): user.to_dict() for uid, user in self.users.items()}}
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Ошибка сохранения: {e}")

    def get_user(self, user_id):
        if user_id not in self.users:
            self.users[user_id] = UserData(user_id)
        return self.users[user_id]

    def check_sleep_schedule(self):
        now = datetime.now()
        hour = now.hour
        if hour >= 23 or hour < 9:
            if not self.is_sleeping:
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


bot_state = BotState()

# ==================== AI API ====================

async def call_ai_api(messages, user_data):
    """Вызов бесплатного AI API"""
    try:
        history = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in user_data.conversation_history[-10:]:
            history.append(msg)
        for msg in messages:
            history.append(msg)

        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            payload = {
                "model": "openai",
                "messages": history
            }
            async with session.post(AI_API_URL, json=payload, timeout=60) as resp:
                print(f"[DEBUG] API статус: {resp.status}")
                if resp.status == 200:
                    result = await resp.json()
                    answer = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                    return answer
                else:
                    text = await resp.text()
                    print(f"[ERROR] API: {text[:200]}")
    except Exception as e:
        print(f"[ERROR] API: {e}")
    return None


async def test_ai_api():
    """Тест AI"""
    print("\n[*] Тестирование AI API...")
    try:
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            payload = {
                "model": "openai",
                "messages": [{"role": "user", "content": "Скажи 'работает'"}]
            }
            async with session.post(AI_API_URL, json=payload, timeout=30) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    answer = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                    if answer:
                        print(f"[+] AI работает! Ответ: {answer[:50]}")
                        return True
                print(f"[-] API статус: {resp.status}")
    except Exception as e:
        print(f"[-] Ошибка: {e}")
    return False

# ==================== ВСПОМОГАТЕЛЬНЫЕ ====================

def calculate_response_delay(message_text, is_voice=False, is_video=False, media_duration=0):
    base_delay = random.uniform(2, 8)
    if is_voice and media_duration > 0:
        base_delay += media_duration + random.uniform(1, 3)
    if is_video and media_duration > 0:
        if media_duration > 600:
            return -1
        base_delay += min(media_duration, 60) + random.uniform(3, 10)
    if message_text:
        words = len(message_text.split())
        base_delay += words * 0.2
    if random.random() < 0.1:
        base_delay += random.uniform(20, 120)
    return min(base_delay, 180)


def split_long_message(text):
    if len(text) < 150:
        return [text]
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    messages = []
    current_msg = ""
    for sentence in sentences:
        if len(current_msg) + len(sentence) < random.randint(80, 180):
            current_msg += (" " if current_msg else "") + sentence
        else:
            if current_msg:
                messages.append(current_msg.strip())
            current_msg = sentence
    if current_msg:
        messages.append(current_msg.strip())
    return messages if messages else [text]


def generate_sleep_response():
    responses = [
        "ладно, я спать пойду уже)",
        "всё, я сплю, пока)",
        "оке, я спать, завтра напишу",
        "блин глаза слипаются, пойду спать",
    ]
    return random.choice(responses)


async def get_media_duration(message):
    try:
        if message.media and hasattr(message.media, 'document'):
            for attr in message.media.document.attributes:
                if isinstance(attr, (DocumentAttributeAudio, DocumentAttributeVideo)):
                    return attr.duration
    except:
        pass
    return 0

# ==================== БОТ ====================

class GirlBot:
    def __init__(self):
        self.client = None
        self.temp_dir = tempfile.mkdtemp()

    async def handle_message(self, event):
        try:
            if event.is_group or event.is_channel:
                return

            sender = await event.get_sender()
            if not sender or sender.bot:
                return

            print(f"\n{'='*50}")
            print(f"[СООБЩЕНИЕ] От: {sender.first_name} (ID: {sender.id})")
            print(f"  Текст: {event.message.message[:100] if event.message.message else '[медиа]'}")

            # Прочитать сообщение
            try:
                await self.client(ReadHistoryRequest(peer=event.chat_id, max_id=event.message.id))
                print(f"  [+] Прочитано")
            except:
                pass

            user_id = sender.id
            user_data = bot_state.get_user(user_id)
            now = datetime.now()

            if not user_data.first_message_time:
                user_data.first_message_time = now
            user_data.last_message_time = now
            user_data.message_count += 1

            if user_data.message_count >= 20:
                user_data.is_friend = True

            # Сон
            if bot_state.check_sleep_schedule():
                if not bot_state.is_sleeping:
                    await self.send_typing(event.chat_id)
                    await asyncio.sleep(random.uniform(2, 5))
                    await event.respond(generate_sleep_response())
                    bot_state.is_sleeping = True
                    bot_state.save_data()
                return

            # Игнор
            if user_data.ignore_until and now < user_data.ignore_until:
                remaining = (user_data.ignore_until - now).total_seconds()
                if remaining > 60:
                    return
                user_data.ignore_until = None

            message_text = event.message.message or ""
            is_voice = False
            is_video = False
            is_photo = False
            media_duration = 0
            media_description = ""

            if event.message.media:
                media_duration = await get_media_duration(event.message)
                if hasattr(event.message.media, 'document'):
                    doc = event.message.media.document
                    for attr in doc.attributes:
                        if isinstance(attr, DocumentAttributeAudio) and attr.voice:
                            is_voice = True
                            break
                        elif isinstance(attr, DocumentAttributeVideo):
                            is_video = True
                            break
                if isinstance(event.message.media, MessageMediaPhoto):
                    is_photo = True

            delay = calculate_response_delay(message_text, is_voice, is_video, media_duration)

            if delay == -1:
                await asyncio.sleep(random.uniform(3, 8))
                await self.send_typing(event.chat_id)
                await asyncio.sleep(random.uniform(1, 3))
                await event.respond("ой это слишком длинное, потом гляну)")
                user_data.ignore_until = now + timedelta(minutes=random.randint(30, 90))
                bot_state.save_data()
                return

            await asyncio.sleep(delay)

            if is_voice:
                media_description = "[Голосовое сообщение]"
            elif is_photo:
                media_description = "[Фото]"
            elif is_video:
                media_description = "[Видео]"

            user_content = message_text
            if media_description:
                user_content = f"{media_description} {message_text}" if message_text else media_description

            if not user_content.strip():
                user_content = "[Стикер или пустое сообщение]"

            messages = [{"role": "user", "content": user_content}]

            print(f"[DEBUG] Запрос к AI...")
            ai_response = await call_ai_api(messages, user_data)
            print(f"[DEBUG] Ответ: {ai_response[:100] if ai_response else 'ПУСТО'}")

            if not ai_response:
                fallback = ["хм", "ага", "понятно)", "ну ок", ")", "хехе"]
                ai_response = random.choice(fallback)

            user_data.conversation_history.append({"role": "user", "content": user_content})
            user_data.conversation_history.append({"role": "assistant", "content": ai_response})

            if len(user_data.conversation_history) > 30:
                user_data.conversation_history = user_data.conversation_history[-20:]

            response_parts = split_long_message(ai_response)

            for i, part in enumerate(response_parts):
                await self.send_typing(event.chat_id)
                typing_time = len(part) * random.uniform(0.03, 0.07)
                typing_time = min(typing_time, 8)
                await asyncio.sleep(typing_time)
                await event.respond(part)
                print(f"[ОТПРАВЛЕНО] {part}")
                if i < len(response_parts) - 1:
                    await asyncio.sleep(random.uniform(0.5, 1.5))

            print(f"{'='*50}\n")
            bot_state.save_data()

        except Exception as e:
            print(f"[ERROR] {e}")
            import traceback
            traceback.print_exc()

    async def send_typing(self, chat_id):
        try:
            await self.client(SetTypingRequest(peer=chat_id, action=SendMessageTypingAction()))
        except:
            pass

# ==================== АВТОРИЗАЦИЯ ====================

async def manual_auth(client):
    from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, FloodWaitError

    print("\n[*] Подключение к Telegram...")
    await client.connect()

    if await client.is_user_authorized():
        print("[+] Уже авторизован!")
        return True

    phone_code_hash = None

    while True:
        print("\nВыбери способ получения кода:")
        print("  1 - В Telegram")
        print("  2 - SMS")
        print("  0 - Выход")

        choice = input("Выбор [1]: ").strip() or "1"

        if choice == "0":
            return False

        try:
            print(f"\n[*] Отправка кода на {PHONE}...")

            if choice == "2" and phone_code_hash:
                from telethon.tl.functions.auth import ResendCodeRequest
                result = await client(ResendCodeRequest(PHONE, phone_code_hash))
                phone_code_hash = result.phone_code_hash
                print("[+] SMS отправлено!")
            else:
                result = await client.send_code_request(PHONE)
                phone_code_hash = result.phone_code_hash
                print("[+] Код отправлен!")

            print("\n[!] Код - 5 ЦИФР из Telegram или SMS")

            code = input("Введи код (или 'r' заново): ").strip()

            if code.lower() == 'r':
                continue

            if not code.isdigit() or len(code) != 5:
                print("[-] Код должен быть 5 цифр!")
                continue

            try:
                await client.sign_in(PHONE, code, phone_code_hash=phone_code_hash)
                print("[+] Авторизация успешна!")
                return True
            except PhoneCodeInvalidError:
                print("[-] Неверный код!")
                continue
            except SessionPasswordNeededError:
                password = input("Введи пароль 2FA: ").strip()
                await client.sign_in(password=password)
                print("[+] Авторизация с 2FA успешна!")
                return True

        except FloodWaitError as e:
            print(f"[-] Подожди {e.seconds} секунд")
            return False
        except Exception as e:
            print(f"[-] Ошибка: {e}")
            continue

# ==================== MAIN ====================

async def main():
    print("=" * 50)
    print("Telegram Girl Bot")
    print("=" * 50)
    print(f"  API_ID = {API_ID}")
    print(f"  API_HASH = {API_HASH}")
    print(f"  PHONE = {PHONE}")

    if not await test_ai_api():
        print("\n[!] AI API не работает, будут fallback-ответы")
        input("Enter для продолжения...")

    session_file = "girl_session.session"
    if os.path.exists(session_file):
        print(f"\n[?] Удалить старую сессию? (y/n)")
        if input().strip().lower() == 'y':
            os.remove(session_file)
            print("[+] Удалено")

    client = TelegramClient(
        'girl_session', API_ID, API_HASH,
        device_model="Samsung Galaxy S21",
        system_version="Android 12",
        app_version="9.4.0",
        lang_code="ru",
        system_lang_code="ru-RU"
    )

    if not await manual_auth(client):
        print("[-] Авторизация не удалась")
        await client.disconnect()
        return

    print("\n[+] Бот запущен!")
    print("[*] Ctrl+C для остановки\n")

    bot = GirlBot()
    bot.client = client

    @client.on(events.NewMessage(incoming=True))
    async def handler(event):
        await bot.handle_message(event)

    await client.run_until_disconnected()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] Бот остановлен")
        bot_state.save_data()
