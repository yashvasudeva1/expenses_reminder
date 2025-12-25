/**
 * Expense Card Component
 * Displays a single expense in a card format
 */

import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Bell,
  Edit,
  Trash2,
  RefreshCw,
  Check,
  Circle
} from 'lucide-react'

// Category colors
const categoryColors = {
  Bills: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Food: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Transport: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Shopping: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Entertainment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Health: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Education: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

export default function ExpenseCard({ expense, onDelete, onMarkPaid, showPaidStatus = true }) {
  const navigate = useNavigate()

  // Format amount as currency
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(expense.amount)

  // Parse dates
  const dueDate = new Date(expense.due_date)
  const reminderDate = new Date(expense.reminder_date)

  // Check if paid
  const isPaid = expense.paid === 1 || expense.paid === true

  // Get due date status
  const getDueDateStatus = () => {
    if (isPaid) {
      return { label: 'Paid', className: 'text-green-500 dark:text-green-400 font-semibold' }
    }
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { label: 'Overdue', className: 'text-red-500 dark:text-red-400 font-semibold' }
    }
    if (isToday(dueDate)) {
      return { label: 'Due Today', className: 'text-orange-500 dark:text-orange-400 font-semibold' }
    }
    if (isTomorrow(dueDate)) {
      return { label: 'Due Tomorrow', className: 'text-yellow-600 dark:text-yellow-400' }
    }
    const daysUntil = differenceInDays(dueDate, new Date())
    if (daysUntil <= 7) {
      return { label: `${daysUntil} days left`, className: 'text-blue-500 dark:text-blue-400' }
    }
    return { label: format(dueDate, 'MMM d, yyyy'), className: 'text-gray-600 dark:text-gray-400' }
  }

  const dueDateStatus = getDueDateStatus()

  return (
    <div className={`card p-5 card-hover animate-fade-in ${isPaid ? 'opacity-75 bg-green-50 dark:bg-green-900/10' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Paid Checkbox & Main Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Paid Checkbox */}
          {showPaidStatus && onMarkPaid && (
            <button
              onClick={() => onMarkPaid(expense.id)}
              className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                isPaid 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500'
              }`}
              title={isPaid ? 'Mark as unpaid' : 'Mark as paid'}
            >
              {isPaid && <Check className="w-4 h-4" />}
            </button>
          )}

          <div className="flex-1 min-w-0">
            {/* Category Badge & Recurring */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${categoryColors[expense.category] || categoryColors.Other}`}>
                {expense.category}
              </span>
              {expense.recurring === 'yes' && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <RefreshCw className="w-3 h-3" />
                  Recurring
                </span>
              )}
              {isPaid && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <Check className="w-3 h-3" />
                  Paid
                </span>
              )}
            </div>

            {/* Expense Name */}
            <h3 className={`font-semibold text-lg text-gray-900 dark:text-white truncate mb-1 ${isPaid ? 'line-through opacity-75' : ''}`}>
              {expense.expense_name}
            </h3>

            {/* Amount */}
            <p className={`text-2xl font-bold ${isPaid ? 'text-green-600 dark:text-green-400' : 'gradient-text'}`}>
              {formattedAmount}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/edit-expense/${expense.id}`)}
              className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
              title="Edit expense"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(expense.id)}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Delete expense"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: Dates */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-4 text-sm">
        {/* Due Date */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400">Due:</span>
          <span className={dueDateStatus.className}>
            {dueDateStatus.label}
          </span>
        </div>

        {/* Reminder Date */}
        <div className="flex items-center gap-2">
          <Bell className={`w-4 h-4 ${expense.email_sent ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="text-gray-500 dark:text-gray-400">Reminder:</span>
          <span className="text-gray-600 dark:text-gray-400">
            {format(reminderDate, 'MMM d, yyyy')}
          </span>
          {expense.email_sent ? (
            <span className="text-xs text-green-500">(Sent)</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
