process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/fortcode_test';

// Mock de mongoose
const mongoose = require('mongoose');
const connectDB = require('../../src/config/db');

// Mock de console.log et console.error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  // Nettoyer les mocks avant chaque test
  jest.clearAllMocks();
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restaurer console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

afterAll(async () => {
  // Fermer la connexion si ouverte
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('Database Connection - Tests Complets', () => {
  
  describe('Connexion normale', () => {
    
    test('1. Connexion réussie avec MONGO_URI défini', async () => {
      // Sauvegarder l'URI originale
      const originalUri = process.env.MONGO_URI;
      process.env.MONGO_URI = 'mongodb://localhost:27017/test_db';
      
      // Mock de mongoose.connect
      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValueOnce();
      
      await connectDB();
      
      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test_db',
        { serverSelectionTimeoutMS: 5000 }
      );
      expect(console.log).toHaveBeenCalledWith('MongoDB connected');
      
      mockConnect.mockRestore();
      process.env.MONGO_URI = originalUri;
    });

    test('2. Connexion en mode test - affiche message test', async () => {
      process.env.NODE_ENV = 'test';
      const originalUri = process.env.MONGO_URI;
      process.env.MONGO_URI = 'mongodb://localhost:27017/test_db';
      
      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValueOnce();
      
      await connectDB();
      
      expect(console.log).toHaveBeenCalledWith('Test mode: connecting to test database');
      expect(console.log).toHaveBeenCalledWith('MongoDB connected');
      
      mockConnect.mockRestore();
      process.env.MONGO_URI = originalUri;
    });
  });

  describe('Gestion des erreurs', () => {
    
    test('3. MONGO_URI non défini - erreur et exit en mode production', async () => {
      // Sauvegarder l'URI originale
      const originalUri = process.env.MONGO_URI;
      delete process.env.MONGO_URI;
      process.env.NODE_ENV = 'production';
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await connectDB();
      
      expect(console.error).toHaveBeenCalledWith('MONGO_URI is not defined');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
      process.env.MONGO_URI = originalUri;
    });

    test('4. MONGO_URI non défini - pas d\'exit en mode test', async () => {
      const originalUri = process.env.MONGO_URI;
      delete process.env.MONGO_URI;
      process.env.NODE_ENV = 'test';
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await connectDB();
      
      expect(console.error).toHaveBeenCalledWith('MONGO_URI is not defined');
      expect(mockExit).not.toHaveBeenCalled();
      
      mockExit.mockRestore();
      process.env.MONGO_URI = originalUri;
    });

    test('5. Erreur de connexion MongoDB - mode production', async () => {
      const originalUri = process.env.MONGO_URI;
      process.env.MONGO_URI = 'mongodb://localhost:27017/invalid';
      process.env.NODE_ENV = 'production';
      
      const mockConnect = jest.spyOn(mongoose, 'connect').mockRejectedValueOnce(new Error('Connection failed'));
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await connectDB();
      
      expect(console.error).toHaveBeenCalledWith(expect.any(Error));
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockConnect.mockRestore();
      mockExit.mockRestore();
      process.env.MONGO_URI = originalUri;
    });

    test('6. Erreur de connexion MongoDB - mode test (continue)', async () => {
      const originalUri = process.env.MONGO_URI;
      process.env.MONGO_URI = 'mongodb://localhost:27017/invalid';
      process.env.NODE_ENV = 'test';
      
      const mockConnect = jest.spyOn(mongoose, 'connect').mockRejectedValueOnce(new Error('Connection failed'));
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await connectDB();
      
      expect(console.log).toHaveBeenCalledWith('Test mode: database connection failed, continuing...');
      expect(mockExit).not.toHaveBeenCalled();
      
      mockConnect.mockRestore();
      mockExit.mockRestore();
      process.env.MONGO_URI = originalUri;
    });
  });

  describe('Cas limites', () => {
    
    test('7. MONGO_URI vide mais existant', async () => {
      const originalUri = process.env.MONGO_URI;
      process.env.MONGO_URI = '';
      process.env.NODE_ENV = 'production';
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await connectDB();
      
      expect(console.error).toHaveBeenCalledWith('MONGO_URI is not defined');
      expect(mockExit).toHaveBeenCalled();
      
      mockExit.mockRestore();
      process.env.MONGO_URI = originalUri;
    });

    test('8. Connexion avec timeout personnalisé', async () => {
      const originalUri = process.env.MONGO_URI;
      process.env.MONGO_URI = 'mongodb://localhost:27017/test_db';
      
      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValueOnce();
      
      await connectDB();
      
      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ serverSelectionTimeoutMS: 5000 })
      );
      
      mockConnect.mockRestore();
      process.env.MONGO_URI = originalUri;
    });
  });
});

describe('Database Connection - Tests d\'intégration', () => {
  
  test('9. Connexion réelle à MongoDB (si disponible)', async () => {
    const originalUri = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://localhost:27017/fortcode_test';
    process.env.NODE_ENV = 'test';
    
    // Tentative de connexion réelle
    try {
      await connectDB();
      // Si on arrive ici, la connexion a réussi
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      
      await mongoose.disconnect();
    } catch (error) {
      // Si MongoDB n'est pas disponible, on skip le test
      console.log('MongoDB not available for integration test');
    }
    
    process.env.MONGO_URI = originalUri;
  });

  test('10. Connexion avec URI invalide - gestion d\'erreur', async () => {
    const originalUri = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://invalid-host:27017/db';
    process.env.NODE_ENV = 'test';
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    await connectDB();
    
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('database connection failed, continuing...')
    );
    
    mockExit.mockRestore();
    process.env.MONGO_URI = originalUri;
  });
});