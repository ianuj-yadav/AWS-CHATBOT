const express = require("express");
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { handleChat } = require("../controllers/chatController");
const { checkQaCache } = require("../middleware/cacheMiddleware");

const router = express.Router();

// Strict Limiter for LLM Endpoint (20 req per 15 min) to prevent cost overruns
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'LLM Rate limit exceeded. Please try again later.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post("/", chatLimiter, [
  body('message').isString().trim().notEmpty().isLength({ max: 2000 }).withMessage("Message must be a string under 2000 characters."),
  body('history').optional().isArray()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}, checkQaCache, handleChat);

module.exports = router;
