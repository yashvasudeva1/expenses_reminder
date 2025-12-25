/**
 * Expense Form Component
 * Reusable form for creating and editing expenses
 */

import { useState, useEffect } from 'react'
import { expensesAPI } from '../services/api'
import {
  Calendar,
  Bell,
  DollarSign,
  Tag,
  RefreshCw,
  FileText
} from 'lucide-react'

export default function ExpenseForm({ initialData, onSubmit, isSubmitting }) {
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    expense_name: '',
    amount: '',
    category: 'Other',
    due_date: '',
    reminder_date: '',
    recurring: 'no'
  })
  const [errors, setErrors] = useState({})

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await expensesAPI.getCategories()
        setCategories(response.data.data.categories)
      } catch (error) {
        // Use default categories
        setCategories(['Bills', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'])
      }
    }
    loadCategories()
  }, [])

  // Populate form with initial data (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        expense_name: initialData.expense_name || '',
        amount: initialData.amount?.toString() || '',
        category: initialData.category || 'Other',
        due_date: initialData.due_date?.split('T')[0] || '',
        reminder_date: initialData.reminder_date?.split('T')[0] || '',
        recurring: initialData.recurring || 'no'
      })
    }
  }, [initialData])

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked ? 'yes' : 'no'
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }

    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Validate form
  const validate = () => {
    const newErrors = {}

    if (!formData.expense_name.trim()) {
      newErrors.expense_name = 'Expense name is required'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount'
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required'
    }

    if (!formData.reminder_date) {
      newErrors.reminder_date = 'Reminder date is required'
    }

    if (formData.due_date && formData.reminder_date) {
      if (new Date(formData.reminder_date) > new Date(formData.due_date)) {
        newErrors.reminder_date = 'Reminder date cannot be after due date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) return

    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    })
  }

  // Get today's date for min date attribute
  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Expense Name */}
      <div>
        <label htmlFor="expense_name" className="label flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          Expense Name
        </label>
        <input
          type="text"
          id="expense_name"
          name="expense_name"
          value={formData.expense_name}
          onChange={handleChange}
          placeholder="e.g., Netflix Subscription"
          className={`input ${errors.expense_name ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        {errors.expense_name && (
          <p className="mt-1 text-sm text-red-500">{errors.expense_name}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="label flex items-center gap-2">
          <span className="text-gray-400 font-medium">₹</span>
          Amount
        </label>
        <input
          type="number"
          id="amount"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          className={`input ${errors.amount ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        {errors.amount && (
          <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="label flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="input"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Due Date */}
      <div>
        <label htmlFor="due_date" className="label flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          Due Date
        </label>
        <input
          type="date"
          id="due_date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          min={today}
          className={`input ${errors.due_date ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        {errors.due_date && (
          <p className="mt-1 text-sm text-red-500">{errors.due_date}</p>
        )}
      </div>

      {/* Reminder Date */}
      <div>
        <label htmlFor="reminder_date" className="label flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-400" />
          Reminder Date
        </label>
        <input
          type="date"
          id="reminder_date"
          name="reminder_date"
          value={formData.reminder_date}
          onChange={handleChange}
          min={today}
          max={formData.due_date || undefined}
          className={`input ${errors.reminder_date ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        {errors.reminder_date && (
          <p className="mt-1 text-sm text-red-500">{errors.reminder_date}</p>
        )}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You'll receive an email reminder on this date
        </p>
      </div>

      {/* Recurring */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="recurring"
          name="recurring"
          checked={formData.recurring === 'yes'}
          onChange={handleChange}
          className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
        />
        <label htmlFor="recurring" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <RefreshCw className="w-4 h-4 text-gray-400" />
          This is a recurring monthly expense
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full py-3 text-base"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </span>
        ) : (
          initialData ? 'Update Expense' : 'Add Expense'
        )}
      </button>
    </form>
  )
}
