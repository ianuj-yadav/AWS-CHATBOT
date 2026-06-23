const express = require("express");
const router = express.Router();
const { getDb } = require("../db/database");
const { getSemanticTable } = require("../db/lancedb");

router.delete("/clear", async (req, res) => {
  try {
    const { clearFaqs, clearChats } = req.body;
    
    if (!clearFaqs && !clearChats) {
      return res.status(400).json({ error: "Must select at least one database to clear." });
    }

    const db = await getDb();
    let message = "Successfully cleared:";

    if (clearChats) {
      await db.run("DELETE FROM chat_logs");
      await db.run("DELETE FROM sqlite_sequence WHERE name='chat_logs'").catch(() => {});
      message += " Chat History,";
    }

    if (clearFaqs) {
      await db.run("DELETE FROM qa_cache");
      await db.run("DELETE FROM sqlite_sequence WHERE name='qa_cache'").catch(() => {});
      
      try {
        const table = await getSemanticTable();
        await table.delete("id >= 0"); // LanceDB requires a condition
      } catch (lanceErr) {
        console.error("LanceDB wipe error:", lanceErr);
      }
      
      message += " FAQs Database";
    }

    res.json({ message: message.replace(/,$/, '') });
  } catch (error) {
    console.error("Error clearing database:", error);
    res.status(500).json({ error: "Failed to clear database" });
  }
});

module.exports = router;
