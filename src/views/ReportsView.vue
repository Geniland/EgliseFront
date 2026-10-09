<script setup>
import { computed, onMounted, ref } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import LineChart from '@/components/dashboard/LineChart.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const period = ref('monthly')
const loading = ref(false)
const error = ref('')
const stats = ref({})
const chart = ref({ labels: [], datasets: [] })
const finances = ref({})
const ministries = ref({ total: 0, ministries: [] })
const formatAmount = value => new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' FCFA'
const cards = computed(() => [
  authStore.hasPermission('members.view') && { label: 'Membres', value: stats.value.members_total?.value ?? 0 },
  authStore.hasPermission('attendance.view') && { label: 'Présences ce mois', value: stats.value.presences_month?.value ?? 0 },
  authStore.hasPermission('finance.view') && { label: 'Dons ce mois', value: formatAmount(finances.value.receipts?.total ?? stats.value.donations?.value) },
  authStore.hasPermission('events.view') && { label: 'Événements à venir', value: stats.value.events?.value ?? 0 },
  authStore.hasPermission('finance.view') && { label: 'Transactions à approuver', value: stats.value.pending_requests?.value ?? 0 },
].filter(Boolean))

async function loadReport() {
  loading.value = true
  error.value = ''
  const results = await Promise.allSettled([
    dashboardApi.getStats(), dashboardApi.getPresenceDonationChart(period.value),
    dashboardApi.getFinancialSummary(), dashboardApi.getMinistryDistribution(),
  ])
  const [s, c, f, m] = results
  if (s.status === 'fulfilled') stats.value = s.value?.data || {}
  if (c.status === 'fulfilled') chart.value = c.value?.data || { labels: [], datasets: [] }
  if (f.status === 'fulfilled') finances.value = f.value?.data || {}
  if (m.status === 'fulfilled') ministries.value = m.value?.data || { total: 0, ministries: [] }
  if (results.every(result => result.status === 'rejected')) error.value = 'Les rapports ne sont pas disponibles pour le moment.'
  loading.value = false
}

