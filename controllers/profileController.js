const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// View Profile
exports.viewProfile = async (req, res) => {
    try {
        const userId = req.session.userId;

        const result = await pool.query(
            `SELECT id, name, email, role, phone, address, national_id, date_of_birth,
                    department_id, job_title, created_at
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = result.rows[0];

        // If user is an officer/department head, get department name
        if ((user.role === 'officer' || user.role === 'department_head') && user.department_id) {
            const deptResult = await pool.query(
                'SELECT name FROM departments WHERE id = $1',
                [user.department_id]
            );
            user.department_name = deptResult.rows[0]?.name || 'Not assigned';
        }

        res.render('shared/profile', { user, success: req.flash('success'), error: req.flash('error') });

    } catch (err) {
        console.error('Error viewing profile:', err);
        res.status(500).send('Server Error');
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { name, phone, address, national_id, date_of_birth } = req.body;

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (phone) {
            updates.push(`phone = $${paramCount++}`);
            values.push(phone);
        }
        if (address) {
            updates.push(`address = $${paramCount++}`);
            values.push(address);
        }
        if (national_id) {
            updates.push(`national_id = $${paramCount++}`);
            values.push(national_id);
        }
        if (date_of_birth) {
            updates.push(`date_of_birth = $${paramCount++}`);
            values.push(date_of_birth);
        }

        if (updates.length === 0) {
            req.flash('error', 'No fields to update');
            return res.redirect('/profile');
        }

        values.push(userId);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`;

        await pool.query(query, values);

        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');

    } catch (err) {
        console.error('Error updating profile:', err);
        req.flash('error', 'Error updating profile');
        res.redirect('/profile');
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/profile');
        }

        // Get user's current password
        const result = await pool.query(
            'SELECT password FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            req.flash('error', 'User not found');
            return res.redirect('/profile');
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!validPassword) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/profile');
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
        );

        req.flash('success', 'Password changed successfully');
        res.redirect('/profile');

    } catch (err) {
        console.error('Error changing password:', err);
        req.flash('error', 'Error changing password');
        res.redirect('/profile');
    }
};

module.exports = exports;