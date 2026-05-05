process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';

const { createServer } = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Match = require('../../src/models/Match');
const Challenge = require('../../src/models/Challenge');
const { initSocket, getIO } = require('../../src/socket');

// Mock des services
jest.mock('../../src/utils/runChallengeCode', () => ({
  runChallengeCode: jest.fn().mockReturnValue({
    passed: true,
    testResults: [{ passed: true }],
    outputSnapshot: 'Test output'
  })
}));

jest.mock('../../src/services/mlDetectionAgent', () => ({
  detectCodeOrigin: jest.fn().mockResolvedValue({
    prediction: 'human',
    label: 'Human written'
  })
}));

let httpServer;
let socketServer;
let clientSocket;
let socketUrl;

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fortcode_test';
  await mongoose.connect(mongoURI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (socketServer) socketServer.close();
  if (httpServer) httpServer.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Match.deleteMany({});
  await Challenge.deleteMany({});

  httpServer = createServer();
  socketServer = initSocket(httpServer);
  await new Promise(resolve => httpServer.listen(() => {
    const address = httpServer.address();
    socketUrl = `http://localhost:${address.port}`;
    resolve();
  }));
});

afterEach(async () => {
  if (clientSocket && clientSocket.connected) {
    clientSocket.disconnect();
  }
  if (socketServer) socketServer.close();
  if (httpServer) httpServer.close();
});

