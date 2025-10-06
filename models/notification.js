const pool = require('../config/db');

const Notification = {
    create: async (user_id, message) => {
        const result = await pool.query(
            'INSERT INTO notifications (user_id, message, created_at, is_read) VALUES ($1, $2, NOW(), false) RETURNING *',
            [user_id, message]
        );
        return result.rows[0];
    },

    findByUser: async (user_id) => {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC', [user_id]);
        return result.rows;
    },

    findById: async (id) => {
        const result = await pool.query('SELECT * FROM notifications WHERE id=$1', 
        [id]);

        return result.rows;
    }
};

module.exports = Notification