<script setup>
import { computed, onMounted, ref } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { listTransactions } from '@/api/finance'

const finance = useFinanceStore()
const requests = ref([])
const requestTotal = ref(0)
const loading = ref(false)
const processingId = ref(null)
const rejectingId = ref(null)
const rejectionReason = ref('')
const notice = ref('')
const noticeError = ref(false)
const pendingAmount = computed(() => requests.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))

async function loadRequests() {
  loading.value = true
  try {
    const response = await listTransactions({ scope: 'pending', per_page: 100 })
    const payload = response?.data || {}
    requests.value = payload.data || []
    requestTotal.value = payload.meta?.total || payload.total || requests.value.length
  } catch (error) {
    requests.value = []
    notice.value = error?.data?.message || 'Impossible de charger les demandes.'
    noticeError.value = true
  } finally { loading.value = false }
}

async function approve(item) {
  processingId.value = item.id
  const result = await finance.approveTransaction(item.id)
  if (result.ok) {
    await loadRequests()
    notice.value = result.message || 'Demande approuvée.'
    noticeError.value = false
  } else { notice.value = result.message || 'Approbation impossible.'; noticeError.value = true }
  processingId.value = null
}

async function reject(item) {
  if (rejectingId.value !== item.id) { rejectingId.value = item.id; rejectionReason.value = ''; return }
  if (!rejectionReason.value.trim()) { notice.value = 'Indique le motif du rejet.'; noticeError.value = true; return }
  processingId.value = item.id
  const result = await finance.rejectTransaction(item.id, { rejection_reason: rejectionReason.value.trim() })
  if (result.ok) {
    rejectingId.value = null
    await loadRequests()
    notice.value = result.message || 'Demande rejetée.'
    noticeError.value = false
  } else { notice.value = result.message || 'Rejet impossible.'; noticeError.value = true }
  processingId.value = null
}

const amount = value => new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' FCFA'
const date = value => value ? value.slice(0, 10).split('-').reverse().join('/') : 'Date non renseignée'
onMounted(loadRequests)
</script>

<template>
  <section class="requests-page">
    <header class="page-heading">
      <div><p class="eyebrow">FINANCES</p><h1>Demandes à traiter</h1><p class="muted">Vérifie et approuve les transactions soumises par ton équipe.</p></div>
      <button class="refresh" :disabled="loading" @click="loadRequests">{{ loading ? 'Chargement…' : 'Actualiser' }}</button>
    </header>
    <div class="summary-grid">
      <article><span>En attente</span><strong>{{ requestTotal }}</strong><small>transactions à examiner</small></article>
      <article><span>Montant soumis</span><strong>{{ amount(pendingAmount) }}</strong><small>sur la page chargée</small></article>
    </div>
    <p v-if="notice" class="notice" :class="{ error: noticeError }">{{ notice }}</p>
    <div v-if="loading && !requests.length" class="empty">Chargement des demandes…</div>
    <div v-else-if="!requests.length" class="empty"><strong>Tout est à jour</strong><span>Aucune transaction n’attend une approbation.</span></div>
    <div v-else class="request-list">
      <article v-for="item in requests" :key="item.id" class="request-card">
        <div>
          <div class="request-title"><span class="type">{{ item.type_label || item.type || 'Transaction' }}</span><h2>{{ item.description || item.transaction_code || 'Transaction sans description' }}</h2></div>
          <p class="meta">{{ item.transaction_code || 'Sans référence' }} · {{ item.category?.name || 'Sans catégorie' }} · {{ date(item.transaction_date) }}<template v-if="item.creator?.name"> · Par {{ item.creator.name }}</template></p>
        </div>
        <strong class="amount">{{ item.formatted_amount || amount(item.amount) }}</strong>
        <div v-if="item.can_current_user_approve || item.can_current_user_reject" class="actions">
          <button v-if="item.can_current_user_approve" class="approve" :disabled="processingId === item.id" @click="approve(item)">{{ processingId === item.id ? 'Traitement…' : 'Approuver' }}</button>
          <button v-if="item.can_current_user_reject" class="reject" :disabled="processingId === item.id" @click="reject(item)">Rejeter</button>
        </div>
        <div v-if="rejectingId === item.id" class="reject-form">
          <label :for="'reason-' + item.id">Motif du rejet</label>
          <textarea :id="'reason-' + item.id" v-model="rejectionReason" rows="2" maxlength="1000" />
          <div><button class="reject" :disabled="processingId === item.id" @click="reject(item)">Confirmer le rejet</button><button class="cancel" @click="rejectingId = null">Annuler</button></div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.requests-page { display:grid; gap:20px; color:#172033; }
.page-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.page-heading h1 { margin:2px 0 6px; font-size:28px; }
.eyebrow { margin:0; color:#64748b; font-size:11px; font-weight:800; letter-spacing:.12em; }
.muted, .meta, .summary-grid small { color:#64748b; }
.muted { margin:0; }
.refresh, .approve, .reject, .cancel { border:0; border-radius:9px; padding:10px 14px; font:inherit; font-weight:700; cursor:pointer; }
.refresh { background:#e9eef5; color:#334155; }
.refresh:disabled, .actions button:disabled { opacity:.55; cursor:wait; }
.summary-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.summary-grid article, .request-card { background:#fff; border:1px solid #e7ebf1; border-radius:14px; box-shadow:0 5px 18px #17203308; }
.summary-grid article { display:grid; gap:5px; padding:18px; }
.summary-grid span { color:#64748b; }
.summary-grid strong { font-size:24px; }
.request-list { display:grid; gap:12px; }
.request-card { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:18px; padding:18px; }
.request-title { display:flex; align-items:center; gap:10px; }
.request-title h2 { margin:0; font-size:16px; }
.type { flex:none; padding:4px 8px; border-radius:999px; color:#4338ca; background:#eef2ff; font-size:11px; font-weight:700; }
.meta { margin:9px 0 0; font-size:12px; }
.amount { white-space:nowrap; font-size:17px; }
.actions { display:flex; gap:8px; }
.approve { color:white; background:#059669; }
.reject { color:#b42318; background:#fee4e2; }
.reject-form { grid-column:1/-1; display:grid; gap:8px; padding-top:12px; border-top:1px solid #eef0f4; }
.reject-form label { color:#475569; font-size:13px; font-weight:700; }
.reject-form textarea { width:100%; border:1px solid #cbd5e1; border-radius:8px; padding:10px; font:inherit; resize:vertical; }
.reject-form > div { display:flex; align-items:center; gap:12px; }
.cancel { color:#475569; background:transparent; }
.notice, .empty { margin:0; padding:14px; border-radius:10px; background:#d1fae5; color:#065f46; }
.notice.error { background:#fee2e2; color:#991b1b; }
.empty { display:grid; justify-items:center; gap:6px; padding:42px 20px; border:1px dashed #cbd5e1; background:transparent; color:#64748b; text-align:center; }
.empty strong { color:#172033; font-size:18px; }
@media (max-width:760px) { .summary-grid { grid-template-columns:1fr; } .request-card { grid-template-columns:1fr; } }
</style>
