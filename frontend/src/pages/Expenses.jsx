/**
 * All Expenses Page
 * List view with filtering and search
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { expensesAPI } from '../services/api'
import ExpenseCard from '../components/ExpenseCard'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Search,
  Filter,
  PlusCircle,
  Receipt,
  ChevronDown,
  X,
  CheckCircle,
  Clock
} from 'lucide-react'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [recurringFilter, setRecurringFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [categories, setCategories] = useState([])
  const [activeTab, setActiveTab] = useState('unpaid') // 'unpaid' or 'paid'

  useEffect(() => {
    loadExpenses()
    loadCategories()
  }, [categoryFilter, recurringFilter])

  const loadExpenses = async () => {
    try {
      const params = {}
      if (categoryFilter) params.category = categoryFilter
      if (recurringFilter) params.recurring = recurringFilter

      const response = await expensesAPI.getAll(params)
      setExpenses(response.data.data.expenses)
    } catch (error) {
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await expensesAPI.getCategories()
      setCategories(response.data.data.categories)
    } catch (error) {
      // Use defaults
      setCategories(['Bills', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Other'])
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      await expensesAPI.delete(deleteId)
      toast.success('Expense deleted')
      setExpenses(expenses.filter(e => e.id !== deleteId))
    } catch (error) {
      toast.error('Failed to delete expense')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleMarkPaid = async (id) => {
    try {
      const response = await expensesAPI.markPaid(id)
      const updatedExpense = response.data.data.expense
      setExpenses(expenses.map(e => e.id === id ? updatedExpense : e))
      toast.success(updatedExpense.paid === 1 ? 'Marked as paid!' : 'Marked as unpaid')
    } catch (error) {
      toast.error('Failed to update expense')
    }
  }

  const clearFilters = () => {
    setCategoryFilter('')
    setRecurringFilter('')
    setSearchTerm('')
  }

  // Filter expenses by search term and paid status
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.expense_name.toLowerCase().includes(searchTerm.toLowerCase())
    const isPaid = expense.paid === 1 || expense.paid === true
    const matchesTab = activeTab === 'paid' ? isPaid : !isPaid
    return matchesSearch && matchesTab
  })

  // Count for tabs
  const unpaidCount = expenses.filter(e => e.paid !== 1 && e.paid !== true).length
  const paidCount = expenses.filter(e => e.paid === 1 || e.paid === true).length

  const hasActiveFilters = categoryFilter || recurringFilter || searchTerm

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-8 h-8 text-primary-500" />
            All Expenses
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/add-expense" className="btn-primary">
          <PlusCircle className="w-5 h-5 mr-2" />
          Add Expense
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('unpaid')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'unpaid'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending
          {unpaidCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'unpaid' 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {unpaidCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'paid'
              ? 'border-green-500 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Paid
          {paidCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'paid' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {paidCount}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="input pl-12"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters || hasActiveFilters ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : ''}`}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
                {[categoryFilter, recurringFilter, searchTerm].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-slide-down">
            {/* Category Filter */}
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input py-2"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Recurring Filter */}
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">
                Type
              </label>
              <select
                value={recurringFilter}
                onChange={(e) => setRecurringFilter(e.target.value)}
                className="input py-2"
              >
                <option value="">All Types</option>
                <option value="yes">Recurring</option>
                <option value="no">One-time</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 mt-5"
              >
                <X className="w-4 h-4" />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expenses List */}
      {filteredExpenses.length > 0 ? (
        <div className="grid gap-4">
          {filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onDelete={(id) => setDeleteId(id)}
              onMarkPaid={handleMarkPaid}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {activeTab === 'paid' ? (
              <CheckCircle className="w-10 h-10 text-gray-400" />
            ) : (
              <Receipt className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {hasActiveFilters 
              ? 'No expenses found' 
              : activeTab === 'paid' 
                ? 'No paid expenses yet' 
                : 'No pending expenses'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Try adjusting your filters or search term'
              : activeTab === 'paid'
                ? 'Mark expenses as paid to see them here'
                : 'Start by adding your first expense to track your spending'}
          </p>
          {hasActiveFilters ? (
            <button onClick={clearFilters} className="btn-secondary">
              Clear Filters
            </button>
          ) : activeTab === 'unpaid' ? (
            <Link to="/add-expense" className="btn-primary inline-flex">
              <PlusCircle className="w-5 h-5 mr-2" />
              Add Your First Expense
            </Link>
          ) : null}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        isLoading={deleting}
      />
    </div>
  )
}
