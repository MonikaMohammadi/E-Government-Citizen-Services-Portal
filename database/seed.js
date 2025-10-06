const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        console.log('Starting database seeding...');

        // Clean existing data (optional - comment out in production)
        console.log('Cleaning existing data...');
        await pool.query('TRUNCATE TABLE notifications CASCADE');
        await pool.query('TRUNCATE TABLE payments CASCADE');
        await pool.query('TRUNCATE TABLE documents CASCADE');
        await pool.query('TRUNCATE TABLE requests CASCADE');
        await pool.query('TRUNCATE TABLE services CASCADE');
        await pool.query('TRUNCATE TABLE departments CASCADE');
        await pool.query('TRUNCATE TABLE users CASCADE');

        // Create departments
        console.log('Creating departments...');
        const departments = await pool.query(`
            INSERT INTO departments (name, description) VALUES
            ('Interior', 'Handles passports, national IDs, and civil affairs'),
            ('Commerce', 'Handles business licenses and commercial registrations'),
            ('Housing', 'Handles land registration and property documents'),
            ('Transportation', 'Handles driving licenses and vehicle registration'),
            ('Health', 'Handles health certificates and medical licenses'),
            ('Education', 'Handles education certificates and school registrations')
            RETURNING id, name
        `);

        const deptMap = {};
        departments.rows.forEach(dept => {
            deptMap[dept.name] = dept.id;
        });

        // Create services
        console.log('Creating services...');
        await pool.query(`
            INSERT INTO services (name, department_id, fee, processing_time_days, description) VALUES
            ('Passport Renewal', ${deptMap['Interior']}, 50.00, 10, 'Renew your passport online'),
            ('National ID Update', ${deptMap['Interior']}, 20.00, 5, 'Update your national ID information'),
            ('Birth Certificate', ${deptMap['Interior']}, 15.00, 3, 'Request a birth certificate copy'),
            ('Business License', ${deptMap['Commerce']}, 100.00, 15, 'Apply for a new business license'),
            ('Trade License Renewal', ${deptMap['Commerce']}, 75.00, 7, 'Renew your trade license'),
            ('Land Registration', ${deptMap['Housing']}, 200.00, 30, 'Register land property'),
            ('Property Tax Payment', ${deptMap['Housing']}, 0.00, 1, 'Pay property taxes online'),
            ('Driving License Renewal', ${deptMap['Transportation']}, 30.00, 7, 'Renew your driving license'),
            ('Vehicle Registration', ${deptMap['Transportation']}, 80.00, 10, 'Register a new vehicle'),
            ('Health Certificate', ${deptMap['Health']}, 25.00, 5, 'Get health certificate for work'),
            ('Medical License', ${deptMap['Health']}, 150.00, 20, 'Apply for medical practice license'),
            ('School Certificate', ${deptMap['Education']}, 10.00, 5, 'Request school certificates'),
            ('University Transcript', ${deptMap['Education']}, 20.00, 7, 'Request university transcript')
        `);

        // Hash password for all test users
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create users
        console.log('Creating users...');

        // Admin user
        await pool.query(`
            INSERT INTO users (name, email, password, role, phone, address, created_at) VALUES
            ('Admin User', 'admin@egov.com', $1, 'admin', '+93 72 900 0000', 'Herat', NOW())
        `, [hashedPassword]);

        // Department heads
        const deptHeads = await pool.query(`
            INSERT INTO users (name, email, password, role, department_id, job_title, phone, address, created_at) VALUES
            ('Ahmad', 'ahmad.interior@egov.com', $1, 'department_head', ${deptMap['Interior']}, 'Department Head', '+93 72 000 1120', 'Kabul', NOW()),
            ('Jawad', 'jawad.commerce@egov.com', $1, 'department_head', ${deptMap['Commerce']}, 'Department Head', '+93 72 000 1120', 'Mazar', NOW()),
            ('Sara', 'sara.housing@egov.com', $1, 'department_head', ${deptMap['Housing']}, 'Department Head', '+93 72 000 1120', 'Herat', NOW())
            RETURNING id, name
        `, [hashedPassword]);

        // Officers
        const officers = await pool.query(`
            INSERT INTO users (name, email, password, role, department_id, job_title, phone, address, created_at) VALUES
            ('Ali', 'ali@egov.com', $1, 'officer', ${deptMap['Interior']}, 'Senior Officer', '+93 40 443 4550', 'Herat', NOW()),
            ('Bahram', 'bahram@egov.com', $1, 'officer', ${deptMap['Commerce']}, 'Processing Officer', '+93 40 442 4551', 'Jalal Abad', NOW()),
            ('Sabor', 'sabor@egov.com', $1, 'officer', ${deptMap['Housing']}, 'Review Officer', '+93 40 441 4552', 'Qandahar', NOW()),
            ('Dawood', 'dawood@egov.com', $1, 'officer', ${deptMap['Transportation']}, 'Senior Officer', '+93 40 440 4553', 'Farah', NOW())
            RETURNING id, name
        `, [hashedPassword]);

        // Citizens 
        const citizens = await pool.query(`
            INSERT INTO users (name, email, password, role, national_id, date_of_birth, phone, address, created_at) VALUES
            ('Morsal', 'morsal@gmail.com', $1, 'citizen', 'AFG123456', '1990-05-15', '+93 74 567 8910', 'Mahbas St, Herat', NOW()),
            ('Hameda', 'hameda@gmail.com', $1, 'citizen', 'AFG234567', '1985-08-20', '+93 74 567 8911', '64 Metra St, Herat', NOW()),
            ('Sani', 'sani@gmail.com', $1, 'citizen', 'AFG345678', '2000-03-10', '+93 74 567 8912', 'khohal Khan St, Kabul', NOW()),
            ('Sarah', 'sarah@gmail.com', $1, 'citizen', 'AFG456789', '1988-11-25', '+93 44 567 8013', 'Emam Bokhari St, Ghor', NOW()),
            ('Timor', 'timor@gmail.com', $1, 'citizen', 'AFG567890', '1995-07-30', '+93 74 567 8914', 'Pashton Pol, Herat', NOW())
            RETURNING id, name
        `, [hashedPassword]);

        // Create sample requests
        console.log('Creating sample requests...');
        const services = await pool.query('SELECT id, name FROM services');
        const statuses = ['submitted', 'under_review', 'approved', 'rejected', 'pending'];

        for (let citizen of citizens.rows) {
            // Each citizen gets 2-3 random service requests
            const numRequests = Math.floor(Math.random() * 2) + 2;

            for (let i = 0; i < numRequests; i++) {
                const randomService = services.rows[Math.floor(Math.random() * services.rows.length)];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                const randomOfficer = officers.rows[Math.floor(Math.random() * officers.rows.length)];

                const request = await pool.query(`
                    INSERT INTO requests (user_id, service_id, status, payment_status, submitted_at, updated_at, reviewed_by)
                    VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days', NOW(), $5)
                    RETURNING id
                `, [
                    citizen.id,
                    randomService.id,
                    randomStatus,
                    randomStatus === 'approved' ? 'paid' : 'unpaid',
                    randomStatus === 'approved' || randomStatus === 'rejected' ? randomOfficer.id : null
                ]);

                // Add sample documents for each request
                await pool.query(`
                    INSERT INTO documents (request_id, file_path, file_name, file_type, uploaded_at)
                    VALUES
                    ($1, '/uploads/sample-doc1.pdf', 'identity-proof.pdf', 'application/pdf', NOW()),
                    ($1, '/uploads/sample-doc2.jpg', 'photo.jpg', 'image/jpeg', NOW())
                `, [request.rows[0].id]);

                // Add notifications for status changes
                if (randomStatus !== 'submitted') {
                    await pool.query(`
                        INSERT INTO notifications (user_id, message, is_read, created_at)
                        VALUES ($1, $2, $3, NOW() - INTERVAL '${Math.floor(Math.random() * 10)} days')
                    `, [
                        citizen.id,
                        `Your request for ${randomService.name} has been ${randomStatus}`,
                        Math.random() > 0.5
                    ]);
                }

                // Add payment record for paid requests
                if (randomStatus === 'approved') {
                    await pool.query(`
                        INSERT INTO payments (request_id, amount, status, payment_method, created_at)
                        VALUES ($1, $2, 'completed', 'credit_card', NOW() - INTERVAL '${Math.floor(Math.random() * 20)} days')
                    `, [request.rows[0].id, Math.random() * 100 + 10]);
                }
            }
        }

        console.log('\n===========================================');
        console.log('Database seeding completed successfully!');
        console.log('===========================================\n');
        console.log('Test Users (all passwords are: password123):');
        console.log('----------------------------------------------');
        console.log('Admin:');
        console.log('  Email: admin@egov.com');
        console.log('\nDepartment Heads:');
        console.log('  Interior: ahmad.interior@egov.com');
        console.log('  Commerce: jawad.commerce@egov.com');
        console.log('  Housing: sara.housing@egov.com');
        console.log('\nOfficers:');
        console.log('  ali@egov.com');
        console.log('  bahram@egov.com');
        console.log('  bahram@egov.com');
        console.log('  dawood@egov.com');
        console.log('\nCitizens:');
        console.log('  morsal@gmail.com');
        console.log('  hameda@gmail.com');
        console.log('  sani@gmail.com');
        console.log('  sarah@gmail.com');
        console.log('  timor@gmail.com');
        console.log('===========================================\n');

        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
}

// Run seed function
seed();