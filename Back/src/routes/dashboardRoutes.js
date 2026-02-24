const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');

// Protect all routes
router.use(auth);

// Admin only
router.get('/stats', role('admin'), dashboardController.getStats);

module.exports = router;
