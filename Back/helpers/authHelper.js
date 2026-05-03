const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');

let authToken = null;
let testUserId = null;

const getAuthToken = async () => {
  if (authToken) return { token: authToken, userId: testUserId };
  
  // Nettoyer la base de test avant
  await mongoose.connection.dropDatabase();
  
  // Créer un utilisateur
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'testuser',
      email: 'test@test.com',
      password: 'Test123!',
      name: 'Test User'
    });
  
  // Récupérer le token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'test@test.com',
      password: 'Test123!'
    });
  
  authToken = loginRes.body.token;
  testUserId = loginRes.body.user?._id || loginRes.body.user?.id;
  
  return { token: authToken, userId: testUserId };
};

module.exports = { getAuthToken };