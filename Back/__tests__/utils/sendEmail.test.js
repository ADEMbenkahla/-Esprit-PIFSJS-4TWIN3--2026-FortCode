process.env.JWT_SECRET = 'test-secret-key-2024';
process.env.NODE_ENV = 'test';
process.env.EMAIL_USERNAME = 'test@fortcode.com';
process.env.EMAIL_PASSWORD = 'test-password-123';

const nodemailer = require('nodemailer');

// Mock de nodemailer
jest.mock('nodemailer');

describe('SendEmail Service - Tests Complets', () => {
  let mockTransporter;
  let sendMailMock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Créer un mock pour transporter.sendMail
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id-123' });
    
    // Mock de createTransport
    mockTransporter = {
      sendMail: sendMailMock
    };
    
    nodemailer.createTransport.mockReturnValue(mockTransporter);
  });

  // ==================== TEST 1: Envoi d'email simple ====================
  test('1. sendEmail - envoi d\'email avec succès', async () => {
    const sendEmail = require('../../src/utils/sendEmail');
    
    const result = await sendEmail({
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'Test message content'
    });
    
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test message content'
    }));
  });

  // ==================== TEST 2: Envoi d'email avec HTML ====================
  test('2. sendEmail - envoi d\'email avec contenu HTML', async () => {
    const sendEmail = require('../../src/utils/sendEmail');
    
    const htmlContent = '<h1>Hello</h1><p>This is HTML</p>';
    
    await sendEmail({
      email: 'user@test.com',
      subject: 'HTML Email',
      html: htmlContent,
      message: 'Plain text fallback'
    });
    
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@test.com',
      subject: 'HTML Email',
      html: htmlContent,
      text: 'Plain text fallback'
    }));
  });

  // ==================== TEST 3: Fallback texte depuis HTML ====================
  test('3. sendEmail - message manquant, fallback depuis HTML', async () => {
    const sendEmail = require('../../src/utils/sendEmail');
    
    const htmlContent = '<p>Hello <strong>World</strong></p>';
    
    await sendEmail({
      email: 'test@example.com',
      subject: 'No Message',
      html: htmlContent
    });
    
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('Hello World')
    }));
  });

  // ==================== TEST 4: Email avec pièces jointes ====================
  test('4. sendEmail - avec pièces jointes', async () => {
    const sendEmail = require('../../src/utils/sendEmail');
    
    const attachments = [
      { filename: 'test.pdf', content: Buffer.from('PDF content') },
      { filename: 'image.png', content: Buffer.from('Image content') }
    ];
    
    await sendEmail({
      email: 'user@test.com',
      subject: 'With Attachments',
      message: 'See attachments',
      attachments: attachments
    });
    
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      attachments: attachments
    }));
  });

  // ==================== TEST 5: Erreur SMTP avec retry ====================
  test('5. sendEmail - erreur SMTP, retry une fois', async () => {
    const sendEmail = require('../../src/utils/sendEmail');
    
    // Premier appel échoue, second réussit
    sendMailMock
      .mockRejectedValueOnce(new Error('SMTP connection error'))
      .mockResolvedValueOnce({ messageId: 'retry-id' });
    
    await sendEmail({
      email: 'test@example.com',
      subject: 'Retry Test',
      message: 'Should retry'
    });
    
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  // ==================== TEST 6: Erreur SMTP persistante ====================
  test('6. sendEmail - erreur SMTP persistante après retry', async () => {
    const sendEmail = require('../../src/utils/sendEmail');
    
    // Les deux appels échouent
    sendMailMock
      .mockRejectedValueOnce(new Error('SMTP error 1'))
      .mockRejectedValueOnce(new Error('SMTP error 2'));
    
    await expect(sendEmail({
      email: 'test@example.com',
      subject: 'Persistent Error',
      message: 'Will fail twice'
    })).rejects.toThrow();
    
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  // ==================== TEST 7: Nettoyage du mot de passe Gmail ====================
  test('7. Configuration - nettoyage des espaces dans EMAIL_PASSWORD', async () => {
    const originalPassword = process.env.EMAIL_PASSWORD;
    process.env.EMAIL_PASSWORD = '  test-password-with-spaces  ';
    
    // Réinitialiser le module
    jest.resetModules();
    
    // Le module va lire la variable d'environnement
    require('../../src/utils/sendEmail');
    
    const createTransportCall = nodemailer.createTransport.mock.calls[0][0];
    expect(createTransportCall.auth.pass).toBe('test-password-with-spaces');
    
    process.env.EMAIL_PASSWORD = originalPassword;
  });

  // ==================== TEST 8: Configuration SMTP ====================
  test('8. Configuration SMTP - paramètres corrects', () => {
    const createTransportCall = nodemailer.createTransport.mock.calls[0][0];
    
    expect(createTransportCall.host).toBe('smtp.gmail.com');
    expect(createTransportCall.port).toBe(465);
    expect(createTransportCall.secure).toBe(true);
    expect(createTransportCall.pool).toBe(true);
    expect(createTransportCall.maxConnections).toBe(1);
    expect(createTransportCall.maxMessages).toBe(100);
    expect(createTransportCall.auth.user).toBe('test@fortcode.com');
  });

  // ==================== TEST 9: Email avec message vide ====================
  test('9. sendEmail - message et HTML vides', async () => {
    const sendEmail = require('../../src/utils/sendEmail');
    
    await sendEmail({
      email: 'test@example.com',
      subject: 'Empty Content',
      message: '',
      html: ''
    });
    
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      text: ''
    }));
  });

  // ==================== TEST 10: Email sans EMAIL_USERNAME ====================
  test('10. Configuration - EMAIL_USERNAME manquant', async () => {
    const originalUsername = process.env.EMAIL_USERNAME;
    delete process.env.EMAIL_USERNAME;
    
    jest.resetModules();
    
    const sendEmail = require('../../src/utils/sendEmail');
    
    await sendEmail({
      email: 'test@example.com',
      subject: 'Test',
      message: 'Hello'
    });
    
    const createTransportCall = nodemailer.createTransport.mock.calls[0][0];
    expect(createTransportCall.auth.user).toBeUndefined();
    
    process.env.EMAIL_USERNAME = originalUsername;
  });
});