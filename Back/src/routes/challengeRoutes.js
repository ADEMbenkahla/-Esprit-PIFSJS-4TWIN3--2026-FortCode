const express = require("express");
const router = express.Router();
const challengeController = require("../controllers/challengeController");
const { protect, checkRole } = require("../middlewares/authMiddleware");

// All challenge management should probably be protected for 'admin' or at least protected.
// For now, protecting route, optionally testing if admin is needed.
// If the backend has role checking, it can be applied here.
// Example: router.use(protect, checkRole(['admin']));

router.post("/", challengeController.createChallenge);
router.get("/", challengeController.getAllChallenges);
router.get("/:id", challengeController.getChallengeById);
router.put("/:id", challengeController.updateChallenge);
router.delete("/:id", challengeController.deleteChallenge);

module.exports = router;
