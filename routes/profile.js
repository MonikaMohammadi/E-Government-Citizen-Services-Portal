const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { validateProfileUpdate } = require('../middlewares/validationMiddleware');
const profileController = require('../controllers/profileController');

// All profile routes require authentication
router.use(isAuthenticated);

// View profile
router.get('/', profileController.viewProfile);

// Update profile
router.post('/update', validateProfileUpdate, profileController.updateProfile);

// Change password
router.post('/change-password', profileController.changePassword);

module.exports = router;