const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');


router.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        switch(req.session.role) {
            case 'citizen':
                return res.redirect('/citizen/dashboard');
            case 'officer':
            case 'department_head':
                return res.redirect('/officer/dashboard');
            case 'admin':
                return res.redirect('/admin/dashboard');
            default:
                return res.redirect('/login');
        }
    } else {
        res.redirect('/login')
    }
});

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);
router.get('/logout', authController.logout);


module.exports = router;