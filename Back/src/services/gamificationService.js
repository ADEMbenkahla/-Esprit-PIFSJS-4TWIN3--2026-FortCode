const User = require("../models/User");

// Paliers de Ranked Rating (RR) selon Valorant
const RANK_THRESHOLDS = [
  { rank: "Radiant", xp: 100000 },
  { rank: "Immortal", xp: 50000 },
  { rank: "Ascendant", xp: 35000 },
  { rank: "Diamond", xp: 20000 },
  { rank: "Platinum", xp: 10000 },
  { rank: "Gold", xp: 5000 },
  { rank: "Silver", xp: 2500 },
  { rank: "Bronze", xp: 1000 },
  { rank: "Iron", xp: 0 }
];

/**
 * Calcule le rang actuel selon le Ranked Rating
 */
const calculateRank = (rankedRating) => {
  let currentRank = "Iron";
  let currentTierXP = 0;
  
  for (const threshold of RANK_THRESHOLDS) {
    if (rankedRating >= threshold.xp) {
      currentRank = threshold.rank;
      currentTierXP = threshold.xp;
      break;
    }
  }

  let nextRankXP = null;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
     if (RANK_THRESHOLDS[i].xp > rankedRating) {
         nextRankXP = RANK_THRESHOLDS[i].xp;
         break;
     }
  }

  let progressPercentage = 100;
  if (nextRankXP) {
      const xpNeededForThisRank = nextRankXP - currentTierXP;
      const xpGainedInThisRank = rankedRating - currentTierXP;
      progressPercentage = Math.floor((xpGainedInThisRank / xpNeededForThisRank) * 100);
      progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);
  }

  return { rank: currentRank, nextRankXP, progressPercentage };
};

/**
 * Fonction publique pour ajouter de l'XP à un utilisateur (Impacte le NIVEAU uniquement).
 */
exports.addXP = async (userId, xpAmount) => {
  let user = typeof userId === 'string' || userId instanceof Buffer || typeof userId === 'object' && !userId.save
    ? await User.findById(userId) 
    : userId;

  if (!user) throw new Error("Utilisateur introuvable pour la gamification.");

  if (!user.gamification) {
      user.gamification = { points: 0, rankedRating: 0, badges: [], level: 1, streak: 0, rank: "Iron" };
  }
  
  user.gamification.points += xpAmount;
  
  // 1 Niveau tous les 500 points (Cap maximum à 80)
  user.gamification.level = Math.floor(user.gamification.points / 500) + 1;
  if (user.gamification.level > 80) {
      user.gamification.level = 80;
      user.gamification.points = (80 - 1) * 500; // Plafond d'XP à 39500
  }
  
  await user.save();
  return { 
    points: user.gamification.points,
    level: user.gamification.level, 
    gainedXP: xpAmount 
  };
};

/**
 * Fonction publique pour ajouter/retirer du Ranked Rating (Impacte le RANK uniquement).
 */
exports.addRankedRating = async (userId, rrAmount) => {
  let user = typeof userId === 'string' || userId instanceof Buffer || typeof userId === 'object' && !userId.save
    ? await User.findById(userId) 
    : userId;

  if (!user) throw new Error("Utilisateur introuvable pour la gamification.");

  if (!user.gamification) {
      user.gamification = { points: 0, rankedRating: 0, badges: [], level: 1, streak: 0, rank: "Iron" };
  }
  
  // Ajouter le Ranked Rating (peut être négatif)
  user.gamification.rankedRating += rrAmount;
  if (user.gamification.rankedRating < 0) user.gamification.rankedRating = 0;
  
  const stats = calculateRank(user.gamification.rankedRating);
  
  user.gamification.rank = stats.rank;
  
  await user.save();
  return { 
    rankedRating: user.gamification.rankedRating,
    rank: stats.rank, 
    nextRankXP: stats.nextRankXP,
    progressPercentage: stats.progressPercentage,
    gainedRR: rrAmount 
  };
};

exports.RANK_THRESHOLDS = RANK_THRESHOLDS;
exports.calculateRank = calculateRank;
