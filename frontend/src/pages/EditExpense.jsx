/**
 * Edit Expense Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { expensesAPI } from '../services/api'
import ExpenseForm from '../components/ExpenseForm'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { ArrowLeft, Edit } from 'lucide-react'

export default function EditExpense() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [expense, setExpense] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadExpense()
  }, [id])

  const loadExpense = async () => {
    try {
      const response = await expensesAPI.getOne(id)
      setExpense(response.data.data.expense)
    } catch (error) {
      toast.error('Expense not found')
      navigate('/expenses')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      await expensesAPI.update(id, formData)
      toast.success('Expense updated successfully!')
      navigate('/expenses')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update expense'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
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
            <Edit className="w-7 h-7 text-primary-500" />
            Edit Expense
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Update the expense details below
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="card p-6 sm:p-8">
        <ExpenseForm
          initialData={expense}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}
