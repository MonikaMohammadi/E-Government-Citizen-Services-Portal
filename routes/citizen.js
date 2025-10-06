const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
// const { isCitizen } = require('../middlewares/roleMiddleware')
const citizenController = require('../controllers/citizenController');
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/'});

router.use(isAuthenticated);

// Citizen dashboard
router.get('/dashboard', citizenController.dashboard);

// Apply service
router.get('/apply-service', citizenController.applyServicePage);
router.post('/apply-service', upload.array('documents'), citizenController.submitService);

// View request
router.get('/request/:id', citizenController.requestDetail);

// Payment
router.get('/pay/:id', citizenController.getPaymentPage);
router.post('/pay/:id', citizenController.postPayment);

// Notification
router.get('/notifications', citizenController.getNotifications);
router.post('/notifications/:id/mark-read', citizenController.markNotificationRead);


module.exports = router;
