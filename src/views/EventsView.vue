<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useEventsStore } from '../stores/events'
import SparklineChart from '@/components/dashboard/SparklineChart.vue'

const eStore = useEventsStore()

const activeTab = ref('overview')
const search = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const dateFromFilter = ref('')
const dateToFilter = ref('')
const scopeFilter = ref('')
const perPage = ref(20)
const page = ref(1)

const showEventModal = ref(false)
const showConfirmModal = ref(false)
const confirmTarget = ref(null)
const confirmAction = ref('')
const confirmMsg = ref('')
const confirmType = ref('warning')
const showDetailModal = ref(false)
const detailEvent = ref(null)

const eventForm = reactive({
  id: null, title: '', description: '', type: 'special_service',
  event_date: '', start_time: '09:00', end_time: '12:00',
  location: '', address: '', image_path: '', notes: '',
  status: 'draft', is_featured: false, max_attendees: '',
  organizer: '', contact_email: '', contact_phone: '',
})
const formErrors = reactive({})
const formAlert = reactive({ type: '', message: '' })

const isEditing = computed(() => !!eventForm.id)

const typeOptions = computed(() => {
  const t = eStore.referential.types || {}
  return Object.entries(t).map(([k, v]) => ({ value: k, label: v }))
})
const statusOptions = computed(() => {
  const s = eStore.referential.statuses || {}
  return Object.entries(s).map(([k, v]) => ({ value: k, label: v }))
})

const typeBadgeClass = (t) => {
  const map = {
    special_service: 'super', conference: 'admin', seminar: 'staff', meeting: 'default',
    retreat: 'super', evangelism: 'admin', youth: 'staff', women: 'default',
    men: 'staff', concert: 'super', other: 'default',
  }
  return 'role-badge ' + (map[t] || 'default')
}

const statusBadgeClass = (s) => {
  if (s === 'published') return 'status-badge active'
  if (s === 'cancelled') return 'status-badge inactive'
  if (s === 'completed') return 'status-badge info'
  if (s === 'draft') return 'status-badge warning'
  return 'status-badge default'
}

const debounced = (() => {
  let t
  return () => { clearTimeout(t); page.value = 1; t = setTimeout(() => loadItems(), 300) }
})()

async function loadItems() {
  const params = {
    search: search.value || undefined,
    type: typeFilter.value || undefined,
    status: statusFilter.value || undefined,
    date_from: dateFromFilter.value || undefined,
    date_to: dateToFilter.value || undefined,
    scope: scopeFilter.value || undefined,
    per_page: perPage.value,
    page: page.value,
  }
  await eStore.loadItems(params)
}

async function loadStats() {
  await eStore.loadStats()
}

function resetForm() {
  eventForm.id = null
  eventForm.title = ''
  eventForm.description = ''
  eventForm.type = 'special_service'
  eventForm.event_date = ''
  eventForm.start_time = '09:00'
  eventForm.end_time = '12:00'
  eventForm.location = ''
  eventForm.address = ''
  eventForm.image_path = ''
  eventForm.notes = ''
  eventForm.status = 'draft'
  eventForm.is_featured = false
  eventForm.max_attendees = ''
  eventForm.organizer = ''
  eventForm.contact_email = ''
  eventForm.contact_phone = ''
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  formAlert.type = ''
  formAlert.message = ''
}

function openCreate() {
  resetForm()
  formAlert.type = ''
  formAlert.message = ''
  showEventModal.value = true
}
function openEdit(ev) {
  resetForm()
  eventForm.id = ev.id
  eventForm.title = ev.title || ''
  eventForm.description = ev.description || ''
  eventForm.type = ev.type || 'special_service'
  eventForm.event_date = ev.event_date || ''
  eventForm.start_time = ev.start_time || '09:00'
  eventForm.end_time = ev.end_time || '12:00'
  eventForm.location = ev.location || ''
  eventForm.address = ev.address || ''
  eventForm.image_path = ev.image_path || ''
  eventForm.notes = ev.notes || ''
  eventForm.status = ev.status || 'draft'
  eventForm.is_featured = !!ev.is_featured
  eventForm.max_attendees = ev.max_attendees || ''
  eventForm.organizer = ev.organizer || ''
  eventForm.contact_email = ev.contact_email || ''
  eventForm.contact_phone = ev.contact_phone || ''
  formAlert.type = ''
  formAlert.message = ''
  showEventModal.value = true
}
function openDetail(ev) {
  detailEvent.value = ev
  showDetailModal.value = true
}

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!eventForm.title.trim()) formErrors.title = 'Le titre est requis'
  if (!eventForm.type) formErrors.type = 'Le type est requis'
  if (!eventForm.event_date) formErrors.event_date = 'La date est requise'
  if (!eventForm.start_time) formErrors.start_time = "L'heure de début est requise"
  if (eventForm.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eventForm.contact_email)) {
    formErrors.contact_email = 'Email invalide'
  }
  return Object.keys(formErrors).length === 0
}

