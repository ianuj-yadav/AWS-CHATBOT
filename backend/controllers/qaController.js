const { getDb } = require("../db/database");
const { embedText } = require("../services/bedrockService");
const { getSemanticTable } = require("../db/lancedb");

const getAllQA = async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT * FROM qa_cache ORDER BY created_at DESC");
    
    // Parse sources back into JSON for the frontend
    const parsedRows = rows.map(row => ({
      ...row,
      sources: row.sources ? JSON.parse(row.sources) : []
    }));

    res.json(parsedRows);
  } catch (error) {
    console.error("Error fetching QA cache:", error);
    res.status(500).json({ error: "Failed to fetch QA records" });
  }
};

const createQA = async (req, res) => {
  try {
    const { question, answer, sources } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: "Question and Answer are required" });
    }

    const db = await getDb();
    const sourcesStr = sources ? JSON.stringify(sources) : "[]";

    try {
      const result = await db.run(
        "INSERT INTO qa_cache (question, answer, sources) VALUES (?, ?, ?)",
        [question, answer, sourcesStr]
      );
      
      let embeddingWarning = null;
      try {
        const vector = await embedText(question);
        const table = await getSemanticTable();
        await table.add([{ id: result.lastID, question, answer, sources: sourcesStr, vector }]);
      } catch (lanceErr) {
        console.error("LanceDB Insert Error:", lanceErr);
        embeddingWarning = "FAQ saved locally, but AI embedding failed due to AWS configuration or API limits. AI will not be able to use this FAQ.";
      }

      if (embeddingWarning) {
        res.status(207).json({ message: "QA record created successfully", warning: embeddingWarning });
      } else {
        res.status(201).json({ message: "QA record created successfully" });
      }
    } catch (dbError) {
      // If constraint error, it means question already exists
      if (dbError.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ error: "This question already exists in the cache. Please edit the existing one." });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error creating QA cache:", error);
    res.status(500).json({ error: "Failed to create QA record" });
  }
};

const updateQA = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, sources } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: "Question and Answer are required" });
    }

    const db = await getDb();
    const sourcesStr = sources ? JSON.stringify(sources) : "[]";

    const result = await db.run(
      "UPDATE qa_cache SET question = ?, answer = ?, sources = ? WHERE id = ?",
      [question, answer, sourcesStr, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "QA record not found" });
    }

    let embeddingWarning = null;
    try {
      const vector = await embedText(question);
      const table = await getSemanticTable();
      await table.delete(`id = ${id}`);
      await table.add([{ id: parseInt(id), question, answer, sources: sourcesStr, vector }]);
    } catch (lanceErr) {
      console.error("LanceDB Update Error:", lanceErr);
      embeddingWarning = "FAQ saved locally, but AI embedding failed due to AWS configuration or API limits. AI will not be able to use this FAQ.";
    }

    if (embeddingWarning) {
      res.status(207).json({ message: "QA record updated successfully", warning: embeddingWarning });
    } else {
      res.json({ message: "QA record updated successfully" });
    }
  } catch (error) {
    console.error("Error updating QA cache:", error);
    res.status(500).json({ error: "Failed to update QA record" });
  }
};

const deleteQA = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    const result = await db.run("DELETE FROM qa_cache WHERE id = ?", [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "QA record not found" });
    }

    // If the table is empty after this deletion, reset the AUTOINCREMENT sequence to 1
    const countRow = await db.get("SELECT COUNT(*) as count FROM qa_cache");
    if (countRow && countRow.count === 0) {
      await db.run("DELETE FROM sqlite_sequence WHERE name='qa_cache'").catch(() => {});
    }

    try {
      const table = await getSemanticTable();
      await table.delete(`id = ${id}`);
    } catch (lanceErr) {
      console.error("LanceDB Delete Error:", lanceErr);
    }

    res.json({ message: "QA record deleted successfully" });
  } catch (error) {
    console.error("Error deleting QA record:", error);
    res.status(500).json({ error: "Failed to delete QA record" });
  }
};

module.exports = {
  getAllQA,
  createQA,
  updateQA,
  deleteQA
};
