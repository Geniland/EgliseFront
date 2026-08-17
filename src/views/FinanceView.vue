<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useFinanceStore } from '../stores/finance'

const fStore = useFinanceStore()

const activeTab = ref('overview')
const accountSearch = ref('')
const accountStatusFilter = ref('')
const accountTypeFilter = ref('')
const accountPage = ref(1)
const accountPerPage = ref(20)

const catTypeFilter = ref('income')
const catSearch = ref('')
const catStatusFilter = ref('')
const catPage = ref(1)
const catPerPage = ref(50)

const txSearch = ref('')
const txAccountFilter = ref('')
const txCategoryFilter = ref('')
const txTypeFilter = ref('')
const txStatusFilter = ref('')
const txDateFrom = ref('')
const txDateTo = ref('')
const txPage = ref(1)
const txPerPage = ref(30)

const showAccountModal = ref(false)
const showCategoryModal = ref(false)
const showTransactionModal = ref(false)
const showTransferModal = ref(false)
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const showConfirmModal = ref(false)
const showAttachModal = ref(false)
const showDetailModal = ref(false)
const detailTx = ref(null)
const attachTx = ref(null)

const confirmTarget = ref(null)
const confirmAction = ref('')
const confirmType = ref('warning')
const confirmMsg = ref('')

const approveTarget = ref(null)
const rejectTarget = ref(null)
const approveComment = ref('')
const rejectReason = ref('')

const accountForm = reactive({
  id: null, name: '', type: 'cash', initial_balance: 0, currency: 'XOF', description: '',
})
const categoryForm = reactive({
  id: null, name: '', type: 'income', parent_id: null, description: '',
})
const transactionForm = reactive({
  id: null, type: 'income', account_id: null, category_id: null, amount: 0,
  transaction_date: new Date().toISOString().slice(0,10), payment_method: 'cash',
  reference: '', description: '',
})
const transferForm = reactive({
  from_account_id: null, to_account_id: null, amount: 0, transaction_date: new Date().toISOString().slice(0,10),
  description: '', reference: '', payment_method: 'transfer',
})
const attachForm = reactive({ file: null })

const formErrors = reactive({})
const formAlert = reactive({ type: '', message: '' })

const accountEditing = computed(() => !!accountForm.id)
const categoryEditing = computed(() => !!categoryForm.id)
const txEditing = computed(() => !!transactionForm.id)

const accountTypeOpts = computed(() => Object.entries(fStore.referential.account_types || { cash: 'Caisse', bank: 'Banque', other: 'Autre' }).map(([v,l])=>({value:v,label:l})))
const currencyOpts = computed(() => Object.entries(fStore.referential.currencies || { XOF: 'Franc CFA (XOF)', EUR: 'Euro (EUR)', USD: 'Dollar (USD)' }).map(([v,l])=>({value:v,label:l})))
const txTypeOpts = computed(() => Object.entries(fStore.referential.transaction_types || { income: 'Recette', expense: 'Dépense', transfer: 'Transfert' }).map(([v,l])=>({value:v,label:l})))
const txStatusOpts = computed(() => Object.entries(fStore.referential.transaction_statuses || {}).map(([v,l])=>({value:v,label:l})))
const pmOpts = computed(() => Object.entries(fStore.referential.payment_methods || {}).map(([v,l])=>({value:v,label:l})))
const txIncomeCats = computed(() => fStore.categoriesAllActive.income || [])
const txExpenseCats = computed(() => fStore.categoriesAllActive.expense || [])
const activeAccounts = computed(() => fStore.accountsAllActive || [])

function typeBadgeClass(type) {
  if (type === 'income') return 'role-badge super'
  if (type === 'expense') return 'role-badge admin'
  if (type === 'transfer') return 'role-badge staff'
  return 'role-badge default'
}
function txStatusBadge(s) {
  if (s === 'approved') return 'status-badge active'
  if (s === 'rejected') return 'status-badge inactive'
  if (s === 'pending') return 'status-badge warning'
  return 'status-badge default'
}
function accountTypeBadge(t) {
  if (t === 'cash') return 'status-badge info'
  if (t === 'bank') return 'status-badge active'
  return 'status-badge warning'
}
function accountStatusBadge(s) {
  return s ? 'status-badge active' : 'status-badge inactive'
}
function dirSign(tx) {
  return tx.direction === 'in' ? '+' : '-'
}
function dirColor(tx) {
  if (tx.direction === 'in') return '#10b981'
  if (tx.type === 'transfer') return '#8b5cf6'
  return '#ef4444'
}

// ————— Filters & Loaders —————
function debounce(wrapFn) {
  let t
  return () => { clearTimeout(t); t = setTimeout(wrapFn, 280) }
}
async function loadAccounts() {
  await fStore.loadAccounts({
    search: accountSearch.value || undefined,
    status: accountStatusFilter.value || undefined,
    type: accountTypeFilter.value || undefined,
    page: accountPage.value, per_page: accountPerPage.value,
  })
}
async function loadCategories() {
  await fStore.loadCategories({
    search: catSearch.value || undefined,
    type: catTypeFilter.value || undefined,
    status: catStatusFilter.value || undefined,
    page: catPage.value, per_page: catPerPage.value,
    with_children: true,
  })
}
async function loadTransactions() {
  await fStore.loadTransactions({
    search: txSearch.value || undefined,
    account_id: txAccountFilter.value || undefined,
    category_id: txCategoryFilter.value || undefined,
    type: txTypeFilter.value || undefined,
    status: txStatusFilter.value || undefined,
    date_from: txDateFrom.value || undefined,
    date_to: txDateTo.value || undefined,
    page: txPage.value, per_page: txPerPage.value,
  })
}
async function loadDashboard() {
  await fStore.loadDashboard()
}
async function loadStats() {
  await fStore.loadStatistics()
}

const dAcc = debounce(() => { accountPage.value = 1; loadAccounts() })
const dCat = debounce(() => { catPage.value = 1; loadCategories() })
const dTx = debounce(() => { txPage.value = 1; loadTransactions() })

watch(accountSearch, dAcc); watch(accountStatusFilter, dAcc); watch(accountTypeFilter, dAcc); watch(accountPage, loadAccounts); watch(accountPerPage, dAcc)
watch(catSearch, dCat); watch(catTypeFilter, dCat); watch(catStatusFilter, dCat); watch(catPage, loadCategories)
watch(txSearch, dTx); watch(txAccountFilter, dTx); watch(txCategoryFilter, dTx); watch(txTypeFilter, dTx); watch(txStatusFilter, dTx); watch(txDateFrom, dTx); watch(txDateTo, dTx); watch(txPage, loadTransactions); watch(txPerPage, dTx)

// ————— Forms —————
function resetAccForm() {
  accountForm.id = null; accountForm.name=''; accountForm.type='cash'
  accountForm.initial_balance = 0; accountForm.currency = 'XOF'; accountForm.description = ''
  Object.keys(formErrors).forEach(k => delete formErrors[k])
}
function resetCatForm() {
  categoryForm.id = null; categoryForm.name=''; categoryForm.type='income'
  categoryForm.parent_id = null; categoryForm.description = ''
  Object.keys(formErrors).forEach(k => delete formErrors[k])
}
function resetTxForm() {
  transactionForm.id = null; transactionForm.type='income'
  transactionForm.account_id = null; transactionForm.category_id = null
  transactionForm.amount = 0
  transactionForm.transaction_date = new Date().toISOString().slice(0,10)
  transactionForm.payment_method = 'cash'
  transactionForm.reference = ''; transactionForm.description = ''
  Object.keys(formErrors).forEach(k => delete formErrors[k])
}
function resetTransferForm() {
  transferForm.from_account_id = null; transferForm.to_account_id = null
  transferForm.amount = 0
  transferForm.transaction_date = new Date().toISOString().slice(0,10)
  transferForm.description = ''; transferForm.reference = ''
  transferForm.payment_method = 'transfer'
  Object.keys(formErrors).forEach(k => delete formErrors[k])
}
function openCreateAccount() { resetAccForm(); formAlert.type=''; formAlert.message=''; showAccountModal.value=true }
function openEditAccount(a) {
  resetAccForm(); formAlert.type=''; formAlert.message=''
  accountForm.id = a.id; accountForm.name=a.name; accountForm.type=a.type
  accountForm.initial_balance = a.initial_balance; accountForm.currency = a.currency
  accountForm.description = a.description || ''
  showAccountModal.value=true
}
function openCreateCategory() { resetCatForm(); formAlert.type=''; formAlert.message=''; showCategoryModal.value=true }
function openEditCategory(c) {
  resetCatForm(); formAlert.type=''; formAlert.message=''
  categoryForm.id = c.id; categoryForm.name=c.name; categoryForm.type=c.type
  categoryForm.parent_id = c.parent_id || null; categoryForm.description = c.description || ''
  showCategoryModal.value=true
}
function openCreateTx() { resetTxForm(); formAlert.type=''; formAlert.message=''; showTransactionModal.value=true }
function openEditTx(tx) {
  if (!tx.can_be_edited) return
  resetTxForm(); formAlert.type=''; formAlert.message=''
  transactionForm.id = tx.id; transactionForm.type = tx.type
  transactionForm.account_id = tx.account_id; transactionForm.category_id = tx.category_id || null
  transactionForm.amount = tx.amount; transactionForm.transaction_date = tx.transaction_date
  transactionForm.payment_method = tx.payment_method || 'cash'
  transactionForm.reference = tx.reference || ''; transactionForm.description = tx.description || ''
  showTransactionModal.value = true
}
function openTransfer() { resetTransferForm(); formAlert.type=''; formAlert.message=''; showTransferModal.value=true }
function openApprove(tx) { approveTarget.value = tx; approveComment.value=''; showApproveModal.value=true }
function openReject(tx) { rejectTarget.value = tx; rejectReason.value=''; showRejectModal.value=true }
async function openDetail(tx) {
  detailTx.value = tx
  showDetailModal.value = true
  await fStore.loadAttachments(tx.id)
}
async function openAttach(tx) {
  attachTx.value = tx
  attachForm.file = null
  showAttachModal.value = true
  await fStore.loadAttachments(tx.id)
}

