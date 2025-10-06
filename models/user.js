const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    create: async ({name, email, password, role}) => {
        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, email, hashed, role]
        );
        return result.rows[0]
    },

    findByEmail: async (email) => {
        const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
        return result.rows[0];
    },

    findById: async (id) => {
        const result = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
        return result.rows[0];
    }
};


module.exports = User;