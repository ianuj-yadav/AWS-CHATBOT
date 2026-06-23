const { getDb } = require("../db/database");
const UAParser = require("ua-parser-js");

const checkQaCache = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return next();

    const db = await getDb();
    
    // FAST PATH: Exact text match in local SQLite DB first (0 latency)
    const exactMatch = await db.get(
      "SELECT * FROM qa_cache WHERE LOWER(question) = LOWER(?)",
      [message.trim()]
    );
    
    if (exactMatch) {
      console.log("Serving exact SQLite cache hit from middleware for:", message);
      
      const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || req.ip;
      const parser = new UAParser(req.headers["user-agent"]);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      
      res.setHeader('Content-Type', 'application/x-ndjson');
      const sources = exactMatch.sources ? JSON.parse(exactMatch.sources) : [];
      res.write(JSON.stringify({ type: 'sources', sources }) + '\n');
      res.write(JSON.stringify({ type: 'chunk', text: exactMatch.answer }) + '\n');
      res.end();

      // Log the chat
      const timestamp = new Date().toISOString();
      await db.run(
        `INSERT INTO chat_logs (user_message, bot_response, ip_address, browser, os, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [message.trim(), exactMatch.answer, ip, browser.name, os.name, timestamp]
      ).catch(err => console.error("Failed to log chat from middleware:", err));

      return;
    }

    next();
  } catch (error) {
    console.error("Middleware checkQaCache error:", error);
    next(); // Ensure the request continues even if cache check fails
  }
};

module.exports = { checkQaCache };
