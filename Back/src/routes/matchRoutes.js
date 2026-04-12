const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/current", authMiddleware, matchController.getCurrentMatch);
router.get("/:id", authMiddleware, matchController.getMatchById);

module.exports = router;