// ————— Submitters —————
async function submitAccount() {
  formAlert.type = ''; Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!accountForm.name.trim()) formErrors.name = 'Nom du compte requis'
  if (!accountForm.type) formErrors.type = 'Type requis'
  if (Number(accountForm.initial_balance) < 0) formErrors.initial_balance = 'Solde initial ≥ 0'
  if (Object.keys(formErrors).length) { formAlert.type='danger'; formAlert.message = 'Veuillez corriger'; return }
  const payload = {
    name: accountForm.name, type: accountForm.type, description: accountForm.description,
    currency: accountForm.currency, initial_balance: Number(accountForm.initial_balance),
  }
  const r = accountEditing.value ? await fStore.updateAccount(accountForm.id, payload) : await fStore.createAccount(payload)
  if (r.ok) {
    formAlert.type = 'success'; formAlert.message = r.message
    await Promise.all([loadAccounts(), loadDashboard(), loadStats()])
    setTimeout(()=>{ showAccountModal.value=false; resetAccForm() }, 500)
  } else {
    formAlert.type='danger'; formAlert.message = r.message
    if (r.errors) Object.assign(formErrors, r.errors)
  }
}
async function submitCategory() {
  formAlert.type = ''; Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!categoryForm.name.trim()) formErrors.name = 'Nom requis'
  if (!categoryForm.type) formErrors.type = 'Type requis'
  if (Object.keys(formErrors).length) { formAlert.type='danger'; formAlert.message = 'Veuillez corriger'; return }
  const payload = {
    name: categoryForm.name, type: categoryForm.type,
    parent_id: categoryForm.parent_id || null, description: categoryForm.description,
  }
  const r = categoryEditing.value ? await fStore.updateCategory(categoryForm.id, payload) : await fStore.createCategory(payload)
  if (r.ok) {
    formAlert.type='success'; formAlert.message = r.message
    await Promise.all([loadCategories(), fStore.loadReferentials()])
    setTimeout(()=>{ showCategoryModal.value=false; resetCatForm() }, 500)
  } else {
    formAlert.type='danger'; formAlert.message = r.message
    if (r.errors) Object.assign(formErrors, r.errors)
  }
}
async function submitTransaction() {
  formAlert.type = ''; Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!transactionForm.account_id) formErrors.account_id = 'Compte requis'
  if (transactionForm.type !== 'transfer' && !transactionForm.category_id) formErrors.category_id = 'Catégorie requise'
  if (!(Number(transactionForm.amount) > 0)) formErrors.amount = 'Montant > 0 requis'
  if (!transactionForm.transaction_date) formErrors.transaction_date = 'Date requise'
  if (Object.keys(formErrors).length) { formAlert.type='danger'; formAlert.message='Veuillez corriger'; return }
  const payload = {
    type: transactionForm.type, account_id: Number(transactionForm.account_id),
    category_id: transactionForm.type === 'transfer' ? null : Number(transactionForm.category_id),
    amount: Number(transactionForm.amount), transaction_date: transactionForm.transaction_date,
    payment_method: transactionForm.payment_method, reference: transactionForm.reference || null,
    description: transactionForm.description || null,
  }
  const r = txEditing.value ? await fStore.updateTransaction(transactionForm.id, payload) : await fStore.createTransaction(payload)
  if (r.ok) {
    formAlert.type='success'; formAlert.message = r.message
    await Promise.all([loadTransactions(), loadDashboard(), loadStats()])
    setTimeout(()=>{ showTransactionModal.value=false; resetTxForm() }, 500)
  } else {
    formAlert.type='danger'; formAlert.message = r.message
    if (r.errors) Object.assign(formErrors, r.errors)
  }
}
async function submitTransfer() {
  formAlert.type = ''; Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!transferForm.from_account_id) formErrors.from_account_id = 'Compte source requis'
  if (!transferForm.to_account_id) formErrors.to_account_id = 'Compte destination requis'
  if (transferForm.from_account_id === transferForm.to_account_id) formErrors.to_account_id = 'Comptes doivent être différents'
  if (!(Number(transferForm.amount) > 0)) formErrors.amount = 'Montant > 0 requis'
  if (Object.keys(formErrors).length) { formAlert.type='danger'; formAlert.message='Veuillez corriger'; return }
  const payload = {
    from_account_id: Number(transferForm.from_account_id),
    to_account_id: Number(transferForm.to_account_id),
    amount: Number(transferForm.amount), transaction_date: transferForm.transaction_date,
    description: transferForm.description || null, reference: transferForm.reference || null,
    payment_method: transferForm.payment_method || 'transfer',
  }
  const r = await fStore.createTransfer(payload)
  if (r.ok) {
    formAlert.type='success'; formAlert.message = r.message
    await Promise.all([loadTransactions(), loadDashboard(), loadStats()])
    setTimeout(()=>{ showTransferModal.value=false; resetTransferForm() }, 500)
  } else {
    formAlert.type='danger'; formAlert.message = r.message
    if (r.errors) Object.assign(formErrors, r.errors)
  }
}