function buildPayload() {
  const payload = {}
  const fields = [
    'title', 'description', 'type', 'event_date', 'start_time', 'end_time',
    'location', 'address', 'image_path', 'notes',
  ]
  fields.forEach(f => { if (eventForm[f]) payload[f] = eventForm[f] })
  payload.status = eventForm.status || 'draft'
  payload.is_featured = !!eventForm.is_featured
  if (eventForm.max_attendees) payload.max_attendees = Number(eventForm.max_attendees)
  if (eventForm.organizer) payload.organizer = eventForm.organizer
  if (eventForm.contact_email) payload.contact_email = eventForm.contact_email
  if (eventForm.contact_phone) payload.contact_phone = eventForm.contact_phone
  return payload
}

async function submitForm() {
  formAlert.type = ''
  if (!validateForm()) {
    formAlert.type = 'danger'
    formAlert.message = 'Veuillez corriger les erreurs du formulaire'
    return
  }
  const payload = buildPayload()
  let result
  if (isEditing.value) {
    result = await eStore.updateItem(eventForm.id, payload)
  } else {
    result = await eStore.createItem(payload)
  }
  if (result.ok) {
    formAlert.type = 'success'
    formAlert.message = result.message || 'Opération réussie'
    await Promise.all([loadItems(), loadStats()])
    setTimeout(() => {
      showEventModal.value = false
      resetForm()
    }, 600)
  } else {
    formAlert.type = 'danger'
    formAlert.message = result.message || 'Erreur'
    if (result.errors) Object.assign(formErrors, result.errors)
  }
}

function askDelete(ev) {
  confirmTarget.value = ev
  confirmAction.value = 'delete'
  confirmType.value = 'danger'
  confirmMsg.value = `Supprimer l'événement "${ev.title}" ? Cette action est irréversible.`
  showConfirmModal.value = true
}
function askPublish(ev) {
  confirmTarget.value = ev
  confirmAction.value = 'publish'
  confirmType.value = 'success'
  confirmMsg.value = `Publier l'événement "${ev.title}" ? Il sera visible par les fidèles.`
  showConfirmModal.value = true
}
function askCancelEvent(ev) {
  confirmTarget.value = ev
  confirmAction.value = 'cancel_event'
  confirmType.value = 'warning'
  confirmMsg.value = `Annuler l'événement "${ev.title}" ?`
  showConfirmModal.value = true
}
function askComplete(ev) {
  confirmTarget.value = ev
  confirmAction.value = 'complete'
  confirmType.value = 'success'
  confirmMsg.value = `Marquer "${ev.title}" comme terminé ?`
  showConfirmModal.value = true
}

async function confirmActionFn() {
  const id = confirmTarget.value?.id
  if (!id) return
  let r
  if (confirmAction.value === 'delete') r = await eStore.removeItem(id)
  else if (confirmAction.value === 'publish') r = await eStore.publish(id)
  else if (confirmAction.value === 'cancel_event') r = await eStore.cancel(id)
  else if (confirmAction.value === 'complete') r = await eStore.complete(id)
  if (r?.ok) {
    showConfirmModal.value = false
    await Promise.all([loadItems(), loadStats()])
  } else if (r) {
    formAlert.type = 'danger'
    formAlert.message = r.message
  }
}

