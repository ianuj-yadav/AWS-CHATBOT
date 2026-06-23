const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const path = require("path");

let dbPromise;

const initDb = async () => {
  if (!dbPromise) {
    dbPromise = open({
      filename: path.join(__dirname, "chatbot.sqlite"),
      driver: sqlite3.Database,
    }).then(async (db) => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS qa_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT UNIQUE NOT NULL,
          answer TEXT NOT NULL,
          sources TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          sources TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_message TEXT,
          bot_response TEXT,
          ip_address TEXT,
          browser TEXT,
          os TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          user_id INTEGER,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Performance Indexes
        CREATE INDEX IF NOT EXISTS idx_qa_cache_question ON qa_cache(question);
        CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      `);
      return db;
    });
  }
  return dbPromise;
};

const getDb = async () => {
  return await initDb();
};

module.exports = { getDb };
