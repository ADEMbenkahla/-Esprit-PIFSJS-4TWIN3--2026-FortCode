const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../../uploads/exercises");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const userId = req.user?.id || "anonymous";
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${userId}_${uniqueSuffix}_${baseName}${ext}`);
  }
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/json"
]);

const allowedExtensions = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".doc",
  ".docx",
  ".zip",
  ".7z",
  ".json"
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const typeOk = allowedMimeTypes.has(file.mimetype);
  const extOk = allowedExtensions.has(ext);

  if (typeOk || extOk) {
    cb(null, true);
    return;
  }

  cb(new Error("Invalid exercise file type. Allowed: PDF, TXT, MD, DOC, DOCX, ZIP, 7Z, JSON."), false);
};

const uploadExercise = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter
});

module.exports = uploadExercise;
