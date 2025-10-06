const pool = require('../config/db');

const Document = {
    create: async (request_id, file_path) => {
        const result = await pool.query(
            'INSERT INTO documents (request_id, file_path) VALUES ($1, $2) RETURNING *',
            [request_id, file_path]
        );
        return result.rows[0]
    },

    findByRequest: async (request_id) => {
        const result = await pool.query(
            'SELECT * FROM documents WHERE request_id=$1', 
            [request_id]);
        return result.rows;
    }
};


module.exports = Document