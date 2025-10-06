const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { isOfficerOrDepartmentHead } = require('../middlewares/roleMiddleware');
const officerController = require('../controllers/officerController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(isAuthenticated, isOfficerOrDepartmentHead);

router.get('/dashboard', officerController.dashboard);
router.get('/request/:id', officerController.requestDetail);
router.post('/request/:id/approve', officerController.approveRequest);
router.post('/request/:id/reject', officerController.rejectRequest);

module.exports= router