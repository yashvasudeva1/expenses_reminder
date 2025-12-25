/**
 * Email Service
 * Handles sending email notifications using Nodemailer
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter = null;

/**
 * Initialize email transporter
 */
function initializeTransporter() {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Add timeouts to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
    // Use pooling for better reliability
    pool: true,
    maxConnections: 1,
    maxMessages: 10
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.log('⚠️  Email service not configured:', error.message);
      console.log('   Configure SMTP settings in .env file to enable email reminders');
    } else {
      console.log('✅ Email service ready');
    }
  });
}

/**
 * Send expense reminder email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.userName - User's name
 * @param {string} params.expenseName - Name of the expense
 * @param {number} params.amount - Expense amount
 * @param {string} params.dueDate - Due date of the expense
 * @param {string} params.category - Expense category
 */
async function sendReminderEmail({ to, userName, expenseName, amount, dueDate, category }) {
  if (!transporter) {
    console.log('Email transporter not initialized');
    return { success: false, error: 'Email service not configured' };
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);

  const formattedDate = new Date(dueDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Expense Reminder'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
    to,
    subject: `💰 Reminder: ${expenseName} - ${formattedAmount} due soon!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Expense Reminder</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">💰 Expense Reminder</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
              Hi <strong>${userName}</strong>,
            </p>
            
            <p style="color: #666; font-size: 15px; line-height: 1.6;">
              This is a friendly reminder about your upcoming expense:
            </p>
            
            <div style="background: #f8f9fc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px;">Expense</td>
                  <td style="padding: 8px 0; color: #333; font-size: 16px; font-weight: 600; text-align: right;">${expenseName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px;">Amount</td>
                  <td style="padding: 8px 0; color: #667eea; font-size: 20px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px;">Category</td>
                  <td style="padding: 8px 0; color: #333; font-size: 16px; text-align: right;">${category}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #888; font-size: 14px;">Due Date</td>
                  <td style="padding: 8px 0; color: #e74c3c; font-size: 16px; font-weight: 600; text-align: right;">${formattedDate}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              Don't forget to make this payment on time to avoid any late fees! 🎯
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #0d9488 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: 600; font-size: 14px;">
                View Dashboard
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            <p>You received this email because you set up a reminder in Expense Reminder App.</p>
            <p>© ${new Date().getFullYear()} Expense Reminder. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${userName},
      
      This is a reminder about your upcoming expense:
      
      Expense: ${expenseName}
      Amount: ${formattedAmount}
      Category: ${category}
      Due Date: ${formattedDate}
      
      Don't forget to make this payment on time!
      
      - Expense Reminder App
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new user
 */
async function sendWelcomeEmail({ to, userName }) {
  if (!transporter) {
    return { success: false, error: 'Email service not configured' };
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Expense Reminder'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
    to,
    subject: `🎉 Welcome to Expense Reminder, ${userName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🎉 Welcome!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #333; font-size: 18px; margin-bottom: 20px;">
              Hi <strong>${userName}</strong>,
            </p>
            
            <p style="color: #666; font-size: 15px; line-height: 1.8;">
              Thank you for joining Expense Reminder! We're excited to help you manage your expenses and never miss a payment again.
            </p>
            
            <h3 style="color: #333; margin-top: 25px;">Here's what you can do:</h3>
            
            <ul style="color: #666; font-size: 15px; line-height: 2;">
              <li>📝 Add and track your expenses</li>
              <li>📅 Set reminder dates for each expense</li>
              <li>📧 Receive email notifications before due dates</li>
              <li>🔄 Set up recurring monthly expenses</li>
              <li>📊 View your monthly expense summary</li>
            </ul>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 35px; border-radius: 25px; font-weight: 600; font-size: 16px;">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeTransporter,
  sendReminderEmail,
  sendWelcomeEmail
};
