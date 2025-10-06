const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/roleMiddleware');
const adminController = require('../controllers/adminController');

router.use(isAuthenticated, isAdmin);

// Dashboard
router.get('/dashboard', adminController.dashboard);


// Departments
router.get('/departments', adminController.listDepartments);
router.post('/departments/add', adminController.addDepartment);
router.post('/departments/delete/:id', adminController.deleteDepartment);

// Services
router.get('/services', adminController.listServices);
router.post('/services/add', adminController.addService);
router.post('/services/delete/:id', adminController.deleteService)

// Users
router.get('/users', adminController.listUsers);
router.post('/users/add', adminController.addUser);
router.post('/users/update/:id', adminController.updateUserRole)
router.post('/users/delete/:id', adminController.deleteUser);

// Reports
router.get('/reports', adminController.viewReports)

// Update request status (Approve/Reject)
router.post('/requests/update/:id', adminController.updateRequestStatus);

module.exports = router