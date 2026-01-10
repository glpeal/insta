import Database from 'better-sqlite3';
import { config } from '../config/config.js';
import { createTables } from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export const initDatabase = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.resolve(config.database.path);
  console.log(`📁 Initializing database at: ${dbPath}`);

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

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
  getAccount: (username) => {
    const db = getDb();
    return db.prepare('SELECT * FROM instagram_accounts WHERE username = ?').get(username);
  },

  createAccount: (username) => {
    const db = getDb();
    return db.prepare('INSERT INTO instagram_accounts (username) VALUES (?)').run(username);
  },

  updateAccountCookies: (username, encryptedCookies) => {
    const db = getDb();
    return db.prepare(`
      UPDATE instagram_accounts
      SET encrypted_cookies = ?, session_valid = 1, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE username = ?
    `).run(encryptedCookies, username);
  },

  // Comments
  addTrackedComment: (accountId, commentId, postUrl, commenterUsername, commentText) => {
    const db = getDb();
    try {
      return db.prepare(`
        INSERT INTO tracked_comments (account_id, comment_id, post_url, commenter_username, comment_text)
        VALUES (?, ?, ?, ?, ?)
      `).run(accountId, commentId, postUrl, commenterUsername, commentText);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return null; // Comment already tracked
      }
      throw error;
    }
  },

  getUnprocessedComments: (accountId) => {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM tracked_comments
      WHERE account_id = ? AND dm_sent = 0
      ORDER BY detected_at ASC
    `).all(accountId);
  },

  markCommentProcessed: (commentId) => {
    const db = getDb();
    return db.prepare(`
      UPDATE tracked_comments
      SET dm_sent = 1, dm_sent_at = CURRENT_TIMESTAMP
      WHERE comment_id = ?
    `).run(commentId);
  },

  // DM logs
  addDmLog: (accountId, recipientUsername, messageTemplate, status, errorMessage = null) => {
    const db = getDb();
    return db.prepare(`
      INSERT INTO dm_logs (account_id, recipient_username, message_template, status, error_message)
      VALUES (?, ?, ?, ?, ?)
    `).run(accountId, recipientUsername, messageTemplate, status, errorMessage);
  },

  updateDmLogStatus: (id, status, errorMessage = null) => {
    const db = getDb();
    return db.prepare(`
      UPDATE dm_logs
      SET status = ?, error_message = ?, sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, errorMessage, id);
  },

  getRecentDmLogs: (accountId, limit = 100) => {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM dm_logs
      WHERE account_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(accountId, limit);
  },

  // Settings
  getSettings: (accountId) => {
    const db = getDb();
    return db.prepare('SELECT * FROM settings WHERE account_id = ?').get(accountId);
  },

  createDefaultSettings: (accountId) => {
    const db = getDb();
    return db.prepare(`
      INSERT INTO settings (account_id) VALUES (?)
    `).run(accountId);
  },

  updateSettings: (accountId, settings) => {
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

    return db.prepare(`
      UPDATE settings SET ${fields.join(', ')} WHERE account_id = ?
    `).run(...values);
  },

  // System logs
  addSystemLog: (level, message, details = null) => {
    const db = getDb();
    return db.prepare(`
      INSERT INTO system_logs (level, message, details) VALUES (?, ?, ?)
    `).run(level, message, details);
  },

  getRecentSystemLogs: (limit = 100) => {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM system_logs ORDER BY created_at DESC LIMIT ?
    `).all(limit);
  }
};
