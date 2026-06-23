const express = require("express");
const { getAllQA, createQA, updateQA, deleteQA } = require("../controllers/qaController");

const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", verifyToken, getAllQA);
router.post("/", verifyToken, createQA);
router.put("/:id", verifyToken, updateQA);
router.delete("/:id", verifyToken, deleteQA);

module.exports = router;
