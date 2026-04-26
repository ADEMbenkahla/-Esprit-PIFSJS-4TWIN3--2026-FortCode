const mongoose = require("mongoose");
const Stage = require("../models/Stage");
const Challenge = require("../models/Challenge");

/**
 * Assign a Stage-type challenge to a stage (removes it from any other stage list first).
 */
async function attachChallengeToStage(stageId, challengeId) {
  const sid = new mongoose.Types.ObjectId(String(stageId));
  const cid = new mongoose.Types.ObjectId(String(challengeId));
  const ch = await Challenge.findById(cid);
  if (!ch) {
    const e = new Error("Challenge not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  if (ch.type === "Battle") {
    const e = new Error("Battle challenges cannot belong to a training stage");
    e.code = "BATTLE_NOT_ALLOWED";
    throw e;
  }
  if (ch.stageId && !ch.stageId.equals(sid)) {
    await Stage.updateOne({ _id: ch.stageId }, { $pull: { challenges: cid } });
  }
  ch.stageId = sid;
  await ch.save();
  return ch;
}

/**
 * Remove a challenge from a stage (pool: stageId = null). Only clears if it was linked to this stage.
 */
async function detachChallengeFromStage(stageId, challengeId) {
  const sid = new mongoose.Types.ObjectId(String(stageId));
  const cid = new mongoose.Types.ObjectId(String(challengeId));
  await Challenge.updateOne({ _id: cid, stageId: sid, type: "Stage" }, { $set: { stageId: null } });
}

/**
 * Move challenge to another stage or to the pool (null). Updates Stage.challenges lists.
 */
async function moveChallengeToStage(challengeId, targetStageIdOrNull) {
  const cid = new mongoose.Types.ObjectId(String(challengeId));
  const ch = await Challenge.findById(cid);
  if (!ch) {
    const e = new Error("Challenge not found");
    e.code = "NOT_FOUND";
    throw e;
  }

  if (ch.type === "Battle" && targetStageIdOrNull) {
    const e = new Error("Battle challenges cannot be attached to a stage");
    e.code = "BATTLE_NOT_ALLOWED";
    throw e;
  }

  const oldSid = ch.stageId;
  const newSid = targetStageIdOrNull ? new mongoose.Types.ObjectId(String(targetStageIdOrNull)) : null;

  if (oldSid && (!newSid || !oldSid.equals(newSid))) {
    await Stage.updateOne({ _id: oldSid }, { $pull: { challenges: cid } });
  }

  if (!newSid) {
    ch.stageId = null;
    await ch.save();
    return ch;
  }

  const st = await Stage.findById(newSid);
  if (!st) {
    const e = new Error("Stage not found");
    e.code = "NOT_FOUND";
    throw e;
  }

  ch.stageId = newSid;
  await ch.save();
  if (!st.challenges.some((x) => x.equals(cid))) {
    st.challenges.push(cid);
  }
  await st.save();
  return ch;
}

/**
 * Replace ordered challenge list on a stage and sync Challenge.stageId (training challenges only).
 */
async function replaceStageChallenges(stageId, orderedChallengeIds) {
  const sid = new mongoose.Types.ObjectId(String(stageId));
  const newIds = orderedChallengeIds.map((x) => new mongoose.Types.ObjectId(String(x)));

  if (new Set(newIds.map(String)).size !== newIds.length) {
    const e = new Error("Duplicate challenge IDs in list");
    e.code = "DUPLICATE_IDS";
    throw e;
  }

  const found = await Challenge.find({ _id: { $in: newIds } });
  if (found.length !== newIds.length) {
    const e = new Error("One or more challenge IDs are invalid");
    e.code = "BAD_IDS";
    throw e;
  }
  if (found.some((c) => c.type === "Battle")) {
    const e = new Error("Cannot assign Battle-type challenges to a training stage");
    e.code = "BATTLE_NOT_ALLOWED";
    throw e;
  }

  const stage = await Stage.findById(sid);
  if (!stage) {
    const e = new Error("Stage not found");
    e.code = "NOT_FOUND";
    throw e;
  }

  const prev = (stage.challenges || []).map((id) => id.toString());
  const next = newIds.map((id) => id.toString());

  for (const p of prev) {
    if (!next.includes(p)) {
      await detachChallengeFromStage(sid, p);
    }
  }

  for (const nid of newIds) {
    await attachChallengeToStage(sid, nid);
  }

  stage.challenges = newIds;
  await stage.save();
  return stage;
}

/** When a stage is deleted: orphan its training challenges (stay in DB, pool). */
async function clearStageIdForDeletedStage(stageId) {
  const sid = new mongoose.Types.ObjectId(String(stageId));
  await Challenge.updateMany({ stageId: sid, type: "Stage" }, { $set: { stageId: null } });
}

module.exports = {
  attachChallengeToStage,
  detachChallengeFromStage,
  moveChallengeToStage,
  replaceStageChallenges,
  clearStageIdForDeletedStage,
};
