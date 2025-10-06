const pool = require('../config/db');

// Citizen Dashboard
exports.dashboard = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.redirect('/login'); 
        }

        // Fetch citizen info
        const citizenResult = await pool.query(
            'SELECT id, name, email FROM users WHERE id=$1',
            [userId]
        );
        const citizen = citizenResult.rows[0];

        // Fetch requests of this citizen
        const requestsResult = await pool.query(`
            SELECT r.id, s.name AS service_name, r.status, r.submitted_at
            FROM requests r
            JOIN services s ON r.service_id = s.id
            WHERE r.user_id = $1
            ORDER BY r.submitted_at DESC
        `, [userId]);

        const notifications = await pool.query(`
            SELECT id, message, is_read, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        res.render('citizen/dashboard', {
            citizen,
            requests: requestsResult.rows,
            notifications: notifications.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Apply Service Page
exports.applyServicePage = async (req, res) => {
    try {
        const services = await pool.query('SELECT * FROM services ORDER BY name ASC');
        res.render('citizen/applyService', { services: services.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Submit Service Request
exports.submitService = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { service_id } = req.body;

        const newRequest = await pool.query(
            'INSERT INTO requests (user_id, service_id, status, submitted_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
            [userId, service_id, 'submitted']
        );

        const requestId = newRequest.rows[0].id;

        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                await pool.query(
                    'INSERT INTO documents (request_id, file_path) VALUES ($1, $2)',
                    [requestId, file.path]
                );
            }
        }

        res.redirect('/citizen/dashboard');

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Request Detail
exports.requestDetail = async (req, res) => {
    try {
        const requestId = req.params.id;

        const requestResult = await pool.query(`
            SELECT r.id, s.name AS service_name, r.status, r.submitted_at
            FROM requests r
            JOIN services s ON r.service_id = s.id
            WHERE r.id=$1
        `, [requestId]);


        const documentsResult = await pool.query(
            'SELECT * FROM documents WHERE request_id=$1',
            [requestId]
        );

        const request = requestResult.rows[0];
        if (!request) {
            return res.status(404).send('Request not found');
        }

        if (request.submitted_at && !(request.submitted_at instanceof Date)) {
            request.submitted_at = new Date(request.submitted_at);
        }
        res.render('citizen/requestDetail', {
            request,
            documents: documentsResult.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};


// Notifications
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.session.userId;
        const notifications = await pool.query(
            'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC',
            [userId]
        );

        res.render('citizen/notifications', { notifications: notifications.rows });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading notifications');
    }
};

exports.markNotificationRead = async (req, res) => {
  const notificationId = req.params.id;
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [notificationId]);
    res.redirect('/citizen/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error marking notification as read');
  }
};

exports.getPaymentPage = async (req, res) => {
    const requestId = req.params.id;
    res.render('citizen/payment', { requestId });
};

exports.postPayment = async (req, res) => {
    const requestId = req.params.id;

    try {
        await pool.query(
            `INSERT INTO payments (request_id, amount, status, payment_method, created_at)
             VALUES ($1, 50.00, 'completed', 'credit_card', NOW())`,
            [requestId]
        );

        await pool.query(
            `UPDATE requests SET payment_status = 'paid' WHERE id = $1`,
            [requestId]
        );

        res.render('citizen/paymentSuccess', { requestId });
    } catch (err) {
        console.error(err);
        res.status(500).send('Payment failed');
    }
};
