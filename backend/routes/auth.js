const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT secret missing");
}
const JWT_SECRET = process.env.JWT_SECRET;
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_USERNAME or ADMIN_PASSWORD missing");
}
const ADMIN_USER = process.env.ADMIN_USERNAME;
const ADMIN_PASS = process.env.ADMIN_PASSWORD;

const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Strict Rate Limiter for Auth (5 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/login', authLimiter, [
  body('username').isString().trim().notEmpty(),
  body('password').isString().notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input format' });
  }

  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

module.exports = router;
