const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const stage = require("../controllers/stageController");

const adminOnly = [authMiddleware, roleMiddleware("admin")];
const participant = [authMiddleware, roleMiddleware("participant", "recruiter", "admin")];

router.post("/reset-progress", ...participant, stage.resetAllProgress);
router.get("/me", ...participant, stage.getMyStages);

router.get("/", ...adminOnly, stage.adminListStages);
router.post("/", ...adminOnly, stage.createStage);
router.put("/:id", ...adminOnly, stage.updateStage);
router.delete("/:id", ...adminOnly, stage.deleteStage);
router.post("/:id/challenges", ...adminOnly, stage.assignChallengesToStage);
router.delete("/:id/challenges/:challengeId", ...adminOnly, stage.removeChallengeFromStage);

router.post("/:id/challenges/:challengeId/run", ...participant, stage.runChallenge);
router.post("/:id/challenges/:challengeId/submit", ...participant, stage.submitChallenge);
router.post("/:id/challenges/:challengeId/complete", ...participant, stage.completeChallenge);
router.post("/:id/reset", ...participant, stage.resetStageProgress);

router.get("/:id", authMiddleware, stage.getStageDetail);

module.exports = router;
