const pool = require('../config/db');

const Service = {
    create: async (name, department_id, fee) => {
        const result = await pool.query(
            'INSERT INTO services (name, department_id, fee) VALUES ($1, $2, $3) RETURNING *',
            [name, department_id, fee]
        );
        return result.rows[0]
    },

    findAll: async () => {
        const result = await pool.query('SELECT * FROM services');
        return result.rows;
    },

};

module.exports = Service