import api from '../utils/api'

export function listAccounts(params) {
  return api.get('/financial-accounts', params)
}
export function listAllActiveAccounts() {
  return api.get('/financial-accounts/all-active')
}
export function getAccount(id) {
  return api.get(`/financial-accounts/${id}`)
}
export function getAccountBalance(id) {
  return api.get(`/financial-accounts/${id}/balance`)
}
export function getAccountTransactions(id, params) {
  return api.get(`/financial-accounts/${id}/transactions`, params)
}
export function createAccount(data) {
  return api.post('/financial-accounts', data)
}
export function updateAccount(id, data) {
  return api.put(`/financial-accounts/${id}`, data)
}
export function toggleAccountStatus(id) {
  return api.patch(`/financial-accounts/${id}/toggle-status`)
}
export function deleteAccount(id) {
  return api.delete(`/financial-accounts/${id}`)
}

export function listCategories(params) {
  return api.get('/financial-categories', params)
}
export function listAllActiveCategories() {
  return api.get('/financial-categories/all-active')
}
export function getCategory(id) {
  return api.get(`/financial-categories/${id}`)
}
export function createCategory(data) {
  return api.post('/financial-categories', data)
}
export function updateCategory(id, data) {
  return api.put(`/financial-categories/${id}`, data)
}
export function toggleCategoryStatus(id) {
  return api.patch(`/financial-categories/${id}/toggle-status`)
}
export function deleteCategory(id) {
  return api.delete(`/financial-categories/${id}`)
}

export function listTransactions(params) {
  return api.get('/transactions', params)
}
export function getTransaction(id) {
  return api.get(`/transactions/${id}`)
}
export function createTransaction(data) {
  return api.post('/transactions', data)
}
export function updateTransaction(id, data) {
  return api.put(`/transactions/${id}`, data)
}
export function deleteTransaction(id) {
  return api.delete(`/transactions/${id}`)
}
export function approveTransaction(id, data) {
  return api.post(`/transactions/${id}/approve`, data)
}
export function rejectTransaction(id, data) {
  return api.post(`/transactions/${id}/reject`, data)
}
export function reverseTransaction(id, data) {
  return api.post(`/transactions/${id}/reverse`, data)
}
export function createTransfer(data) {
  return api.post('/financial-transfers', data)
}

export function getFinanceDashboard(params) {
  return api.get('/finance/dashboard', params)
}
export function getFinanceStatistics(params) {
  return api.get('/finance/statistics', params)
}

export function listTransactionAttachments(transactionId) {
  return api.get(`/transactions/${transactionId}/attachments`)
}
export function getTransactionAttachment(id) {
  return api.get(`/transaction-attachments/${id}`)
}
export function createTransactionAttachment(data) {
  const fd = new FormData()
  Object.keys(data).forEach(k => fd.append(k, data[k]))
  return api.post('/transaction-attachments', fd)
}
export function deleteTransactionAttachment(id) {
  return api.delete(`/transaction-attachments/${id}`)
}
export function downloadTransactionAttachmentUrl(id) {
  return `/api/transaction-attachments/${id}/download`
}

export function getFinancialCategoriesReferential() {
  return api.get('/referentiels/financial-categories')
}
export function getFinancialAccountsReferential() {
  return api.get('/referentiels/financial-accounts')
}
export function getTransactionMetaReferential() {
  return api.get('/referentiels/transaction-meta')
}
