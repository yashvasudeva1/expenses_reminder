/**
 * Dashboard Page
 * Main overview page with stats and upcoming expenses
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { expensesAPI } from '../services/api'
import StatsCard from '../components/StatsCard'
import ExpenseCard from '../components/ExpenseCard'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Bell,
  PlusCircle,
  Receipt,
  PieChart,
  ArrowRight
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Current month name
  const currentMonth = format(new Date(), 'MMMM yyyy')

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      const response = await expensesAPI.getMonthlySummary()
      setSummary(response.data.data)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      await expensesAPI.delete(deleteId)
      toast.success('Expense deleted')
      loadSummary()
    } catch (error) {
      toast.error('Failed to delete expense')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's your expense overview for {currentMonth}
          </p>
        </div>
        <Link to="/add-expense" className="btn-primary">
          <PlusCircle className="w-5 h-5 mr-2" />
          Add Expense
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Monthly Total"
          value={formatCurrency(summary?.totalAmount)}
          icon={DollarSign}
          color="primary"
          subtitle={currentMonth}
        />
        <StatsCard
          title="Total Expenses"
          value={summary?.totalExpenses || 0}
          icon={Receipt}
          color="blue"
          subtitle="All time"
        />
        <StatsCard
          title="Categories Used"
          value={summary?.byCategory?.length || 0}
          icon={PieChart}
          color="purple"
          subtitle="This month"
        />
        <StatsCard
          title="Upcoming (7 days)"
          value={summary?.upcoming?.length || 0}
          icon={Bell}
          color="orange"
          subtitle="Due soon"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Expenses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              Upcoming Expenses
            </h2>
            <Link 
              to="/expenses" 
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {summary?.upcoming?.length > 0 ? (
            <div className="space-y-4">
              {summary.upcoming.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                No upcoming expenses
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You have no expenses due in the next 7 days
              </p>
              <Link to="/add-expense" className="btn-primary inline-flex">
                <PlusCircle className="w-5 h-5 mr-2" />
                Add Expense
              </Link>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary-500" />
            By Category
          </h2>

          {summary?.byCategory?.length > 0 ? (
            <div className="card p-5 space-y-4">
              {summary.byCategory.map((cat, index) => {
                const percentage = summary.totalAmount > 0 
                  ? (cat.total / summary.totalAmount) * 100 
                  : 0
                
                const colors = [
                  'bg-primary-500',
                  'bg-purple-500',
                  'bg-blue-500',
                  'bg-green-500',
                  'bg-orange-500',
                  'bg-pink-500',
                  'bg-red-500',
                  'bg-indigo-500'
                ]

                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {cat.category}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">
                        {cat.count} expense{cat.count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-400">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No expenses this month
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/add-expense"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <PlusCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Add New Expense</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Track a new expense</p>
                </div>
              </Link>
              <Link
                to="/expenses"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">View All Expenses</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">See your full history</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

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
