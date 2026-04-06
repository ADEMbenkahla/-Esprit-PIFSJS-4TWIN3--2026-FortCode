// Script de test pour soumettre du code JavaScript et scanner avec SonarQube

const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://127.0.0.1:5000/api';

// Code JavaScript de test avec quelques issues intentionnelles
const testCode = `
// Bad practice example
var unused = 42;  // Variable non utilisée

function calculateSum(a, b) {
  return a + b;  // Bonne fonction
}

function buggyFunction() {
  let result = null;
  
  if (true) {
    result = "test";
  }
  
  console.log(result);  // Potential null reference
  
  var duplicateVar = 1;
  var duplicateVar = 2;  // Redéclaration
}

// Code smell - long function
function complexFunction(x, y, z) {
  if (x > 0) {
    if (y > 0) {
      if (z > 0) {
        let a = x + y + z;
        let b = a * 2;
        let c = b / 3;
        console.log(c);
      }
    }
  }
}

calculateSum(5, 3);
buggyFunction();
complexFunction(1, 2, 3);
`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  header: (msg) => console.log(`\n${colors.cyan}╔${'═'.repeat(msg.length + 2)}╗${colors.reset}\n${colors.cyan}║${colors.reset} ${colors.magenta}${msg}${colors.reset} ${colors.cyan}║${colors.reset}\n${colors.cyan}╚${'═'.repeat(msg.length + 2)}╝${colors.reset}\n`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  divider: () => console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}\n`)
};

async function getTokens() {
  log.header('ÉTAPE 1: Récupération des tokens');
  
  log.info('Cherche les tokens JWT dans les cookies du navigateur');
  log.info('DevTools > Application > Cookies > http://127.0.0.1:5173');
  log.info('Cherche un cookie nommé "token"');
  
  log.warn('Copie les deux tokens (recruiter + visitor) et remonte-les ci-dessous:');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}Colle le token RECRUITER:${colors.reset} `, (recruiterToken) => {
      rl.question(`${colors.yellow}Colle le token VISITOR:${colors.reset} `, (visitorToken) => {
        rl.question(`${colors.yellow}Colle l'ID de la ROOM (ou appuie Entrée pour auto-déterminer):${colors.reset} `, (roomId) => {
          rl.close();
          resolve({ recruiterToken: recruiterToken.trim(), visitorToken: visitorToken.trim(), roomId: roomId.trim() });
        });
      });
    });
  });
}

async function submitAndTest({ recruiterToken, visitorToken, roomId }) {
  try {
    // STEP 2: Get rooms list if no roomId provided
    let actualRoomId = roomId;
    if (!actualRoomId) {
      log.header('ÉTAPE 2: Récupération de la room');
      const roomsRes = await axios.get(`${API_URL}/programming-rooms`, {
        headers: { Authorization: `Bearer ${recruiterToken}` }
      });

      if (roomsRes.data.rooms.length === 0) {
        log.error('Aucune room trouvée. Crée une room d\'abord dans l\'interface.');
        return;
      }

      actualRoomId = roomsRes.data.rooms[0]._id;
      log.success(`Room trouvée: ${roomsRes.data.rooms[0].title} (${actualRoomId})`);
    }

    log.divider();

    // STEP 3: Submit JavaScript code
    log.header('ÉTAPE 3: Soumission du code JavaScript');
    
    log.info('Code à tester:');
    console.log(`${colors.magenta}${testCode}${colors.reset}`);
    log.divider();

    const submitRes = await axios.post(
      `${API_URL}/programming-rooms/${actualRoomId}/submit`,
      {
        code: testCode,
        language: 'javascript',
        executionTime: 245,
        memoryUsed: 35
      },
      { headers: { Authorization: `Bearer ${visitorToken}` } }
    );

    const resultId = submitRes.data.result._id;
    log.success(`Code soumis! ID du résultat: ${resultId}`);
    
    log.divider();

    // STEP 4: Wait for scan
    log.header('ÉTAPE 4: Attente du scan SonarQube');
    log.warn('⏳ Scanning en cours... (maximum 30 secondes)');
    
    let scanComplete = false;
    let attempts = 0;
    let sonarData = null;

    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      log.info(`Vérification #${i + 1}...`);
      
      const monitorRes = await axios.get(
        `${API_URL}/programming-rooms/${actualRoomId}/monitoring`,
        { headers: { Authorization: `Bearer ${recruiterToken}` } }
      );

      const submission = monitorRes.data.resultSubmissions.find(s => s._id === resultId);
      
      if (submission && submission.sonarQube) {
        sonarData = submission.sonarQube;
        if (sonarData.scanStatus === 'success' || sonarData.scanStatus === 'failed') {
          scanComplete = true;
          break;
        }
      }
    }

    log.divider();

    // STEP 5: Display results
    log.header('ÉTAPE 5: Résultats du scan SonarQube');

    if (sonarData) {
      log.success('Données SonarQube reçues!');
      log.divider();
      
      console.log(`${colors.cyan}Project Key${colors.reset}`);
      console.log(`  → ${sonarData.projectKey}\n`);
      
      console.log(`${colors.cyan}Statut du Scan${colors.reset}`);
      const statusColor = sonarData.scanStatus === 'success' ? colors.green : sonarData.scanStatus === 'failed' ? colors.red : colors.yellow;
      console.log(`  → ${statusColor}${sonarData.scanStatus}${colors.reset}\n`);
      
      console.log(`${colors.cyan}Quality Gate${colors.reset}`);
      const qgColor = sonarData.qualityGateStatus === 'PASSED' ? colors.green : colors.red;
      console.log(`  → ${qgColor}${sonarData.qualityGateStatus}${colors.reset}\n`);
      
      if (sonarData.metrics) {
        console.log(`${colors.cyan}Métriques de Code${colors.reset}`);
        console.log(`  • Bugs: ${sonarData.metrics.bugs || 0}`);
        console.log(`  • Vulnerabilités: ${sonarData.metrics.vulnerabilities || 0}`);
        console.log(`  • Code Smells: ${sonarData.metrics.code_smells || 0}`);
        console.log(`  • Coverage: ${sonarData.metrics.coverage || 'N/A'}%`);
        console.log(`  • Duplication: ${sonarData.metrics.duplicated_lines_density || 'N/A'}%\n`);
      }

      console.log(`${colors.cyan}Problèmes détectés${colors.reset}`);
      console.log(`  → ${sonarData.issuesCount || 0} issues\n`);

      if (sonarData.dashboardUrl) {
        console.log(`${colors.cyan}Tableau de bord SonarQube${colors.reset}`);
        console.log(`  → ${colors.blue}${sonarData.dashboardUrl}${colors.reset}\n`);
      }

      log.divider();
    } else {
      log.warn('Données SonarQube non trouvées.');
      log.info('Le scan pourrait encore être en cours (attends 30-60 secondes et échange l\'UI).');
    }

    log.header('✅ TEST TERMINÉ');

  } catch (error) {
    log.error(`Erreur: ${error.message}`);
    if (error.response) {
      console.error(`${colors.red}${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
    }
  }
}

// Main
(async () => {
  const tokens = await getTokens();
  await submitAndTest(tokens);
})();
