const axios = require('axios');

const API_URL = 'http://127.0.0.1:5000/api';
const RECRUITER_TOKEN = 'YOUR_RECRUITER_JWT_TOKEN'; // Remplace avec ton token
const VISITOR_TOKEN = 'YOUR_VISITOR_JWT_TOKEN';     // Remplace avec ton token

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}========== ${msg} ==========${colors.reset}\n`)
};

async function test() {
  try {
    log.header('TEST SONARQUBE INTEGRATION');

    // ==== STEP 1: Get a valid room ====
    log.info('Step 1: Fetching programming rooms...');
    const roomsRes = await axios.get(`${API_URL}/programming-rooms`, {
      headers: { Authorization: `Bearer ${RECRUITER_TOKEN}` }
    });
    
    if (roomsRes.data.rooms.length === 0) {
      log.error('No rooms found. Create a room first in the UI.');
      return;
    }

    const roomId = roomsRes.data.rooms[0]._id;
    log.success(`Found room: ${roomId}`);

    // ==== STEP 2: Get room details ====
    log.info(`Step 2: Getting room details for ${roomId}...`);
    const roomRes = await axios.get(`${API_URL}/programming-rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${RECRUITER_TOKEN}` }
    });
    
    const room = roomRes.data;
    log.success(`Room: ${room.title} (Code: ${room.roomCode})`);

    // ==== STEP 3: Submit code as visitor ====
    log.info('Step 3: Submitting test code...');
    const testCode = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
`;

    const submitRes = await axios.post(
      `${API_URL}/programming-rooms/${roomId}/submit`,
      {
        code: testCode,
        language: 'python',
        executionTime: 150,
        memoryUsed: 25
      },
      { headers: { Authorization: `Bearer ${VISITOR_TOKEN}` } }
    );

    const resultId = submitRes.data.result._id;
    log.success(`Code submitted! Result ID: ${resultId}`);

    // ==== STEP 4: Wait for scan to start ====
    log.info('Step 4: Waiting for SonarQube scan to start (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ==== STEP 5: Check scan status ====
    log.info('Step 5: Checking scan status...');
    const monitorRes = await axios.get(
      `${API_URL}/programming-rooms/${roomId}/monitoring`,
      { headers: { Authorization: `Bearer ${RECRUITER_TOKEN}` } }
    );

    const submission = monitorRes.data.resultSubmissions.find(s => s._id === resultId);
    
    if (submission && submission.sonarQube) {
      const sq = submission.sonarQube;
      log.success('SonarQube data found!');
      log.info(`  Project Key: ${sq.projectKey}`);
      log.info(`  Scan Status: ${sq.scanStatus}`);
      log.info(`  Quality Gate: ${sq.qualityGateStatus}`);
      
      if (sq.metrics) {
        log.info('  Metrics:');
        log.info(`    - Bugs: ${sq.metrics.bugs || 'N/A'}`);
        log.info(`    - Vulnerabilities: ${sq.metrics.vulnerabilities || 'N/A'}`);
        log.info(`    - Code Smells: ${sq.metrics.code_smells || 'N/A'}`);
        log.info(`    - Line Coverage: ${sq.metrics.coverage || 'N/A'}%`);
        log.info(`    - Issues Count: ${sq.issuesCount || 0}`);
      }

      log.info(`  Dashboard URL: ${sq.dashboardUrl || 'N/A'}`);
    } else {
      log.warn('SonarQube data not yet available. Scan might still be running.');
      log.info('Wait 10-30 seconds and check the UI again.');
    }

    // ==== STEP 6: Manual sync ====
    log.info('Step 6: Triggering manual SonarQube sync...');
    const syncRes = await axios.post(
      `${API_URL}/programming-rooms/${roomId}/monitoring/results/${resultId}/sonarqube/sync`,
      {},
      { headers: { Authorization: `Bearer ${RECRUITER_TOKEN}` } }
    );

    log.success('Manual sync triggered!');
    log.info(`  Updated metrics: ${JSON.stringify(syncRes.data.sonarQube, null, 2)}`);

    log.header('TEST COMPLETED SUCCESSFULLY ✅');

  } catch (error) {
    if (error.response) {
      log.error(`API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      console.error(error.response.data);
    } else {
      log.error(`Error: ${error.message}`);
    }
  }
}

// Run test
test();
