// controllers/authController.js
const User = require('../models/user');
const bcrypt = require('bcryptjs');

exports.getLogin = (req, res) => {
    res.render('auth/login', { error: null, session: req.session });
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email);
        if (!user) return res.render('auth/login', { error: 'User not found', session: req.session });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.render('auth/login', { error: 'Incorrect password', session: req.session });

        // Save session
        req.session.userId = user.id;
        req.session.role = user.role;

        // Redirect based on role
        if (user.role === 'citizen') return res.redirect('/citizen/dashboard');
        if (user.role === 'officer' || user.role === 'department_head') return res.redirect('/officer/dashboard');
        if (user.role === 'admin') return res.redirect('/admin/dashboard');

    } catch (err) {
        console.log(err);
        res.render('auth/login', { error: 'Something went wrong, please try again', session: req.session });
    }
};

exports.getRegister = (req, res) => {
    res.render('auth/register', { error: null, session: req.session });
};

exports.postRegister = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.render('auth/register', { error: 'Email already registered', session: req.session });
        }

        await User.create({ name, email, password, role: role || 'citizen' });
        res.redirect('/login');
    } catch (err) {
        console.log(err);
        res.render('auth/register', { error: 'Error registering user', session: req.session });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};
