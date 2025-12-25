/**
 * Add Expense Page
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { expensesAPI } from '../services/api'
import ExpenseForm from '../components/ExpenseForm'
import toast from 'react-hot-toast'
import { ArrowLeft, PlusCircle } from 'lucide-react'

export default function AddExpense() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      await expensesAPI.create(formData)
      toast.success('Expense added successfully!')
      navigate('/dashboard')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create expense'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-7 h-7 text-primary-500" />
            Add New Expense
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Fill in the details below to track your expense
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="card p-6 sm:p-8">
        <ExpenseForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
        <h3 className="font-medium text-primary-900 dark:text-primary-100 mb-2">
          💡 Tips
        </h3>
        <ul className="text-sm text-primary-700 dark:text-primary-300 space-y-1">
          <li>• Set the reminder date a few days before the due date</li>
          <li>• Mark recurring expenses for monthly bills like rent or subscriptions</li>
          <li>• Use categories to organize and filter your expenses later</li>
        </ul>
      </div>
    </div>
  )
}
