import { defineStore } from 'pinia'
import {
  listAccounts, listAllActiveAccounts, getAccount, getAccountBalance, getAccountTransactions,
  createAccount, updateAccount, toggleAccountStatus, deleteAccount,
  listCategories, listAllActiveCategories, getCategory, createCategory, updateCategory, toggleCategoryStatus, deleteCategory,
  listTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction,
  approveTransaction, rejectTransaction, reverseTransaction, createTransfer,
  getFinanceDashboard, getFinanceStatistics,
  listTransactionAttachments, createTransactionAttachment, deleteTransactionAttachment,
  getFinancialCategoriesReferential, getFinancialAccountsReferential, getTransactionMetaReferential,
} from '../api/finance'

function buildErrorMap(data) {
  const errors = {}
  if (data && data.errors && typeof data.errors === 'object') {
    for (const k of Object.keys(data.errors)) {
      const v = data.errors[k]
      errors[k] = Array.isArray(v) ? v[0] : String(v)
    }
  }
  return errors
}

function wrapPaginate(res) {
  const data = res?.data
  const items = data?.data || []
  const meta = data?.meta || data || {}
  return {
    items,
    pagination: {
      current_page: meta.current_page || 1,
      last_page: meta.last_page || 1,
      total: meta.total || 0,
      per_page: meta.per_page || 20,
      from: meta.from || 0,
      to: meta.to || 0,
    },
  }
}

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    accounts: [],
    accountsPagination: { current_page: 1, last_page: 1, total: 0, per_page: 20, from: 0, to: 0 },
    accountsAllActive: [],

    categories: [],
    categoriesPagination: { current_page: 1, last_page: 1, total: 0, per_page: 50, from: 0, to: 0 },
    categoriesAllActive: { income: [], expense: [], types: {} },

    transactions: [],
    transactionsPagination: { current_page: 1, last_page: 1, total: 0, per_page: 30, from: 0, to: 0 },

    referential: {
      transaction_types: {},
      transaction_statuses: {},
      directions: {},
      payment_methods: {},
      account_types: {},
      currencies: {},
      attachments: { max_size_kb: 0, extensions: [], mime_types: [] },
    },

    selectedAccount: null,
    selectedCategory: null,
    selectedTransaction: null,
    selectedTransactionAttachments: [],

    dashboard: null,
    statistics: null,

    loading: false,
    saving: false,
    deleting: false,
    approving: false,
    transferring: false,
    error: '',
  }),

  actions: {
    async loadReferentials() {
      try {
        const [cat, acc, meta] = await Promise.all([
          getFinancialCategoriesReferential(),
          getFinancialAccountsReferential(),
          getTransactionMetaReferential(),
        ])
        if (cat?.data) this.categoriesAllActive = cat.data
        if (acc?.data) this.accountsAllActive = acc.data
        if (meta?.data) Object.assign(this.referential, meta.data)
        return true
      } catch (e) {
        this.error = e?.data?.message || e.message || 'Erreur référentiels'
        return false
      }
    },

    async loadAccounts(params = {}) {
      this.loading = true; this.error = ''
      try {
        const { items, pagination } = wrapPaginate(await listAccounts(params))
        this.accounts = items
        this.accountsPagination = pagination
      } catch (e) { this.error = e?.data?.message || e.message }
      finally { this.loading = false }
    },

    async loadAllActiveAccounts() {
      try {
        const { data } = await listAllActiveAccounts()
        if (Array.isArray(data)) this.accountsAllActive = data
        return this.accountsAllActive
      } catch (e) { return this.accountsAllActive }
    },

    async loadAccountDetail(id) {
      try {
        const { data } = await getAccount(id)
        this.selectedAccount = data
        return data
      } catch (e) { return null }
    },

    async loadAccountBalance(id) {
      try { return (await getAccountBalance(id)).data }
      catch (e) { return null }
    },

    async createAccount(data) {
      this.saving = true; this.error = ''
      try {
        const res = await createAccount(data)
        return { ok: true, message: res.data?.message, data: res.data?.account, errors: {} }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally { this.saving = false }
    },

    async updateAccount(id, data) {
      this.saving = true; this.error = ''
      try {
        const res = await updateAccount(id, data)
        return { ok: true, message: res.data?.message, data: res.data?.account, errors: {} }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally { this.saving = false }
    },

    async toggleAccountStatus(id) {
      try {
        const res = await toggleAccountStatus(id)
        return { ok: true, message: res.data?.message, data: res.data?.account }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
    },

    async deleteAccount(id) {
      this.deleting = true
      try {
        const res = await deleteAccount(id)
        return { ok: true, message: res.data?.message }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
      finally { this.deleting = false }
    },

    async loadCategories(params = {}) {
      this.loading = true; this.error = ''
      try {
        const { items, pagination } = wrapPaginate(await listCategories(params))
        this.categories = items
        this.categoriesPagination = pagination
      } catch (e) { this.error = e?.data?.message || e.message }
      finally { this.loading = false }
    },

    async loadAllActiveCategories() {
      try {
        const { data } = await listAllActiveCategories()
        if (data) this.categoriesAllActive = data
        return this.categoriesAllActive
      } catch (e) { return this.categoriesAllActive }
    },

    async createCategory(data) {
      this.saving = true
      try {
        const res = await createCategory(data)
        return { ok: true, message: res.data?.message, data: res.data?.category, errors: {} }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally { this.saving = false }
    },

    async updateCategory(id, data) {
      this.saving = true
      try {
        const res = await updateCategory(id, data)
        return { ok: true, message: res.data?.message, data: res.data?.category, errors: {} }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally { this.saving = false }
    },

    async toggleCategoryStatus(id) {
      try {
        const res = await toggleCategoryStatus(id)
        return { ok: true, message: res.data?.message, data: res.data?.category }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
    },

    async deleteCategory(id) {
      this.deleting = true
      try {
        const res = await deleteCategory(id)
        return { ok: true, message: res.data?.message }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
      finally { this.deleting = false }
    },

    async loadTransactions(params = {}) {
      this.loading = true; this.error = ''
      try {
        const { items, pagination } = wrapPaginate(await listTransactions(params))
        this.transactions = items
        this.transactionsPagination = pagination
      } catch (e) { this.error = e?.data?.message || e.message }
      finally { this.loading = false }
    },

    async loadTransactionDetail(id) {
      try {
        const { data } = await getTransaction(id)
        this.selectedTransaction = data
        return data
      } catch (e) { return null }
    },

    async createTransaction(data) {
      this.saving = true
      try {
        const res = await createTransaction(data)
        return { ok: true, message: res.data?.message, data: res.data?.transaction, errors: {} }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally { this.saving = false }
    },

    async updateTransaction(id, data) {
      this.saving = true
      try {
        const res = await updateTransaction(id, data)
        return { ok: true, message: res.data?.message, data: res.data?.transaction, errors: {} }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally { this.saving = false }
    },

    async deleteTransaction(id) {
      this.deleting = true
      try {
        const res = await deleteTransaction(id)
        return { ok: true, message: res.data?.message }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
      finally { this.deleting = false }
    },

    async approveTransaction(id, data = {}) {
      this.approving = true
      try {
        const res = await approveTransaction(id, data)
        return { ok: true, message: res.data?.message, data: res.data?.transaction }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
      finally { this.approving = false }
    },

    async rejectTransaction(id, data) {
      this.approving = true
      try {
        const res = await rejectTransaction(id, data)
        return { ok: true, message: res.data?.message, data: res.data?.transaction }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
      finally { this.approving = false }
    },

    async reverseTransaction(id, data) {
      this.saving = true
      try {
        const res = await reverseTransaction(id, data)
        return { ok: true, message: res.data?.message, data: res.data?.transaction }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
      finally { this.saving = false }
    },

    async createTransfer(data) {
      this.transferring = true
      try {
        const res = await createTransfer(data)
        return { ok: true, message: res.data?.message, data: res.data, errors: {} }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally { this.transferring = false }
    },

    async loadDashboard(params = {}) {
      this.loading = true
      try {
        const { data } = await getFinanceDashboard(params)
        this.dashboard = data
        return data
      } catch (e) { return null }
      finally { this.loading = false }
    },

    async loadStatistics(params = {}) {
      this.loading = true
      try {
        const { data } = await getFinanceStatistics(params)
        this.statistics = data
        return data
      } catch (e) { return null }
      finally { this.loading = false }
    },

    async loadAttachments(transactionId) {
      try {
        const { data } = await listTransactionAttachments(transactionId)
        this.selectedTransactionAttachments = data?.data || []
        return this.selectedTransactionAttachments
      } catch (e) { return [] }
    },

    async createAttachment(payload) {
      this.saving = true
      try {
        const res = await createTransactionAttachment(payload)
        return { ok: true, message: res.data?.message, data: res.data?.attachment }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
      finally { this.saving = false }
    },

    async deleteAttachment(id) {
      this.deleting = true
      try {
        const res = await deleteTransactionAttachment(id)
        return { ok: true, message: res.data?.message }
      } catch (e) { return { ok: false, message: e?.data?.message || e.message } }
      finally { this.deleting = false }
    },
  },
})
