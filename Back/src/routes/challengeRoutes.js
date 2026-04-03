const express = require("express");
const router = express.Router();
const challengeController = require("../controllers/challengeController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const staff = [authMiddleware, roleMiddleware("admin", "recruiter")];

router.post("/", ...staff, challengeController.createChallenge);
router.get("/", ...staff, challengeController.getAllChallenges);
router.get("/:id", ...staff, challengeController.getChallengeById);
router.put("/:id", ...staff, challengeController.updateChallenge);
router.delete("/:id", ...staff, challengeController.deleteChallenge);

module.exports = router;
