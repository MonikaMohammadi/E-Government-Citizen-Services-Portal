const pool = require('../config/db');
const transporter = require('../config/email');

async function sendNotification(userId, message, sendEmail = true) {
    try {
        // Save notification to database
        await pool.query(
            'INSERT INTO notifications (user_id, message, created_at, is_read) VALUES ($1, $2, NOW(), false)',
            [userId, message]
        );

        // Send email notification if enabled
        if (sendEmail) {
            // Get user email
            const userResult = await pool.query(
                'SELECT email, name FROM users WHERE id=$1',
                [userId]
            );

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];

                const mailOptions = {
                    from: process.env.EMAIL_FROM || 'noreply@egov.com',
                    to: user.email,
                    subject: 'E-Government Portal Notification',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px;">
                                <h2 style="color: #333;">Hello ${user.name},</h2>
                                <p style="color: #555; font-size: 16px;">${message}</p>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                                <p style="color: #888; font-size: 14px;">
                                    Please log in to your account to view more details.
                                </p>
                                <a href="${process.env.APP_URL || 'http://localhost:3000'}/login"
                                   style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                                    Login to Portal
                                </a>
                                <p style="color: #aaa; font-size: 12px; margin-top: 20px;">
                                    This is an automated message. Please do not reply to this email.
                                </p>
                            </div>
                        </div>
                    `
                };

                // Send email asynchronously
                transporter.sendMail(mailOptions).catch(err => {
                    console.log('Error sending email notification:', err.message);
                });
            }
        }

    } catch (err) {
        console.log('Error sending notification:', err);
    }
}

module.exports = sendNotification;