const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");

// Mock des modules
jest.mock("multer");
jest.mock("fs");

// Importer le module après les mocks
const uploadMiddleware = require("../../src/middlewares/uploadMiddleware");

describe("Upload Middleware - Battle Statement", () => {
  let mockDiskStorage;
  let mockMulter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de fs.existsSync et fs.mkdirSync
    fs.existsSync = jest.fn();
    fs.mkdirSync = jest.fn();
    
    // Mock de multer.diskStorage
    mockDiskStorage = jest.fn();
    multer.diskStorage = mockDiskStorage;
    
    // Mock de multer
    mockMulter = jest.fn().mockReturnValue({ single: jest.fn() });
    multer.mockImplementation(mockMulter);
  });

  describe("Crée le dossier uploads", () => {
    
    test("1. Crée le dossier s'il n'existe pas", () => {
      fs.existsSync.mockReturnValue(false);
      
      // Re-importer pour déclencher la création
      jest.isolateModules(() => {
        require("../../src/middlewares/uploadMiddleware");
      });
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("uploads/battle-statements"),
        { recursive: true }
      );
    });

    test("2. Ne crée pas le dossier s'il existe déjà", () => {
      fs.existsSync.mockReturnValue(true);
      
      jest.isolateModules(() => {
        require("../../src/middlewares/uploadMiddleware");
      });
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("Configuration de diskStorage", () => {
    let storageConfig;
    let destinationFn;
    let filenameFn;

    beforeEach(() => {
      // Capturer la configuration passée à diskStorage
      storageConfig = mockDiskStorage.mock.calls[0]?.[0];
      destinationFn = storageConfig?.destination;
      filenameFn = storageConfig?.filename;
    });

    test("3. Destination function - utilise uploadsDir", () => {
      expect(destinationFn).toBeDefined();
      
      const mockCb = jest.fn();
      destinationFn({}, {}, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(null, expect.stringContaining("uploads/battle-statements"));
    });

    test("4. Filename function - avec userId", () => {
      expect(filenameFn).toBeDefined();
      
      const mockReq = { user: { id: "user123" } };
      const mockFile = { originalname: "document.pdf" };
      const mockCb = jest.fn();
      
      filenameFn(mockReq, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/user123_\d+_document\.pdf/)
      );
    });

    test("5. Filename function - sans userId (anonymous)", () => {
      const mockReq = { user: null };
      const mockFile = { originalname: "test.txt" };
      const mockCb = jest.fn();
      
      filenameFn(mockReq, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/anonymous_\d+_test\.txt/)
      );
    });

    test("6. Filename function - nom de fichier avec caractères spéciaux", () => {
      const mockReq = { user: { id: "user123" } };
      const mockFile = { originalname: "Mon Document (1).pdf" };
      const mockCb = jest.fn();
      
      filenameFn(mockReq, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/user123_\d+_Mon_Document_1_\.pdf/)
      );
    });

    test("7. Filename function - fichier sans extension", () => {
      const mockReq = { user: { id: "user123" } };
      const mockFile = { originalname: "README" };
      const mockCb = jest.fn();
      
      filenameFn(mockReq, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(
        null,
        expect.stringMatching(/user123_\d+_README/)
      );
    });
  });

  describe("File Filter - Types autorisés", () => {
    let fileFilterFn;

    beforeEach(() => {
      const storageConfig = mockDiskStorage.mock.calls[0]?.[0];
      fileFilterFn = mockMulter.mock.calls[0]?.[0]?.fileFilter;
    });

    test("8. Accepte PDF", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "application/pdf" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    test("9. Accepte TXT", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "text/plain" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    test("10. Accepte Markdown", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "text/markdown" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    test("11. Accepte ZIP", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "application/zip" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    test("12. Accepte DOCX", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    test("13. Accepte DOC", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "application/msword" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(null, true);
    });

    test("14. Rejette type non autorisé (image)", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "image/jpeg" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(expect.any(Error), false);
      expect(mockCb.mock.calls[0][0].message).toContain("Invalid file type");
    });

    test("15. Rejette type non autorisé (video)", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "video/mp4" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(expect.any(Error), false);
    });

    test("16. Rejette type non autorisé (exe)", () => {
      const mockCb = jest.fn();
      const mockFile = { mimetype: "application/x-msdownload" };
      
      fileFilterFn({}, mockFile, mockCb);
      
      expect(mockCb).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });

  describe("Configuration multer", () => {
    
    test("17. Limite de taille à 10MB", () => {
      const multerConfig = mockMulter.mock.calls[0]?.[0];
      
      expect(multerConfig.limits).toBeDefined();
      expect(multerConfig.limits.fileSize).toBe(10 * 1024 * 1024);
    });

    test("18. Storage est configuré", () => {
      const multerConfig = mockMulter.mock.calls[0]?.[0];
      
      expect(multerConfig.storage).toBeDefined();
    });

    test("19. FileFilter est configuré", () => {
      const multerConfig = mockMulter.mock.calls[0]?.[0];
      
      expect(multerConfig.fileFilter).toBeDefined();
    });
  });
});

describe("Upload Middleware - Tests d'intégration", () => {
  let upload;

  beforeEach(() => {
    jest.resetModules();
    
    // Reset mocks
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.mkdirSync = jest.fn();
    
    // Recréer le middleware
    upload = require("../../src/middlewares/uploadMiddleware");
  });

  test("20. Exporte un middleware multer", () => {
    expect(upload).toBeDefined();
    expect(typeof upload).toBe('object');
  });

  test("21. Le middleware a une méthode single", () => {
    // Créer une instance de multer mockée
    const mockMulterInstance = { single: jest.fn().mockReturnValue(jest.fn()) };
    const multer = require("multer");
    multer.mockReturnValue(mockMulterInstance);
    
    const uploadMiddleware = require("../../src/middlewares/uploadMiddleware");
    
    expect(uploadMiddleware.single).toBeDefined();
  });
});