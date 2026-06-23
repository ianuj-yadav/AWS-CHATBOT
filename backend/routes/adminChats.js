const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_message TEXT,
        bot_response TEXT,
        ip_address TEXT,
        browser TEXT,
        os TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const chats = await db.all("SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT 50");
    console.log("Admin polling chat logs. Found:", chats.length);
    const formattedChats = chats.map(c => {
      let finalDate = c.created_at || new Date().toISOString();
      // SQLite sometimes returns "YYYY-MM-DD HH:MM:SS"
      if (finalDate.includes(' ') && !finalDate.includes('T')) {
        finalDate = finalDate.replace(' ', 'T') + 'Z';
      }
      return {
        ...c,
        created_at: finalDate
      };
    });
    res.json(formattedChats);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

module.exports = router;
