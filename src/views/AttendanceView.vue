<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { useAuthStore } from '../stores/auth'
import { useAttendanceStore } from '../stores/attendance'
import { useMembersStore } from '../stores/members'
import SparklineChart from '@/components/dashboard/SparklineChart.vue'

const authStore = useAuthStore()
const aStore = useAttendanceStore()
const mStore = useMembersStore()

const activeTab = ref('sessions')
const statsPeriod = ref('month')
const search = ref('')
const sessionTypeFilter = ref('')
const sessionStatusFilter = ref('')
const dateFromFilter = ref('')
const dateToFilter = ref('')
const sessionsPerPage = ref(20)
const sessionsPage = ref(1)
const attPerPage = ref(30)
const attPage = ref(1)
const attSessionFilter = ref('')
const attStatusFilter = ref('')
const attMemberFilter = ref('')

const showSessionModal = ref(false)
const sessionModalMode = ref('create')
const showAttendanceModal = ref(false)
const attendanceModalMode = ref('create')
const showQrModal = ref(false)
const showMarkAbsentModal = ref(false)
const showBulkAttendanceModal = ref(false)
const showReasonModal = ref(false)
const reasonModalMode = ref('create')
const showConfirmModal = ref(false)
const confirmTarget = ref(null)
const confirmAction = ref('')

const sessionForm = reactive({
  id: null, title: '', session_date: '', start_time: '08:00', end_time: '11:00',
  type: 'Culte dominical', description: '', location: '',
  latitude: '', longitude: '', gps_radius_meters: 100, gps_required: false, status: true,
})
const attendanceForm = reactive({
  id: null, session_id: '', member_id: '', status: 'present', arrival_time: '',
  absence_reason_id: '', absence_note: '', comment: '',
})
const reasonForm = reactive({ id: null, code: '', name: '', description: '', requires_proof: false, status: true })
const sessionFormErrors = reactive({})
const attendanceFormErrors = reactive({})
const reasonFormErrors = reactive({})
const formAlert = reactive({ type: '', message: '' })
const bulkStatus = ref('present')
const bulkSelection = ref([])
const qrValidityMinutes = ref(180)

const isSessionEditing = computed(() => !!sessionForm.id)
const isAttendanceEditing = computed(() => !!attendanceForm.id)
const isReasonEditing = computed(() => !!reasonForm.id)

const sessionTypes = [
  'Culte dominical', 'Réunion de prière', 'Étude biblique',
  'Réunion des jeunes', 'Culte des enfants', 'Mariage', 'Baptême',
  'Conférence', 'Atelier de formation', 'Autre',
]
const attendanceStatuses = [
  { value: 'present', label: 'Présent', color: 'success' },
  { value: 'retard', label: 'En retard', color: 'warning' },
  { value: 'absent', label: 'Absent', color: 'danger' },
  { value: 'absent_excuse', label: 'Absent excusé', color: 'info' },
]
const statusBadgeClass = (s) => {
  if (s === 'present') return 'status-badge active'
  if (s === 'retard') return 'status-badge warning'
  if (s === 'absent') return 'status-badge inactive'
  if (s === 'absent_excuse') return 'status-badge info'
  return 'status-badge default'
}
const statusText = (s) => {
  const map = { present: 'Présent', absent: 'Absent', absent_excuse: 'Absent excusé', retard: 'En retard' }
  return map[s] || s
}
const typeBadgeClass = (t) => {
  if (t && t.includes('Culte')) return 'role-badge admin'
  if (t && t.includes('Réunion')) return 'role-badge staff'
  if (t && t.includes('Baptême') || t && t.includes('Mariage')) return 'role-badge super'
  return 'role-badge default'
}

const debouncedSessions = (() => {
  let t
  return () => { clearTimeout(t); sessionsPage.value = 1; t = setTimeout(() => loadSessions(), 300) }
})()
const debouncedAttendances = (() => {
  let t
  return () => { clearTimeout(t); attPage.value = 1; t = setTimeout(() => loadAttendances(), 300) }
})()

async function loadSessions() {
  const params = {
    search: search.value || undefined,
    type: sessionTypeFilter.value || undefined,
    status: sessionStatusFilter.value === '' ? undefined : (sessionStatusFilter.value === 'true' ? 'true' : 'false'),
    date_from: dateFromFilter.value || undefined,
    date_to: dateToFilter.value || undefined,
    per_page: sessionsPerPage.value,
    page: sessionsPage.value,
  }
  await aStore.loadSessions(params)
}

async function loadAttendances() {
  const params = {
    session_id: attSessionFilter.value || undefined,
    member_id: attMemberFilter.value || undefined,
    status: attStatusFilter.value || undefined,
    per_page: attPerPage.value,
    page: attPage.value,
  }
  await aStore.loadAttendances(params)
}

async function loadAllStats() {
  const period = statsPeriod.value === 'week' ? 'week' : statsPeriod.value === 'year' ? 'year' : 'month'
  await aStore.loadStats({ period })
}

function resetSessionForm() {
  sessionForm.id = null; sessionForm.title = ''; sessionForm.session_date = ''
  sessionForm.start_time = '08:00'; sessionForm.end_time = '11:00'; sessionForm.type = 'Culte dominical'
  sessionForm.description = ''; sessionForm.location = ''; sessionForm.latitude = ''
  sessionForm.longitude = ''; sessionForm.gps_radius_meters = 100; sessionForm.gps_required = false
  sessionForm.status = true
  Object.keys(sessionFormErrors).forEach(k => delete sessionFormErrors[k])
  formAlert.type = ''; formAlert.message = ''
}

function resetAttendanceForm() {
  attendanceForm.id = null; attendanceForm.session_id = ''; attendanceForm.member_id = ''
  attendanceForm.status = 'present'; attendanceForm.arrival_time = ''
  attendanceForm.absence_reason_id = ''; attendanceForm.absence_note = ''; attendanceForm.comment = ''
  Object.keys(attendanceFormErrors).forEach(k => delete attendanceFormErrors[k])
  formAlert.type = ''; formAlert.message = ''
}

function resetReasonForm() {
  reasonForm.id = null; reasonForm.code = ''; reasonForm.name = ''
  reasonForm.description = ''; reasonForm.requires_proof = false; reasonForm.status = true
  Object.keys(reasonFormErrors).forEach(k => delete reasonFormErrors[k])
  formAlert.type = ''; formAlert.message = ''
}

function openCreateSession() { resetSessionForm(); sessionModalMode.value = 'create'; showSessionModal.value = true }
function openEditSession(s) {
  resetSessionForm()
  sessionModalMode.value = 'edit'
  sessionForm.id = s.id
  sessionForm.title = s.title || ''
  sessionForm.session_date = s.session_date_iso || ''
  sessionForm.start_time = s.start_time || '08:00'
  sessionForm.end_time = s.end_time || '11:00'
  sessionForm.type = s.type || 'Culte dominical'
  sessionForm.description = s.description || ''
  sessionForm.location = s.location || ''
  sessionForm.latitude = s.latitude || ''
  sessionForm.longitude = s.longitude || ''
  sessionForm.gps_radius_meters = s.gps_radius_meters || 100
  sessionForm.gps_required = !!s.gps_required
  sessionForm.status = s.status !== false
  showSessionModal.value = true
}

