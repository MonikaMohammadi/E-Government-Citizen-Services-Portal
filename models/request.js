const pool = require('../config/db');

const Request = {
    create: async (citizen_id, service_id) => {
        const result = await pool.query(
            'INSERT INTO requests (citizen_id, service_id, status, submitted_at) VALUES ($1, $2, $3, Now()) RETURNING *',
            [citizen_id, service_id, 'Pending']
        );
        return result.rows[0]
    },

    findByCitizen: async (citizen_id) => {
        const result = await pool.query(
            `SELECT r.id, r.status, r.submitted_at, s.name AS service_name
             FROM requests r
             JOIN services s ON r.service_id = s.id
             WHERE r.user_id=$1`,
            [citizen_id]);
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query(
            'SELECT * FROM requests WHERE id=$1', [id]);
        return result.rows[0];
    },

    updateStatus: async (id, status) => {
        await pool.query(
            'UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2',
            [status, id]
        );
    }
};

module.exports = Request;