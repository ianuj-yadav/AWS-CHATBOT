// adminUsers.js - simple stub returning dummy user list

const express = require('express');
const router = express.Router();

// Example user data
const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' }
];

router.get('/', (req, res) => {
  res.json(users);
});

module.exports = router;
