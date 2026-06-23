const { embedText, streamResponse } = require("../services/bedrockService");
const { getDb } = require("../db/database");
const { getSemanticTable } = require("../db/lancedb");

const UAParser = require("ua-parser-js");

const logChat = async (userMessage, botResponse, ipAddress, browserName, osName) => {
  try {
    const db = await getDb();
    const timestamp = new Date().toISOString();
    await db.run(
      `INSERT INTO chat_logs (user_message, bot_response, ip_address, browser, os, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userMessage, botResponse, ipAddress, browserName, osName, timestamp]
    );
  } catch (err) {
    console.error("Failed to log chat:", err);
  }
};

const handleChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    
    // Extract metadata
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || req.ip;
    const parser = new UAParser(req.headers["user-agent"]);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    console.log("User IP:", ip);

    // TRUE RAG PATH: Retrieve context from Vector DB
    const [vector, table] = await Promise.all([
      embedText(message),
      getSemanticTable()
    ]);
    
    const rowCount = await table.countRows();
    let validMatches = [];
    
    if (rowCount > 0) {
      // Retrieve top 5 FAQs
      const results = await table.search(vector).limit(5).execute();
      const ragThreshold = parseFloat(process.env.RAG_THRESHOLD || "0.30");
      // Filter matches
      validMatches = results.filter(r => r._distance < ragThreshold);
    } else {
      console.log("RAG: LanceDB is empty, skipping vector search.");
    }
    
    res.setHeader('Content-Type', 'application/x-ndjson');
    
    // Build context
    let contextDocs = "";
    let retrievedSources = [];
    
    if (validMatches.length > 0) {
      console.log(`RAG: Found ${validMatches.length} valid contexts for:`, message);
      contextDocs = validMatches.map((match, i) => 
        `[FAQ ${i+1}]\nQuestion: ${match.question}\nAnswer: ${match.answer}`
      ).join("\n\n");
      
      // Combine unique sources
      validMatches.forEach(match => {
        if (match.sources) {
          try {
            const parsed = JSON.parse(match.sources);
            parsed.forEach(p => {
              if (!retrievedSources.some(s => s.name === p.name)) {
                retrievedSources.push(p);
              }
            });
          } catch(e) {}
        }
      });
    } else {
      console.log("RAG: No valid context found. Distance was too high.");
    }

    console.log("Streaming from Bedrock...");
    await streamResponse(message, history, contextDocs, retrievedSources, res, async (answer, finalSources) => {
      await logChat(message, answer, ip, browser.name, os.name);
    });

  } catch (error) {
    console.log("AWS Bedrock failed or offline, using Local Fallback Strategies...");
    
    try {
      const db = await getDb();
      const lowerMsg = (req.body.message || "").toLowerCase();
      const originalMessage = req.body.message || "";
      
      let answer = null;
      let sources = [];

      // STRATEGY 3: Regex Intent Recognition
      if (/\b(cost|price|pricing|pay|dollars|plan)\b/.test(lowerMsg)) {
        answer = "Our pricing plans include:\n\n* **Starter** — $29/month\n* **Professional** — $99/month\n* **Enterprise** — Custom pricing\n\nAll plans include access to the knowledge base.";
        sources = [{ name: "PricingGuide.pdf", type: "pdf" }];
      } else if (/\b(reset|forgot|password|credentials)\b/.test(lowerMsg)) {
        answer = "To reset your password, click the **Forgot Password** link on the login page. You'll receive a verification email within 2 minutes.";
        sources = [{ name: "UserGuide.pdf", type: "pdf" }];
      } else if (/\b(login|sign in|auth|register)\b/.test(lowerMsg)) {
        answer = "You can login or register by clicking the 'Login' button at the top right of the homepage.";
        sources = [];
      } else if (/\b(bedrock|aws|llm|ai)\b/.test(lowerMsg)) {
        answer = "Amazon Bedrock is a fully managed service that makes foundation models available through a single API. It supports Anthropic, Meta, and more.";
        sources = [{ name: "AWSBedrock_Overview.pdf", type: "pdf" }];
      } else {
        // STRATEGY 1: Fuzzy Keyword Search in SQLite
        const words = lowerMsg.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
        if (words.length > 0) {
          const conditions = words.map(() => "LOWER(question) LIKE ?").join(" OR ");
          const params = words.map(w => `%${w}%`);
          
          const fuzzyMatch = await db.get(`SELECT * FROM qa_cache WHERE ${conditions} LIMIT 1`, params);
          if (fuzzyMatch) {
            console.log("Fallback: Fuzzy match found for:", fuzzyMatch.question);
            answer = fuzzyMatch.answer;
            sources = fuzzyMatch.sources ? JSON.parse(fuzzyMatch.sources) : [];
          }
        }
      }

      // Default Fallback if nothing matched
      if (!answer) {
        answer = "Sorry, I can't help you at the current time. Please try again later.";
      }

      // Stream the fallback text to look like AI typing
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.write(JSON.stringify({ type: 'sources', sources }) + '\n');
      
      const words = answer.split(" ");
      for (const word of words) {
        res.write(JSON.stringify({ type: 'chunk', text: word + " " }) + '\n');
        await new Promise(r => setTimeout(r, 10)); // small delay for smooth streaming
      }
      res.end();
      
      // Log the fallback interaction
      const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || req.ip;
      const parser = new UAParser(req.headers["user-agent"]);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      await logChat(originalMessage, answer, ip, browser.name, os.name);
      
    } catch (fallbackError) {
      console.error("Fallback Error:", fallbackError);
      res.status(500).json({ error: "Failed to generate response even in fallback mode.", details: fallbackError.message, stack: fallbackError.stack });
    }
  }
};

module.exports = {
  handleChat,
};