async function confirmAccToggle(a) {
  const r = await fStore.toggleAccountStatus(a.id)
  if (r.ok) await Promise.all([loadAccounts(), loadDashboard(), loadStats()])
  else { formAlert.type='danger'; formAlert.message = r.message }
}
function askDeleteAccount(a) {
  confirmTarget.value = a; confirmAction.value = 'delete_account'
  confirmType.value = 'danger'
  confirmMsg.value = `Supprimer le compte "${a.name}" ? Impossible s'il a déjà des transactions.`
  showConfirmModal.value = true
}
function askDeleteCategory(c) {
  confirmTarget.value = c; confirmAction.value = 'delete_category'
  confirmType.value = 'danger'
  confirmMsg.value = `Supprimer la catégorie "${c.name}" ? Impossible si utilisée ou si sous-catégories.`
  showConfirmModal.value = true
}
function askDeleteTx(tx) {
  confirmTarget.value = tx; confirmAction.value = 'delete_tx'
  confirmType.value = 'danger'
  confirmMsg.value = `Supprimer la transaction ${tx.transaction_code} ? Seules les lignes en attente/rejetée peuvent être supprimées.`
  showConfirmModal.value = true
}
function askReverseTx(tx) {
  confirmTarget.value = tx; confirmAction.value = 'reverse_tx'
  confirmType.value = 'warning'
  confirmMsg.value = `Contre-écriture de ${tx.transaction_code} ? Une transaction inverse sera générée.`
  showConfirmModal.value = true
}
function askDeleteAtt(a) {
  confirmTarget.value = a; confirmAction.value = 'delete_att'
  confirmType.value = 'danger'
  confirmMsg.value = `Supprimer la pièce jointe "${a.original_name}" ?`
  showConfirmModal.value = true
}
async function confirmActionFn() {
  let r
  if (confirmAction.value === 'delete_account') r = await fStore.deleteAccount(confirmTarget.value.id)
  else if (confirmAction.value === 'delete_category') r = await fStore.deleteCategory(confirmTarget.value.id)
  else if (confirmAction.value === 'delete_tx') r = await fStore.deleteTransaction(confirmTarget.value.id)
  else if (confirmAction.value === 'reverse_tx') r = await fStore.reverseTransaction(confirmTarget.value.id, { comment: 'Contre-écriture manuelle' })
  else if (confirmAction.value === 'delete_att') r = await fStore.deleteAttachment(confirmTarget.value.id)
  if (r?.ok) {
    showConfirmModal.value = false
    await Promise.all([loadAccounts(), loadCategories(), loadTransactions(), loadDashboard(), loadStats()])
    if (detailTx.value) await fStore.loadAttachments(detailTx.value.id)
    if (attachTx.value) await fStore.loadAttachments(attachTx.value.id)
  } else if (r) {
    formAlert.type='danger'; formAlert.message = r.message
  }
}
async function confirmApprove() {
  if (!approveTarget.value) return
  const r = await fStore.approveTransaction(approveTarget.value.id, { comment: approveComment.value || null })
  if (r.ok) {
    showApproveModal.value=false
    await Promise.all([loadTransactions(), loadDashboard(), loadStats()])
  } else {
    formAlert.type='danger'; formAlert.message = r.message
  }
}
async function confirmReject() {
  formAlert.type = ''
  if (!rejectReason.value.trim()) { formAlert.type='danger'; formAlert.message='Motif de rejet requis'; return }
  if (!rejectTarget.value) return
  const r = await fStore.rejectTransaction(rejectTarget.value.id, { rejection_reason: rejectReason.value })
  if (r.ok) {
    showRejectModal.value=false
    await Promise.all([loadTransactions(), loadDashboard(), loadStats()])
  } else {
    formAlert.type='danger'; formAlert.message = r.message
  }
}
async function submitAttachment() {
  if (!attachForm.file) { formAlert.type='danger'; formAlert.message='Sélectionner un fichier'; return }
  const r = await fStore.createAttachment({ transaction_id: attachTx.value.id, file: attachForm.file })
  if (r.ok) {
    formAlert.type='success'; formAlert.message = r.message
    attachForm.file = null
    await fStore.loadAttachments(attachTx.value.id)
    if (detailTx.value) await fStore.loadAttachments(detailTx.value.id)
  } else {
    formAlert.type='danger'; formAlert.message = r.message
  }
}
function pickFile(e) { attachForm.file = e.target.files?.[0] || null }

// ————— Dashboard helpers —————
const dashboardIncomeByCatMax = computed(() => {
  const vals = (fStore.dashboard?.income_by_category || []).map(i => i.total || 0)
  return Math.max(1, ...vals)
})
const dashboardExpenseByCatMax = computed(() => {
  const vals = (fStore.dashboard?.expense_by_category || []).map(i => i.total || 0)
  return Math.max(1, ...vals)
})
const balanceByAccountMax = computed(() => {
  const vals = (fStore.dashboard?.balance_by_account || []).map(i => i.current_balance || 0)
  return Math.max(1, ...vals)
})

function pagesToShow(p, lp) {
  const pages = []; const w = 2
  for (let i = 1; i <= lp; i++) {
    if (i === 1 || i === lp || (i >= p - w && i <= p + w)) pages.push(i)
    else if (pages[pages.length-1] !== '...') pages.push('...')
  }
  return pages
}

onMounted(async () => {
  await fStore.loadReferentials()
  await Promise.all([loadAccounts(), loadCategories(), loadTransactions(), loadDashboard(), loadStats()])
})
</script>

