require("dotenv").config();
const express = require("express");
const cors = require("cors");
const chatRoutes = require("./routes/chat");
const qaRoutes = require("./routes/qa");

// Admin token removed as we exclusively use JWT now

const { verifyToken } = require('./middleware/auth');
const { getDb } = require('./db/database');
const { initCache } = require('./services/cacheService');
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0", // Replace with real DSN
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

Sentry.setupExpressErrorHandler(app);

// Connect to DB and Redis
getDb().catch((err) => logger.error("DB Error:", err));
initCache();

app.set("trust proxy", 1);

// Global Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global Rate Limiter (100 req per 15 min)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(globalLimiter);

// API Routes
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/admin/clients', verifyToken, require('./routes/adminClients'));
app.use('/admin/users', verifyToken, require('./routes/adminUsers'));
app.use('/admin/faqs', verifyToken, require('./routes/adminFaqs'));
app.use('/admin/suggestions', verifyToken, require('./routes/adminSuggestions'));
app.use('/admin/chats', verifyToken, require('./routes/adminChats'));
app.use('/admin/database', verifyToken, require('./routes/adminDatabase'));

// API Routes
app.use("/chat", chatRoutes);
app.use("/api/qa", qaRoutes);


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