function openCreateAttendance(sessionId) {
  resetAttendanceForm()
  attendanceModalMode.value = 'create'
  if (sessionId) attendanceForm.session_id = String(sessionId)
  showAttendanceModal.value = true
}
function openEditAttendance(a) {
  resetAttendanceForm()
  attendanceModalMode.value = 'edit'
  attendanceForm.id = a.id
  attendanceForm.session_id = String(a.session_id)
  attendanceForm.member_id = String(a.member_id)
  attendanceForm.status = a.status || 'present'
  attendanceForm.arrival_time = a.arrival_time_iso ? a.arrival_time_iso.slice(0, 16) : ''
  attendanceForm.absence_reason_id = a.absence_reason_id ? String(a.absence_reason_id) : ''
  attendanceForm.absence_note = a.absence_note || ''
  attendanceForm.comment = a.comment || ''
  showAttendanceModal.value = true
}

function openCreateReason() { resetReasonForm(); reasonModalMode.value = 'create'; showReasonModal.value = true }
function openEditReason(r) {
  resetReasonForm()
  reasonModalMode.value = 'edit'
  reasonForm.id = r.id; reasonForm.code = r.code || ''; reasonForm.name = r.name || ''
  reasonForm.description = r.description || ''; reasonForm.requires_proof = !!r.requires_proof
  reasonForm.status = r.status !== false
  showReasonModal.value = true
}

function validateSessionForm() {
  Object.keys(sessionFormErrors).forEach(k => delete sessionFormErrors[k])
  if (!sessionForm.title.trim()) sessionFormErrors.title = 'Le titre est requis'
  if (!sessionForm.session_date) sessionFormErrors.session_date = 'La date est requise'
  if (!sessionForm.type) sessionFormErrors.type = 'Le type est requis'
  if (sessionForm.gps_required) {
    if (!sessionForm.latitude) sessionFormErrors.latitude = 'Latitude requise si GPS activé'
    if (!sessionForm.longitude) sessionFormErrors.longitude = 'Longitude requise si GPS activé'
  }
  return Object.keys(sessionFormErrors).length === 0
}
function buildSessionPayload() {
  const payload = {}
  const fields = ['title', 'session_date', 'start_time', 'end_time', 'type', 'description', 'location', 'gps_radius_meters']
  fields.forEach(f => { if (sessionForm[f]) payload[f] = sessionForm[f] })
  if (sessionForm.latitude) payload.latitude = sessionForm.latitude
  if (sessionForm.longitude) payload.longitude = sessionForm.longitude
  payload.gps_required = sessionForm.gps_required
  payload.status = sessionForm.status
  return payload
}
async function submitSessionForm() {
  formAlert.type = ''
  if (!validateSessionForm()) {
    formAlert.type = 'danger'; formAlert.message = 'Veuillez corriger les erreurs du formulaire'
    return
  }
  const payload = buildSessionPayload()
  let result
  if (isSessionEditing.value) result = await aStore.updateSessionItem(sessionForm.id, payload)
  else result = await aStore.createSessionItem(payload)
  if (result.ok) {
    formAlert.type = 'success'; formAlert.message = result.message || 'Opération réussie'
    await loadSessions(); await loadAllStats()
    setTimeout(() => { showSessionModal.value = false; resetSessionForm() }, 500)
  } else {
    formAlert.type = 'danger'; formAlert.message = result.message || 'Erreur'
    if (result.errors) Object.assign(sessionFormErrors, result.errors)
  }
}

function validateAttendanceForm() {
  Object.keys(attendanceFormErrors).forEach(k => delete attendanceFormErrors[k])
  if (!attendanceForm.session_id) attendanceFormErrors.session_id = 'La session est requise'
  if (!attendanceForm.member_id) attendanceFormErrors.member_id = 'Le membre est requis'
  if (!attendanceForm.status) attendanceFormErrors.status = 'Le statut est requis'
  if (['absent', 'absent_excuse'].includes(attendanceForm.status) === false && attendanceForm.status !== 'present' && attendanceForm.status !== 'retard') {
    attendanceFormErrors.status = 'Statut invalide'
  }
  return Object.keys(attendanceFormErrors).length === 0
}
async function submitAttendanceForm() {
  formAlert.type = ''
  if (!validateAttendanceForm()) {
    formAlert.type = 'danger'; formAlert.message = 'Veuillez corriger les erreurs du formulaire'
    return
  }
  const payload = {}
  const fields = ['session_id', 'status', 'arrival_time', 'absence_note', 'comment']
  fields.forEach(f => { if (attendanceForm[f]) payload[f] = attendanceForm[f] })
  payload.member_id = Number(attendanceForm.member_id)
  if (attendanceForm.absence_reason_id) payload.absence_reason_id = Number(attendanceForm.absence_reason_id)
  let result
  if (isAttendanceEditing.value) result = await aStore.updateAttendanceItem(attendanceForm.id, payload)
  else result = await aStore.createAttendanceItem(payload)
  if (result.ok) {
    formAlert.type = 'success'; formAlert.message = result.message || 'Opération réussie'
    await loadAttendances(); await loadAllStats()
    setTimeout(() => { showAttendanceModal.value = false; resetAttendanceForm() }, 500)
  } else {
    formAlert.type = 'danger'; formAlert.message = result.message || 'Erreur'
    if (result.errors) Object.assign(attendanceFormErrors, result.errors)
  }
}

function validateReasonForm() {
  Object.keys(reasonFormErrors).forEach(k => delete reasonFormErrors[k])
  if (!reasonForm.code.trim()) reasonFormErrors.code = 'Le code est requis'
  if (!reasonForm.name.trim()) reasonFormErrors.name = 'Le nom est requis'
  return Object.keys(reasonFormErrors).length === 0
}
async function submitReasonForm() {
  formAlert.type = ''
  if (!validateReasonForm()) {
    formAlert.type = 'danger'; formAlert.message = 'Veuillez corriger les erreurs du formulaire'
    return
  }
  const payload = {
    code: reasonForm.code, name: reasonForm.name,
    description: reasonForm.description || undefined,
    requires_proof: reasonForm.requires_proof, status: reasonForm.status,
  }
  let result
  if (isReasonEditing.value) result = await aStore.updateReason(reasonForm.id, payload)
  else result = await aStore.createReason(payload)
  if (result.ok) {
    formAlert.type = 'success'; formAlert.message = result.message || 'Opération réussie'
    await aStore.loadAbsenceReasons()
    setTimeout(() => { showReasonModal.value = false; resetReasonForm() }, 500)
  } else {
    formAlert.type = 'danger'; formAlert.message = result.message || 'Erreur'
  }
}

function askDeleteSession(s) { confirmTarget.value = s; confirmAction.value = 'delete_session'; showConfirmModal.value = true }
function askDeleteAttendance(a) { confirmTarget.value = a; confirmAction.value = 'delete_attendance'; showConfirmModal.value = true }
function askDeleteReason(r) { confirmTarget.value = r; confirmAction.value = 'delete_reason'; showConfirmModal.value = true }
function askMarkAbsent(s) { confirmTarget.value = s; confirmAction.value = 'mark_absent'; showMarkAbsentModal.value = true }
function askGenerateQr(s) { confirmTarget.value = s; qrValidityMinutes.value = 180; confirmGenerateQr(); }
function askBulkAttendance(s) {
  confirmTarget.value = s
  bulkStatus.value = 'present'
  bulkSelection.value = []
  if (!mStore.members.length) mStore.loadMembers({ per_page: 9999 })
  showBulkAttendanceModal.value = true
}

async function confirmActionFn() {
  if (confirmAction.value === 'delete_session') {
    const r = await aStore.removeSession(confirmTarget.value.id)
    if (r.ok) { showConfirmModal.value = false; await loadSessions(); await loadAllStats() }
    else { formAlert.type = 'danger'; formAlert.message = r.message }
  } else if (confirmAction.value === 'delete_attendance') {
    const r = await aStore.removeAttendance(confirmTarget.value.id)
    if (r.ok) { showConfirmModal.value = false; await loadAttendances(); await loadAllStats() }
    else { formAlert.type = 'danger'; formAlert.message = r.message }
  } else if (confirmAction.value === 'delete_reason') {
    const r = await aStore.removeReason(confirmTarget.value.id)
    if (r.ok) { showConfirmModal.value = false }
    else { formAlert.type = 'danger'; formAlert.message = r.message }
  }
}

