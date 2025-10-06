const { Pool } = require('pg')
require('dotenv').config();


const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
})


pool.connect()
    .then(()=> console.log('Connected to DB'))
    .catch(err => console.error('DB connection err:', err))
    
module.exports = pool