async function toggleFeaturedFn(ev) {
  const r = await eStore.toggleFeatured(ev.id)
  if (r.ok) await Promise.all([loadItems(), loadStats()])
  else { formAlert.type = 'danger'; formAlert.message = r.message }
}

const pagesToShow = computed(() => {
  const cur = eStore.pagination.current_page || 1
  const last = eStore.pagination.last_page || 1
  const pages = []
  const w = 2
  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= cur - w && i <= cur + w)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }
  return pages
})

const trendMaxCount = computed(() => {
  const counts = (eStore.stats.trend || []).map(t => t.count || 0)
  return Math.max(1, ...counts)
})
const trendSpark = computed(() => (eStore.stats.trend || []).map(t => t.count || 0))

const byTypeData = computed(() => {
  const max = Math.max(1, ...(eStore.stats.by_type || []).map(t => t.count), 1)
  return (eStore.stats.by_type || []).map(t => ({ ...t, pct: Math.round((t.count / max) * 100) }))
})

watch(search, debounced)
watch(typeFilter, debounced)
watch(statusFilter, debounced)
watch(dateFromFilter, debounced)
watch(dateToFilter, debounced)
watch(scopeFilter, debounced)
watch(perPage, debounced)
watch(page, loadItems)

onMounted(async () => {
  await eStore.loadReferential()
  await Promise.all([loadItems(), loadStats()])
})
</script>