async function confirmMarkAbsent(override) {
  if (!confirmTarget.value) return
  const r = await aStore.markAbsent(confirmTarget.value.id, override)
  formAlert.type = r.ok ? 'success' : 'danger'
  formAlert.message = r.message
  if (r.ok) { showMarkAbsentModal.value = false; await loadAttendances(); await loadAllStats() }
}

async function confirmGenerateQr() {
  if (!confirmTarget.value) return
  const r = await aStore.generateQr(confirmTarget.value.id, qrValidityMinutes.value)
  if (r.ok) {
    showQrModal.value = true
  } else {
    formAlert.type = 'danger'; formAlert.message = r.message
  }
}

function toggleBulkMember(id) {
  const i = bulkSelection.value.indexOf(String(id))
  if (i >= 0) bulkSelection.value.splice(i, 1)
  else bulkSelection.value.push(String(id))
}
function selectAllBulk() {
  if (bulkSelection.value.length === mStore.members.length) bulkSelection.value = []
  else bulkSelection.value = mStore.members.map(m => String(m.id))
}
async function confirmBulkAttendance() {
  if (!confirmTarget.value || !bulkSelection.value.length) {
    formAlert.type = 'danger'; formAlert.message = 'Sélectionnez au moins un membre'
    return
  }
  const entries = bulkSelection.value.map(mid => ({ member_id: Number(mid), status: bulkStatus.value }))
  const r = await aStore.bulkAttendanceItems(confirmTarget.value.id, entries)
  formAlert.type = r.ok ? 'success' : 'danger'
  formAlert.message = r.message
  if (r.ok) { showBulkAttendanceModal.value = false; await loadAttendances(); await loadAllStats() }
}

const pagesToShow = computed(() => {
  const cur = aStore.sessionsPagination.current_page || 1
  const last = aStore.sessionsPagination.last_page || 1
  const pages = []; const w = 2
  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= cur - w && i <= cur + w)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }
  return pages
})
const attPagesToShow = computed(() => {
  const cur = aStore.attendancesPagination.current_page || 1
  const last = aStore.attendancesPagination.last_page || 1
  const pages = []; const w = 2
  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= cur - w && i <= cur + w)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }
  return pages
})

const trendSparkline = computed(() => (aStore.stats.trend || []).map(t => t.rate || 0))
const presentSparkline = computed(() => (aStore.stats.trend || []).map(t => t.present || 0))
const absentSparkline = computed(() => (aStore.stats.trend || []).map(t => t.absent || 0))

watch(search, debouncedSessions)
watch(sessionTypeFilter, debouncedSessions)
watch(sessionStatusFilter, debouncedSessions)
watch(dateFromFilter, debouncedSessions)
watch(dateToFilter, debouncedSessions)
watch(sessionsPerPage, debouncedSessions)
watch(sessionsPage, loadSessions)
watch(attSessionFilter, debouncedAttendances)
watch(attStatusFilter, debouncedAttendances)
watch(attMemberFilter, debouncedAttendances)
watch(attPerPage, debouncedAttendances)
watch(attPage, loadAttendances)
watch(statsPeriod, loadAllStats)

onMounted(async () => {
  await Promise.all([
    loadSessions(),
    loadAttendances(),
    loadAllStats(),
    aStore.loadAbsenceReasons(),
    mStore.loadReferentiels(),
  ])
  if (!mStore.members.length) await mStore.loadMembers({ per_page: 9999, page: 1 })
})
</script>

