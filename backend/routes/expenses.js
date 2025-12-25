/**
 * Expense Routes
 * CRUD operations for user expenses
 */

const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { query, queryOne, execute } = require('../config/database');
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
  queryValidator('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  queryValidator('startDate').optional().isISO8601().withMessage('Invalid start date'),
  queryValidator('endDate').optional().isISO8601().withMessage('Invalid end date'),
  queryValidator('recurring').optional().isIn(['yes', 'no']).withMessage('Invalid recurring value')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let sqlQuery = 'SELECT * FROM expenses WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    // Apply filters
    if (req.query.category) {
      sqlQuery += ` AND category = $${paramIndex++}`;
      params.push(req.query.category);
    }

    if (req.query.startDate) {
      sqlQuery += ` AND due_date >= $${paramIndex++}`;
      params.push(req.query.startDate);
    }

    if (req.query.endDate) {
      sqlQuery += ` AND due_date <= $${paramIndex++}`;
      params.push(req.query.endDate);
    }

    if (req.query.recurring) {
      sqlQuery += ` AND recurring = $${paramIndex++}`;
      params.push(req.query.recurring);
    }

    sqlQuery += ' ORDER BY due_date ASC';

    const expenses = await query(sqlQuery, params);

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
router.get('/summary/monthly', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;

    // Get start and end of month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // Total expenses for the month
    const totalResult = await queryOne(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = $1 AND due_date BETWEEN $2 AND $3',
      [req.user.id, startDate, endDate]
    );

    // Expenses by category
    const byCategory = await query(
      'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = $1 AND due_date BETWEEN $2 AND $3 GROUP BY category ORDER BY total DESC',
      [req.user.id, startDate, endDate]
    );

    // Upcoming expenses (next 7 days)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const upcoming = await query(
      'SELECT * FROM expenses WHERE user_id = $1 AND due_date BETWEEN $2 AND $3 ORDER BY due_date ASC LIMIT 5',
      [req.user.id, today, nextWeek]
    );

    // Count of all expenses
    const countResult = await queryOne(
      'SELECT COUNT(*) as count FROM expenses WHERE user_id = $1',
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
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const expense = await queryOne(
      'SELECT * FROM expenses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

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
], async (req, res) => {
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

    const expense = await queryOne(
      'INSERT INTO expenses (user_id, expense_name, amount, category, due_date, reminder_date, recurring) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, expense_name, amount, category || 'Other', due_date, reminder_date, recurring || 'no']
    );

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
], async (req, res) => {
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
    const existingExpense = await queryOne(
      'SELECT * FROM expenses WHERE id = $1 AND user_id = $2',
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
    let paramIndex = 1;

    if (expense_name !== undefined) {
      updates.push(`expense_name = $${paramIndex++}`);
      params.push(expense_name);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      params.push(amount);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (due_date !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      params.push(due_date);
    }
    if (reminder_date !== undefined) {
      updates.push(`reminder_date = $${paramIndex++}`);
      params.push(reminder_date);
      // Reset email_sent when reminder_date changes
      updates.push(`email_sent = $${paramIndex++}`);
      params.push(0);
    }
    if (recurring !== undefined) {
      updates.push(`recurring = $${paramIndex++}`);
      params.push(recurring);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(req.params.id, req.user.id);

    const updatedExpense = await queryOne(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
      params
    );

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
], async (req, res) => {
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
    const expense = await queryOne(
      'SELECT * FROM expenses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    await execute('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);

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

/**
 * @route   PATCH /api/expenses/:id/paid
 * @desc    Mark expense as paid/unpaid
 * @access  Private
 */
router.patch('/:id/paid', [
  param('id').isInt().withMessage('Invalid expense ID')
], async (req, res) => {
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
    const expense = await queryOne(
      'SELECT * FROM expenses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Toggle paid status
    const newPaidStatus = expense.paid === 1 ? 0 : 1;
    const paidAt = newPaidStatus === 1 ? new Date().toISOString() : null;

    const updatedExpense = await queryOne(
      'UPDATE expenses SET paid = $1, paid_at = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [newPaidStatus, paidAt, req.params.id, req.user.id]
    );

    res.json({
      success: true,
      message: newPaidStatus === 1 ? 'Expense marked as paid' : 'Expense marked as unpaid',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating expense'
    });
  }
});

/**
 * @route   GET /api/expenses/paid
 * @desc    Get all paid expenses
 * @access  Private
 */
router.get('/paid/list', async (req, res) => {
  try {
    const expenses = await query(
      'SELECT * FROM expenses WHERE user_id = $1 AND paid = 1 ORDER BY paid_at DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        expenses,
        count: expenses.length
      }
    });
  } catch (error) {
    console.error('Get paid expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching paid expenses'
    });
  }
});

module.exports = router;
