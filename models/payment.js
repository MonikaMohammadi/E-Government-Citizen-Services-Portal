const pool = require('../config/db');

const Payment = {
    create: async (request_id, amount, status) => {
        const result = await pool.query(
            'INSERT INTO payments (request_id, amount, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
            [request_id, amount, status]
        );
        return result.rows[0]
    },

    findByRequest: async (request_id) => {
        const result = await pool.query(
            'SELECT * FROM payments WHERE request_id=$1', [request_id]);
        return result.rows;
    }
};

module.exports = Payment;