<template>
  <div class="attendance-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">✅ Gestion des Présences</h1>
        <p class="page-subtitle">Gérez les sessions, enregistrez les présences et consultez les statistiques</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-secondary" @click="openCreateReason">➕ Motif d'absence</button>
        <button class="btn-primary" @click="openCreateSession">➕ Nouvelle session</button>
      </div>
    </div>

    <div class="sa-stats-grid">
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#ecfdf5;color:#10b981">📅</div>
        <div class="sa-stat-value">{{ aStore.stats.sessions.total }}</div>
        <div class="sa-stat-label">Sessions totales</div>
        <SparklineChart v-if="trendSparkline.length" :data="trendSparkline" color="#10b981" :width="180" :height="24" />
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#eff6ff;color:#3b82f6">✅</div>
        <div class="sa-stat-value">{{ aStore.stats.attendances.present }}</div>
        <div class="sa-stat-label">Présences enregistrées</div>
        <SparklineChart v-if="presentSparkline.length" :data="presentSparkline" color="#3b82f6" :width="180" :height="24" />
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#fef2f2;color:#ef4444">❌</div>
        <div class="sa-stat-value">{{ aStore.stats.attendances.absent }}</div>
        <div class="sa-stat-label">Absences</div>
        <SparklineChart v-if="absentSparkline.length" :data="absentSparkline" color="#ef4444" :width="180" :height="24" />
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#fef3c7;color:#f59e0b">📊</div>
        <div class="sa-stat-value">{{ aStore.stats.attendances.attendance_rate }}%</div>
        <div class="sa-stat-label">Taux de présence moyen</div>
        <div class="sa-stat-label" style="margin-top:6px">{{ aStore.stats.attendances.late }} en retard</div>
      </div>
    </div>

    <div class="sa-stats-grid" style="grid-template-columns: 1fr 1fr">
      <div class="sa-table-wrap" style="padding:16px">
        <h3 class="card-title">📈 Évolution du taux de présence</h3>
        <div class="trend-chart">
          <div v-if="!aStore.stats.trend?.length" class="sa-empty">Aucune donnée</div>
          <div v-else class="trend-bars">
            <div v-for="(t, i) in aStore.stats.trend" :key="i" class="trend-bar-col">
              <div class="trend-bar-stack">
                <div class="trend-bar present" :style="{ height: (t.present / Math.max(1, (t.present + t.absent)) * 80) + '%' }">
                  <span v-if="t.present" class="bar-label">{{ t.present }}</span>
                </div>
                <div class="trend-bar absent" :style="{ height: (t.absent / Math.max(1, (t.present + t.absent)) * 80) + '%' }">
                  <span v-if="t.absent" class="bar-label">{{ t.absent }}</span>
                </div>
              </div>
              <div class="trend-rate" :class="{ good: t.rate >= 70, bad: t.rate < 50 }">{{ t.rate }}%</div>
              <div class="trend-label">{{ t.label }}</div>
            </div>
          </div>
          <div class="trend-legend">
            <span><span class="dot present"></span> Présents</span>
            <span><span class="dot absent"></span> Absents</span>
          </div>
        </div>
      </div>
      <div class="sa-table-wrap" style="padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 class="card-title">⚠️ Absences répétées (30j)</h3>
          <select v-model="statsPeriod" @change="loadAllStats" class="small-select">
            <option value="week">7 derniers jours</option>
            <option value="month">Dernier mois</option>
            <option value="year">12 mois</option>
          </select>
        </div>
        <div v-if="!aStore.stats.repeated_absences?.length" class="sa-empty">
          Aucune absence répétée détectée 🎉
        </div>
        <div v-else class="repeated-list">
          <div v-for="r in aStore.stats.repeated_absences" :key="r.member_id" class="repeated-item">
            <div class="repeated-avatar" :style="{ background: `hsl(${(r.member_id * 47) % 360}, 60%, 55%)` }">
              {{ (r.full_name || '?').charAt(0) }}
            </div>
            <div class="repeated-info">
              <div class="repeated-name">{{ r.full_name }}</div>
              <div class="repeated-code">{{ r.member_code || '-' }}</div>
            </div>
            <div class="repeated-count">
              <span class="count-value">{{ r.count }}</span>
              <span class="count-label">absences</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <button :class="['tab-btn', {active: activeTab==='sessions'}]" @click="activeTab='sessions'">
        📅 Sessions <span class="tab-count">{{ aStore.sessionsPagination.total }}</span>
      </button>
      <button :class="['tab-btn', {active: activeTab==='attendances'}]" @click="activeTab='attendances'">
        ✅ Enregistrements <span class="tab-count">{{ aStore.attendancesPagination.total }}</span>
      </button>
      <button :class="['tab-btn', {active: activeTab==='reasons'}]" @click="activeTab='reasons'">
        📝 Motifs d'absence <span class="tab-count">{{ aStore.absenceReasons.length }}</span>
      </button>
    </div>

    <div v-show="activeTab==='sessions'">
      <div class="sa-toolbar">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input v-model="search" placeholder="Rechercher une session (titre)" />
        </div>
        <select v-model="sessionTypeFilter">
          <option value="">Tous types</option>
          <option v-for="t in sessionTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-model="sessionStatusFilter">
          <option value="">Statut</option>
          <option value="true">Actives</option>
          <option value="false">Clôturées</option>
        </select>
        <input type="date" v-model="dateFromFilter" title="Date début" />
        <input type="date" v-model="dateToFilter" title="Date fin" />
        <select v-model="sessionsPerPage">
          <option :value="10">10 / page</option>
          <option :value="20">20 / page</option>
          <option :value="50">50 / page</option>
        </select>
      </div>

      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Date & heure</th>
              <th>Type</th>
              <th>Lieu</th>
              <th>Stats</th>
              <th>Statut</th>
              <th>QR</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="aStore.loading"><td colspan="8" class="sa-empty">⏳ Chargement...</td></tr>
            <tr v-else-if="!aStore.sessions.length"><td colspan="8" class="sa-empty">Aucune session trouvée</td></tr>
            <tr v-for="s in aStore.sessions" :key="s.id">
              <td>
                <div class="sa-user-name" style="font-weight:600">{{ s.title }}</div>
                <div v-if="s.description" class="sa-user-sub">{{ s.description }}</div>
              </td>
              <td>
                <div class="sa-user-name">📅 {{ s.session_date }}</div>
                <div class="sa-user-sub">🕐 {{ s.start_time }} - {{ s.end_time }}</div>
              </td>
              <td><span :class="typeBadgeClass(s.type)">{{ s.type || '—' }}</span></td>
              <td>
                <div v-if="s.location">📍 {{ s.location }}</div>
                <div v-else class="sa-subtle">—</div>
                <div v-if="s.gps_required" class="sa-user-sub" style="color:#f59e0b">📡 GPS requis ({{ s.gps_radius_meters }}m)</div>
              </td>
              <td>
                <div class="mini-stats">
                  <div class="mini-stat"><span class="mini-val good">{{ s.stats?.present || 0 }}</span><span class="mini-lab">présents</span></div>
                  <div class="mini-stat"><span class="mini-val warn">{{ s.stats?.late || 0 }}</span><span class="mini-lab">retard</span></div>
                  <div class="mini-stat"><span class="mini-val bad">{{ s.stats?.absent || 0 }}</span><span class="mini-lab">absents</span></div>
                </div>
                <div class="attendance-rate-bar">
                  <div class="rate-fill" :style="{ width: (s.stats?.attendance_rate || 0) + '%' }"></div>
                  <span class="rate-text">{{ s.stats?.attendance_rate || 0 }}%</span>
                </div>
              </td>
              <td>
                <span :class="s.status ? 'status-badge active' : 'status-badge inactive'">
                  {{ s.status ? 'Active' : 'Clôturée' }}
                </span>
              </td>
              <td>
                <span v-if="s.qr_valid" class="status-badge active">✅ Valide</span>
                <span v-else-if="s.qr_token" class="status-badge warning">⏰ Expiré</span>
                <span v-else class="sa-subtle">—</span>
              </td>
              <td>
                <div class="row-actions" style="flex-wrap:wrap">
                  <button class="btn-icon edit" @click="openEditSession(s)" title="Modifier">✏️</button>
                  <button class="btn-icon" style="background:#eff6ff;color:#2563eb" @click="askGenerateQr(s)" title="QR Code">📱</button>
                  <button class="btn-icon" style="background:#ecfdf5;color:#059669" @click="askBulkAttendance(s)" title="Enregistrement en masse">📋</button>
                  <button class="btn-icon" style="background:#fef3c7;color:#d97706" @click="askMarkAbsent(s)" title="Marquer tous absents">⏭️</button>
                  <button class="btn-icon" style="background:#f0f9ff;color:#0284c7" @click="() => { showAttendanceModal=false; openCreateAttendance(s.id) }" title="Ajouter présence">➕</button>
                  <button class="btn-icon delete" @click="askDeleteSession(s)" title="Supprimer">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sa-pagination">
        <div class="sa-pagination-info">
          Affichage {{ aStore.sessionsPagination.from || 0 }}-{{ aStore.sessionsPagination.to || 0 }} sur {{ aStore.sessionsPagination.total || 0 }}
        </div>
        <div class="sa-pagination-btns">
          <button class="page-btn" :disabled="(aStore.sessionsPagination.current_page || 1) <= 1" @click="sessionsPage--">Précédent</button>
          <template v-for="p, i in pagesToShow" :key="i">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button v-else class="page-btn" :class="{ active: (aStore.sessionsPagination.current_page || 1) === p }" @click="sessionsPage = p">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="(aStore.sessionsPagination.current_page || 1) >= (aStore.sessionsPagination.last_page || 1)" @click="sessionsPage++">Suivant</button>
        </div>
      </div>
    </div>

    <div v-show="activeTab==='attendances'">
      <div class="sa-toolbar">
        <select v-model="attSessionFilter">
          <option value="">Toutes sessions</option>
          <option v-for="s in aStore.sessions" :key="s.id" :value="String(s.id)">{{ s.title }} ({{ s.session_date }})</option>
        </select>
        <select v-model="attStatusFilter">
          <option value="">Tous statuts</option>
          <option v-for="st in attendanceStatuses" :key="st.value" :value="st.value">{{ st.label }}</option>
        </select>
        <select v-model="attPerPage">
          <option :value="30">30 / page</option>
          <option :value="50">50 / page</option>
          <option :value="100">100 / page</option>
        </select>
        <button class="btn-secondary" @click="openCreateAttendance()">➕ Nouvelle présence</button>
      </div>

      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Session</th>
              <th>Statut</th>
              <th>Arrivée</th>
              <th>Motif absence</th>
              <th>GPS</th>
              <th>Méthode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="aStore.loading"><td colspan="8" class="sa-empty">⏳ Chargement...</td></tr>
            <tr v-else-if="!aStore.attendances.length"><td colspan="8" class="sa-empty">Aucun enregistrement trouvé</td></tr>
            <tr v-for="a in aStore.attendances" :key="a.id">
              <td>
                <div class="sa-user-cell">
                  <div class="sa-user-avatar" :style="{ background: `hsl(${(a.member_id * 53) % 360}, 60%, 55%)` }">
                    {{ (a.member?.first_name || a.member_id || '?').toString().charAt(0) }}
                  </div>
                  <div>
                    <div class="sa-user-name">
                      {{ a.member?.first_name }} {{ a.member?.last_name }}
                      <span v-if="a.member?.member_code" style="margin-left:8px"><code class="member-code">{{ a.member.member_code }}</code></span>
                    </div>
                    <div class="sa-user-sub">{{ a.member?.phone || '-' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="sa-user-name">{{ a.session?.title || '#' + a.session_id }}</div>
                <div class="sa-user-sub">{{ a.session?.session_date || '-' }}</div>
              </td>
              <td><span :class="statusBadgeClass(a.status)">{{ statusText(a.status) }}</span></td>
              <td>
                <div v-if="a.arrival_time">{{ a.arrival_time }}</div>
                <div v-else class="sa-subtle">—</div>
                <div v-if="a.comment" class="sa-user-sub">💬 {{ a.comment }}</div>
              </td>
              <td>
                <div v-if="a.absence_reason">
                  <span class="role-badge default">{{ a.absence_reason.name }}</span>
                  <div v-if="a.absence_note" class="sa-user-sub">{{ a.absence_note }}</div>
                </div>
                <div v-else class="sa-subtle">—</div>
              </td>
              <td>
                <span v-if="a.gps_verified" class="status-badge active">✅ Vérifié</span>
                <span v-else-if="a.latitude" class="status-badge warning">⚠️ Hors zone</span>
                <span v-else class="sa-subtle">—</span>
              </td>
              <td>
                <span v-if="a.scan_method === 'qr'" class="role-badge admin">📱 QR</span>
                <span v-else-if="a.scan_method === 'bulk'" class="role-badge staff">📋 Lot</span>
                <span v-else class="role-badge default">✍️ Manuel</span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon edit" @click="openEditAttendance(a)" title="Modifier">✏️</button>
                  <button class="btn-icon delete" @click="askDeleteAttendance(a)" title="Supprimer">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sa-pagination">
        <div class="sa-pagination-info">
          Affichage {{ aStore.attendancesPagination.from || 0 }}-{{ aStore.attendancesPagination.to || 0 }} sur {{ aStore.attendancesPagination.total || 0 }}
        </div>
        <div class="sa-pagination-btns">
          <button class="page-btn" :disabled="(aStore.attendancesPagination.current_page || 1) <= 1" @click="attPage--">Précédent</button>
          <template v-for="p, i in attPagesToShow" :key="i">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button v-else class="page-btn" :class="{ active: (aStore.attendancesPagination.current_page || 1) === p }" @click="attPage = p">{{ p }}</button>
          </template>
          <button class="page-btn" :disabled="(aStore.attendancesPagination.current_page || 1) >= (aStore.attendancesPagination.last_page || 1)" @click="attPage++">Suivant</button>
        </div>
      </div>
    </div>

    <div v-show="activeTab==='reasons'">
      <div class="sa-toolbar">
        <div style="flex:1"></div>
        <button class="btn-primary" @click="openCreateReason">➕ Nouveau motif</button>
      </div>
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Description</th>
              <th>Justificatif</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!aStore.absenceReasons.length"><td colspan="6" class="sa-empty">Aucun motif</td></tr>
            <tr v-for="r in aStore.absenceReasons" :key="r.id">
              <td><code class="member-code">{{ r.code }}</code></td>
              <td class="sa-user-name">{{ r.name }}</td>
              <td class="sa-user-sub">{{ r.description || '—' }}</td>
              <td>
                <span v-if="r.requires_proof" class="status-badge warning">📄 Requis</span>
                <span v-else class="sa-subtle">Non requis</span>
              </td>
              <td><span :class="r.status ? 'status-badge active' : 'status-badge inactive'">{{ r.status ? 'Actif' : 'Inactif' }}</span></td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon edit" @click="openEditReason(r)">✏️</button>
                  <button class="btn-icon delete" @click="askDeleteReason(r)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Session Modal -->
    <Teleport to="body">
      <div v-if="showSessionModal" class="modal-backdrop" @click.self="showSessionModal=false">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h3>{{ isSessionEditing ? '✏️ Modifier une session' : '➕ Nouvelle session' }}</h3>
            <button class="modal-close" @click="showSessionModal=false; resetSessionForm()">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="formAlert.message" :class="['form-alert', formAlert.type]">{{ formAlert.message }}</div>
            <div class="form-section-title">📋 Informations générales</div>
            <div class="form-row">
              <div class="form-group wide">
                <label>Titre * <span v-if="sessionFormErrors.title" class="err">{{ sessionFormErrors.title }}</span></label>
                <input v-model="sessionForm.title" :class="{err: sessionFormErrors.title}" placeholder="Ex: Culte dominical du 12 janvier" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Date * <span v-if="sessionFormErrors.session_date" class="err">{{ sessionFormErrors.session_date }}</span></label>
                <input type="date" v-model="sessionForm.session_date" :class="{err: sessionFormErrors.session_date}" />
              </div>
              <div class="form-group">
                <label>Début</label>
                <input type="time" v-model="sessionForm.start_time" />
              </div>
              <div class="form-group">
                <label>Fin</label>
                <input type="time" v-model="sessionForm.end_time" />
              </div>
              <div class="form-group">
                <label>Type *</label>
                <select v-model="sessionForm.type" :class="{err: sessionFormErrors.type}">
                  <option v-for="t in sessionTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group wide">
                <label>Description</label>
                <textarea v-model="sessionForm.description" rows="2" placeholder="Facultatif"></textarea>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group wide">
                <label>Lieu</label>
                <input v-model="sessionForm.location" placeholder="Ex: Temple principal" />
              </div>
              <div class="form-group">
                <label>Statut</label>
                <div style="padding-top:10px">
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="sessionForm.status" />
                    <span class="slider"></span>
                  </label>
                  <span style="margin-left:10px;font-size:13px;color:var(--text-muted)">{{ sessionForm.status ? 'Active' : 'Clôturée' }}</span>
                </div>
              </div>
            </div>
            <div class="form-section-title">📡 Contrôle GPS (optionnel)</div>
            <div class="form-row">
              <div class="form-group">
                <label>
                  <input type="checkbox" v-model="sessionForm.gps_required" style="margin-right:8px;accent-color:var(--primary)" />
                  Activer la vérification GPS
                </label>
              </div>
              <div class="form-group">
                <label>Latitude <span v-if="sessionFormErrors.latitude" class="err">{{ sessionFormErrors.latitude }}</span></label>
                <input v-model="sessionForm.latitude" placeholder="Ex: 6.1725" :class="{err: sessionFormErrors.latitude}" :disabled="!sessionForm.gps_required" />
              </div>
              <div class="form-group">
                <label>Longitude <span v-if="sessionFormErrors.longitude" class="err">{{ sessionFormErrors.longitude }}</span></label>
                <input v-model="sessionForm.longitude" placeholder="Ex: 1.2312" :class="{err: sessionFormErrors.longitude}" :disabled="!sessionForm.gps_required" />
              </div>
              <div class="form-group">
                <label>Rayon (m)</label>
                <input type="number" v-model.number="sessionForm.gps_radius_meters" :disabled="!sessionForm.gps_required" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showSessionModal=false; resetSessionForm()">Annuler</button>
            <button class="btn-primary" :disabled="aStore.saving" @click="submitSessionForm">
              <span v-if="aStore.saving">💾...</span>
              <span v-else>{{ isSessionEditing ? '💾 Enregistrer' : '✅ Créer la session' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Attendance Modal -->
    <Teleport to="body">
      <div v-if="showAttendanceModal" class="modal-backdrop" @click.self="showAttendanceModal=false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ isAttendanceEditing ? '✏️ Modifier présence' : '➕ Nouvelle présence' }}</h3>
            <button class="modal-close" @click="showAttendanceModal=false; resetAttendanceForm()">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="formAlert.message" :class="['form-alert', formAlert.type]">{{ formAlert.message }}</div>
            <div class="form-group">
              <label>Session * <span v-if="attendanceFormErrors.session_id" class="err">{{ attendanceFormErrors.session_id }}</span></label>
              <select v-model="attendanceForm.session_id" :class="{err: attendanceFormErrors.session_id}">
                <option value="">Choisir...</option>
                <option v-for="s in aStore.sessions" :key="s.id" :value="String(s.id)">{{ s.title }} ({{ s.session_date }})</option>
              </select>
            </div>
            <div class="form-group">
              <label>Membre * <span v-if="attendanceFormErrors.member_id" class="err">{{ attendanceFormErrors.member_id }}</span></label>
              <select v-model="attendanceForm.member_id" :class="{err: attendanceFormErrors.member_id}">
                <option value="">Choisir...</option>
                <option v-for="m in mStore.members" :key="m.id" :value="String(m.id)">
                  {{ m.first_name }} {{ m.last_name }} ({{ m.member_code }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Statut *</label>
              <div class="status-picker">
                <label v-for="st in attendanceStatuses" :key="st.value" :class="['status-option', st.color, {active: attendanceForm.status===st.value}]">
                  <input type="radio" :value="st.value" v-model="attendanceForm.status" />
                  <span>{{ st.label }}</span>
                </label>
              </div>
            </div>
            <div v-if="attendanceForm.status==='present' || attendanceForm.status==='retard'" class="form-group">
              <label>Heure d'arrivée</label>
              <input type="datetime-local" v-model="attendanceForm.arrival_time" />
            </div>
            <div v-if="attendanceForm.status==='absent' || attendanceForm.status==='absent_excuse'" class="form-group">
              <label>Motif d'absence</label>
              <select v-model="attendanceForm.absence_reason_id">
                <option value="">— Aucun —</option>
                <option v-for="r in aStore.absenceReasons" :key="r.id" :value="String(r.id)">{{ r.name }}</option>
              </select>
            </div>
            <div v-if="attendanceForm.status==='absent' || attendanceForm.status==='absent_excuse'" class="form-group">
              <label>Note sur l'absence</label>
              <textarea v-model="attendanceForm.absence_note" rows="2" placeholder="Facultatif"></textarea>
            </div>
            <div class="form-group">
              <label>Commentaire</label>
              <textarea v-model="attendanceForm.comment" rows="2" placeholder="Facultatif"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showAttendanceModal=false; resetAttendanceForm()">Annuler</button>
            <button class="btn-primary" :disabled="aStore.saving" @click="submitAttendanceForm">
              <span v-if="aStore.saving">💾...</span>
              <span v-else>{{ isAttendanceEditing ? '💾 Enregistrer' : '✅ Valider' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Reason Modal -->
    <Teleport to="body">
      <div v-if="showReasonModal" class="modal-backdrop" @click.self="showReasonModal=false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>{{ isReasonEditing ? '✏️ Modifier le motif' : '➕ Nouveau motif d\'absence' }}</h3>
            <button class="modal-close" @click="showReasonModal=false; resetReasonForm()">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="formAlert.message" :class="['form-alert', formAlert.type]">{{ formAlert.message }}</div>
            <div class="form-row">
              <div class="form-group">
                <label>Code * <span v-if="reasonFormErrors.code" class="err">{{ reasonFormErrors.code }}</span></label>
                <input v-model="reasonForm.code" placeholder="Ex: MALADIE" :class="{err: reasonFormErrors.code}" />
              </div>
              <div class="form-group">
                <label>Nom * <span v-if="reasonFormErrors.name" class="err">{{ reasonFormErrors.name }}</span></label>
                <input v-model="reasonForm.name" placeholder="Ex: Maladie" :class="{err: reasonFormErrors.name}" />
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea v-model="reasonForm.description" rows="2" placeholder="Facultatif"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>
                  <input type="checkbox" v-model="reasonForm.requires_proof" style="margin-right:8px;accent-color:var(--primary)" />
                  Justificatif requis
                </label>
              </div>
              <div class="form-group">
                <label>Statut</label>
                <div style="padding-top:10px">
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="reasonForm.status" />
                    <span class="slider"></span>
                  </label>
                  <span style="margin-left:10px;font-size:13px;color:var(--text-muted)">{{ reasonForm.status ? 'Actif' : 'Inactif' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showReasonModal=false; resetReasonForm()">Annuler</button>
            <button class="btn-primary" :disabled="aStore.saving" @click="submitReasonForm">
              <span v-if="aStore.saving">💾...</span>
              <span v-else>{{ isReasonEditing ? '💾 Enregistrer' : '✅ Créer' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- QR Modal -->
    <Teleport to="body">
      <div v-if="showQrModal && aStore.qrData" class="modal-backdrop" @click.self="showQrModal=false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>📱 QR Code de présence</h3>
            <button class="modal-close" @click="showQrModal=false">✕</button>
          </div>
          <div class="modal-body" style="text-align:center">
            <div v-if="aStore.qrData.qr_code_data" class="qr-display">
              <div style="background:#fff; padding: 20px; border-radius: 16px; display: inline-block; border: 3px dashed var(--primary); margin-bottom: 16px;">
                <qrcode-vue :value="aStore.qrData.qr_code_data" :size="240" level="M" />
              </div>
              <div style="font-size:14px;color:var(--text-muted);">
                Scannez ce QR Code avec l'application mobile pour enregistrer votre présence
              </div>
            </div>
            <div class="qr-info">
              <div class="qr-info-row"><span>Session:</span><strong>{{ confirmTarget?.title }}</strong></div>
              <div class="qr-info-row"><span>Date:</span><strong>{{ aStore.qrData.session_date }}</strong></div>
              <div class="qr-info-row"><span>Expire:</span><strong>{{ aStore.qrData.expires_at }}</strong></div>
              <div class="qr-info-row"><span>Validité:</span><strong>{{ aStore.qrData.validity_minutes }} min</strong></div>
            </div>
            <div style="margin-top:16px;display:flex;gap:8px">
              <div class="form-group" style="flex:1">
                <label>Validité (minutes)</label>
                <input type="number" v-model.number="qrValidityMinutes" min="5" max="4320" />
              </div>
              <button class="btn-secondary" style="align-self:flex-end" @click="confirmGenerateQr">🔄 Régénérer</button>
            </div>
            <button v-if="confirmTarget" class="btn-danger" style="margin-top:12px;width:100%" @click="async () => { const r = await aStore.invalidateQr(confirmTarget.id); formAlert.type=r.ok?'success':'danger'; formAlert.message=r.message; if (r.ok) showQrModal=false }">
              🚫 Invalider le QR Code
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Mark all absent Modal -->
    <Teleport to="body">
      <div v-if="showMarkAbsentModal" class="modal-backdrop" @click.self="showMarkAbsentModal=false">
        <div class="modal-dialog confirm-dialog">
          <div class="confirm-icon warning">⏭️</div>
          <h3>Marquer tous absents ?</h3>
          <p class="confirm-text">
            Tous les membres de l'église seront marqués absents pour la session <strong>{{ confirmTarget?.title }}</strong>.
            <br/>Cette action initialise les absences avant marquage individuel.
          </p>
          <div class="modal-footer justify-center">
            <button class="btn-secondary" @click="showMarkAbsentModal=false">Annuler</button>
            <button class="btn-secondary" @click="confirmMarkAbsent(false)">Initialiser</button>
            <button class="btn-danger" @click="confirmMarkAbsent(true)">Forcer (écrase)</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bulk attendance Modal -->
    <Teleport to="body">
      <div v-if="showBulkAttendanceModal" class="modal-backdrop modal-lg-backdrop" @click.self="showBulkAttendanceModal=false">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h3>📋 Enregistrement en masse</h3>
            <button class="modal-close" @click="showBulkAttendanceModal=false">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="formAlert.message" :class="['form-alert', formAlert.type]">{{ formAlert.message }}</div>
            <div class="bulk-info">Session : <strong>{{ confirmTarget?.title }}</strong> ({{ confirmTarget?.session_date }})</div>
            <div class="form-row" style="margin-bottom:12px">
              <div class="form-group">
                <label>Appliquer le statut</label>
                <div class="status-picker">
                  <label v-for="st in attendanceStatuses" :key="st.value" :class="['status-option', st.color, {active: bulkStatus===st.value}]">
                    <input type="radio" :value="st.value" v-model="bulkStatus" />
                    <span>{{ st.label }}</span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>&nbsp;</label>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <button class="btn-secondary" @click="selectAllBulk">
                    {{ bulkSelection.length === mStore.members.length ? 'Désélectionner tout' : 'Tout sélectionner' }}
                  </button>
                  <span class="sa-subtle">{{ bulkSelection.length }} sélectionné(s) / {{ mStore.members.length }}</span>
                </div>
              </div>
            </div>
            <div class="bulk-members">
              <label v-for="m in mStore.members" :key="m.id" class="bulk-check" :class="{active: bulkSelection.includes(String(m.id))}">
                <input type="checkbox" :value="String(m.id)" v-model="bulkSelection" />
                <div class="bulk-avatar" :style="{ background: `hsl(${(m.id * 53) % 360}, 60%, 55%)` }">
                  {{ (m.first_name || '?').charAt(0) }}
                </div>
                <div class="bulk-name">
                  <div>{{ m.first_name }} {{ m.last_name }}</div>
                  <div class="sa-subtle" style="font-size:11px">{{ m.member_code }} · {{ m.phone || '—' }}</div>
                </div>
              </label>
              <div v-if="!mStore.members.length" class="sa-empty">Aucun membre chargé</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showBulkAttendanceModal=false">Annuler</button>
            <button class="btn-primary" :disabled="!bulkSelection.length || aStore.saving" @click="confirmBulkAttendance">
              <span v-if="aStore.saving">💾...</span>
              <span v-else>✅ Enregistrer ({{ bulkSelection.length }})</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Modal -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="modal-backdrop" @click.self="showConfirmModal=false">
        <div class="modal-dialog confirm-dialog">
          <div class="confirm-icon" :class="{ danger: confirmAction.startsWith('delete'), warning: confirmAction.startsWith('mark') }">
            <span v-if="confirmAction.startsWith('delete')">🗑️</span>
            <span v-else>⏭️</span>
          </div>
          <h3 v-if="confirmAction==='delete_session'">Supprimer cette session ?</h3>
          <h3 v-else-if="confirmAction==='delete_attendance'">Supprimer cet enregistrement ?</h3>
          <h3 v-else>Supprimer ce motif ?</h3>
          <p class="confirm-text">
            <template v-if="confirmAction.startsWith('delete')">Cette action est irréversible (suppression logique).</template>
          </p>
          <div class="modal-footer justify-center">
            <button class="btn-secondary" @click="showConfirmModal=false">Annuler</button>
            <button class="btn-danger" :disabled="aStore.deleting" @click="confirmActionFn">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.attendance-page { padding: 0 0 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.page-title { margin: 0 0 4px; font-size: 24px; font-weight: 700; color: var(--text-primary); }
.page-subtitle { margin: 0; color: var(--text-muted); font-size: 14px; }
.btn-primary { background: linear-gradient(135deg, var(--primary), #4f46e5); color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(99,102,241,.25); transition: transform .15s; }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-secondary { background: #fff; color: var(--text-primary); border: 1px solid var(--border); padding: 10px 16px; border-radius: 10px; cursor: pointer; font-weight: 500; transition: all .15s; }
.btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
.btn-danger { background: linear-gradient(135deg, var(--danger), #dc2626); color: #fff; border: none; padding: 10px 18px; border-radius: 10px; cursor: pointer; font-weight: 600; }

.sa-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
@media (max-width: 1024px) { .sa-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
@media (max-width: 480px) { .sa-stats-grid { grid-template-columns: 1fr !important; } }
.sa-stat-card { background: #fff; border-radius: 14px; padding: 18px; box-shadow: var(--card-shadow); border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 6px; }
.sa-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 6px; }
.sa-stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.sa-stat-label { color: var(--text-muted); font-size: 13px; }

.card-title { margin: 0 0 14px; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.small-select { padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px; background: #fff; font-size: 13px; cursor: pointer; }

.trend-chart { }
.trend-bars { display: flex; align-items: flex-end; justify-content: space-around; gap: 8px; padding: 12px 4px; min-height: 220px; }
.trend-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.trend-bar-stack { width: 100%; height: 140px; display: flex; flex-direction: column; justify-content: flex-end; background: #f8fafc; border-radius: 8px; overflow: hidden; }
.trend-bar { position: relative; display: flex; align-items: flex-start; justify-content: center; padding-top: 4px; min-height: 4px; transition: all .3s; }
.trend-bar.present { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
.trend-bar.absent { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
.bar-label { font-size: 10px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,.2); }
.trend-rate { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-top: 2px; }
.trend-rate.good { color: #059669; }
.trend-rate.bad { color: #dc2626; }
.trend-label { font-size: 10px; color: var(--text-muted); }
.trend-legend { display: flex; gap: 16px; justify-content: center; margin-top: 10px; font-size: 12px; color: var(--text-muted); }
.trend-legend .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
.trend-legend .dot.present { background: #10b981; }
.trend-legend .dot.absent { background: #ef4444; }

.repeated-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
.repeated-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #fafbff; border-radius: 10px; border: 1px solid var(--border-light); }
.repeated-avatar { width: 40px; height: 40px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
.repeated-info { flex: 1; min-width: 0; }
.repeated-name { font-weight: 600; color: var(--text-primary); font-size: 14px; }
.repeated-code { color: var(--text-muted); font-size: 12px; }
.repeated-count { text-align: center; padding: 6px 12px; background: #fef2f2; border-radius: 10px; }
.repeated-count .count-value { display: block; font-size: 18px; font-weight: 700; color: #dc2626; }
.repeated-count .count-label { font-size: 10px; color: #991b1b; }

.tab-bar { display: flex; gap: 0; background: #fff; border: 1px solid var(--border-light); border-radius: 12px; padding: 4px; margin-bottom: 16px; overflow-x: auto; }
.tab-btn { flex: 1; min-width: 160px; padding: 10px 16px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--text-muted); border-radius: 8px; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap; }
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { background: linear-gradient(135deg, var(--primary), #4f46e5); color: #fff; box-shadow: 0 4px 12px rgba(99,102,241,.25); }
.tab-count { background: rgba(255,255,255,.2); padding: 2px 8px; border-radius: 999px; font-size: 11px; }
.tab-btn:not(.active) .tab-count { background: #eef2ff; color: #4f46e5; }

.sa-toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; align-items: center; background: #fff; padding: 14px; border-radius: 12px; border: 1px solid var(--border-light); }
.search-input-wrap { flex: 1 1 320px; position: relative; display: flex; align-items: center; background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; }
.search-input-wrap span { color: var(--text-muted); margin-right: 8px; }
.search-input-wrap input { flex: 1; padding: 10px 0; border: none; background: transparent; outline: none; font-size: 14px; }
.sa-toolbar select, .sa-toolbar input[type=date] { padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: #fff; font-size: 14px; cursor: pointer; }

.sa-table-wrap { background: #fff; border-radius: 14px; border: 1px solid var(--border-light); box-shadow: var(--card-shadow); overflow-x: auto; }
.sa-table { width: 100%; border-collapse: collapse; }
.sa-table thead th { text-align: left; padding: 14px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); background: #f8fafc; border-bottom: 1px solid var(--border); font-weight: 600; }
.sa-table tbody td { padding: 14px 16px; border-bottom: 1px solid var(--border-light); vertical-align: middle; font-size: 14px; }
.sa-table tbody tr:last-child td { border-bottom: none; }
.sa-table tbody tr:hover { background: #fafbff; }
.sa-empty { text-align: center; padding: 40px 20px !important; color: var(--text-muted); }

.sa-user-cell { display: flex; align-items: center; gap: 12px; }
.sa-user-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 15px; flex-shrink: 0; }
.sa-user-name { font-weight: 600; color: var(--text-primary); }
.sa-user-sub { color: var(--text-muted); font-size: 12px; }
.sa-subtle { color: var(--text-muted); font-size: 13px; }

.member-code { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--text-primary); }
.role-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.role-badge.super { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; }
.role-badge.admin { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #3730a3; }
.role-badge.staff { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1e40af; }
.role-badge.default { background: linear-gradient(135deg, #e2e8f0, #cbd5e1); color: #334155; }
.role-badge.info { background: linear-gradient(135deg, #cffafe, #a5f3fc); color: #0e7490; }

.status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status-badge.active { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46; }
.status-badge.inactive { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #4b5563; }
.status-badge.warning { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; }
.status-badge.info { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1e40af; }

.mini-stats { display: flex; gap: 8px; margin-bottom: 6px; }
.mini-stat { display: flex; flex-direction: column; align-items: center; min-width: 36px; }
.mini-val { font-size: 14px; font-weight: 700; }
.mini-val.good { color: #059669; }
.mini-val.warn { color: #d97706; }
.mini-val.bad { color: #dc2626; }
.mini-lab { font-size: 9px; color: var(--text-muted); text-transform: uppercase; }
.attendance-rate-bar { position: relative; height: 14px; background: #f1f5f9; border-radius: 7px; overflow: hidden; }
.rate-fill { position: absolute; left: 0; top: 0; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 7px; transition: width .3s; }
.rate-text { position: relative; z-index: 1; display: block; text-align: center; font-size: 10px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.25); line-height: 14px; }

.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: #cbd5e1; transition: .2s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: #fff; transition: .2s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.toggle-switch input:checked + .slider { background-color: var(--success, #10b981); }
.toggle-switch input:checked + .slider:before { transform: translateX(20px); }

.row-actions { display: flex; gap: 6px; }
.btn-icon { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; }
.btn-icon.edit { background: #eff6ff; color: #1d4ed8; }
.btn-icon.edit:hover { background: #dbeafe; }
.btn-icon.delete { background: #fef2f2; color: #b91c1c; }
.btn-icon.delete:hover { background: #fee2e2; }

.sa-pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px 4px; gap: 12px; flex-wrap: wrap; }
.sa-pagination-info { color: var(--text-muted); font-size: 14px; }
.sa-pagination-btns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.page-btn { padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border); background: #fff; cursor: pointer; font-size: 13px; color: var(--text-primary); min-width: 36px; }
.page-btn:hover:not(:disabled):not(.active) { border-color: var(--primary); color: var(--primary); }
.page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
.page-ellipsis { padding: 0 4px; color: var(--text-muted); }

@media (max-width: 1024px) {
  .sa-table thead { display: none; }
  .sa-table tbody tr { display: block; border-bottom: 1px solid var(--border-light); padding: 4px 0; }
  .sa-table tbody td { display: flex; justify-content: space-between; align-items: center; text-align: right; padding: 10px 16px; border: none; gap: 12px; }
  .sa-table tbody td::before { content: attr(data-label); font-weight: 600; color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: .5px; text-align: left; flex: 1; }
  .sa-user-cell { justify-content: flex-end; }
}

.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; animation: fadeIn .2s ease; }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: none; opacity: 1 } }
.modal-dialog { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; box-shadow: 0 20px 60px rgba(15,23,42,.3); animation: slideUp .25s ease; max-height: 92vh; display: flex; flex-direction: column; }
.modal-dialog.modal-lg { max-width: 960px; }
.modal-lg-backdrop { align-items: flex-start; padding-top: 5vh; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid var(--border-light); }
.modal-header h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
.modal-close { background: transparent; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted); width: 34px; height: 34px; border-radius: 8px; }
.modal-close:hover { background: #f1f5f9; color: var(--danger); }
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border-light); }
.modal-footer.justify-center { justify-content: center; }

.form-section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--primary); margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-light); }
.form-section-title:not(:first-child) { margin-top: 20px; }

.form-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 14px; }
.form-row.row-3 { grid-template-columns: 1.2fr 1fr 1fr; }
@media (max-width: 1024px) { .form-row, .form-row.row-3 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .form-row, .form-row.row-3 { grid-template-columns: 1fr; } }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.wide { grid-column: span 1; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-group label .err { color: var(--danger); font-weight: 500; margin-left: 6px; font-size: 11px; }
.form-group input, .form-group select, .form-group textarea { padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; outline: none; background: #fff; color: var(--text-primary); transition: border-color .15s, box-shadow .15s; font-family: inherit; resize: vertical; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
.form-group input.err, .form-group select.err, .form-group textarea.err { border-color: var(--danger); }
.form-group input:disabled { background: #f8fafc; color: var(--text-muted); }

.status-picker { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.status-option { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 2px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 13px; transition: all .15s; font-weight: 500; }
.status-option input { accent-color: var(--primary); }
.status-option.success.active { border-color: #10b981; background: #ecfdf5; color: #065f46; }
.status-option.warning.active { border-color: #f59e0b; background: #fffbeb; color: #92400e; }
.status-option.danger.active { border-color: #ef4444; background: #fef2f2; color: #991b1b; }
.status-option.info.active { border-color: #06b6d4; background: #ecfeff; color: #155e75; }

.form-alert { padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; font-weight: 500; }
.form-alert.success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.form-alert.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.err { color: var(--danger); }

.confirm-dialog { text-align: center; max-width: 440px; }
.confirm-icon { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 10px auto 16px; font-size: 30px; }
.confirm-icon.danger { background: #fee2e2; }
.confirm-icon.warning { background: #fef3c7; }
.confirm-icon.success { background: #d1fae5; }
.confirm-dialog h3 { margin: 0 0 8px; color: var(--text-primary); font-size: 17px; }
.confirm-text { color: var(--text-muted); font-size: 14px; margin: 0 0 16px; }

.qr-display { padding: 20px; background: #f8fafc; border-radius: 12px; }
.qr-placeholder { width: 240px; height: 240px; margin: 0 auto; border: 3px dashed var(--primary); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; }
.qr-info { margin-top: 16px; background: #f8fafc; border-radius: 10px; padding: 12px; }
.qr-info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px solid var(--border-light); }
.qr-info-row:last-child { border-bottom: none; }
.qr-info-row span:first-child { color: var(--text-muted); }

.bulk-info { padding: 12px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; margin-bottom: 14px; font-size: 13px; color: #1e40af; }
.bulk-members { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; max-height: 400px; overflow-y: auto; padding: 4px; }
.bulk-check { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 2px solid var(--border); border-radius: 10px; cursor: pointer; transition: all .15s; }
.bulk-check input { accent-color: var(--primary); }
.bulk-check.active { border-color: var(--primary); background: #eef2ff; }
.bulk-avatar { width: 36px; height: 36px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
.bulk-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
