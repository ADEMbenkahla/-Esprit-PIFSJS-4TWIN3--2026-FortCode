const mongoose = require('mongoose');
const Stage = require('../models/Stage');
const Challenge = require('../models/Challenge');

/**
 * Syncs challenges with a stage by updating the Stage.challenges array.
 * @param {string} stageId 
 * @param {Array} challengeIds 
 */
async function replaceStageChallenges(stageId, challengeIds) {
    const stage = await Stage.findById(stageId);
    if (!stage) throw new Error("Stage not found");

    // Validate if challengeIds are valid ObjectIds
    const validIds = challengeIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    stage.challenges = validIds.map(id => new mongoose.Types.ObjectId(id));
    await stage.save();
    return stage;
}

/**
 * Removes a challenge from a stage's listing.
 * @param {string} stageId 
 * @param {string} challengeId 
 */
async function detachChallengeFromStage(stageId, challengeId) {
    return await Stage.findByIdAndUpdate(stageId, {
        $pull: { challenges: new mongoose.Types.ObjectId(challengeId) }
    });
}

/**
 * Sets stageId to null for all challenges associated with a deleted stage.
 * @param {string} stageId 
 */
async function clearStageIdForDeletedStage(stageId) {
    return await Challenge.updateMany(
        { stageId: new mongoose.Types.ObjectId(stageId) },
        { $set: { stageId: null } }
    );
}

module.exports = {
    replaceStageChallenges,
    detachChallengeFromStage,
    clearStageIdForDeletedStage
};
