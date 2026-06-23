// adminFaqs.js - simple stub for FAQ CRUD (in‑memory for demo)

const express = require('express');
const router = express.Router();

let faqs = [
  { id: 1, question: 'What is AWS Bedrock?', answer: 'A managed service for building generative AI apps.' },
  { id: 2, question: 'How to reset my password?', answer: 'Use the password reset link on the login page.' }
];

// List all FAQs
router.get('/', (req, res) => {
  res.json(faqs);
});

// Create a new FAQ
router.post('/', (req, res) => {
  const { question, answer } = req.body;
  const newFaq = { id: Date.now(), question, answer };
  faqs.push(newFaq);
  res.status(201).json(newFaq);
});

// Update an existing FAQ
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body;
  const faq = faqs.find(f => f.id === Number(id));
  if (!faq) return res.status(404).json({ error: 'FAQ not found' });
  faq.question = question;
  faq.answer = answer;
  res.json(faq);
});

// Delete a FAQ
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = faqs.findIndex(f => f.id === Number(id));
  if (index === -1) return res.status(404).json({ error: 'FAQ not found' });
  faqs.splice(index, 1);
  res.status(204).end();
});

module.exports = router;
