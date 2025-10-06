const pool = require('../config/db');

exports.searchPage = (req,res) => {
    res.render('shared/search', { results: null, filters: {} });
};

exports.searchRequests = async (req, res) => {
    const { name, requestId, status, serviceType, startDate, endDate } = req.body;

    let query = `
        SELECT r.id, r.status, r.submitted_at AS created_at, u.name AS citizen_name, s.name AS service_name
        FROM requests r
        JOIN users u ON r.user_id = u.id
        JOIN services s ON r.service_id = s.id
        WHERE 1=1`;
    
    const values = [];
    let index = 1;

    if (name) {
        query += ` AND u.name ILIKE $${index++}`;
        values.push(`%${name}%`);
    }
    if (requestId) {
        query += ` AND r.id = $${index++}`;
        values.push(requestId);
    }
    if (status) {
        query += ` AND r.status = $${index++}`;
        values.push(status);
    }
    if (serviceType) {
        query += ` AND s.name ILIKE $${index++}`;
        values.push(`%${serviceType}%`);
    }
    if (startDate && endDate) { 
        query += ` AND r.submitted_at BETWEEN $${index++}::date AND $${index++}::date`;
        values.push(startDate, endDate);
    }

    try {
        const results = await pool.query(query, values);

        // Convert submitted_at to a proper JS Date string
        const formattedResults = results.rows.map(r => {
            let formattedDate = null;
            if (r.created_at) {  // Use the alias from the query
                const d = new Date(r.created_at);
                const options = { 
                    year: 'numeric', month: 'numeric', day: 'numeric', 
                    hour: 'numeric', minute: 'numeric', second: 'numeric', 
                    hour12: true 
                };
                formattedDate = d.toLocaleString('en-US', options);
            }
            return { ...r, submitted_at: formattedDate }; // keep key as submitted_at for EJS
        });

        res.render('shared/search', { results: formattedResults, filters: req.body });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error searching requests');
    }
};
