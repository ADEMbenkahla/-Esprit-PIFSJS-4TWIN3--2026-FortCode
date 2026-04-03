module.exports = function(...allowedRoles) {
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRole = String(req.user.role || "").toLowerCase().trim();
    const allowed = allowedRoles.map((r) => String(r).toLowerCase().trim());

    if (!userRole || !allowed.includes(userRole)) {
      return res.status(403).json({
        message: "Forbidden: Insufficient permissions",
        detail: `This route requires one of: ${allowedRoles.join(", ")}. Your token role is: ${req.user.role || "missing"}.`,
      });
    }

    next();
  };
};
