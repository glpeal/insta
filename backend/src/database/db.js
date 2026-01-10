import sqlite3 from 'sqlite3';
import { config } from '../config/config.js';
import { createTables } from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

// Promisified database operations
class DatabaseWrapper {
  constructor(db) {
    this.db = db;
    this.run = promisify(db.run.bind(db));
    this.get = promisify(db.get.bind(db));
    this.all = promisify(db.all.bind(db));
    this.exec = promisify(db.exec.bind(db));
  }

  async prepare(sql) {
    return {
      run: (...params) => this.run(sql, params),
      get: (...params) => this.get(sql, params),
      all: (...params) => this.all(sql, params)
    };
  }

  close() {
    this.db.close();
  }
}

export const initDatabase = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.resolve(config.database.path);
  console.log(`📁 Initializing database at: ${dbPath}`);

  const db = new sqlite3.Database(dbPath);
  dbInstance = new DatabaseWrapper(db);

  // Enable foreign keys and WAL mode
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  createTables(dbInstance);

  return dbInstance;
};

export const getDb = () => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
};

export const closeDatabase = () => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('✅ Database connection closed');
  }
};

// Helper functions for common queries
export const dbHelpers = {
  // Instagram accounts
  getAccount: async (username) => {
    const db = getDb();
    return db.get('SELECT * FROM instagram_accounts WHERE username = ?', username);
  },

  createAccount: async (username) => {
    const db = getDb();
    return db.run('INSERT INTO instagram_accounts (username) VALUES (?)', username);
  },

  updateAccountCookies: async (username, encryptedCookies) => {
    const db = getDb();
    return db.run(`
      UPDATE instagram_accounts
      SET encrypted_cookies = ?, session_valid = 1, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE username = ?
    `, encryptedCookies, username);
  },

  // Comments
  addTrackedComment: async (accountId, commentId, postUrl, commenterUsername, commentText) => {
    const db = getDb();
    try {
      return await db.run(`
        INSERT INTO tracked_comments (account_id, comment_id, post_url, commenter_username, comment_text)
        VALUES (?, ?, ?, ?, ?)
      `, accountId, commentId, postUrl, commenterUsername, commentText);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE')) {
        return null; // Comment already tracked
      }
      throw error;
    }
  },

  getUnprocessedComments: async (accountId) => {
    const db = getDb();
    return db.all(`
      SELECT * FROM tracked_comments
      WHERE account_id = ? AND dm_sent = 0
      ORDER BY detected_at ASC
    `, accountId);
  },

  markCommentProcessed: async (commentId) => {
    const db = getDb();
    return db.run(`
      UPDATE tracked_comments
      SET dm_sent = 1, dm_sent_at = CURRENT_TIMESTAMP
      WHERE comment_id = ?
    `, commentId);
  },

  // DM logs
  addDmLog: async (accountId, recipientUsername, messageTemplate, status, errorMessage = null) => {
    const db = getDb();
    return db.run(`
      INSERT INTO dm_logs (account_id, recipient_username, message_template, status, error_message)
      VALUES (?, ?, ?, ?, ?)
    `, accountId, recipientUsername, messageTemplate, status, errorMessage);
  },

  updateDmLogStatus: async (id, status, errorMessage = null) => {
    const db = getDb();
    return db.run(`
      UPDATE dm_logs
      SET status = ?, error_message = ?, sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, status, errorMessage, id);
  },

  getRecentDmLogs: async (accountId, limit = 100) => {
    const db = getDb();
    return db.all(`
      SELECT * FROM dm_logs
      WHERE account_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, accountId, limit);
  },

  // Settings
  getSettings: async (accountId) => {
    const db = getDb();
    return db.get('SELECT * FROM settings WHERE account_id = ?', accountId);
  },

  createDefaultSettings: async (accountId) => {
    const db = getDb();
    return db.run(`
      INSERT INTO settings (account_id) VALUES (?)
    `, accountId);
  },

  updateSettings: async (accountId, settings) => {
    const db = getDb();
    const fields = [];
    const values = [];

    if (settings.automation_enabled !== undefined) {
      fields.push('automation_enabled = ?');
      values.push(settings.automation_enabled ? 1 : 0);
    }
    if (settings.dm_template !== undefined) {
      fields.push('dm_template = ?');
      values.push(settings.dm_template);
    }
    if (settings.max_dm_per_hour !== undefined) {
      fields.push('max_dm_per_hour = ?');
      values.push(settings.max_dm_per_hour);
    }
    if (settings.min_delay_seconds !== undefined) {
      fields.push('min_delay_seconds = ?');
      values.push(settings.min_delay_seconds);
    }
    if (settings.max_delay_seconds !== undefined) {
      fields.push('max_delay_seconds = ?');
      values.push(settings.max_delay_seconds);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(accountId);

    return db.run(`
      UPDATE settings SET ${fields.join(', ')} WHERE account_id = ?
    `, ...values);
  },

  // System logs
  addSystemLog: async (level, message, details = null) => {
    const db = getDb();
    return db.run(`
      INSERT INTO system_logs (level, message, details) VALUES (?, ?, ?)
    `, level, message, details);
  },

  getRecentSystemLogs: async (limit = 100) => {
    const db = getDb();
    return db.all(`
      SELECT * FROM system_logs ORDER BY created_at DESC LIMIT ?
    `, limit);
  },

  getAllTrackedComments: async (accountId, limit = 100) => {
    const db = getDb();
    return db.all(`
      SELECT * FROM tracked_comments
      WHERE account_id = ?
      ORDER BY detected_at DESC
      LIMIT ?
    `, accountId, limit);
  }
};
