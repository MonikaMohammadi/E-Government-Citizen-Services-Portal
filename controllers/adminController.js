const pool = require('../config/db');
const bcrypt = require('bcryptjs');


// Dashboard
exports.dashboard = async (req, res) => {
   try {
       const requests = await pool.query(`
        SELECT r.id, u.name AS citizen, s.name AS service, r.status, r.submitted_at
        FROM requests r
        JOIN users u ON r.user_id = u.id
        JOIN services s ON r.service_id = s.id
        ORDER BY r.submitted_at DESC
    `);
        const users = await pool.query('SELECT * FROM users');
        const services = await pool.query('SELECT * FROM services');
        const departments = await pool.query('SELECT * FROM departments');

        res.render('admin/dashboard', { 
            requests: requests.rows, 
            users:users.rows,
            services:services.rows, 
            departments:departments.rows
        });
   } catch (err) {
        console.error('Dashboard', err);
        res.status(500).send('Server Error')
   }
};


// Departments
exports.listDepartments = async (req, res) => {
   try {
    const departments = await pool.query('SELECT * FROM departments ORDER BY id ASC');
    res.render('admin/departments', { departments:departments.rows});
   } catch (err) {
    console.error('List Department Error', err);
    res.status(500).send('Server Error');
   }
}; 

exports.addDepartment = async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('INSERT INTO departments (name) VALUES ($1)', [name]);
        res.redirect('/admin/departments')
    } catch (err) {
        console.error('Add Department Error', err);
        res.status(500).send('Server Error');
    }
};

exports.deleteDepartment = async (req, res) => {
    try {
       await pool.query('DELETE FROM departments WHERE id=$1', [req.params.id]);
       res.redirect('/admin/departments') 
    } catch (err) {
        console.error('Delete Department Error', err);
        res.status(500).send('Server Error');
    }
}


// Services
exports.listServices = async (req, res) => {
    try {
        const services = await pool.query(`
            SELECT s.*, d.name as department_name 
            FROM services s 
            JOIN departments d ON s.department_id = d.id 
            ORDER BY s.id ASC`);

            const departments = await pool.query('SELECT * FROM departments ORDER BY id ASC')
        
            res.render('admin/services', { services:services.rows, departments: departments.rows});
    } catch (err) {
        console.error('List Services Error', err);
        res.status(500).send('Server Error')
    }
};

exports.addService = async (req, res) => {
    try {
        const { name, department_id, fee } = req.body;
        await pool.query('INSERT INTO services (name, department_id, fee) VALUES ($1,$2,$3)', [name, department_id, fee]);
        res.redirect('/admin/services');
    } catch (err) {
        console.error('Add Service Error', err);
        res.status(500).send('Server Error')
    }
};

exports.deleteService = async (req, res)=> {
    try {
        await pool.query('DELETE FROM services WHERE id=$1', [req.params.id]);
        res.redirect('/admin/services');
    } catch (err) {
        console.error('Delete Service Error', err);
        res.status(500).send('Server Error')
    }
};

// Users
exports.listUsers = async (req, res) => {
    try {
        const users = await pool.query('SELECT id, name, email, role FROM users ORDER BY id ASC');
        res.render('admin/users', { users:users.rows});
    } catch (err) {
        console.error('List User Error', err);
        res.status(500).send('Server Error')
    }
};

exports.addUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4)', [name, email, hashed, role]);
    res.redirect('/admin/users');
};

exports.updateUserRole = async (req, res) => {
    try {
    await pool.query('UPDATE users SET role=$1 WHERE id=$2', 
    [req.body.role, req.params.id]);
    res.redirect('/admin/users')
  } catch (err) {
        console.error('Update User Role Error',err);
        res.status(500).send('Server Error')
  }
}

exports.deleteUser = async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Delete User Error', err);
        res.status(500).send('Server Error');
    }
};


// Reports
exports.viewReports = async (req, res) => {
    try {
        // Get requests by status
        const statusReport = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM requests
            GROUP BY status
            ORDER BY status
        `);

        // Get requests by service
        const servicesReport = await pool.query(`
            SELECT s.name, COUNT(r.id) as count
            FROM services s
            LEFT JOIN requests r ON s.id = r.service_id
            GROUP BY s.name
            ORDER BY count DESC
        `);

        // Get requests by department
        const departmentReport = await pool.query(`
            SELECT d.name, COUNT(r.id) as count
            FROM departments d
            LEFT JOIN services s ON d.id = s.department_id
            LEFT JOIN requests r ON s.id = r.service_id
            GROUP BY d.name
            ORDER BY count DESC
        `);

        // Get total revenue from paid requests
        const revenueReport = await pool.query(`
            SELECT SUM(s.fee) as total_revenue
            FROM requests r
            JOIN services s ON r.service_id = s.id
            WHERE r.payment_status = 'Paid'
        `);

    res.render('admin/reports', {
        reports: statusReport.rows,
        servicesReport: servicesReport.rows,
        departmentReport: departmentReport.rows,
        totalRevenue: revenueReport.rows[0].total_revenue || 0
    })
    } catch (err) {
        console.error('View Reports Error', err);
        res.status(500).send('Server Error')
    }
};

// Update Request Status (Approve/Reject/Pending/UnderReview)

exports.updateRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const requestId = req.params.id;

        console.log("Updating request:", requestId, "to status:", status);

        const result = await pool.query(
            'UPDATE requests SET status=$1 WHERE id=$2 RETURNING user_id',
            [status, requestId]
        );

        console.log("Update result:", result.rows);

        if (result.rows.length > 0) {
            const userId = result.rows[0].user_id;

            await pool.query(
                'INSERT INTO notifications (user_id, message, created_at) VALUES ($1, $2, NOW())',
                [userId, `Your request #${requestId} has been set to ${status}.`]
            );
        }

        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Update Request Status Error:', err);
        res.status(500).send('Server Error');
    }
};



