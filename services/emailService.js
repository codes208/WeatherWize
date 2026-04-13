const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.RESEND_FROM || 'WeatherWize Alerts <onboarding@resend.dev>';

/**
 * Sends a weather alert email to a user.
 * @param {string} toEmail   - Recipient email address
 * @param {string} username  - Recipient's username (used in greeting)
 * @param {string} message   - Alert message text
 */
async function sendAlertEmail(toEmail, username, message) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[EMAIL] RESEND_API_KEY not set — skipping email notification.');
        return;
    }

    if (!toEmail) {
        console.warn(`[EMAIL] User "${username}" has no email address — skipping.`);
        return;
    }

    const { error } = await resend.emails.send({
        from:    FROM_ADDRESS,
        to:      [toEmail],
        subject: `WeatherWize Alert: ${message}`,
        html: `
            <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #1a1a2e; color: #ffffff; border-radius: 12px;">
                <h2 style="color: #4fc3f7; margin-top: 0;">⛈ WeatherWize Alert</h2>
                <p style="font-size: 1rem; line-height: 1.6;">Hi <strong>${username}</strong>,</p>
                <p style="font-size: 1rem; line-height: 1.6;">One of your weather alerts has been triggered:</p>
                <div style="background: rgba(255,255,255,0.08); border-left: 4px solid #4fc3f7; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 1rem;">
                    ${message}
                </div>
                <p style="font-size: 0.85rem; color: #aaa; margin-top: 28px;">
                    You can manage your alerts from your
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/alerts-manager.html" style="color: #4fc3f7;">WeatherWize dashboard</a>.
                </p>
                <p style="font-size: 0.75rem; color: #666; margin-top: 8px;">
                    This is an automated notification from WeatherWize. Please do not reply to this email.
                </p>
            </div>
        `,
        text: `WeatherWize Alert\n\nHi ${username},\n\n${message}\n\nManage your alerts at ${process.env.APP_URL || 'http://localhost:3000'}/alerts-manager.html`,
    });

    if (error) {
        console.error(`[EMAIL] Failed to send alert email to ${toEmail}:`, error);
    } else {
        console.log(`[EMAIL] Alert email sent to ${toEmail}`);
    }
}

module.exports = { sendAlertEmail };
