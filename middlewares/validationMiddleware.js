const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('back');
    }
    next();
};

// User registration validation
const validateRegistration = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain both letters and numbers'),
    body('confirmPassword')
        .notEmpty().withMessage('Password confirmation is required')
        .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
    handleValidationErrors
];

// User login validation
const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

// Service request validation
const validateServiceRequest = [
    body('service_id')
        .notEmpty().withMessage('Service is required')
        .isInt({ min: 1 }).withMessage('Invalid service selected'),
    handleValidationErrors
];

// Department validation
const validateDepartment = [
    body('name')
        .trim()
        .notEmpty().withMessage('Department name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Department name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s&-]+$/).withMessage('Department name contains invalid characters'),
    handleValidationErrors
];

// Service validation
const validateService = [
    body('name')
        .trim()
        .notEmpty().withMessage('Service name is required')
        .isLength({ min: 2, max: 200 }).withMessage('Service name must be between 2 and 200 characters'),
    body('department_id')
        .notEmpty().withMessage('Department is required')
        .isInt({ min: 1 }).withMessage('Invalid department selected'),
    body('fee')
        .optional()
        .isFloat({ min: 0 }).withMessage('Fee must be a positive number'),
    handleValidationErrors
];

// User creation validation (by admin)
const validateUserCreation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
        .notEmpty().withMessage('Role is required')
        .isIn(['citizen', 'officer', 'department_head', 'admin']).withMessage('Invalid role selected'),
    handleValidationErrors
];

// ID parameter validation
const validateId = [
    param('id')
        .notEmpty().withMessage('ID is required')
        .isInt({ min: 1 }).withMessage('Invalid ID'),
    handleValidationErrors
];

// Search validation
const validateSearch = [
    query('name')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Search name too long'),
    query('requestId')
        .optional()
        .isInt({ min: 1 }).withMessage('Invalid request ID'),
    query('status')
        .optional()
        .isIn(['submitted', 'under_review', 'approved', 'rejected', 'pending']).withMessage('Invalid status'),
    query('startDate')
        .optional()
        .isISO8601().withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601().withMessage('Invalid end date format')
        .custom((value, { req }) => {
            if (req.query.startDate && value < req.query.startDate) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
    handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('phone')
        .optional()
        .trim()
        .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone number format'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Address too long'),
    body('date_of_birth')
        .optional()
        .isISO8601().withMessage('Invalid date format')
        .custom((value) => {
            const dob = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            if (age < 18 || age > 120) {
                throw new Error('Invalid age');
            }
            return true;
        }),
    handleValidationErrors
];

// Status update validation
const validateStatusUpdate = [
    body('status')
        .notEmpty().withMessage('Status is required')
        .isIn(['submitted', 'under_review', 'approved', 'rejected']).withMessage('Invalid status'),
    body('review_notes')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Review notes too long'),
    body('rejection_reason')
        .if(body('status').equals('rejected'))
        .notEmpty().withMessage('Rejection reason is required when rejecting a request')
        .isLength({ max: 500 }).withMessage('Rejection reason too long'),
    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateServiceRequest,
    validateDepartment,
    validateService,
    validateUserCreation,
    validateId,
    validateSearch,
    validateProfileUpdate,
    validateStatusUpdate
};