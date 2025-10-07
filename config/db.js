const { Pool } = require('pg')
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})


pool.connect()
    .then(()=> console.log('Connected to DB'))
    .catch(err => console.error('DB connection err:', err))
    
module.exports = pool