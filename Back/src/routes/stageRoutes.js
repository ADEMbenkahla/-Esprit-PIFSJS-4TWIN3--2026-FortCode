const express = require("express");
const router = express.Router();
const { getStages, getStageById, updateProgress, resetAllProgress, resetStageProgress } = require("../controllers/stageController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, getStages);
router.post("/reset-progress", authMiddleware, resetAllProgress);
router.get("/:stageId", authMiddleware, getStageById);
router.post("/:stageId/reset", authMiddleware, resetStageProgress);
router.post("/:stageId/progress", authMiddleware, updateProgress);

module.exports = router;
