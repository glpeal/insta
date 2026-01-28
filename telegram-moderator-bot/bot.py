#!/usr/bin/env python3
"""
Telegram Moderation Bot
Простой бот для модерации чатов с поддержкой:
- Запрещённых слов
- Антиспам
- Мут/бан
- Команды модерации
"""

import json
import os
import time
import logging
from datetime import datetime, timedelta
from collections import defaultdict

# Загрузка .env файла
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from telegram import Update, ChatPermissions
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

# Логирование
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Файл конфигурации
CONFIG_FILE = "config.json"

# Дефолтная конфигурация
DEFAULT_CONFIG = {
    "banned_words": ["спам", "реклама"],
    "spam_threshold": 5,  # сообщений
    "spam_interval": 10,  # секунд
    "mute_duration": 300,  # секунд (5 минут)
    "warn_before_mute": 3,  # предупреждений перед мутом
    "owner_ids": [],  # ID владельцев (могут всё)
    "admin_ids": [],  # ID админов бота
}


def load_config():
    """Загрузка конфигурации"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)
            # Добавляем недостающие ключи
            for key, value in DEFAULT_CONFIG.items():
                if key not in config:
                    config[key] = value
            return config
    return DEFAULT_CONFIG.copy()


def save_config(config):
    """Сохранение конфигурации"""
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


# Глобальные переменные
config = load_config()
user_messages = defaultdict(list)  # user_id -> [timestamps]
user_warnings = defaultdict(int)  # user_id -> warning_count


async def is_admin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Проверка является ли пользователь админом чата или владельцем бота"""
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id

    # Проверяем владельцев бота
    if user_id in config.get("owner_ids", []):
        return True

    # Проверяем админов бота
    if user_id in config.get("admin_ids", []):
        return True

    # Проверяем админов чата
    try:
        chat_member = await context.bot.get_chat_member(chat_id, user_id)
        return chat_member.status in ["creator", "administrator"]
    except Exception:
        return False


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start"""
    await update.message.reply_text(
        "Привет! Я бот-модератор.\n\n"
        "Добавь меня в чат с правами админа и я буду:\n"
        "• Удалять сообщения с запрещёнными словами\n"
        "• Мутить за спам\n"
        "• Выполнять команды модерации\n\n"
        "Команды: /help"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /help"""
    help_text = """
<b>Команды модерации:</b>

<b>Для всех:</b>
/help - эта справка
/rules - правила чата

<b>Для админов:</b>
/mute [время] - мут пользователя (ответом на сообщение)
/unmute - размут пользователя
/ban - бан пользователя
/unban [user_id] - разбан по ID
/kick - кик пользователя
/warn - предупреждение
/unwarn - снять предупреждение

<b>Запрещённые слова:</b>
/addword [слово] - добавить слово
/delword [слово] - удалить слово
/words - список запрещённых слов

<b>Настройки:</b>
/setspam [кол-во] [сек] - настройка антиспама
/setmute [сек] - время мута по умолчанию
/setwarn [кол-во] - предупреждений до мута
/addowner [user_id] - добавить владельца
/addadmin [user_id] - добавить админа бота
/status - статус бота

<i>Время можно указывать: 30s, 5m, 1h, 1d</i>
"""
    await update.message.reply_text(help_text, parse_mode="HTML")


