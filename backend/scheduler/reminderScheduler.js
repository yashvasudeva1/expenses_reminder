/**
 * Reminder Scheduler
 * Background job that sends email reminders for upcoming expenses
 */

const cron = require('node-cron');
const { all, get, run } = require('../config/database');
const { sendReminderEmail } = require('../services/emailService');

/**
 * Process pending reminders
 * Finds all expenses where reminder_date <= today and email not yet sent
 */
async function processReminders() {
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`\n🔍 Checking for reminders (${today})...`);

  try {
    // Get all pending reminders with user info
    const pendingReminders = all(`
      SELECT 
        e.id,
        e.expense_name,
        e.amount,
        e.category,
        e.due_date,
        e.reminder_date,
        e.recurring,
        u.name as user_name,
        u.email as user_email
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE e.reminder_date <= ? AND e.email_sent = 0
      ORDER BY e.due_date ASC
    `, [today]);

    if (pendingReminders.length === 0) {
      console.log('   No pending reminders found');
      return;
    }

    console.log(`   Found ${pendingReminders.length} pending reminder(s)`);

    // Process each reminder
    for (const reminder of pendingReminders) {
      try {
        // Send email
        const result = await sendReminderEmail({
          to: reminder.user_email,
          userName: reminder.user_name,
          expenseName: reminder.expense_name,
          amount: reminder.amount,
          dueDate: reminder.due_date,
          category: reminder.category
        });

        if (result.success) {
          // Mark as sent
          run('UPDATE expenses SET email_sent = 1 WHERE id = ?', [reminder.id]);
          console.log(`   ✅ Reminder sent for: ${reminder.expense_name} → ${reminder.user_email}`);

          // Handle recurring expenses
          if (reminder.recurring === 'yes') {
            createNextRecurringExpense(reminder);
          }
        } else {
          console.log(`   ⚠️  Failed to send reminder for: ${reminder.expense_name}`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing reminder ${reminder.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error processing reminders:', error);
  }
}

/**
 * Create next month's expense for recurring expenses
 */
function createNextRecurringExpense(expense) {
  try {
    // Calculate next month's dates
    const currentDueDate = new Date(expense.due_date);
    const currentReminderDate = new Date(expense.reminder_date);
    
    // Add one month
    const nextDueDate = new Date(currentDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    
    const nextReminderDate = new Date(currentReminderDate);
    nextReminderDate.setMonth(nextReminderDate.getMonth() + 1);

    // Get user_id from original expense
    const originalExpense = get('SELECT user_id FROM expenses WHERE id = ?', [expense.id]);

    // Create new expense
    run(
      'INSERT INTO expenses (user_id, expense_name, amount, category, due_date, reminder_date, recurring, email_sent) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [
        originalExpense.user_id,
        expense.expense_name,
        expense.amount,
        expense.category,
        nextDueDate.toISOString().split('T')[0],
        nextReminderDate.toISOString().split('T')[0],
        'yes'
      ]
    );

    console.log(`   🔄 Created recurring expense for next month: ${expense.expense_name}`);
  } catch (error) {
    console.error(`   ❌ Error creating recurring expense:`, error.message);
  }
}

/**
 * Start the reminder scheduler
 * Runs every hour to check for pending reminders
 */
function startScheduler() {
  // Run every hour at minute 0
  // Cron format: second(optional) minute hour day-of-month month day-of-week
  cron.schedule('0 * * * *', () => {
    console.log('\n⏰ Running scheduled reminder check...');
    processReminders();
  }, {
    timezone: 'UTC'
  });

  console.log('✅ Reminder scheduler started (runs every hour)');

  // Also run immediately on startup (after a short delay)
  setTimeout(() => {
    console.log('\n🚀 Running initial reminder check...');
    processReminders();
  }, 5000);
}

/**
 * Manually trigger reminder processing (for testing)
 */
function triggerReminders() {
  return processReminders();
}

module.exports = {
  startScheduler,
  triggerReminders,
  processReminders
};