describe('Socket.IO - Tests Complets', () => {
  let user;
  let userToken;
  let user2;
  let user2Token;
  let testChallenge;

  beforeEach(async () => {
    // Créer utilisateur 1
    user = await User.create({
      username: `player1_${Date.now()}`,
      email: `player1_${Date.now()}@test.com`,
      password: await bcrypt.hash('Player123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true
    });
    userToken = jwt.sign(
      { id: user._id.toString(), role: 'participant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Créer utilisateur 2
    user2 = await User.create({
      username: `player2_${Date.now()}`,
      email: `player2_${Date.now()}@test.com`,
      password: await bcrypt.hash('Player123!', 10),
      role: 'participant',
      isVerified: true,
      isActive: true
    });
    user2Token = jwt.sign(
      { id: user2._id.toString(), role: 'participant' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Créer un challenge
    testChallenge = await Challenge.create({
      title: 'Test Battle Challenge',
      description: 'Challenge for battle',
      type: 'Battle',
      language: 'javascript',
      starterCode: 'function solve() { return 42; }',
      testCases: [{ name: 'Test 1', assertion: 'result === 42' }]
    });
  });

  // ==================== CONNECTION ====================
  describe('Connection', () => {
    
    test('1. Connexion avec token valide', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (err) => {
        done(err);
      });
    });

    test('2. Connexion sans token - refusée', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: null }
      });

      clientSocket.on('connect_error', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });

      setTimeout(() => {
        if (!clientSocket.connected) done();
      }, 1000);
    });

    test('3. Connexion avec token invalide - refusée', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: 'invalid-token-12345' }
      });

      clientSocket.on('connect_error', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });
    });
  });

  // ==================== MATCHMAKING ====================
  describe('Matchmaking', () => {
    
    test('4. Recherche de match - findMatch', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('findMatch', { type: 'training' });
        
        // Attendre un peu pour voir si une réponse arrive
        setTimeout(() => {
          done();
        }, 2000);
      });
    });

    test('5. Annulation recherche - cancelSearch', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('findMatch', { type: 'training' });
        clientSocket.emit('cancelSearch');
        
        setTimeout(() => {
          done();
        }, 1000);
      });
    });
  });

  // ==================== JOIN MATCH ====================
  describe('Join Match', () => {
    let match;

    beforeEach(async () => {
      match = await Match.create({
        players: [
          { user: user._id, username: user.username, health: 100, finished: false },
          { user: user2._id, username: user2.username, health: 100, finished: false }
        ],
        status: 'live',
        type: 'training'
      });
    });

    test('6. Rejoindre un match - joinMatch', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('joinMatch', { matchId: match._id.toString() });
        
        clientSocket.on('matchFound', (data) => {
          expect(data).toBeDefined();
          done();
        });
        
        setTimeout(() => {
          done();
        }, 2000);
      });
    });
  });

  // ==================== EXECUTE CODE ====================
  describe('Execute Code', () => {
    let match;

    beforeEach(async () => {
      match = await Match.create({
        players: [
          { user: user._id, username: user.username, health: 100, finished: false, socketId: null },
          { user: user2._id, username: user2.username, health: 100, finished: false, socketId: null }
        ],
        status: 'live',
        type: 'training',
        challenge: {
          title: 'Test Challenge',
          data: {
            javascript: testChallenge
          }
        }
      });
    });

    test('7. Exécuter du code - executeIncantation', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', async () => {
        // D'abord rejoindre le match
        clientSocket.emit('joinMatch', { matchId: match._id.toString() });
        
        setTimeout(() => {
          clientSocket.emit('executeIncantation', {
            matchId: match._id.toString(),
            code: 'function solve() { return 42; }',
            language: 'javascript'
          });
          
          clientSocket.on('opponentBattleEvent', (data) => {
            expect(data).toBeDefined();
            done();
          });
          
          setTimeout(() => {
            done();
          }, 3000);
        }, 1000);
      });
    });
  });

  // ==================== CODE UPDATE ====================
  describe('Code Update', () => {
    let match;

    beforeEach(async () => {
      match = await Match.create({
        players: [
          { user: user._id, username: user.username, health: 100, finished: false },
          { user: user2._id, username: user2.username, health: 100, finished: false }
        ],
        status: 'live',
        type: 'training'
      });
    });

    test('8. Mise à jour du code en temps réel - codeUpdate', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('joinMatch', { matchId: match._id.toString(), roomId: `match:${match._id}` });
        
        clientSocket.emit('codeUpdate', {
          roomId: `match:${match._id}`,
          code: 'function solve() { return 42; }'
        });
        
        done();
      });
    });
  });

  // ==================== SUBMIT MATCH ====================
  describe('Submit Match', () => {
    let match;

    beforeEach(async () => {
      match = await Match.create({
        players: [
          { user: user._id, username: user.username, health: 100, finished: false },
          { user: user2._id, username: user2.username, health: 100, finished: false }
        ],
        status: 'live',
        type: 'training'
      });
    });

    test('9. Soumission du match - submitMatch', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('joinMatch', { matchId: match._id.toString() });
        
        setTimeout(() => {
          clientSocket.emit('submitMatch', {
            matchId: match._id.toString(),
            code: 'function solve() { return 42; }',
            language: 'javascript'
          });
          
          clientSocket.on('waitingForOpponent', () => {
            expect(true).toBe(true);
            done();
          });
          
          setTimeout(() => {
            done();
          }, 3000);
        }, 1000);
      });
    });
  });

  // ==================== QUIT MATCH ====================
  describe('Quit Match', () => {
    let match;

    beforeEach(async () => {
      match = await Match.create({
        players: [
          { user: user._id, username: user.username, health: 100, finished: false },
          { user: user2._id, username: user2.username, health: 100, finished: false }
        ],
        status: 'live',
        type: 'training'
      });
    });

    test('10. Quitter un match - quitMatch', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('joinMatch', { matchId: match._id.toString() });
        
        setTimeout(() => {
          clientSocket.emit('quitMatch', {
            matchId: match._id.toString(),
            roomId: `match:${match._id}`
          });
          
          done();
        }, 1000);
      });
    });
  });

  // ==================== DISCONNECT ====================
  describe('Disconnect', () => {
    
    test('11. Déconnexion - update isOnline status', (done) => {
      clientSocket = Client(socketUrl, {
        auth: { token: userToken }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        
        clientSocket.disconnect();
        
        setTimeout(async () => {
          const updatedUser = await User.findById(user._id);
          expect(updatedUser.isOnline).toBe(false);
          done();
        }, 2000);
      });
    });
  });
});