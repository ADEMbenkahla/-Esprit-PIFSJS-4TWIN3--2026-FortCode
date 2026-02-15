const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');

// Protect all routes
router.use(auth);

// Admin Routes
router.get('/', role('admin'), activityController.getLogs);
router.get('/me', activityController.getMyLogs); // Authenticated user (any role)
router.get('/:id', role('admin'), activityController.getLogById);

module.exports = router;