function exportCsv() {
  const hasAttendance = authStore.hasPermission('attendance.view')
  const hasFinance = authStore.hasPermission('finance.view')
  const rows = [['Rapport', 'Valeur'], ...cards.value.map(card => [card.label, String(card.value)]), [], ['Période', ...(hasAttendance ? ['Présences'] : []), ...(hasFinance ? ['Dons'] : [])]]
  const attendance = chart.value.datasets?.find(dataset => /présence|attendance/i.test(dataset.label || ''))?.data || []
  const donations = chart.value.datasets?.find(dataset => /don|recette|finance/i.test(dataset.label || ''))?.data || []
  ;(chart.value.labels || []).forEach((label, index) => rows.push([label, ...(hasAttendance ? [String(attendance[index] ?? 0)] : []), ...(hasFinance ? [String(donations[index] ?? 0)] : [])]))
  const csv = '\uFEFF' + rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'rapports-eglise.csv'
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(loadReport)
</script>

<template>
  <section class="reports-page">
    <header class="page-heading">
      <div><p class="eyebrow">PILOTAGE</p><h1>Rapports et statistiques</h1><p class="muted">Synthèse calculée à partir des données de ton église.</p></div>
      <div class="heading-actions">
        <select v-model="period" aria-label="Période du graphique" @change="loadReport"><option value="monthly">6 derniers mois</option><option value="weekly">7 derniers jours</option></select>
        <button v-if="authStore.hasAnyPermission(['reports.export', 'finance.reports'])" class="export" :disabled="loading" @click="exportCsv">Exporter CSV</button>
      </div>
    </header>
    <p v-if="error" class="error-banner">{{ error }}</p>
    <div v-if="loading" class="loading">Actualisation des rapports…</div>
    <div class="metric-grid"><article v-for="card in cards" :key="card.label"><span>{{ card.label }}</span><strong>{{ card.value }}</strong></article></div>
    <article v-if="authStore.hasAnyPermission(['attendance.view', 'finance.view'])" class="panel">
      <div class="panel-heading"><div><h2>Présences et dons</h2><p>Évolution sur la période sélectionnée</p></div><button class="subtle" :disabled="loading" @click="loadReport">Actualiser</button></div>
      <div v-if="chart.labels?.length" class="chart-wrap"><LineChart :labels="chart.labels" :datasets="chart.datasets" :height="260" /></div>
      <div v-else class="empty">Aucune donnée disponible sur cette période.</div>
    </article>
    <div class="detail-grid">
      <article v-if="authStore.hasPermission('finance.view')" class="panel"><div class="panel-heading"><div><h2>Résumé financier</h2><p>Montants validés</p></div></div>
        <dl class="finance-list"><div><dt>Recettes</dt><dd>{{ formatAmount(finances.receipts?.total) }}</dd></div><div><dt>Dépenses</dt><dd>{{ formatAmount(finances.expenses?.total) }}</dd></div><div class="net"><dt>Solde net</dt><dd>{{ formatAmount(finances.net_balance?.total) }}</dd></div></dl>
      </article>
      <article v-if="authStore.hasPermission('ministries.view')" class="panel"><div class="panel-heading"><div><h2>Répartition par ministère</h2><p>{{ ministries.total || 0 }} membres de l’église</p></div></div>
        <div v-if="ministries.ministries?.length" class="ministry-list"><div v-for="item in ministries.ministries" :key="item.id || item.name"><span>{{ item.name }}</span><strong>{{ item.count ?? 0 }}</strong></div></div>
        <div v-else class="empty">Aucun ministère renseigné.</div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.reports-page { display:grid; gap:18px; color:#172033; }
.page-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.page-heading h1 { margin:2px 0 6px; font-size:28px; }
.eyebrow { margin:0; color:#64748b; font-size:11px; font-weight:800; letter-spacing:.12em; }
.muted, .panel-heading p { margin:0; color:#64748b; }
.heading-actions { display:flex; gap:9px; align-items:center; }
.heading-actions select, .export, .subtle { border:1px solid #dbe2ea; border-radius:9px; padding:10px 12px; background:white; color:#334155; font:inherit; font-weight:650; }
.export { border-color:#059669; color:white; background:#059669; cursor:pointer; }
.export:disabled, .subtle:disabled { opacity:.55; cursor:wait; }
.metric-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; }
.metric-grid article, .panel { border:1px solid #e7ebf1; border-radius:14px; background:white; box-shadow:0 5px 18px #17203308; }
.metric-grid article { display:grid; gap:9px; padding:16px; }
.metric-grid span { color:#64748b; font-size:13px; }
.metric-grid strong { font-size:22px; }
.panel { padding:18px; }
.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.panel-heading h2 { margin:0 0 5px; font-size:17px; }
.panel-heading p { font-size:12px; }
.subtle { cursor:pointer; }
.chart-wrap { width:100%; height:260px; margin-top:14px; overflow:hidden; }
.empty, .loading { padding:26px 12px; color:#64748b; text-align:center; }
.detail-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.finance-list { display:grid; margin:16px 0 0; }
.finance-list div, .ministry-list div { display:flex; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid #eef0f4; }
.finance-list div:last-child, .ministry-list div:last-child { border:0; }
.finance-list dt { color:#64748b; }
.finance-list dd { margin:0; font-weight:750; }
.net { color:#047857; }
.ministry-list { margin-top:12px; }
.ministry-list span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.error-banner { margin:0; padding:12px 14px; border-radius:9px; color:#991b1b; background:#fee2e2; }
@media(max-width:1000px) { .metric-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media(max-width:700px) { .page-heading { align-items:flex-start; flex-direction:column; } .heading-actions { width:100%; } .heading-actions>* { flex:1; } .metric-grid,.detail-grid { grid-template-columns:1fr 1fr; } }
@media(max-width:480px) { .metric-grid,.detail-grid { grid-template-columns:1fr; } }
</style>
