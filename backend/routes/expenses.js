/**
 * Expense Routes
 * CRUD operations for user expenses
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { all, get, run } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Expense categories
const CATEGORIES = ['Bills', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'];

/**
 * @route   GET /api/expenses
 * @desc    Get all expenses for logged-in user
 * @access  Private
 */
router.get('/', [
  query('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('recurring').optional().isIn(['yes', 'no']).withMessage('Invalid recurring value')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params = [req.user.id];

    // Apply filters
    if (req.query.category) {
      query += ' AND category = ?';
      params.push(req.query.category);
    }

    if (req.query.startDate) {
      query += ' AND due_date >= ?';
      params.push(req.query.startDate);
    }

    if (req.query.endDate) {
      query += ' AND due_date <= ?';
      params.push(req.query.endDate);
    }

    if (req.query.recurring) {
      query += ' AND recurring = ?';
      params.push(req.query.recurring);
    }

    query += ' ORDER BY due_date ASC';

    const expenses = all(query, params);

    res.json({
      success: true,
      data: {
        expenses,
        count: expenses.length
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expenses'
    });
  }
});

/**
 * @route   GET /api/expenses/categories
 * @desc    Get available expense categories
 * @access  Private
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: { categories: CATEGORIES }
  });
});

/**
 * @route   GET /api/expenses/summary/monthly
 * @desc    Get monthly expense summary
 * @access  Private
 */
router.get('/summary/monthly', (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;

    // Get start and end of month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // Total expenses for the month
    const totalResult = get(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND due_date BETWEEN ? AND ?',
      [req.user.id, startDate, endDate]
    );

    // Expenses by category
    const byCategory = all(
      'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = ? AND due_date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC',
      [req.user.id, startDate, endDate]
    );

    // Upcoming expenses (next 7 days)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const upcoming = all(
      'SELECT * FROM expenses WHERE user_id = ? AND due_date BETWEEN ? AND ? ORDER BY due_date ASC LIMIT 5',
      [req.user.id, today, nextWeek]
    );

    // Count of all expenses
    const countResult = get(
      'SELECT COUNT(*) as count FROM expenses WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        month: `${year}-${String(month).padStart(2, '0')}`,
        totalAmount: totalResult.total,
        byCategory,
        upcoming,
        totalExpenses: countResult.count
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching summary'
    });
  }
});

/**
 * @route   GET /api/expenses/:id
 * @desc    Get single expense by ID
 * @access  Private
 */
router.get('/:id', [
  param('id').isInt().withMessage('Invalid expense ID')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const expense = db.prepare(`
      SELECT * FROM expenses WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: { expense }
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense'
    });
  }
});

/**
 * @route   POST /api/expenses
 * @desc    Create new expense
 * @access  Private
 */
router.post('/', [
  body('expense_name')
    .trim()
    .notEmpty().withMessage('Expense name is required')
    .isLength({ max: 100 }).withMessage('Expense name must be less than 100 characters'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('category')
    .optional()
    .isIn(CATEGORIES).withMessage('Invalid category'),
  body('due_date')
    .notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Invalid due date format'),
  body('reminder_date')
    .notEmpty().withMessage('Reminder date is required')
    .isISO8601().withMessage('Invalid reminder date format'),
  body('recurring')
    .optional()
    .isIn(['yes', 'no']).withMessage('Recurring must be yes or no')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { expense_name, amount, category, due_date, reminder_date, recurring } = req.body;

    // Validate reminder_date is not after due_date
    if (new Date(reminder_date) > new Date(due_date)) {
      return res.status(400).json({
        success: false,
        message: 'Reminder date cannot be after due date'
      });
    }

    const result = run(
      'INSERT INTO expenses (user_id, expense_name, amount, category, due_date, reminder_date, recurring) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, expense_name, amount, category || 'Other', due_date, reminder_date, recurring || 'no']
    );

    const expense = get('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: { expense }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating expense'
    });
  }
});

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update expense
 * @access  Private
 */
router.put('/:id', [
  param('id').isInt().withMessage('Invalid expense ID'),
  body('expense_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Expense name must be 1-100 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('category')
    .optional()
    .isIn(CATEGORIES).withMessage('Invalid category'),
  body('due_date')
    .optional()
    .isISO8601().withMessage('Invalid due date format'),
  body('reminder_date')
    .optional()
    .isISO8601().withMessage('Invalid reminder date format'),
  body('recurring')
    .optional()
    .isIn(['yes', 'no']).withMessage('Recurring must be yes or no')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if expense exists and belongs to user
    const existingExpense = get(
      'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const { expense_name, amount, category, due_date, reminder_date, recurring } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (expense_name !== undefined) {
      updates.push('expense_name = ?');
      params.push(expense_name);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(due_date);
    }
    if (reminder_date !== undefined) {
      updates.push('reminder_date = ?');
      params.push(reminder_date);
      // Reset email_sent when reminder_date changes
      updates.push('email_sent = 0');
    }
    if (recurring !== undefined) {
      updates.push('recurring = ?');
      params.push(recurring);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(req.params.id, req.user.id);

    run(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const updatedExpense = get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating expense'
    });
  }
});

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete expense
 * @access  Private
 */
router.delete('/:id', [
  param('id').isInt().withMessage('Invalid expense ID')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if expense exists and belongs to user
    const expense = get(
      'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    run('DELETE FROM expenses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting expense'
    });
  }
});

module.exports = router;
