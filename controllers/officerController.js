const pool = require('../config/db');

// officerController.js
exports.dashboard = async (req, res) => {
    try {
        const requests = await pool.query(`
            SELECT r.id, u.name AS citizen_name, s.name AS service_name, 
                   r.status, r.submitted_at
            FROM requests r
            JOIN users u ON r.user_id = u.id
            JOIN services s ON r.service_id = s.id
            ORDER BY r.submitted_at DESC
        `);

        res.render('officer/dashboard', { requests: requests.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading officer dashboard');
    }
};


exports.requestDetail = async (req, res) => {
    const requestId = req.params.id;

    const requestResult = await pool.query(
        `SELECT r.id, u.name AS citizen_name, s.name AS service_name, r.status, r.submitted_at
        FROM requests r 
        JOIN users u ON r.user_id=u.id 
        JOIN services s ON r.service_id=s.id 
        WHERE r.id=$1`,
        [requestId]
    );

    if (requestResult.rows.length === 0) {
        return res.status(404).send('Request not found');
    }

    const documents = await pool.query('SELECT * FROM documents WHERE request_id=$1', [requestId]);

    res.render('officer/reviewRequest', {
        request: requestResult.rows[0],
        documents: documents.rows
    });
};

exports.approveRequest = async (req, res) => {
    const requestId = req.params.id;
    await pool.query('UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2', ['Approved', requestId]);
    res.redirect('/officer/dashboard');
};

exports.rejectRequest = async (req, res) => {
    const requestId = req.params.id;
    await pool.query('UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2', ['Rejected', requestId]);
    res.redirect('/officer/dashboard');
};

exports.updateRequestStatus = async (req, res) => {
    const { requestId, status } = req.body;

    try {
        const request = await pool.query(
            'UPDATE requests SET status = $1 WHERE id = $2 RETURNING user_id',
            [status, requestId]
        );
        if (request.rows.length > 0) {
            const userId = request.rows[0].user_id;
            await pool.query(
                'INSERT INTO notifications (user_id, message, created_at) VALUES ($1, $2, NOW())',
                [userId, `Your request #${requestId} is now ${status}.`]
            );
        }

        res.redirect('/officer/dashboard');

    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating request');
    }
}


