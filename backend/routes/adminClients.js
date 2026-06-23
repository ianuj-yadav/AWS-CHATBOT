// adminClients.js - simple stub returning dummy client list

const express = require('express');
const router = express.Router();

// Example client data
const clients = [
  { id: 1, name: 'Client A', email: 'a@example.com' },
  { id: 2, name: 'Client B', email: 'b@example.com' }
];

router.get('/', (req, res) => {
  res.json(clients);
});

module.exports = router;
