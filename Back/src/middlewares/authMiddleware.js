const jwt = require("jsonwebtoken");

module.exports = function(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ S'assurer que req.user a l'ID correctement
    req.user = {
      id: String(decoded.id),  // ✅ Convertir en string pour éviter les problèmes MongoDB
      role: decoded.role,
      originalId: decoded.id  // Debug
    };
    
    console.log("🔐 authMiddleware decoded token:", { 
      tokenId: decoded.id, 
      tokenType: typeof decoded.id,
      convertedId: String(decoded.id),
      role: decoded.role,
      path: req.path 
    });
    
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(403).json({ message: "Invalid token" });
  }
};

