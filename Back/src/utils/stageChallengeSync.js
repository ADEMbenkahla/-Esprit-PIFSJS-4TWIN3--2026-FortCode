const Stage = require("../models/Stage");
const Challenge = require("../models/Challenge");

/**
 * Replaces the challenges assigned to a stage.
 * Ensures the bidirectional relationship is maintained.
 */
exports.replaceStageChallenges = async (stageId, challengeIds) => {
  const stage = await Stage.findById(stageId);
  if (!stage) {
    const err = new Error("Stage not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // 1. Clear stageId for challenges currently pointing to this stage
  await Challenge.updateMany({ stageId }, { $set: { stageId: null } });

  // 2. Set stageId for the new set of challenges
  await Challenge.updateMany(
    { _id: { $in: challengeIds } },
    { $set: { stageId: stageId, type: "Stage" } }
  );

  // 3. Update the Stage's challenges array
  stage.challenges = challengeIds;
  await stage.save();

  return stage;
};

/**
 * Detaches a specific challenge from a stage.
 */
exports.detachChallengeFromStage = async (stageId, challengeId) => {
  await Challenge.updateOne(
    { _id: challengeId, stageId: stageId },
    { $set: { stageId: null } }
  );
};

/**
 * Clears the stageId for all challenges associated with a deleted stage.
 */
exports.clearStageIdForDeletedStage = async (stageId) => {
  await Challenge.updateMany({ stageId }, { $set: { stageId: null } });
};
