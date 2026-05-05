process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const gamificationService = require('../../src/services/gamificationService');

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Gamification Service - Tests Complets', () => {
  let testUser;
  let testUserId;

  beforeEach(async () => {
    await User.deleteMany({});

    testUser = await User.create({
      username: `gametest_${Date.now()}`,
      email: `gametest_${Date.now()}@test.com`,
      password: await bcrypt.hash('Test123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true,
      gamification: {
        points: 0,
        rankedRating: 0,
        badges: [],
        level: 1,
        streak: 0,
        rank: 'Iron'
      }
    });
    testUserId = testUser._id;
  });

  // ==================== TESTS addXP ====================
  describe('addXP - Ajout de points d\'expérience', () => {
    
    test('1. addXP - ajout de XP avec succès', async () => {
      const result = await gamificationService.addXP(testUserId, 500);
      
      expect(result).toBeDefined();
      expect(result.gainedXP).toBe(500);
      expect(result.points).toBe(500);
      expect(result.level).toBe(2); // 500 pts = niveau 2
      expect(result.levelUp).toBe(true);
    });

    test('2. addXP - ajout de XP sans level up', async () => {
      const result = await gamificationService.addXP(testUserId, 200);
      
      expect(result.gainedXP).toBe(200);
      expect(result.points).toBe(200);
      expect(result.level).toBe(1); // Niveau 1 car < 500
      expect(result.levelUp).toBe(false);
    });

    test('3. addXP - ajout de XP à un utilisateur avec objet utilisateur', async () => {
      const result = await gamificationService.addXP(testUser, 100);
      
      expect(result).toBeDefined();
      expect(result.gainedXP).toBe(100);
    });

    test('4. addXP - niveau maximum (level 80)', async () => {
      // Ajouter assez de XP pour atteindre niveau 80
      for (let i = 0; i < 79; i++) {
        await gamificationService.addXP(testUserId, 500);
      }
      
      const result = await gamificationService.addXP(testUserId, 500);
      
      expect(result.level).toBe(80);
      // Le plafond d'XP devrait être (80-1)*500 = 39500
      expect(result.points).toBeLessThanOrEqual(39500);
    });

    test('5. addXP - utilisateur sans gamification', async () => {
      // Créer un utilisateur sans objet gamification
      const newUser = await User.create({
        username: `nogame_${Date.now()}`,
        email: `nogame_${Date.now()}@test.com`,
        password: await bcrypt.hash('Test123!', 10),
        role: 'participant'
      });
      
      const result = await gamificationService.addXP(newUser._id, 300);
      
      expect(result).toBeDefined();
      expect(result.points).toBe(300);
      expect(result.level).toBe(1);
    });

    test('6. addXP - utilisateur non trouvé', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(gamificationService.addXP(fakeId, 100))
        .rejects.toThrow('Utilisateur introuvable pour la gamification.');
    });
  });

  // ==================== TESTS spendXP ====================
  describe('spendXP - Dépense de points d\'expérience', () => {
    
    test('7. spendXP - dépense avec succès', async () => {
      // D'abord ajouter des XP
      await gamificationService.addXP(testUserId, 1000);
      
      const result = await gamificationService.spendXP(testUserId, 200);
      
      expect(result).toBeDefined();
      expect(result.spentXP).toBe(200);
      expect(result.points).toBe(800);
      expect(result.level).toBe(2);
    });

    test('8. spendXP - XP insuffisant', async () => {
      await gamificationService.addXP(testUserId, 100);
      
      await expect(gamificationService.spendXP(testUserId, 200))
        .rejects.toThrow('Not enough XP');
    });

    test('9. spendXP - avec objet utilisateur', async () => {
      await gamificationService.addXP(testUser, 500);
      
      const result = await gamificationService.spendXP(testUser, 100);
      
      expect(result.spentXP).toBe(100);
      expect(result.points).toBe(400);
    });

    test('10. spendXP - coût à 0', async () => {
      const result = await gamificationService.spendXP(testUserId, 0);
      
      expect(result.spentXP).toBe(0);
    });

    test('11. spendXP - utilisateur sans gamification', async () => {
      const newUser = await User.create({
        username: `nospend_${Date.now()}`,
        email: `nospend_${Date.now()}@test.com`,
        password: await bcrypt.hash('Test123!', 10),
        role: 'participant'
      });
      
      await expect(gamificationService.spendXP(newUser._id, 100))
        .rejects.toThrow('Not enough XP');
    });

    test('12. spendXP - utilisateur non trouvé', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(gamificationService.spendXP(fakeId, 100))
        .rejects.toThrow('Utilisateur introuvable pour la gamification.');
    });
  });

  // ==================== TESTS addRankedRating ====================
  describe('addRankedRating - Ajout de points de classement', () => {
    
    test('13. addRankedRating - ajout de RR avec succès', async () => {
      const result = await gamificationService.addRankedRating(testUserId, 500);
      
      expect(result).toBeDefined();
      expect(result.gainedRR).toBe(500);
      expect(result.rankedRating).toBe(500);
      expect(result.rank).toBe('Iron');
    });

    test('14. addRankedRating - atteindre Bronze (1000 RR)', async () => {
      await gamificationService.addRankedRating(testUserId, 1000);
      
      const result = await gamificationService.addRankedRating(testUserId, 100);
      
      expect(result.rankedRating).toBe(1100);
      expect(result.rank).toBe('Bronze');
      expect(result.nextRankXP).toBe(2500);
      expect(result.progressPercentage).toBeLessThan(100);
    });

    test('15. addRankedRating - atteindre Silver (2500 RR)', async () => {
      await gamificationService.addRankedRating(testUserId, 2500);
      
      const result = await gamificationService.addRankedRating(testUserId, 100);
      
      expect(result.rankedRating).toBe(2600);
      expect(result.rank).toBe('Silver');
    });

    test('16. addRankedRating - RR négatif (ne descend pas en dessous de 0)', async () => {
      await gamificationService.addRankedRating(testUserId, 100);
      
      const result = await gamificationService.addRankedRating(testUserId, -200);
      
      expect(result.rankedRating).toBe(0);
    });

    test('17. addRankedRating - utilisateur sans gamification', async () => {
      const newUser = await User.create({
        username: `norank_${Date.now()}`,
        email: `norank_${Date.now()}@test.com`,
        password: await bcrypt.hash('Test123!', 10),
        role: 'participant'
      });
      
      const result = await gamificationService.addRankedRating(newUser._id, 500);
      
      expect(result.rankedRating).toBe(500);
    });

    test('18. addRankedRating - utilisateur non trouvé', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(gamificationService.addRankedRating(fakeId, 100))
        .rejects.toThrow('Utilisateur introuvable pour la gamification.');
    });
  });

  // ==================== TESTS calculateRank ====================
  describe('calculateRank - Calcul du rang', () => {
    
    test('19. calculateRank - rang Iron (0 RR)', () => {
      const result = gamificationService.calculateRank(0);
      
      expect(result.rank).toBe('Iron');
      expect(result.nextRankXP).toBe(1000);
      expect(result.progressPercentage).toBe(0);
    });

    test('20. calculateRank - rang Bronze (1000 RR)', () => {
      const result = gamificationService.calculateRank(1000);
      
      expect(result.rank).toBe('Bronze');
      expect(result.nextRankXP).toBe(2500);
    });

    test('21. calculateRank - rang Silver (2500 RR)', () => {
      const result = gamificationService.calculateRank(2500);
      
      expect(result.rank).toBe('Silver');
      expect(result.nextRankXP).toBe(5000);
    });

    test('22. calculateRank - rang Gold (5000 RR)', () => {
      const result = gamificationService.calculateRank(5000);
      
      expect(result.rank).toBe('Gold');
      expect(result.nextRankXP).toBe(10000);
    });

    test('23. calculateRank - rang Platinum (10000 RR)', () => {
      const result = gamificationService.calculateRank(10000);
      
      expect(result.rank).toBe('Platinum');
      expect(result.nextRankXP).toBe(20000);
    });

    test('24. calculateRank - rang Diamond (20000 RR)', () => {
      const result = gamificationService.calculateRank(20000);
      
      expect(result.rank).toBe('Diamond');
      expect(result.nextRankXP).toBe(35000);
    });

    test('25. calculateRank - rang Ascendant (35000 RR)', () => {
      const result = gamificationService.calculateRank(35000);
      
      expect(result.rank).toBe('Ascendant');
      expect(result.nextRankXP).toBe(50000);
    });

    test('26. calculateRank - rang Immortal (50000 RR)', () => {
      const result = gamificationService.calculateRank(50000);
      
      expect(result.rank).toBe('Immortal');
      expect(result.nextRankXP).toBe(100000);
    });

    test('27. calculateRank - rang Radiant (100000 RR)', () => {
      const result = gamificationService.calculateRank(100000);
      
      expect(result.rank).toBe('Radiant');
      expect(result.nextRankXP).toBe(null);
      expect(result.progressPercentage).toBe(100);
    });

    test('28. calculateRank - pourcentage de progression', () => {
      const result = gamificationService.calculateRank(1500);
      
      expect(result.rank).toBe('Bronze');
      expect(result.progressPercentage).toBeGreaterThan(0);
      expect(result.progressPercentage).toBeLessThan(100);
    });
  });

  // ==================== TESTS RANK_THRESHOLDS ====================
  describe('RANK_THRESHOLDS - Export', () => {
    
    test('29. RANK_THRESHOLDS exporté correctement', () => {
      expect(gamificationService.RANK_THRESHOLDS).toBeDefined();
      expect(Array.isArray(gamificationService.RANK_THRESHOLDS)).toBe(true);
      expect(gamificationService.RANK_THRESHOLDS[0].rank).toBe('Radiant');
    });
  });
});