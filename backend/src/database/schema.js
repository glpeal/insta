/**
 * Database schema for Instagram DM Panel
 * Using SQLite for MVP with easy migration path to PostgreSQL
 */

export const createTables = (db) => {
  // Instagram accounts table
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS instagram_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      encrypted_cookies TEXT,
      is_active INTEGER DEFAULT 1,
      last_login_at DATETIME,
      session_valid INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Comments tracking table
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      comment_id TEXT UNIQUE NOT NULL,
      post_url TEXT NOT NULL,
      commenter_username TEXT NOT NULL,
      comment_text TEXT,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      dm_sent INTEGER DEFAULT 0,
      dm_sent_at DATETIME,
      FOREIGN KEY (account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE
    )
  `);

  // DM logs table
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS dm_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      recipient_username TEXT NOT NULL,
      message_template TEXT NOT NULL,
      status TEXT NOT NULL, -- 'pending', 'sent', 'failed', 'retry'
      error_message TEXT,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE
    )
  `);

  // Settings table
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      automation_enabled INTEGER DEFAULT 1,
      dm_template TEXT DEFAULT 'Привет! Спасибо за комментарий!',
      max_dm_per_hour INTEGER DEFAULT 30,
      min_delay_seconds INTEGER DEFAULT 10,
      max_delay_seconds INTEGER DEFAULT 90,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES instagram_accounts(id) ON DELETE CASCADE
    )
  `);

  // System logs table
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL, -- 'info', 'warning', 'error'
      message TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  db.db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tracked_comments_account
    ON tracked_comments(account_id);

    CREATE INDEX IF NOT EXISTS idx_tracked_comments_commenter
    ON tracked_comments(commenter_username);

    CREATE INDEX IF NOT EXISTS idx_dm_logs_account
    ON dm_logs(account_id);

    CREATE INDEX IF NOT EXISTS idx_dm_logs_status
    ON dm_logs(status);

    CREATE INDEX IF NOT EXISTS idx_dm_logs_created
    ON dm_logs(created_at);
  `);

  console.log('✅ Database tables created successfully');
};
