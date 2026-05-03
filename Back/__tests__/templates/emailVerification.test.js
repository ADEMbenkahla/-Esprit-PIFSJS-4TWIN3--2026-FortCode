const fs = require('fs');
const path = require('path');

describe('Email Verification Template - Tests', () => {
  let templateContent;
  let templatePath;

  beforeAll(() => {
    templatePath = path.join(__dirname, '../../src/templates/emailVerification.html');
    templateContent = fs.readFileSync(templatePath, 'utf8');
  });

  // ==================== STRUCTURE HTML ====================
  describe('Structure HTML', () => {
    
    test('1. Template existe et est lisible', () => {
      expect(templateContent).toBeDefined();
      expect(typeof templateContent).toBe('string');
      expect(templateContent.length).toBeGreaterThan(0);
    });

    test('2. Contient la balise DOCTYPE', () => {
      expect(templateContent).toContain('<!DOCTYPE html>');
    });

    test('3. Contient les balises html', () => {
      expect(templateContent).toContain('<html>');
      expect(templateContent).toContain('</html>');
    });

    test('4. Contient les balises head', () => {
      expect(templateContent).toContain('<head>');
      expect(templateContent).toContain('</head>');
    });

    test('5. Contient les balises body', () => {
      expect(templateContent).toContain('<body>');
      expect(templateContent).toContain('</body>');
    });
  });

  // ==================== STYLES ====================
  describe('Styles CSS', () => {
    
    test('6. Contient des styles CSS', () => {
      expect(templateContent).toContain('<style>');
      expect(templateContent).toContain('</style>');
    });

    test('7. Contient la police Outfit', () => {
      expect(templateContent).toContain('fonts.googleapis.com');
      expect(templateContent).toContain('Outfit');
    });

    test('8. Contient les classes principales', () => {
      expect(templateContent).toContain('.wrapper');
      expect(templateContent).toContain('.container');
      expect(templateContent).toContain('.card');
      expect(templateContent).toContain('.code-container');
      expect(templateContent).toContain('.code-value');
      expect(templateContent).toContain('.footer');
    });
  });

  // ==================== PLACEHOLDERS ====================
  describe('Placeholders pour données dynamiques', () => {
    
    test('9. Contient le placeholder {{username}}', () => {
      expect(templateContent).toContain('{{username}}');
    });

    test('10. Contient le placeholder {{verificationCode}}', () => {
      expect(templateContent).toContain('{{verificationCode}}');
    });
  });

  // ==================== CONTENU STATIQUE ====================
  describe('Contenu statique', () => {
    
    test('11. Contient le titre "Verify Your Account"', () => {
      expect(templateContent).toContain('Verify Your Account');
    });

    test('12. Contient "FortCode" dans le contenu', () => {
      expect(templateContent).toContain('FortCode');
    });

    test('13. Contient la mention de sécurité', () => {
      expect(templateContent).toContain('secure code');
      expect(templateContent).toContain('24 hours');
    });

    test('14. Contient le logo (cid:logo)', () => {
      expect(templateContent).toContain('src="cid:logo"');
      expect(templateContent).toContain('alt="FortCode Logo"');
    });

    test('15. Contient le message de bienvenue', () => {
      expect(templateContent).toContain('Welcome');
      expect(templateContent).toContain('Thank you for registering');
    });

    test('16. Contient le footer avec copyright', () => {
      expect(templateContent).toContain('&copy; 2024 FortCode Ecosystem');
    });
  });

  // ==================== REMPLACEMENT DES PLACEHOLDERS ====================
  describe('Remplissage dynamique', () => {
    
    test('17. Remplacer {{username}} par un nom', () => {
      const username = 'Jean Dupont';
      const filled = templateContent.replace('{{username}}', username);
      
      expect(filled).toContain(username);
      expect(filled).not.toContain('{{username}}');
    });

    test('18. Remplacer {{verificationCode}} par un code', () => {
      const code = '123456';
      const filled = templateContent.replace('{{verificationCode}}', code);
      
      expect(filled).toContain(code);
      expect(filled).not.toContain('{{verificationCode}}');
    });

    test('19. Remplacer les deux placeholders simultanément', () => {
      const username = 'Marie Curie';
      const code = '789012';
      
      let filled = templateContent.replace('{{username}}', username);
      filled = filled.replace('{{verificationCode}}', code);
      
      expect(filled).toContain(username);
      expect(filled).toContain(code);
      expect(filled).not.toContain('{{username}}');
      expect(filled).not.toContain('{{verificationCode}}');
    });
  });

  // ==================== RENDU FINAL ====================
  describe('Rendu final complet', () => {
    
    test('20. Génère un email HTML valide avec les données', () => {
      const username = 'Test User';
      const verificationCode = '654321';
      
      let finalHtml = templateContent;
      finalHtml = finalHtml.replace('{{username}}', username);
      finalHtml = finalHtml.replace('{{verificationCode}}', verificationCode);
      
      // Vérifier les balises de base
      expect(finalHtml).toContain('<!DOCTYPE html>');
      expect(finalHtml).toContain('<html>');
      expect(finalHtml).toContain('</html>');
      expect(finalHtml).toContain(username);
      expect(finalHtml).toContain(verificationCode);
      
      // Vérifier l'absence des placeholders
      expect(finalHtml).not.toContain('{{username}}');
      expect(finalHtml).not.toContain('{{verificationCode}}');
    });
  });
});