const jwt = require("jsonwebtoken");

module.exports = function(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Anciens tokens / users sans role dans le payload → traiter comme participant (sinon roleMiddleware renvoie 403 partout)
    const raw = decoded.role;
    const role =
      raw != null && String(raw).trim() !== ""
        ? String(raw).toLowerCase().trim()
        : "participant";

    req.user = {
      id: String(decoded.id),
      role,
      originalId: decoded.id,
    };
    
    console.log("🔐 authMiddleware decoded token:", {
      tokenId: decoded.id,
      tokenType: typeof decoded.id,
      convertedId: String(decoded.id),
      roleInToken: decoded.role,
      roleUsed: role,
      path: req.path,
    });
    
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