<template>
  <div class="attendance-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">💰 Module Financier</h1>
        <p class="page-subtitle">Comptes, catégories, recettes, dépenses, transferts et approbation</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-primary" @click="openCreateTx" style="margin-right:8px">➕ Nouvelle transaction</button>
        <button class="btn-primary" @click="openTransfer" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)">↔️ Transfert</button>
      </div>
    </div>

    <div v-if="formAlert.message" :class="['form-alert', formAlert.type]">{{ formAlert.message }}</div>

    <div class="tab-bar">
      <button :class="['tab', activeTab==='overview'?'active':'']" @click="activeTab='overview';loadDashboard()">📊 Tableau de bord</button>
      <button :class="['tab', activeTab==='accounts'?'active':'']" @click="activeTab='accounts';loadAccounts()">💳 Comptes</button>
      <button :class="['tab', activeTab==='categories'?'active':'']" @click="activeTab='categories';loadCategories()">📑 Catégories</button>
      <button :class="['tab', activeTab==='transactions'?'active':'']" @click="activeTab='transactions';loadTransactions()">💸 Transactions</button>
      <button :class="['tab', activeTab==='waiting'?'active':'']" @click="activeTab='waiting';txStatusFilter='pending';loadTransactions()">⏳ En attente {{ fStore.dashboard?.waiting_approval_count || 0 }}</button>
    </div>

    <!-- ============================== DASHBOARD ============================== -->
    <div v-if="activeTab==='overview'">
      <div class="sa-stats-grid">
        <div class="sa-stat-card">
          <div class="sa-stat-icon" style="background:#ecfdf5;color:#10b981">💰</div>
          <div class="sa-stat-value">{{ fStore.dashboard?.overview?.formatted_total_balance || '—' }}</div>
          <div class="sa-stat-label">Solde total</div>
        </div>
        <div class="sa-stat-card">
          <div class="sa-stat-icon" style="background:#f0fdf4;color:#059669">📈</div>
          <div class="sa-stat-value" style="color:#10b981">{{ fStore.dashboard?.overview?.formatted_month_income || '—' }}</div>
          <div class="sa-stat-label">Recettes du mois</div>
          <div class="sa-stat-label" style="margin-top:4px">Total: {{ fStore.dashboard?.overview?.formatted_total_income || '—' }}</div>
        </div>
        <div class="sa-stat-card">
          <div class="sa-stat-icon" style="background:#fef2f2;color:#dc2626">📉</div>
          <div class="sa-stat-value" style="color:#ef4444">{{ fStore.dashboard?.overview?.formatted_month_expense || '—' }}</div>
          <div class="sa-stat-label">Dépenses du mois</div>
          <div class="sa-stat-label" style="margin-top:4px">Total: {{ fStore.dashboard?.overview?.formatted_total_expense || '—' }}</div>
        </div>
        <div class="sa-stat-card">
          <div class="sa-stat-icon" style="background:#fff7ed;color:#ea580c">⏳</div>
          <div class="sa-stat-value" style="color:#f59e0b">{{ fStore.dashboard?.overview?.pending_count || 0 }}</div>
          <div class="sa-stat-label">En attente d'approbation</div>
          <div class="sa-stat-label" style="margin-top:4px">Approuvées: {{ fStore.dashboard?.overview?.approved_count || 0 }}</div>
        </div>
      </div>

      <div class="sa-stats-grid" style="grid-template-columns:1.2fr 1fr">
        <div class="sa-table-wrap" style="padding:18px">
          <h3 class="card-title">💳 Solde par compte</h3>
          <div v-if="!fStore.dashboard?.balance_by_account?.length" class="sa-empty">Aucun compte</div>
          <div v-else style="display:flex;flex-direction:column;gap:12px">
            <div v-for="a in (fStore.dashboard?.balance_by_account || [])" :key="a.id" class="sa-user-cell" style="gap:12px;padding:10px 12px;background:#fafbff;border-radius:10px;border:1px solid #e5e7eb">
              <div class="sa-stat-icon" style="width:38px;height:38px;font-size:18px;background:#eff6ff;color:#3b82f6">{{ a.type==='bank'?'🏦':a.type==='cash'?'💵':'📁' }}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:#111827">{{ a.name }}</div>
                <div style="height:8px;background:#f3f4f6;border-radius:999px;overflow:hidden;margin-top:6px">
                  <div :style="{ width: Math.max(3, Math.round(((a.current_balance||0) / balanceByAccountMax) * 100)) + '%' }" style="height:100%;background:linear-gradient(90deg,#10b981,#3b82f6);border-radius:999px"></div>
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:800;color:#111827">{{ a.formatted_current_balance }}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:3px">Initial: {{ Number(a.initial_balance||0).toLocaleString('fr-FR') }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sa-table-wrap" style="padding:18px">
          <h3 class="card-title">📥 Recettes par catégorie</h3>
          <div v-if="!fStore.dashboard?.income_by_category?.length" class="sa-empty">Aucune recette approuvée</div>
          <div v-else style="display:flex;flex-direction:column;gap:10px">
            <div v-for="c in fStore.dashboard?.income_by_category || []" :key="c.category_id" style="display:flex;flex-direction:column;gap:5px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:600;color:#111827">{{ c.name }}</span>
                <span style="font-weight:800;color:#10b981">{{ Number(c.total).toLocaleString('fr-FR') }}</span>
              </div>
              <div style="height:8px;background:#f3f4f6;border-radius:999px;overflow:hidden">
                <div :style="{ width: Math.max(3, Math.round((c.total / dashboardIncomeByCatMax) * 100)) + '%' }" style="height:100%;background:linear-gradient(90deg,#10b981,#3b82f6);border-radius:999px"></div>
              </div>
              <div style="font-size:11px;color:#6b7280">{{ c.tx_count }} transactions</div>
            </div>
          </div>
        </div>
      </div>

      <div class="sa-stats-grid" style="grid-template-columns:1fr 1fr">
        <div class="sa-table-wrap" style="padding:18px">
          <h3 class="card-title">📤 Dépenses par catégorie</h3>
          <div v-if="!fStore.dashboard?.expense_by_category?.length" class="sa-empty">Aucune dépense approuvée</div>
          <div v-else style="display:flex;flex-direction:column;gap:10px">
            <div v-for="c in fStore.dashboard?.expense_by_category || []" :key="c.category_id" style="display:flex;flex-direction:column;gap:5px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:600;color:#111827">{{ c.name }}</span>
                <span style="font-weight:800;color:#ef4444">{{ Number(c.total).toLocaleString('fr-FR') }}</span>
              </div>
              <div style="height:8px;background:#f3f4f6;border-radius:999px;overflow:hidden">
                <div :style="{ width: Math.max(3, Math.round((c.total / dashboardExpenseByCatMax) * 100)) + '%' }" style="height:100%;background:linear-gradient(90deg,#f97316,#ef4444);border-radius:999px"></div>
              </div>
              <div style="font-size:11px;color:#6b7280">{{ c.tx_count }} transactions</div>
            </div>
          </div>
        </div>

        <div class="sa-table-wrap" style="padding:18px">
          <h3 class="card-title">⏳ En attente d'approbation</h3>
          <div v-if="!fStore.dashboard?.waiting_approval?.length" class="sa-empty">Tout est à jour ✅</div>
          <div v-else style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow:auto">
            <div v-for="tx in (fStore.dashboard?.waiting_approval || [])" :key="tx.id" class="sa-user-cell" style="gap:10px;padding:10px 12px;background:#fffbeb;border-radius:10px;border:1px solid #fde68a;cursor:pointer" @click="openDetail(tx)">
              <span :class="typeBadgeClass(tx.type)" style="font-size:10px;padding:3px 8px">{{ tx.type_label }}</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:#111827;font-size:13px">{{ tx.description || tx.category?.name || tx.type_label }}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px">{{ tx.formatted_date }} · Compte: {{ tx.account?.name }}</div>
              </div>
              <div :style="{color:dirColor(tx),fontWeight:800}">{{ tx.formatted_signed_amount }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="sa-table-wrap" style="padding:18px">
        <h3 class="card-title">📝 Dernières transactions</h3>
        <div v-if="!fStore.dashboard?.recent_transactions?.length" class="sa-empty">Aucune transaction</div>
        <div v-else style="overflow:auto">
          <table class="sa-table">
            <thead><tr>
              <th>Code</th><th>Type</th><th>Compte</th><th>Catégorie</th><th>Date</th><th>Référence</th>
              <th style="text-align:right">Montant</th><th>Statut</th><th>Actions</th>
            </tr></thead>
            <tbody>
              <tr v-for="tx in (fStore.dashboard?.recent_transactions || [])" :key="tx.id">
                <td style="font-family:monospace;color:#2563eb">{{ tx.transaction_code }}</td>
                <td><span :class="typeBadgeClass(tx.type)" style="font-size:10px;padding:3px 8px">{{ tx.type_label }}</span></td>
                <td>{{ tx.account?.name }}</td>
                <td>{{ tx.category?.name || (tx.type==='transfer' ? '↔️ Transfert' : '-') }}</td>
                <td style="white-space:nowrap">{{ tx.formatted_date }}</td>
                <td style="font-size:12px;color:#6b7280">{{ tx.reference || '-' }}</td>
                <td style="text-align:right;font-weight:700" :style="{color:dirColor(tx)}">{{ tx.formatted_signed_amount }}</td>
                <td><span :class="txStatusBadge(tx.status)" style="font-size:10px;padding:3px 8px">{{ tx.status_label }}</span></td>
                <td><div class="row-actions">
                  <button class="btn-icon view" title="Voir" @click="openDetail(tx)">👁️</button>
                  <button v-if="tx.status==='pending'" class="btn-icon approve" title="Approuver" @click="openApprove(tx)">✅</button>
                  <button v-if="tx.status==='pending'" class="btn-icon reject" title="Rejeter" @click="openReject(tx)">❌</button>
                  <button v-if="tx.status==='approved'" class="btn-icon reverse" title="Contre-écriture" @click="askReverseTx(tx)">↩️</button>
                </div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============================== ACCOUNTS ============================== -->
    <div v-if="activeTab==='accounts'">
      <div class="sa-table-wrap" style="padding:18px">
        <div class="sa-user-cell" style="gap:10px;flex-wrap:wrap;margin-bottom:14px">
          <input v-model="accountSearch" placeholder="🔍 Rechercher compte..." class="input" style="max-width:240px" />
          <select v-model="accountTypeFilter" class="input" style="max-width:150px">
            <option value="">Tous types</option>
            <option v-for="o in accountTypeOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <select v-model="accountStatusFilter" class="input" style="max-width:150px">
            <option value="">Tous statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
          <select v-model="accountPerPage" class="input" style="max-width:120px">
            <option :value="20">20 / page</option><option :value="50">50 / page</option><option :value="100">100 / page</option>
          </select>
          <div style="flex:1"></div>
          <button class="btn-primary" @click="openCreateAccount">➕ Nouveau compte</button>
        </div>

        <div style="overflow:auto">
          <table class="sa-table">
            <thead><tr>
              <th>Nom</th><th>Type</th><th>Devise</th><th style="text-align:right">Solde initial</th>
              <th style="text-align:right">Solde actuel</th><th># Tx</th><th>Statut</th><th>Actions</th>
            </tr></thead>
            <tbody>
              <tr v-for="a in fStore.accounts" :key="a.id">
                <td style="font-weight:600">{{ a.name }}<div v-if="a.description" style="font-size:11px;color:#6b7280;font-weight:400;margin-top:2px">{{ a.description }}</div></td>
                <td><span :class="accountTypeBadge(a.type)" style="font-size:10px;padding:3px 8px">{{ a.type_label }}</span></td>
                <td style="font-family:monospace">{{ a.currency }}</td>
                <td style="text-align:right">{{ Number(a.initial_balance||0).toLocaleString('fr-FR') }}</td>
                <td style="text-align:right;font-weight:800">{{ a.formatted_current_balance }}</td>
                <td style="text-align:center">{{ a.transactions_count || 0 }}</td>
                <td><span :class="accountStatusBadge(a.status)" style="font-size:10px;padding:3px 8px">{{ a.status ? 'Actif' : 'Inactif' }}</span></td>
                <td><div class="row-actions">
                  <button class="btn-icon edit" title="Modifier" @click="openEditAccount(a)">✏️</button>
                  <button class="btn-icon status" title="Activer/Désactiver" @click="confirmAccToggle(a)">🔄</button>
                  <button class="btn-icon delete" title="Supprimer" @click="askDeleteAccount(a)">🗑️</button>
                </div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:10px;flex-wrap:wrap">
          <div style="font-size:12px;color:#6b7280">Page {{ fStore.accountsPagination.current_page }} / {{ fStore.accountsPagination.last_page || 1 }} · Total {{ fStore.accountsPagination.total }}</div>
          <div v-if="(fStore.accountsPagination.last_page||1) > 1" style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn-ghost" :disabled="fStore.accountsPagination.current_page<=1" @click="accountPage--">‹ Précédent</button>
            <button v-for="p in pagesToShow(fStore.accountsPagination.current_page, fStore.accountsPagination.last_page||1)" :key="p" :class="['btn-page', p===fStore.accountsPagination.current_page?'active':'']" :disabled="p==='...'" @click="accountPage=p">{{ p }}</button>
            <button class="btn-ghost" :disabled="fStore.accountsPagination.current_page>=(fStore.accountsPagination.last_page||1)" @click="accountPage++">Suivant ›</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================== CATEGORIES ============================== -->
    <div v-if="activeTab==='categories'">
      <div class="sa-stats-grid" style="grid-template-columns: 1fr 1fr">
        <div class="sa-table-wrap" style="padding:18px">
          <div class="sa-user-cell" style="gap:10px;flex-wrap:wrap;margin-bottom:14px">
            <h3 style="margin:0;font-size:15px;color:#10b981">📥 Recettes</h3>
            <div style="flex:1"></div>
            <select v-model="catStatusFilter" class="input" style="max-width:130px">
              <option value="">Tous statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
            <button class="btn-primary" style="background:linear-gradient(135deg,#10b981,#059669)" @click="catTypeFilter='income';openCreateCategory()">➕ Catégorie</button>
          </div>
          <div style="overflow:auto;max-height:460px">
            <table class="sa-table">
              <thead><tr><th>Nom</th><th style="width:80px">Statut</th><th style="width:140px">Actions</th></tr></thead>
              <tbody>
                <template v-for="c in (txIncomeCats || fStore.categories.filter(x=>x.type==='income'))" :key="'in'+c.id">
                  <tr>
                    <td style="font-weight:600;padding-left:14px">{{ c.full_path_label || c.name }}
                      <div v-if="c.description" style="font-size:11px;color:#6b7280;font-weight:400">{{ c.description }}</div>
                    </td>
                    <td><span :class="accountStatusBadge(c.status)" style="font-size:10px;padding:3px 8px">{{ c.status?'Actif':'Inactif' }}</span></td>
                    <td><div class="row-actions">
                      <button class="btn-icon edit" title="Modifier" @click="openEditCategory(c)">✏️</button>
                      <button class="btn-icon status" title="Toggle" @click="fStore.toggleCategoryStatus(c.id).then(()=>loadCategories()).then(fStore.loadReferentials)">🔄</button>
                      <button class="btn-icon delete" title="Supprimer" @click="askDeleteCategory(c)">🗑️</button>
                    </div></td>
                  </tr>
                  <tr v-if="c.children?.length" v-for="child in c.children" :key="'in'+c.id+'ch'+child.id">
                    <td style="padding-left:40px">└ {{ child.name }}</td>
                    <td><span :class="accountStatusBadge(child.status)" style="font-size:10px;padding:3px 8px">{{ child.status?'Actif':'Inactif' }}</span></td>
                    <td><div class="row-actions">
                      <button class="btn-icon edit" title="Modifier" @click="openEditCategory(child)">✏️</button>
                      <button class="btn-icon delete" title="Supprimer" @click="askDeleteCategory(child)">🗑️</button>
                    </div></td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div class="sa-table-wrap" style="padding:18px">
          <div class="sa-user-cell" style="gap:10px;flex-wrap:wrap;margin-bottom:14px">
            <h3 style="margin:0;font-size:15px;color:#ef4444">📤 Dépenses</h3>
            <div style="flex:1"></div>
            <select v-model="catStatusFilter" class="input" style="max-width:130px">
              <option value="">Tous statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
            <button class="btn-primary" style="background:linear-gradient(135deg,#ef4444,#dc2626)" @click="catTypeFilter='expense';openCreateCategory()">➕ Catégorie</button>
          </div>
          <div style="overflow:auto;max-height:460px">
            <table class="sa-table">
              <thead><tr><th>Nom</th><th style="width:80px">Statut</th><th style="width:140px">Actions</th></tr></thead>
              <tbody>
                <template v-for="c in (txExpenseCats || fStore.categories.filter(x=>x.type==='expense'))" :key="'ex'+c.id">
                  <tr>
                    <td style="font-weight:600;padding-left:14px">{{ c.full_path_label || c.name }}
                      <div v-if="c.description" style="font-size:11px;color:#6b7280;font-weight:400">{{ c.description }}</div>
                    </td>
                    <td><span :class="accountStatusBadge(c.status)" style="font-size:10px;padding:3px 8px">{{ c.status?'Actif':'Inactif' }}</span></td>
                    <td><div class="row-actions">
                      <button class="btn-icon edit" title="Modifier" @click="openEditCategory(c)">✏️</button>
                      <button class="btn-icon status" title="Toggle" @click="fStore.toggleCategoryStatus(c.id).then(()=>loadCategories()).then(fStore.loadReferentials)">🔄</button>
                      <button class="btn-icon delete" title="Supprimer" @click="askDeleteCategory(c)">🗑️</button>
                    </div></td>
                  </tr>
                  <tr v-if="c.children?.length" v-for="child in c.children" :key="'ex'+c.id+'ch'+child.id">
                    <td style="padding-left:40px">└ {{ child.name }}</td>
                    <td><span :class="accountStatusBadge(child.status)" style="font-size:10px;padding:3px 8px">{{ child.status?'Actif':'Inactif' }}</span></td>
                    <td><div class="row-actions">
                      <button class="btn-icon edit" title="Modifier" @click="openEditCategory(child)">✏️</button>
                      <button class="btn-icon delete" title="Supprimer" @click="askDeleteCategory(child)">🗑️</button>
                    </div></td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================== TRANSACTIONS ============================== -->
    <div v-if="activeTab==='transactions' || activeTab==='waiting'">
      <div class="sa-table-wrap" style="padding:18px">
        <div class="sa-user-cell" style="gap:10px;flex-wrap:wrap;margin-bottom:14px">
          <input v-model="txSearch" placeholder="🔍 Code/référence/description..." class="input" style="max-width:260px" />
          <select v-model="txAccountFilter" class="input" style="max-width:200px">
            <option value="">Tous les comptes</option>
            <option v-for="a in activeAccounts" :key="'accf'+a.id" :value="a.id">{{ a.name }} ({{ a.formatted_current_balance }})</option>
          </select>
          <select v-model="txCategoryFilter" class="input" style="max-width:180px">
            <option value="">Toutes catégories</option>
            <optgroup label="Recettes"><option v-for="c in txIncomeCats" :key="'inci'+c.id" :value="c.id">{{ c.name }}</option></optgroup>
            <optgroup label="Dépenses"><option v-for="c in txExpenseCats" :key="'exci'+c.id" :value="c.id">{{ c.name }}</option></optgroup>
          </select>
          <select v-model="txTypeFilter" class="input" style="max-width:140px">
            <option value="">Tous types</option>
            <option v-for="o in txTypeOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <select v-if="activeTab==='transactions'" v-model="txStatusFilter" class="input" style="max-width:140px">
            <option value="">Tous statuts</option>
            <option v-for="o in txStatusOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <input v-model="txDateFrom" type="date" class="input" style="max-width:140px" />
          <input v-model="txDateTo" type="date" class="input" style="max-width:140px" />
          <select v-model="txPerPage" class="input" style="max-width:120px">
            <option :value="30">30 / p.</option><option :value="60">60 / p.</option><option :value="100">100 / p.</option>
          </select>
          <div style="flex:1"></div>
          <button class="btn-primary" style="margin-right:6px" @click="openCreateTx">➕ Nouveau</button>
          <button class="btn-primary" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)" @click="openTransfer">↔️ Transfert</button>
        </div>

        <div style="overflow:auto">
          <table class="sa-table">
            <thead><tr>
              <th>Code</th><th>Date</th><th>Type</th><th>Compte</th><th>Catégorie / Transfert</th>
              <th>Référence</th><th style="text-align:right">Montant</th><th>Statut</th><th>Actions</th>
            </tr></thead>
            <tbody>
              <tr v-for="tx in fStore.transactions" :key="tx.id">
                <td style="font-family:monospace;color:#2563eb">{{ tx.transaction_code }}</td>
                <td style="white-space:nowrap;font-size:12px">{{ tx.formatted_date }}</td>
                <td><span :class="typeBadgeClass(tx.type)" style="font-size:10px;padding:3px 8px">{{ tx.type_label }}</span></td>
                <td>{{ tx.account?.name }}</td>
                <td>
                  <template v-if="tx.type==='transfer'">
                    <span v-if="tx.direction==='out'" style="color:#ef4444;font-size:12px">→ {{ tx.to_account?.name }}</span>
                    <span v-else style="color:#10b981;font-size:12px">← {{ tx.from_account?.name }}</span>
                    <div v-if="tx.transfer_group_code" style="font-size:10px;color:#6b7280;margin-top:2px;font-family:monospace">Groupe {{ tx.transfer_group_code }}</div>
                  </template>
                  <template v-else>{{ tx.category?.name || '-' }}</template>
                </td>
                <td style="font-size:12px;color:#6b7280">{{ tx.reference || '-' }}</td>
                <td style="text-align:right;font-weight:800;white-space:nowrap" :style="{color:dirColor(tx)}">{{ tx.formatted_signed_amount }}</td>
                <td><span :class="txStatusBadge(tx.status)" style="font-size:10px;padding:3px 8px">{{ tx.status_label }}</span></td>
                <td><div class="row-actions">
                  <button class="btn-icon view" title="Détails" @click="openDetail(tx)">👁️</button>
                  <button class="btn-icon attach" title="Pièces jointes" @click="openAttach(tx)">📎</button>
                  <button v-if="tx.can_be_edited" class="btn-icon edit" title="Modifier" @click="openEditTx(tx)">✏️</button>
                  <button v-if="tx.status==='pending' && tx.can_current_user_approve" class="btn-icon approve" title="Approuver" @click="openApprove(tx)">✅</button>
                  <button v-if="tx.status==='pending' && tx.can_current_user_reject" class="btn-icon reject" title="Rejeter" @click="openReject(tx)">❌</button>
                  <button v-if="tx.status==='approved'" class="btn-icon reverse" title="Contre-écriture" @click="askReverseTx(tx)">↩️</button>
                  <button v-if="tx.can_be_deleted" class="btn-icon delete" title="Supprimer" @click="askDeleteTx(tx)">🗑️</button>
                </div></td>
              </tr>
              <tr v-if="!fStore.transactions.length"><td colspan="9" class="sa-empty">Aucune transaction</td></tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:10px;flex-wrap:wrap">
          <div style="font-size:12px;color:#6b7280">Page {{ fStore.transactionsPagination.current_page }} / {{ fStore.transactionsPagination.last_page || 1 }} · Total {{ fStore.transactionsPagination.total }}</div>
          <div v-if="(fStore.transactionsPagination.last_page||1) > 1" style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn-ghost" :disabled="fStore.transactionsPagination.current_page<=1" @click="txPage--">‹ Précédent</button>
            <button v-for="p in pagesToShow(fStore.transactionsPagination.current_page, fStore.transactionsPagination.last_page||1)" :key="p" :class="['btn-page', p===fStore.transactionsPagination.current_page?'active':'']" :disabled="p==='...'" @click="txPage=p">{{ p }}</button>
            <button class="btn-ghost" :disabled="fStore.transactionsPagination.current_page>=(fStore.transactionsPagination.last_page||1)" @click="txPage++">Suivant ›</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================ MODALE COMPTE ================ -->
    <div v-if="showAccountModal" class="modal-backdrop" @click.self="showAccountModal=false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ accountEditing ? 'Modifier le compte' : 'Nouveau compte' }}</h3>
          <button class="btn-icon close" @click="showAccountModal=false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Nom du compte *</label>
              <input v-model="accountForm.name" :class="['input', formErrors.name?'err':'']" placeholder="Ex: Caisse du culte" />
              <div v-if="formErrors.name" class="err-msg">{{ formErrors.name }}</div>
            </div>
            <div class="form-group">
              <label class="label">Type *</label>
              <select v-model="accountForm.type" :class="['input', formErrors.type?'err':'']">
                <option v-for="o in accountTypeOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <div v-if="formErrors.type" class="err-msg">{{ formErrors.type }}</div>
            </div>
            <div class="form-group">
              <label class="label">Devise</label>
              <select v-model="accountForm.currency" class="input">
                <option v-for="o in currencyOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Solde initial</label>
              <input type="number" step="0.01" v-model.number="accountForm.initial_balance" :class="['input', formErrors.initial_balance?'err':'']" />
              <div v-if="formErrors.initial_balance" class="err-msg">{{ formErrors.initial_balance }}</div>
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label class="label">Description</label>
              <textarea v-model="accountForm.description" rows="2" class="input"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showAccountModal=false">Annuler</button>
          <button class="btn-primary" @click="submitAccount">{{ accountEditing ? 'Enregistrer' : 'Créer le compte' }}</button>
        </div>
      </div>
    </div>

    <!-- ================ MODALE CATEGORIE ================ -->
    <div v-if="showCategoryModal" class="modal-backdrop" @click.self="showCategoryModal=false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ categoryEditing ? 'Modifier catégorie' : 'Nouvelle catégorie' }}</h3>
          <button class="btn-icon close" @click="showCategoryModal=false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Type *</label>
              <select v-model="categoryForm.type" :class="['input', formErrors.type?'err':'']">
                <option value="income">Recette</option>
                <option value="expense">Dépense</option>
              </select>
              <div v-if="formErrors.type" class="err-msg">{{ formErrors.type }}</div>
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label class="label">Nom *</label>
              <input v-model="categoryForm.name" :class="['input', formErrors.name?'err':'']" />
              <div v-if="formErrors.name" class="err-msg">{{ formErrors.name }}</div>
            </div>
          </div>
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Catégorie parente</label>
              <select v-model="categoryForm.parent_id" class="input">
                <option :value="null">— Aucune (racine) —</option>
                <option v-for="c in (categoryForm.type==='income' ? txIncomeCats : txExpenseCats).filter(x => !categoryEditing || x.id !== categoryForm.id)" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label class="label">Description</label>
              <textarea v-model="categoryForm.description" rows="2" class="input"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showCategoryModal=false">Annuler</button>
          <button class="btn-primary" @click="submitCategory">{{ categoryEditing ? 'Enregistrer' : 'Créer' }}</button>
        </div>
      </div>
    </div>

    <!-- ================ MODALE TRANSACTION ================ -->
    <div v-if="showTransactionModal" class="modal-backdrop" @click.self="showTransactionModal=false">
      <div class="modal-dialog" style="max-width:640px">
        <div class="modal-header">
          <h3>{{ txEditing ? 'Modifier transaction' : 'Nouvelle transaction' }}</h3>
          <button class="btn-icon close" @click="showTransactionModal=false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Type *</label>
              <select v-model="transactionForm.type" class="input">
                <option value="income">📥 Recette</option>
                <option value="expense">📤 Dépense</option>
              </select>
            </div>
            <div class="form-group">
              <label class="label">Compte *</label>
              <select v-model="transactionForm.account_id" :class="['input', formErrors.account_id?'err':'']">
                <option :value="null">— Sélectionner —</option>
                <option v-for="a in activeAccounts" :key="'acctg'+a.id" :value="a.id">{{ a.name }} ({{ a.formatted_current_balance }})</option>
              </select>
              <div v-if="formErrors.account_id" class="err-msg">{{ formErrors.account_id }}</div>
            </div>
            <div class="form-group">
              <label class="label">Catégorie *</label>
              <select v-model="transactionForm.category_id" :class="['input', formErrors.category_id?'err':'']">
                <option :value="null">— Sélectionner —</option>
                <optgroup v-if="transactionForm.type==='income'" label="Recettes">
                  <option v-for="c in txIncomeCats" :key="'cati'+c.id" :value="c.id">{{ c.full_path_label || c.name }}</option>
                </optgroup>
                <optgroup v-if="transactionForm.type==='expense'" label="Dépenses">
                  <option v-for="c in txExpenseCats" :key="'cate'+c.id" :value="c.id">{{ c.full_path_label || c.name }}</option>
                </optgroup>
              </select>
              <div v-if="formErrors.category_id" class="err-msg">{{ formErrors.category_id }}</div>
            </div>
          </div>
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Montant *</label>
              <input type="number" step="0.01" min="0" v-model.number="transactionForm.amount" :class="['input', formErrors.amount?'err':'']" />
              <div v-if="formErrors.amount" class="err-msg">{{ formErrors.amount }}</div>
            </div>
            <div class="form-group">
              <label class="label">Date *</label>
              <input type="date" v-model="transactionForm.transaction_date" :class="['input', formErrors.transaction_date?'err':'']" />
              <div v-if="formErrors.transaction_date" class="err-msg">{{ formErrors.transaction_date }}</div>
            </div>
            <div class="form-group">
              <label class="label">Mode de paiement</label>
              <select v-model="transactionForm.payment_method" class="input">
                <option v-for="o in pmOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Référence</label>
              <input v-model="transactionForm.reference" class="input" placeholder="Facture N°, reçu, ..." />
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label class="label">Description</label>
              <textarea v-model="transactionForm.description" rows="2" class="input"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showTransactionModal=false">Annuler</button>
          <button class="btn-primary" @click="submitTransaction">{{ txEditing ? 'Enregistrer' : 'Créer' }}</button>
        </div>
      </div>
    </div>

    <!-- ================ MODALE TRANSFERT ================ -->
    <div v-if="showTransferModal" class="modal-backdrop" @click.self="showTransferModal=false">
      <div class="modal-dialog" style="max-width:560px">
        <div class="modal-header"><h3>↔️ Nouveau transfert inter-comptes</h3><button class="btn-icon close" @click="showTransferModal=false">✕</button></div>
        <div class="modal-body">
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Compte source *</label>
              <select v-model="transferForm.from_account_id" :class="['input', formErrors.from_account_id?'err':'']">
                <option :value="null">— Sélectionner —</option>
                <option v-for="a in activeAccounts" :key="'froma'+a.id" :value="a.id">{{ a.name }} ({{ a.formatted_current_balance }})</option>
              </select>
              <div v-if="formErrors.from_account_id" class="err-msg">{{ formErrors.from_account_id }}</div>
            </div>
            <div class="form-group">
              <label class="label">Compte destination *</label>
              <select v-model="transferForm.to_account_id" :class="['input', formErrors.to_account_id?'err':'']">
                <option :value="null">— Sélectionner —</option>
                <option v-for="a in activeAccounts" :key="'toa'+a.id" :value="a.id">{{ a.name }}</option>
              </select>
              <div v-if="formErrors.to_account_id" class="err-msg">{{ formErrors.to_account_id }}</div>
            </div>
            <div class="form-group">
              <label class="label">Montant *</label>
              <input type="number" step="0.01" min="0" v-model.number="transferForm.amount" :class="['input', formErrors.amount?'err':'']" />
              <div v-if="formErrors.amount" class="err-msg">{{ formErrors.amount }}</div>
            </div>
          </div>
          <div class="form-row row-3">
            <div class="form-group">
              <label class="label">Date</label>
              <input type="date" v-model="transferForm.transaction_date" class="input" />
            </div>
            <div class="form-group">
              <label class="label">Référence</label>
              <input v-model="transferForm.reference" class="input" />
            </div>
            <div class="form-group">
              <label class="label">Mode</label>
              <select v-model="transferForm.payment_method" class="input">
                <option v-for="o in pmOpts" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="label">Motif / Description</label>
            <textarea v-model="transferForm.description" rows="2" class="input"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showTransferModal=false">Annuler</button>
          <button class="btn-primary" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)" @click="submitTransfer">⏵ Exécuter le transfert</button>
        </div>
      </div>
    </div>

    <!-- ================ MODALE APPROBATION ================ -->
    <div v-if="showApproveModal" class="modal-backdrop" @click.self="showApproveModal=false">
      <div class="modal-dialog" style="max-width:520px">
        <div class="modal-header"><h3>✅ Approuver la transaction</h3><button class="btn-icon close" @click="showApproveModal=false">✕</button></div>
        <div class="modal-body">
          <div v-if="approveTarget" class="sa-user-cell" style="gap:14px;padding:14px;background:#ecfdf5;border-radius:12px;border:1px solid #a7f3d0;margin-bottom:14px">
            <div style="font-weight:800;font-family:monospace;color:#059669">{{ approveTarget.transaction_code }}</div>
            <div style="flex:1">
              <div style="font-weight:700;color:#111827">{{ approveTarget.description || approveTarget.category?.name || approveTarget.type_label }}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:3px">Compte {{ approveTarget.account?.name }} · {{ approveTarget.formatted_date }}</div>
            </div>
            <div :style="{color:dirColor(approveTarget),fontWeight:800}">{{ approveTarget.formatted_signed_amount }}</div>
          </div>
          <div class="form-group">
            <label class="label">Commentaire (facultatif)</label>
            <textarea v-model="approveComment" rows="3" class="input" placeholder="Observations, référence interne..."></textarea>
          </div>
          <div v-if="!approveTarget?.can_current_user_approve" class="form-alert danger" style="margin-top:12px">
            ⚠️ Vous ne pouvez pas approuver une transaction que vous avez vous-même créée.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showApproveModal=false">Annuler</button>
          <button class="btn-primary" style="background:linear-gradient(135deg,#10b981,#059669)" :disabled="!approveTarget?.can_current_user_approve || fStore.approving" @click="confirmApprove">
            {{ fStore.approving ? '⏳ Traitement...' : '✅ Confirmer approbation' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ================ MODALE REJET ================ -->
    <div v-if="showRejectModal" class="modal-backdrop" @click.self="showRejectModal=false">
      <div class="modal-dialog" style="max-width:520px">
        <div class="modal-header"><h3>❌ Rejeter la transaction</h3><button class="btn-icon close" @click="showRejectModal=false">✕</button></div>
        <div class="modal-body">
          <div v-if="rejectTarget" class="sa-user-cell" style="gap:14px;padding:14px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;margin-bottom:14px">
            <div style="font-weight:800;font-family:monospace;color:#dc2626">{{ rejectTarget.transaction_code }}</div>
            <div style="flex:1">
              <div style="font-weight:700;color:#111827">{{ rejectTarget.description || rejectTarget.category?.name || rejectTarget.type_label }}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:3px">Compte {{ rejectTarget.account?.name }} · {{ rejectTarget.formatted_date }}</div>
            </div>
            <div :style="{color:dirColor(rejectTarget),fontWeight:800}">{{ rejectTarget.formatted_signed_amount }}</div>
          </div>
          <div class="form-group">
            <label class="label">Motif du rejet *</label>
            <textarea v-model="rejectReason" :class="['input', formErrors.rejection_reason?'err':'']" rows="4" placeholder="Pourquoi cette transaction est-elle rejetée ? (obligatoire)"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showRejectModal=false">Annuler</button>
          <button class="btn-primary" style="background:linear-gradient(135deg,#ef4444,#dc2626)" :disabled="fStore.approving" @click="confirmReject">
            {{ fStore.approving ? '⏳ Traitement...' : '❌ Confirmer le rejet' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ================ MODALE DETAILS TRANSACTION ================ -->
    <div v-if="showDetailModal" class="modal-backdrop" @click.self="showDetailModal=false">
      <div class="modal-dialog" style="max-width:720px;max-height:90vh;overflow:auto">
        <div class="modal-header"><h3>Détails transaction</h3><button class="btn-icon close" @click="showDetailModal=false">✕</button></div>
        <div class="modal-body" v-if="detailTx">
          <div class="sa-user-cell" style="gap:14px;padding:16px;background:linear-gradient(135deg,#eff6ff,#faf5ff);border-radius:14px;margin-bottom:18px">
            <div style="font-family:monospace;font-weight:800;color:#2563eb;font-size:15px">{{ detailTx.transaction_code }}</div>
            <span :class="typeBadgeClass(detailTx.type)" style="font-size:11px;padding:4px 10px">{{ detailTx.type_label }}</span>
            <span :class="txStatusBadge(detailTx.status)" style="font-size:11px;padding:4px 10px">{{ detailTx.status_label }}</span>
            <div style="flex:1"></div>
            <div :style="{color:dirColor(detailTx),fontWeight:800,fontSize:'20px',marginLeft:'auto'}">{{ detailTx.formatted_signed_amount }}</div>
          </div>
          <div class="sa-stats-grid" style="grid-template-columns:1fr 1fr">
            <div><strong>Compte:</strong> {{ detailTx.account?.name }}</div>
            <div v-if="detailTx.type!=='transfer'"><strong>Catégorie:</strong> {{ detailTx.category?.name || '-' }}</div>
            <div v-if="detailTx.type==='transfer' && detailTx.direction==='out'"><strong>Vers:</strong> {{ detailTx.to_account?.name }}</div>
            <div v-if="detailTx.type==='transfer' && detailTx.direction==='in'"><strong>Depuis:</strong> {{ detailTx.from_account?.name }}</div>
            <div><strong>Date:</strong> {{ detailTx.formatted_date }}</div>
            <div><strong>Mode paiement:</strong> {{ detailTx.payment_method_label || '-' }}</div>
            <div><strong>Référence:</strong> {{ detailTx.reference || '-' }}</div>
            <div v-if="detailTx.transfer_group_code"><strong>Groupe transfert:</strong> <code style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px">{{ detailTx.transfer_group_code }}</code></div>
            <div><strong>Créé par:</strong> {{ detailTx.creator?.name || '#'+detailTx.created_by }}</div>
            <div v-if="detailTx.approver"><strong>Approuvé par:</strong> {{ detailTx.approver?.name }} le {{ detailTx.approved_at }}</div>
            <div v-if="detailTx.rejection_reason" style="grid-column:span 2;color:#dc2626;background:#fef2f2;padding:10px;border-radius:8px"><strong>Motif rejet:</strong> {{ detailTx.rejection_reason }}</div>
            <div v-if="detailTx.description" style="grid-column:span 2"><strong>Description:</strong> {{ detailTx.description }}</div>
          </div>

          <div style="margin-top:22px">
            <div class="sa-user-cell" style="margin-bottom:10px">
              <h3 class="card-title" style="margin:0">📎 Pièces jointes ({{ fStore.selectedTransactionAttachments.length }})</h3>
              <button class="btn-ghost" @click="openAttach(detailTx)">➕ Ajouter</button>
            </div>
            <div v-if="!fStore.selectedTransactionAttachments.length" class="sa-empty">Aucune pièce jointe</div>
            <div v-else style="display:flex;flex-wrap:wrap;gap:10px">
              <div v-for="att in fStore.selectedTransactionAttachments" :key="att.id" style="width:160px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff">
                <div v-if="att.is_image" style="height:110px;background:#f9fafb;display:flex;align-items:center;justify-content:center;overflow:hidden">
                  <img :src="att.file_url" :alt="att.original_name" style="max-height:100%;max-width:100%;object-fit:contain" />
                </div>
                <div v-else style="height:110px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:36px">
                  {{ att.is_pdf ? '📕' : '📄' }}
                </div>
                <div style="padding:8px 10px">
                  <div style="font-size:12px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" :title="att.original_name">{{ att.original_name }}</div>
                  <div style="font-size:10px;color:#6b7280;margin-top:2px">{{ att.formatted_size }}</div>
                  <div class="row-actions" style="margin-top:8px">
                    <button class="btn-icon view" title="Télécharger" @click="window.open(att.file_url,'_blank')">⬇️</button>
                    <button class="btn-icon delete" title="Supprimer" @click="askDeleteAtt(att)">🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" v-if="detailTx">
          <button class="btn-ghost" @click="showDetailModal=false">Fermer</button>
          <button v-if="detailTx.can_be_edited" class="btn-ghost" @click="showDetailModal=false;openEditTx(detailTx)">✏️ Modifier</button>
          <button v-if="detailTx.status==='pending' && detailTx.can_current_user_approve" class="btn-primary" style="background:linear-gradient(135deg,#10b981,#059669)" @click="showDetailModal=false;openApprove(detailTx)">✅ Approuver</button>
          <button v-if="detailTx.status==='pending' && detailTx.can_current_user_reject" class="btn-primary" style="background:linear-gradient(135deg,#ef4444,#dc2626)" @click="showDetailModal=false;openReject(detailTx)">❌ Rejeter</button>
          <button v-if="detailTx.status==='approved'" class="btn-ghost" @click="showDetailModal=false;askReverseTx(detailTx)">↩️ Contre-écrire</button>
        </div>
      </div>
    </div>

    <!-- ================ MODALE UPLOAD ATTACHMENT ================ -->
    <div v-if="showAttachModal" class="modal-backdrop" @click.self="showAttachModal=false">
      <div class="modal-dialog" style="max-width:620px;max-height:90vh;overflow:auto">
        <div class="modal-header"><h3>📎 Pièces jointes</h3><button class="btn-icon close" @click="showAttachModal=false">✕</button></div>
        <div class="modal-body">
          <div v-if="attachTx" style="margin-bottom:14px;font-size:13px;color:#374151">
            Transaction: <strong style="font-family:monospace;color:#2563eb">{{ attachTx.transaction_code }}</strong> · {{ attachTx.description || attachTx.category?.name }}
          </div>
          <div class="form-group" style="border:2px dashed #c7d2fe;background:#f5f3ff;padding:16px;border-radius:12px;margin-bottom:14px">
            <label class="label">Sélectionner un fichier (max 10 Mo)</label>
            <input type="file" class="input" @change="pickFile" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
            <div v-if="attachForm.file" style="margin-top:10px;font-size:12px;color:#374151;background:#fff;padding:8px 12px;border-radius:8px;border:1px solid #e5e7eb">
              📄 <strong>{{ attachForm.file.name }}</strong> · {{ (attachForm.file.size/1024).toFixed(1) }} Ko
            </div>
          </div>
          <button class="btn-primary" @click="submitAttachment" :disabled="!attachForm.file || fStore.saving">
            {{ fStore.saving ? '⏳ Upload...' : '⬆️ Envoyer la pièce jointe' }}
          </button>
          <hr style="margin:20px 0;border:0;border-top:1px solid #e5e7eb" />
          <div>
            <h4 style="margin:0 0 12px 0;font-size:13px;color:#374151">Fichiers déjà joints ({{ fStore.selectedTransactionAttachments.length }})</h4>
            <div v-if="!fStore.selectedTransactionAttachments.length" class="sa-empty">Aucune pièce jointe</div>
            <div v-else style="display:flex;flex-wrap:wrap;gap:10px">
              <div v-for="att in fStore.selectedTransactionAttachments" :key="att.id" style="width:140px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff">
                <div v-if="att.is_image" style="height:90px;background:#f9fafb;display:flex;align-items:center;justify-content:center;overflow:hidden">
                  <img :src="att.file_url" :alt="att.original_name" style="max-height:100%;max-width:100%;object-fit:contain" />
                </div>
                <div v-else style="height:90px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:30px">{{ att.is_pdf ? '📕':'📄' }}</div>
                <div style="padding:6px 8px">
                  <div style="font-size:11px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" :title="att.original_name">{{ att.original_name }}</div>
                  <div style="font-size:10px;color:#6b7280;margin-top:2px">{{ att.formatted_size }}</div>
                  <div class="row-actions" style="margin-top:6px">
                    <button class="btn-icon view" @click="window.open(att.file_url,'_blank')">⬇️</button>
                    <button class="btn-icon delete" @click="askDeleteAtt(att)">🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showAttachModal=false">Terminé</button>
        </div>
      </div>
    </div>

    <!-- ================ MODALE CONFIRM GENERIQUE ================ -->
    <div v-if="showConfirmModal" class="modal-backdrop" @click.self="showConfirmModal=false">
      <div class="modal-dialog" style="max-width:460px">
        <div class="modal-header"><h3>Confirmer l'action</h3><button class="btn-icon close" @click="showConfirmModal=false">✕</button></div>
        <div class="modal-body">
          <div class="sa-user-cell" style="padding:14px;border-radius:12px;margin-bottom:10px"
               :style="confirmType==='danger'?'background:#fef2f2;border:1px solid #fecaca':confirmType==='success'?'background:#ecfdf5;border:1px solid #a7f3d0':'background:#fffbeb;border:1px solid #fde68a'">
            <div style="font-size:22px">{{ confirmType==='danger' ? '⚠️' : confirmType==='success' ? '✅' : 'ℹ️' }}</div>
            <div style="flex:1;color:#111827;font-weight:500">{{ confirmMsg }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showConfirmModal=false">Annuler</button>
          <button class="btn-primary"
                  :style="confirmType==='danger'?'background:linear-gradient(135deg,#ef4444,#dc2626)':confirmType==='success'?'background:linear-gradient(135deg,#10b981,#059669)':''"
                  @click="confirmActionFn">Confirmer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-alert.danger { background:#fef2f2;color:#b91c1c;border:1px solid #fecaca }
.form-alert.success { background:#ecfdf5;color:#047857;border:1px solid #a7f3d0 }
.btn-page { padding:6px 10px;border:1px solid #e5e7eb;background:#fff;border-radius:8px;cursor:pointer;font-size:12px }
.btn-page:hover { border-color:#93c5fd }
.btn-page.active { background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border-color:#2563eb }
.btn-page:disabled { opacity:.5;cursor:not-allowed }
</style>