<template>
  <div class="attendance-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">📅 Gestion des Événements</h1>
        <p class="page-subtitle">Planifiez, publiez et suivez toutes les activités de l'église</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-primary" @click="openCreate">➕ Nouvel événement</button>
      </div>
    </div>

    <div v-if="formAlert.message" :class="['form-alert', formAlert.type]">
      {{ formAlert.message }}
    </div>

    <div class="sa-stats-grid">
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#ecfdf5;color:#10b981">📋</div>
        <div class="sa-stat-value">{{ eStore.stats.overview.total }}</div>
        <div class="sa-stat-label">Total événements</div>
        <SparklineChart v-if="trendSpark.length" :data="trendSpark" color="#10b981" :width="160" :height="22" />
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#eff6ff;color:#3b82f6">📢</div>
        <div class="sa-stat-value">{{ eStore.stats.overview.published }}</div>
        <div class="sa-stat-label">Publiés</div>
        <div class="sa-stat-label" style="margin-top:4px">
          {{ eStore.stats.overview.upcoming }} à venir
        </div>
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#fef3c7;color:#f59e0b">📝</div>
        <div class="sa-stat-value">{{ eStore.stats.overview.draft }}</div>
        <div class="sa-stat-label">Brouillons</div>
        <div class="sa-stat-label" style="margin-top:4px">
          ⭐ {{ eStore.stats.overview.featured }} en une
        </div>
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#f0fdf4;color:#10b981">🗓️</div>
        <div class="sa-stat-value">{{ eStore.stats.overview.this_month }}</div>
        <div class="sa-stat-label">Ce mois</div>
        <div class="sa-stat-label" style="margin-top:4px">
          {{ eStore.stats.overview.next_month }} le mois prochain
        </div>
      </div>
    </div>

    <div class="sa-stats-grid" style="grid-template-columns: 1.2fr 1fr">
      <div class="sa-table-wrap" style="padding:18px">
        <h3 class="card-title">📈 Évolution mensuelle</h3>
        <div class="trend-chart">
          <div v-if="!eStore.stats.trend?.length" class="sa-empty">Aucune donnée</div>
          <div v-else class="trend-bars">
            <div v-for="(t, i) in eStore.stats.trend" :key="i" class="trend-bar-col">
              <div class="trend-bar-stack" style="height:140px">
                <div
                  class="trend-bar present"
                  :style="{ height: (t.count / trendMaxCount * 100) + '%', minHeight: '4px' }"
                >
                  <span v-if="t.count" class="bar-label">{{ t.count }}</span>
                </div>
              </div>
              <div class="trend-label">{{ t.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="sa-table-wrap" style="padding:18px">
        <h3 class="card-title">📊 Répartition par type</h3>
        <div v-if="!byTypeData.length" class="sa-empty">Aucune donnée</div>
        <div v-else style="display:flex;flex-direction:column;gap:10px">
          <div v-for="t in byTypeData" :key="t.type" style="display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span :class="typeBadgeClass(t.type)" style="font-size:11px;padding:3px 10px">{{ t.label }}</span>
              <span style="font-weight:700;color:#111827">{{ t.count }}</span>
            </div>
            <div style="height:8px;background:#f3f4f6;border-radius:999px;overflow:hidden">
              <div style="height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:999px;width:0%" :style="{ width: t.pct + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="sa-stats-grid" style="grid-template-columns: 1fr">
      <div class="sa-table-wrap" style="padding:18px">
        <h3 class="card-title">🔔 Prochains événements publiés</h3>
        <div v-if="!eStore.stats.upcoming_events?.length" class="sa-empty">Aucun événement à venir 🎉</div>
        <div v-else style="display:flex;flex-direction:column;gap:10px">
          <div
            v-for="ev in eStore.stats.upcoming_events"
            :key="ev.id"
            class="sa-user-cell"
            style="gap:14px;padding:12px 14px;background:#fafbff;border-radius:12px;border:1px solid #e5e7eb;cursor:pointer"
            @click="openDetail(ev)"
          >
            <div style="width:58px;min-width:58px;padding:8px 4px;background:linear-gradient(135deg,#eff6ff,#e0e7ff);border-radius:12px;text-align:center">
              <div style="font-size:22px;font-weight:800;color:#1e40af;line-height:1">{{ new Date(ev.event_date).getDate() }}</div>
              <div style="font-size:10px;color:#3b82f6;font-weight:700;text-transform:uppercase;margin-top:4px">{{ new Date(ev.event_date).toLocaleString('fr-FR', { month: 'short' }) }}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;color:#111827">
                {{ ev.is_featured ? '⭐ ' : '' }}{{ ev.title }}
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;font-size:12px;color:#6b7280">
                <span :class="typeBadgeClass(ev.type)" style="font-size:10px;padding:2px 8px">{{ ev.type_label }}</span>
                <span v-if="ev.start_time">🕐 {{ ev.start_time }}{{ ev.end_time ? ' - ' + ev.end_time : '' }}</span>
                <span v-if="ev.location">📍 {{ ev.location }}</span>
              </div>
            </div>
            <span :class="statusBadgeClass(ev.status)" style="font-size:11px">{{ ev.status_label }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <button :class="['tab-btn', {active: activeTab==='overview'}]" @click="activeTab='overview'">
        📊 Tableau de bord
      </button>
      <button :class="['tab-btn', {active: activeTab==='list'}]" @click="activeTab='list'">
        📋 Tous les événements
        <span class="tab-count">{{ eStore.pagination.total }}</span>
      </button>
      <button :class="['tab-btn', {active: activeTab==='calendar'}]" @click="activeTab='calendar'; eStore.loadCalendar()">
        🗓️ Calendrier
      </button>
    </div>

    <template v-if="activeTab==='overview' || activeTab==='list'">
      <div class="sa-toolbar">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input v-model="search" placeholder="Rechercher un événement (titre, description, lieu)..." />
        </div>
        <select v-model="statusFilter">
          <option value="">Tous statuts</option>
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <select v-model="typeFilter">
          <option value="">Tous types</option>
          <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <select v-model="scopeFilter">
          <option value="">Toutes dates</option>
          <option value="upcoming">À venir</option>
          <option value="past">Passés</option>
        </select>
        <input type="date" v-model="dateFromFilter" title="Date début" />
        <input type="date" v-model="dateToFilter" title="Date fin" />
        <select v-model="perPage">
          <option :value="10">10 / page</option>
          <option :value="20">20 / page</option>
          <option :value="50">50 / page</option>
        </select>
      </div>

      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Événement</th>
              <th>Date & heure</th>
              <th>Type</th>
              <th>Lieu</th>
              <th>Statut</th>
              <th>Une</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="eStore.loading">
              <td colspan="7" class="sa-empty">⏳ Chargement...</td>
            </tr>
            <tr v-else-if="!eStore.items.length">
              <td colspan="7" class="sa-empty">Aucun événement trouvé</td>
            </tr>
            <tr v-for="ev in eStore.items" :key="ev.id">
              <td>
                <div class="sa-user-cell" style="cursor:pointer" @click="openDetail(ev)">
                  <div style="flex:1;min-width:0">
                    <div class="sa-user-name">{{ ev.is_featured ? '⭐ ' : '' }}{{ ev.title }}</div>
                    <div v-if="ev.description" class="sa-user-sub" style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {{ ev.description }}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="sa-user-name">📅 {{ ev.formatted_date || ev.event_date }}</div>
                <div class="sa-user-sub">🕐 {{ ev.formatted_time || (ev.start_time + (ev.end_time ? ' - ' + ev.end_time : '')) }}</div>
                <div v-if="ev.max_attendees" class="sa-user-sub">👥 Max {{ ev.max_attendees }} pers.</div>
              </td>
              <td><span :class="typeBadgeClass(ev.type)">{{ ev.type_label || ev.type }}</span></td>
              <td>
                <div v-if="ev.location">📍 {{ ev.location }}</div>
                <div v-if="ev.address" class="sa-user-sub">{{ ev.address }}</div>
                <div v-if="!ev.location && !ev.address" class="sa-subtle">—</div>
                <div v-if="ev.organizer" class="sa-user-sub">👤 {{ ev.organizer }}</div>
              </td>
              <td><span :class="statusBadgeClass(ev.status)">{{ ev.status_label || ev.status }}</span></td>
              <td>
                <button class="btn-icon edit" :title="ev.is_featured ? 'Retirer de la une' : 'Mettre en une'" @click="toggleFeaturedFn(ev)">
                  {{ ev.is_featured ? '⭐' : '☆' }}
                </button>
              </td>
              <td>
                <div class="row-actions" style="justify-content:flex-end">
                  <button class="btn-icon edit" title="Voir détails" @click="openDetail(ev)">👁️</button>
                  <button class="btn-icon edit" title="Modifier" @click="openEdit(ev)">✏️</button>
                  <template v-if="ev.status === 'draft'">
                    <button class="btn-icon edit" title="Publier" @click="askPublish(ev)">📢</button>
                  </template>
                  <template v-else-if="ev.status === 'published'">
                    <button class="btn-icon edit" title="Marquer terminé" @click="askComplete(ev)">✅</button>
                    <button class="btn-icon delete" title="Annuler" @click="askCancelEvent(ev)">❌</button>
                  </template>
                  <button class="btn-icon delete" title="Supprimer" @click="askDelete(ev)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="eStore.pagination.last_page > 1" class="sa-pagination">
          <div class="sa-pagination-info">
            Page {{ eStore.pagination.current_page }} / {{ eStore.pagination.last_page }}
            — {{ eStore.pagination.total }} événement(s)
          </div>
          <div class="sa-pagination-btns">
            <button
              class="page-btn"
              :disabled="eStore.pagination.current_page <= 1"
              @click="page = Math.max(1, page - 1)"
            >‹</button>
            <template v-for="p in pagesToShow" :key="p">
              <span v-if="p === '...'" class="page-ellipsis">…</span>
              <button
                v-else
                :class="['page-btn', {active: p === eStore.pagination.current_page}]"
                @click="page = p"
              >{{ p }}</button>
            </template>
            <button
              class="page-btn"
              :disabled="eStore.pagination.current_page >= eStore.pagination.last_page"
              @click="page = Math.min(eStore.pagination.last_page, page + 1)"
            >›</button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="activeTab==='calendar'">
      <div class="sa-table-wrap" style="margin-top:16px;padding:18px">
        <h3 class="card-title">🗓️ Calendrier des événements</h3>
        <div v-if="!eStore.calendar?.length" class="sa-empty">Aucun événement dans la période</div>
        <div v-else style="display:flex;flex-direction:column;gap:10px">
          <div
            v-for="ev in eStore.calendar"
            :key="ev.id"
            @click="openDetail(ev)"
            style="display:flex;align-items:stretch;gap:14px;padding:14px;background:#fafbff;border:1px solid #e5e7eb;border-radius:14px;cursor:pointer;transition:all .2s"
          >
            <div style="width:72px;min-width:72px;text-align:center;padding:10px 4px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;display:flex;flex-direction:column;justify-content:center">
              <div style="font-size:28px;font-weight:800;color:#92400e;line-height:1">{{ new Date(ev.event_date).getDate() }}</div>
              <div style="font-size:11px;color:#b45309;font-weight:600;margin-top:4px;text-transform:capitalize">{{ new Date(ev.event_date).toLocaleString('fr-FR', { weekday: 'short' }) }}</div>
              <div style="font-size:10px;color:#d97706;font-weight:700;text-transform:uppercase">{{ new Date(ev.event_date).toLocaleString('fr-FR', { month: 'short' }) }}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
                <span style="font-weight:700;color:#111827;font-size:15px">{{ ev.is_featured ? '⭐ ' : '' }}{{ ev.title }}</span>
                <span :class="statusBadgeClass(ev.status)" style="font-size:11px">{{ ev.status_label }}</span>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:#6b7280;margin-bottom:6px">
                <span :class="typeBadgeClass(ev.type)" style="font-size:11px;padding:2px 8px">{{ ev.type_label }}</span>
                <span v-if="ev.start_time">🕐 {{ ev.start_time }}{{ ev.end_time ? ' - ' + ev.end_time : '' }}</span>
                <span v-if="ev.location">📍 {{ ev.location }}</span>
                <span v-if="ev.organizer">👤 {{ ev.organizer }}</span>
              </div>
              <div v-if="ev.description" style="font-size:13px;color:#4b5563;line-height:1.5">{{ ev.description }}</div>
            </div>
            <div style="display:flex;align-items:flex-start">
              <button class="btn-icon edit" title="Modifier" @click.stop="openEdit(ev)">✏️</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal : Formulaire événement -->
    <div v-if="showEventModal" class="modal-backdrop" @click.self="showEventModal = false">
      <div class="modal-dialog" style="max-width:720px">
        <div class="modal-header">
          <h3>{{ isEditing ? '✏️ Modifier l\'événement' : '➕ Nouvel événement' }}</h3>
          <button class="modal-close" @click="showEventModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="formAlert.message" :class="['form-alert', formAlert.type]">
            {{ formAlert.message }}
          </div>

          <h4 class="form-section-title">Informations principales</h4>
          <div class="form-row">
            <div class="form-group" style="grid-column: span 4">
              <label>Titre <span v-if="formErrors.title" class="err">{{ formErrors.title }}</span></label>
              <input v-model="eventForm.title" :class="{err: formErrors.title}" placeholder="Ex: Culte de Pâques 2026" />
            </div>
          </div>
          <div class="form-row row-3">
            <div class="form-group">
              <label>Type d'événement <span v-if="formErrors.type" class="err">{{ formErrors.type }}</span></label>
              <select v-model="eventForm.type" :class="{err: formErrors.type}">
                <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Statut</label>
              <select v-model="eventForm.status">
                <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date <span v-if="formErrors.event_date" class="err">{{ formErrors.event_date }}</span></label>
              <input type="date" v-model="eventForm.event_date" :class="{err: formErrors.event_date}" />
            </div>
          </div>
          <div class="form-row row-3">
            <div class="form-group">
              <label>Heure début <span v-if="formErrors.start_time" class="err">{{ formErrors.start_time }}</span></label>
              <input type="time" v-model="eventForm.start_time" :class="{err: formErrors.start_time}" />
            </div>
            <div class="form-group">
              <label>Heure fin</label>
              <input type="time" v-model="eventForm.end_time" />
            </div>
            <div class="form-group">
              <label>Participants max. (optionnel)</label>
              <input type="number" min="1" v-model="eventForm.max_attendees" placeholder="Illimité" />
            </div>
          </div>

          <h4 class="form-section-title">Lieu & contact</h4>
          <div class="form-row">
            <div class="form-group" style="grid-column: span 2">
              <label>Nom du lieu</label>
              <input v-model="eventForm.location" placeholder="Église, salle, nom du lieu..." />
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label>Adresse complète</label>
              <input v-model="eventForm.address" placeholder="Rue, ville..." />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="grid-column: span 2">
              <label>Organisateur</label>
              <input v-model="eventForm.organizer" placeholder="Nom de l'organisateur" />
            </div>
            <div class="form-group">
              <label>Email contact <span v-if="formErrors.contact_email" class="err">{{ formErrors.contact_email }}</span></label>
              <input v-model="eventForm.contact_email" :class="{err: formErrors.contact_email}" placeholder="contact@eglise.org" />
            </div>
            <div class="form-group">
              <label>Téléphone</label>
              <input v-model="eventForm.contact_phone" placeholder="+228 00 00 00 00" />
            </div>
          </div>

          <h4 class="form-section-title">Contenu & image</h4>
          <div class="form-row">
            <div class="form-group" style="grid-column: span 4">
              <label>URL de l'affiche / image</label>
              <input v-model="eventForm.image_path" placeholder="https://... ou /storage/affiche.jpg" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="grid-column: span 4">
              <label>Description</label>
              <textarea rows="3" v-model="eventForm.description" placeholder="Décrivez l'événement..."></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="grid-column: span 4">
              <label>Notes internes (non publiées)</label>
              <textarea rows="2" v-model="eventForm.notes" placeholder="Notes privées pour l'équipe..."></textarea>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fafbff;border-radius:10px;border:1px solid #e0e7ff">
            <label class="toggle-switch">
              <input type="checkbox" v-model="eventForm.is_featured" />
              <span class="slider"></span>
            </label>
            <div style="flex:1">
              <div style="font-weight:600;color:#3730a3;font-size:13px">Mettre en évidence ⭐</div>
              <div style="font-size:12px;color:#6366f1">Événement affiché en tête de liste sur le tableau de bord</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showEventModal = false">Annuler</button>
          <button class="btn-primary" @click="submitForm" :disabled="eStore.saving">
            {{ eStore.saving ? '⏳ Enregistrement...' : (isEditing ? '💾 Enregistrer' : '✅ Créer l\'événement') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal : Confirmation -->
    <div v-if="showConfirmModal" class="modal-backdrop" @click.self="showConfirmModal = false">
      <div class="modal-dialog confirm-dialog">
        <div class="modal-body" style="padding:28px 24px">
          <div :class="['confirm-icon', confirmType]">
            {{ confirmType === 'danger' ? '🗑️' : confirmType === 'success' ? '✅' : '⚠️' }}
          </div>
          <h3>Confirmation</h3>
          <p class="confirm-text">{{ confirmMsg }}</p>
        </div>
        <div class="modal-footer justify-center">
          <button class="btn-secondary" @click="showConfirmModal = false">Annuler</button>
          <button :class="confirmType === 'danger' ? 'btn-danger' : 'btn-primary'" @click="confirmActionFn" :disabled="eStore.deleting">
            Confirmer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal : Détails événement -->
    <div v-if="showDetailModal && detailEvent" class="modal-backdrop" @click.self="showDetailModal = false">
      <div class="modal-dialog" style="max-width:680px">
        <div class="modal-header">
          <h3>{{ detailEvent.is_featured ? '⭐ ' : '' }}{{ detailEvent.title }}</h3>
          <button class="modal-close" @click="showDetailModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="detailEvent.image_path" style="margin-bottom:18px">
            <img
              :src="detailEvent.image_path"
              alt="Affiche"
              style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb"
              @error="(e) => { e.target.style.display = 'none' }"
            />
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
            <span :class="typeBadgeClass(detailEvent.type)">{{ detailEvent.type_label }}</span>
            <span :class="statusBadgeClass(detailEvent.status)">{{ detailEvent.status_label }}</span>
            <span v-if="detailEvent.is_upcoming" class="status-badge info">À venir</span>
            <span v-if="detailEvent.is_past" class="status-badge">Passé</span>
            <span v-if="detailEvent.is_featured" class="role-badge super">⭐ À la une</span>
          </div>
          <div class="form-row row-3">
            <div class="form-group">
              <label>📅 Date</label>
              <div style="padding:9px 12px;background:#f8fafc;border-radius:8px;font-weight:600;color:#111827">{{ detailEvent.formatted_date || detailEvent.event_date }}</div>
            </div>
            <div class="form-group">
              <label>🕐 Horaires</label>
              <div style="padding:9px 12px;background:#f8fafc;border-radius:8px;font-weight:600;color:#111827">{{ detailEvent.formatted_time || (detailEvent.start_time + (detailEvent.end_time ? ' - ' + detailEvent.end_time : '')) }}</div>
            </div>
            <div class="form-group">
              <label>👥 Capacité</label>
              <div style="padding:9px 12px;background:#f8fafc;border-radius:8px;font-weight:600;color:#111827">{{ detailEvent.max_attendees ? (detailEvent.max_attendees + ' pers.') : 'Illimitée' }}</div>
            </div>
          </div>
          <div v-if="detailEvent.location || detailEvent.address" class="form-row">
            <div v-if="detailEvent.location" class="form-group">
              <label>📍 Lieu</label>
              <div style="padding:9px 12px;background:#f8fafc;border-radius:8px;font-weight:600;color:#111827">{{ detailEvent.location }}</div>
            </div>
            <div v-if="detailEvent.address" class="form-group">
              <label>🏠 Adresse</label>
              <div style="padding:9px 12px;background:#f8fafc;border-radius:8px;font-weight:600;color:#111827">{{ detailEvent.address }}</div>
            </div>
          </div>
          <div v-if="detailEvent.organizer || detailEvent.contact_email || detailEvent.contact_phone" class="form-row row-3">
            <div v-if="detailEvent.organizer" class="form-group">
              <label>👤 Organisateur</label>
              <div style="padding:9px 12px;background:#f8fafc;border-radius:8px;font-weight:600;color:#111827">{{ detailEvent.organizer }}</div>
            </div>
            <div v-if="detailEvent.contact_email" class="form-group">
              <label>✉️ Email</label>
              <div style="padding:9px 12px;background:#f8fafc;border-radius:8px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis">{{ detailEvent.contact_email }}</div>
            </div>
            <div v-if="detailEvent.contact_phone" class="form-group">
              <label>📞 Téléphone</label>
              <div style="padding:9px 12px;background:#f8fafc;border-radius:8px;font-weight:600;color:#111827">{{ detailEvent.contact_phone }}</div>
            </div>
          </div>
          <div v-if="detailEvent.description" style="margin-top:16px">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#4f46e5;margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed #e5e7eb">📝 Description</div>
            <div style="white-space:pre-wrap;line-height:1.6;color:#374151;background:#fafafa;padding:14px;border-radius:10px;border:1px solid #f3f4f6">{{ detailEvent.description }}</div>
          </div>
          <div v-if="detailEvent.notes" style="margin-top:14px">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#d97706;margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed #fde68a">🔒 Notes internes</div>
            <div style="white-space:pre-wrap;line-height:1.6;color:#92400e;background:#fffbeb;padding:14px;border-radius:10px;border:1px solid #fde68a">{{ detailEvent.notes }}</div>
          </div>
          <div style="margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;display:flex;gap:18px;flex-wrap:wrap">
            <div>Créé par : <span style="font-weight:600;color:#111827">{{ detailEvent.creator?.name || '—' }}</span></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showDetailModal = false">Fermer</button>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <template v-if="detailEvent.status === 'draft'">
              <button class="btn-primary" @click="askPublish(detailEvent); showDetailModal=false">📢 Publier</button>
            </template>
            <template v-else-if="detailEvent.status === 'published'">
              <button class="btn-secondary" @click="askComplete(detailEvent); showDetailModal=false">✅ Terminé</button>
              <button class="btn-secondary" style="color:#b91c1c;border-color:#fecaca;background:#fef2f2" @click="askCancelEvent(detailEvent); showDetailModal=false">❌ Annuler</button>
            </template>
            <button class="btn-primary" @click="openEdit(detailEvent); showDetailModal=false">✏️ Modifier</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-badge.default { background: linear-gradient(135deg,#f3f4f6,#e5e7eb); color:#374151; }
.sa-stat-card { display: flex; flex-direction: column; }
.sa-stat-card > :nth-child(2) { margin-top: 8px; }
@media (max-width: 1024px) {
  .sa-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 560px) {
  .sa-stats-grid { grid-template-columns: 1fr !important; }
}
</style>
