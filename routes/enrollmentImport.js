const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Placeholder enrollment import routes (admin only)
// Implement actual import logic here when ready.
router.get("/", authMiddleware, (req, res) => {
  res.json({ message: "Enrollment import endpoint not yet implemented" });
});

module.exports = router;


