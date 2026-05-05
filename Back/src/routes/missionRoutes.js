const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const missionController = require("../controllers/missionController");

const participant = [authMiddleware, roleMiddleware("participant", "recruiter", "admin")];

router.get("/me", authMiddleware, missionController.getMyMissions);
router.get("/:id", authMiddleware, missionController.getMissionById);
router.post("/:missionId/challenges/:challengeId/submit", ...participant, missionController.submitMissionChallenge);

module.exports = router;
