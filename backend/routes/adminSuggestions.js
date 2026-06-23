// adminSuggestions.js - simple stub for suggestions CRUD (in‑memory demo)

const express = require('express');
const router = express.Router();

let suggestions = [
  { id: 1, user: 'Alice', text: 'Add more example prompts.' },
  { id: 2, user: 'Bob', text: 'Support multi‑language.' }
];

// List all suggestions
router.get('/', (req, res) => {
  res.json(suggestions);
});

// Create a new suggestion
router.post('/', (req, res) => {
  const { user, text } = req.body;
  const newSuggestion = { id: Date.now(), user, text };
  suggestions.push(newSuggestion);
  res.status(201).json(newSuggestion);
});

module.exports = router;