async def rules(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /rules"""
    banned = ", ".join(config["banned_words"]) if config["banned_words"] else "нет"
    await update.message.reply_text(
        f"<b>Правила чата:</b>\n\n"
        f"1. Не спамить (>{config['spam_threshold']} сообщений за {config['spam_interval']} сек)\n"
        f"2. Не использовать запрещённые слова\n"
        f"3. {config['warn_before_mute']} предупреждения = мут\n\n"
        f"<b>Запрещённые слова:</b> {banned}",
        parse_mode="HTML"
    )


def parse_duration(duration_str: str) -> int:
    """Парсинг времени (30s, 5m, 1h, 1d)"""
    if not duration_str:
        return config["mute_duration"]

    try:
        if duration_str.endswith('s'):
            return int(duration_str[:-1])
        elif duration_str.endswith('m'):
            return int(duration_str[:-1]) * 60
        elif duration_str.endswith('h'):
            return int(duration_str[:-1]) * 3600
        elif duration_str.endswith('d'):
            return int(duration_str[:-1]) * 86400
        else:
            return int(duration_str)
    except ValueError:
        return config["mute_duration"]


async def mute(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /mute"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("Ответьте на сообщение пользователя.")
        return

    user = update.message.reply_to_message.from_user
    duration = parse_duration(context.args[0] if context.args else "")

    try:
        until_date = datetime.now() + timedelta(seconds=duration)
        await context.bot.restrict_chat_member(
            update.effective_chat.id,
            user.id,
            ChatPermissions(can_send_messages=False),
            until_date=until_date
        )
        await update.message.reply_text(
            f"@{user.username or user.first_name} замучен на {duration} сек."
        )
    except Exception as e:
        await update.message.reply_text(f"Ошибка: {e}")


async def unmute(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /unmute"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("Ответьте на сообщение пользователя.")
        return

    user = update.message.reply_to_message.from_user

    try:
        await context.bot.restrict_chat_member(
            update.effective_chat.id,
            user.id,
            ChatPermissions(
                can_send_messages=True,
                can_send_media_messages=True,
                can_send_polls=True,
                can_send_other_messages=True,
                can_add_web_page_previews=True,
                can_change_info=False,
                can_invite_users=True,
                can_pin_messages=False
            )
        )
        await update.message.reply_text(
            f"@{user.username or user.first_name} размучен."
        )
    except Exception as e:
        await update.message.reply_text(f"Ошибка: {e}")


async def ban(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /ban"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("Ответьте на сообщение пользователя.")
        return

    user = update.message.reply_to_message.from_user

    try:
        await context.bot.ban_chat_member(update.effective_chat.id, user.id)
        await update.message.reply_text(
            f"@{user.username or user.first_name} забанен."
        )
    except Exception as e:
        await update.message.reply_text(f"Ошибка: {e}")


async def unban(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /unban"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not context.args:
        await update.message.reply_text("Укажите user_id: /unban 123456789")
        return

    try:
        user_id = int(context.args[0])
        await context.bot.unban_chat_member(update.effective_chat.id, user_id)
        await update.message.reply_text(f"Пользователь {user_id} разбанен.")
    except Exception as e:
        await update.message.reply_text(f"Ошибка: {e}")


async def kick(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /kick"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("Ответьте на сообщение пользователя.")
        return

    user = update.message.reply_to_message.from_user

    try:
        await context.bot.ban_chat_member(update.effective_chat.id, user.id)
        await context.bot.unban_chat_member(update.effective_chat.id, user.id)
        await update.message.reply_text(
            f"@{user.username or user.first_name} кикнут."
        )
    except Exception as e:
        await update.message.reply_text(f"Ошибка: {e}")


async def warn(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /warn"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("Ответьте на сообщение пользователя.")
        return

    user = update.message.reply_to_message.from_user
    user_warnings[user.id] += 1
    warnings = user_warnings[user.id]

    if warnings >= config["warn_before_mute"]:
        # Мут при достижении лимита
        try:
            until_date = datetime.now() + timedelta(seconds=config["mute_duration"])
            await context.bot.restrict_chat_member(
                update.effective_chat.id,
                user.id,
                ChatPermissions(can_send_messages=False),
                until_date=until_date
            )
            user_warnings[user.id] = 0
            await update.message.reply_text(
                f"@{user.username or user.first_name} получил {warnings} предупреждений и замучен!"
            )
        except Exception as e:
            await update.message.reply_text(f"Ошибка мута: {e}")
    else:
        await update.message.reply_text(
            f"@{user.username or user.first_name} предупреждён ({warnings}/{config['warn_before_mute']})"
        )


async def unwarn(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /unwarn"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("Ответьте на сообщение пользователя.")
        return

    user = update.message.reply_to_message.from_user
    if user_warnings[user.id] > 0:
        user_warnings[user.id] -= 1

    await update.message.reply_text(
        f"@{user.username or user.first_name}: {user_warnings[user.id]}/{config['warn_before_mute']} предупреждений"
    )


async def addword(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /addword"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not context.args:
        await update.message.reply_text("Укажите слово: /addword плохоеслово")
        return

    word = " ".join(context.args).lower()
    if word not in config["banned_words"]:
        config["banned_words"].append(word)
        save_config(config)
        await update.message.reply_text(f"Слово '{word}' добавлено в чёрный список.")
    else:
        await update.message.reply_text(f"Слово '{word}' уже в списке.")


async def delword(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /delword"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not context.args:
        await update.message.reply_text("Укажите слово: /delword слово")
        return

    word = " ".join(context.args).lower()
    if word in config["banned_words"]:
        config["banned_words"].remove(word)
        save_config(config)
        await update.message.reply_text(f"Слово '{word}' удалено из списка.")
    else:
        await update.message.reply_text(f"Слово '{word}' не найдено.")


async def words(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /words"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if config["banned_words"]:
        words_list = "\n".join(f"• {w}" for w in config["banned_words"])
        await update.message.reply_text(f"<b>Запрещённые слова:</b>\n{words_list}", parse_mode="HTML")
    else:
        await update.message.reply_text("Список запрещённых слов пуст.")


async def setspam(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /setspam"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if len(context.args) < 2:
        await update.message.reply_text(
            f"Использование: /setspam [кол-во] [секунд]\n"
            f"Текущие: {config['spam_threshold']} сообщений за {config['spam_interval']} сек"
        )
        return

    try:
        config["spam_threshold"] = int(context.args[0])
        config["spam_interval"] = int(context.args[1])
        save_config(config)
        await update.message.reply_text(
            f"Антиспам: {config['spam_threshold']} сообщений за {config['spam_interval']} сек"
        )
    except ValueError:
        await update.message.reply_text("Укажите числа.")


async def setmute(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /setmute"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not context.args:
        await update.message.reply_text(
            f"Использование: /setmute [секунд]\nТекущее: {config['mute_duration']} сек"
        )
        return

    try:
        config["mute_duration"] = int(context.args[0])
        save_config(config)
        await update.message.reply_text(f"Время мута: {config['mute_duration']} сек")
    except ValueError:
        await update.message.reply_text("Укажите число.")


async def setwarn(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /setwarn"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not context.args:
        await update.message.reply_text(
            f"Использование: /setwarn [кол-во]\nТекущее: {config['warn_before_mute']}"
        )
        return

    try:
        config["warn_before_mute"] = int(context.args[0])
        save_config(config)
        await update.message.reply_text(f"Предупреждений до мута: {config['warn_before_mute']}")
    except ValueError:
        await update.message.reply_text("Укажите число.")


async def addowner(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /addowner"""
    user_id = update.effective_user.id

    # Только существующие владельцы могут добавлять новых
    if config["owner_ids"] and user_id not in config["owner_ids"]:
        await update.message.reply_text("Только владельцы могут добавлять владельцев.")
        return

    if not context.args:
        await update.message.reply_text(
            f"Использование: /addowner [user_id]\n"
            f"Ваш ID: {user_id}\n"
            f"Владельцы: {config['owner_ids']}"
        )
        return

    try:
        new_owner = int(context.args[0])
        if new_owner not in config["owner_ids"]:
            config["owner_ids"].append(new_owner)
            save_config(config)
            await update.message.reply_text(f"Владелец {new_owner} добавлен.")
        else:
            await update.message.reply_text("Уже владелец.")
    except ValueError:
        await update.message.reply_text("Укажите числовой ID.")


async def addadmin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /addadmin"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    if not context.args:
        await update.message.reply_text(
            f"Использование: /addadmin [user_id]\n"
            f"Админы бота: {config['admin_ids']}"
        )
        return

    try:
        new_admin = int(context.args[0])
        if new_admin not in config["admin_ids"]:
            config["admin_ids"].append(new_admin)
            save_config(config)
            await update.message.reply_text(f"Админ {new_admin} добавлен.")
        else:
            await update.message.reply_text("Уже админ.")
    except ValueError:
        await update.message.reply_text("Укажите числовой ID.")


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /status"""
    if not await is_admin(update, context):
        await update.message.reply_text("У вас нет прав.")
        return

    await update.message.reply_text(
        f"<b>Статус бота:</b>\n\n"
        f"Запрещённых слов: {len(config['banned_words'])}\n"
        f"Антиспам: {config['spam_threshold']} сообщений за {config['spam_interval']} сек\n"
        f"Время мута: {config['mute_duration']} сек\n"
        f"Предупреждений до мута: {config['warn_before_mute']}\n"
        f"Владельцы: {len(config['owner_ids'])}\n"
        f"Админы бота: {len(config['admin_ids'])}\n"
        f"Ваш ID: {update.effective_user.id}",
        parse_mode="HTML"
    )


async def myid(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /myid"""
    user = update.effective_user
    chat = update.effective_chat
    await update.message.reply_text(
        f"Ваш ID: {user.id}\n"
        f"Chat ID: {chat.id}"
    )


async def check_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Проверка сообщений на спам и запрещённые слова"""
    if not update.message or not update.message.text:
        return

    user = update.effective_user
    user_id = user.id
    chat_id = update.effective_chat.id
    text = update.message.text.lower()

    # Пропускаем админов
    if await is_admin(update, context):
        return

    # Проверка запрещённых слов
    for word in config["banned_words"]:
        if word.lower() in text:
            try:
                await update.message.delete()
                await context.bot.send_message(
                    chat_id,
                    f"@{user.username or user.first_name}, сообщение удалено (запрещённое слово)."
                )
                # Добавляем предупреждение
                user_warnings[user_id] += 1
                if user_warnings[user_id] >= config["warn_before_mute"]:
                    until_date = datetime.now() + timedelta(seconds=config["mute_duration"])
                    await context.bot.restrict_chat_member(
                        chat_id,
                        user_id,
                        ChatPermissions(can_send_messages=False),
                        until_date=until_date
                    )
                    user_warnings[user_id] = 0
                    await context.bot.send_message(
                        chat_id,
                        f"@{user.username or user.first_name} замучен за нарушения."
                    )
            except Exception as e:
                logger.error(f"Ошибка удаления: {e}")
            return

    # Проверка спама
    current_time = time.time()
    user_messages[user_id] = [
        t for t in user_messages[user_id]
        if current_time - t < config["spam_interval"]
    ]
    user_messages[user_id].append(current_time)

    if len(user_messages[user_id]) > config["spam_threshold"]:
        try:
            until_date = datetime.now() + timedelta(seconds=config["mute_duration"])
            await context.bot.restrict_chat_member(
                chat_id,
                user_id,
                ChatPermissions(can_send_messages=False),
                until_date=until_date
            )
            await context.bot.send_message(
                chat_id,
                f"@{user.username or user.first_name} замучен за спам."
            )
            user_messages[user_id] = []
        except Exception as e:
            logger.error(f"Ошибка мута: {e}")


def main():
    """Запуск бота"""
    token = os.getenv("TELEGRAM_BOT_TOKEN")

    if not token:
        print("=" * 50)
        print("ОШИБКА: Не указан TELEGRAM_BOT_TOKEN")
        print()
        print("Получите токен у @BotFather в Telegram и запустите:")
        print("  export TELEGRAM_BOT_TOKEN='ваш_токен'")
        print("  python bot.py")
        print()
        print("Или создайте файл .env с содержимым:")
        print("  TELEGRAM_BOT_TOKEN=ваш_токен")
        print("=" * 50)
        return

    # Создаём приложение
    app = Application.builder().token(token).build()

    # Команды
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("rules", rules))
    app.add_handler(CommandHandler("mute", mute))
    app.add_handler(CommandHandler("unmute", unmute))
    app.add_handler(CommandHandler("ban", ban))
    app.add_handler(CommandHandler("unban", unban))
    app.add_handler(CommandHandler("kick", kick))
    app.add_handler(CommandHandler("warn", warn))
    app.add_handler(CommandHandler("unwarn", unwarn))
    app.add_handler(CommandHandler("addword", addword))
    app.add_handler(CommandHandler("delword", delword))
    app.add_handler(CommandHandler("words", words))
    app.add_handler(CommandHandler("setspam", setspam))
    app.add_handler(CommandHandler("setmute", setmute))
    app.add_handler(CommandHandler("setwarn", setwarn))
    app.add_handler(CommandHandler("addowner", addowner))
    app.add_handler(CommandHandler("addadmin", addadmin))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("myid", myid))

    # Обработчик всех сообщений (для модерации)
    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND,
        check_message
    ))

    print("=" * 50)
    print("Бот запущен!")
    print()
    print("Важно:")
    print("1. Добавьте бота в чат как администратора")
    print("2. Узнайте свой ID командой /myid")
    print("3. Добавьте себя владельцем: /addowner ваш_id")
    print("=" * 50)

    # Запуск
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
