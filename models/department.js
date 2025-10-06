const pool = require('../config/db');

const Department = {
    create: async (name) => {
        const result = await pool.query(
            'INSERT INTO departments (name) VALUES ($1) RETURNING *',
            [name]
        );
        return result.rows[0]
    },

    findAll: async () => {
        const result = await pool.query('SELECT * FROM departments');
        return result.rows;
    },

};

module.exports = Department;