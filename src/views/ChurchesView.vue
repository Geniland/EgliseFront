<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChurchesStore } from '@/stores/churches'

const authStore = useAuthStore()
const churchesStore = useChurchesStore()

const activeTab = ref('list') // 'list' | 'detail'
const perPage = ref(15)
const search = ref('')
const statusFilter = ref('')

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showToggleModal = ref(false)
const showStaffModal = ref(false)
const showEditStaffModal = ref(false)
const showDeleteStaffModal = ref(false)
const showToggleStaffModal = ref(false)

const selectedChurch = ref(null)
const modalTarget = reactive({ id: null, row: null })
const modalTargetStaff = reactive({ churchId: null, userId: null, row: null })

const createForm = reactive({
  name: '', address: '', city: '', phone: '', email: '', description: '',
  parent_church_id: null, status: true, code: '',
})
const editForm = reactive({
  name: '', address: '', city: '', phone: '', email: '', description: '',
  parent_church_id: null, status: true, code: '',
})
const createStaffForm = reactive({
  name: '', email: '', password: '', password_confirmation: '',
  phone: '', address: '', role_id: null, status: true,
})
const editStaffForm = reactive({
  name: '', email: '', phone: '', address: '',
  role_id: null, status: true, password: '', password_confirmation: '',
})

const flashMsg = ref('')
const flashType = ref('success')

function flashOk(txt) { flashMsg.value = txt; flashType.value = 'success'; setTimeout(() => (flashMsg.value = ''), 4500) }
function flashErr(txt) { flashMsg.value = txt; flashType.value = 'danger'; setTimeout(() => (flashMsg.value = ''), 6500) }
function errorMap(err) {
  const res = {}
  const errs = err?.data?.errors || err?.response?.data?.errors || {}
  for (const k of Object.keys(errs)) {
    const v = errs[k]
    res[k] = Array.isArray(v) ? v[0] : v
  }
  return res
}
const createErrors = reactive({})
const editErrors = reactive({})
const createStaffErrors = reactive({})
const editStaffErrors = reactive({})

onMounted(async () => {
  try {
    if (authStore.churches.length === 0) await authStore.fetchChurches({ silent: true })
  } catch (e) {}
  try {
    await churchesStore.loadSelectOptions()
  } catch (e) {}
  try {
    await churchesStore.loadStaffRoles()
  } catch (e) {}
  await loadChurches()
})

async function loadChurches() {
  try {
    await churchesStore.loadChurches({
      per_page: perPage.value,
      search: search.value || undefined,
      status: statusFilter.value === '' ? undefined : (statusFilter.value === '1' ? 1 : 0),
    })
  } catch (e) {
    flashErr(e.data?.message || e.message || 'Erreur de chargement des églises')
  }
}

const stats = computed(() => churchesStore.stats)
const churches = computed(() => churchesStore.churches)
const meta = computed(() => churchesStore.churchesMeta)
const selectParents = computed(() => {
  let base = churchesStore.selectOptions
  if (!base || base.length === 0) base = authStore.churches || []
  return base.filter(c => !selectedChurch.value || c.id !== selectedChurch.value.id)
})

function resetCreateForm() {
  createForm.name = ''; createForm.address = ''; createForm.city = ''
  createForm.phone = ''; createForm.email = ''; createForm.description = ''
  createForm.parent_church_id = null; createForm.status = true; createForm.code = ''
  Object.keys(createErrors).forEach(k => delete createErrors[k])
}

async function openCreate() {
  if (!selectParents.value || selectParents.value.length === 0) {
    try { await churchesStore.loadSelectOptions() } catch (_) {}
  }
  resetCreateForm()
  showCreateModal.value = true
}

async function openEdit(row) {
  if (!selectParents.value || selectParents.value.length === 0) {
    try { await churchesStore.loadSelectOptions() } catch (_) {}
  }
  modalTarget.id = row.id; modalTarget.row = row
  editForm.name = row.name; editForm.code = row.code || ''; editForm.address = row.address || ''
  editForm.city = row.city || ''; editForm.phone = row.phone || ''; editForm.email = row.email || ''
  editForm.description = row.description || ''
  editForm.parent_church_id = row.parent_church_id || null
  editForm.status = (typeof row.status === 'boolean') ? row.status : (row.status === '1' || row.status === 1 || !!row.status)
  editForm.code = row.code || ''
  Object.keys(editErrors).forEach(k => delete editErrors[k])
  selectedChurch.value = row
  showEditModal.value = true
}

async function submitCreate() {
  Object.keys(createErrors).forEach(k => delete createErrors[k])
  try {
    const payload = { ...createForm }
    if (!payload.code) delete payload.code
    await churchesStore.createChurch(payload)
    flashOk('Église créée avec succès')
    showCreateModal.value = false
    resetCreateForm()
  } catch (e) {
    const em = errorMap(e)
    Object.assign(createErrors, em)
    flashErr(e.data?.message || e.message || 'Erreur lors de la création')
  }
}

async function submitEdit() {
  Object.keys(editErrors).forEach(k => delete editErrors[k])
  try {
    const payload = { ...editForm }
    if (!payload.code) delete payload.code
    await churchesStore.updateChurch(modalTarget.id, payload)
    flashOk('Église mise à jour')
    showEditModal.value = false
  } catch (e) {
    Object.assign(editErrors, errorMap(e))
    flashErr(e.data?.message || e.message || 'Erreur de mise à jour')
  }
}

function confirmToggle(row) {
  modalTarget.id = row.id; modalTarget.row = row
  showToggleModal.value = true
}
async function submitToggle() {
  try {
    await churchesStore.toggleChurchStatus(modalTarget.id)
    flashOk('Statut mis à jour')
    showToggleModal.value = false
  } catch (e) {
    flashErr(e.data?.message || e.message)
  }
}

function confirmDelete(row) {
  modalTarget.id = row.id; modalTarget.row = row
  showDeleteModal.value = true
}
async function submitDelete() {
  try {
    await churchesStore.removeChurch(modalTarget.id)
    flashOk('Église supprimée')
    showDeleteModal.value = false
  } catch (e) {
    flashErr(e.data?.message || e.message)
  }
}

async function selectChurchTab(row) {
  try {
    await churchesStore.loadChurchDetail(row.id)
    await churchesStore.loadStaff(row.id, { per_page: 20 })
    selectedChurch.value = churchesStore.currentChurch
    activeTab.value = 'detail'
  } catch (e) {
    flashErr(e.data?.message || e.message || 'Impossible de charger le détail')
  }
}

const members = computed(() => churchesStore.currentMembers)
const staffStats = computed(() => churchesStore.currentStaffStats)

function resetStaffForm() {
  createStaffForm.name = ''; createStaffForm.email = ''; createStaffForm.password = ''
  createStaffForm.password_confirmation = ''; createStaffForm.phone = ''; createStaffForm.address = ''
  createStaffForm.role_id = null; createStaffForm.status = true
  Object.keys(createStaffErrors).forEach(k => delete createStaffErrors[k])
}

const FALLBACK_ROLES = [
  { id: 5, name: 'Responsable', description: 'Rôle Responsable' },
  { id: 3, name: 'Secrétaire', description: 'Rôle Secrétaire' },
  { id: 4, name: 'Comptable', description: 'Rôle Comptable' },
  { id: 6, name: 'Fidèle', description: 'Rôle Fidèle' },
]

async function ensureStaffRolesLoaded() {
  let list = churchesStore.staffRoles || []
  if (list.length === 0) {
    try { list = await churchesStore.loadStaffRoles() || [] } catch (_) {}
  }
  if (list?.length === 0) {
    try {
      list = FALLBACK_ROLES.map(r => ({ ...r }))
      churchesStore.staffRoles = list
    } catch (_) {}
  }
  return list || []
}

async function openAddStaff() {
  if (!selectedChurch.value) return flashErr('Sélectionnez d\'abord une église')
  await ensureStaffRolesLoaded()
  resetStaffForm()
  showStaffModal.value = true
}
async function submitAddStaff() {
  Object.keys(createStaffErrors).forEach(k => delete createStaffErrors[k])
  try {
    const res = await churchesStore.addStaff(selectedChurch.value.id, { ...createStaffForm })
    flashOk(res.message || 'Compte créé')
    showStaffModal.value = false
  } catch (e) {
    Object.assign(createStaffErrors, errorMap(e))
    flashErr(e.data?.message || e.message)
  }
}
async function openEditStaff(row) {
  await ensureStaffRolesLoaded()
  modalTargetStaff.churchId = selectedChurch.value?.id
  modalTargetStaff.userId = row.id
  modalTargetStaff.row = row
  editStaffForm.name = row.name; editStaffForm.email = row.email; editStaffForm.phone = row.phone || ''
  editStaffForm.address = row.address || ''; editStaffForm.role_id = row.role_id || null
  editStaffForm.status = !!row.status; editStaffForm.password = ''; editStaffForm.password_confirmation = ''
  Object.keys(editStaffErrors).forEach(k => delete editStaffErrors[k])
  showEditStaffModal.value = true
}
async function submitEditStaff() {
  Object.keys(editStaffErrors).forEach(k => delete editStaffErrors[k])
  try {
    const payload = { ...editStaffForm }
    if (!payload.password) {
      delete payload.password
      delete payload.password_confirmation
    }
    await churchesStore.updateStaff(modalTargetStaff.churchId, modalTargetStaff.userId, payload)
    flashOk('Compte mis à jour')
    showEditStaffModal.value = false
  } catch (e) {
    Object.assign(editStaffErrors, errorMap(e))
    flashErr(e.data?.message || e.message)
  }
}
function confirmToggleStaff(row) {
  modalTargetStaff.churchId = selectedChurch.value?.id
  modalTargetStaff.userId = row.id
  modalTargetStaff.row = row
  showToggleStaffModal.value = true
}
async function submitToggleStaff() {
  try {
    await churchesStore.toggleStaff(modalTargetStaff.churchId, modalTargetStaff.userId)
    flashOk('Statut du compte mis à jour')
    showToggleStaffModal.value = false
  } catch (e) { flashErr(e.data?.message || e.message) }
}
function confirmDeleteStaff(row) {
  modalTargetStaff.churchId = selectedChurch.value?.id
  modalTargetStaff.userId = row.id
  modalTargetStaff.row = row
  showDeleteStaffModal.value = true
}
async function submitDeleteStaff() {
  try {
    await churchesStore.removeStaff(modalTargetStaff.churchId, modalTargetStaff.userId)
    flashOk('Compte supprimé')
    showDeleteStaffModal.value = false
  } catch (e) { flashErr(e.data?.message || e.message) }
}

const staffRoles = computed(() => {
  let list = churchesStore.staffRoles || []
  if (!list || list.length === 0) list = FALLBACK_ROLES
  return list || []
})
function roleBadgeClass(roleName) {
  switch (roleName) {
    case 'Administrateur': return 'role-badge role-admin'
    case 'Responsable': return 'role-badge role-manager'
    case 'Secrétaire': return 'role-badge role-secretary'
    case 'Comptable': return 'role-badge role-accountant'
    default: return 'role-badge role-member'
  }
}
</script>

<template>
  <div class="sa-view">
    <div class="sa-view-header">
      <div>
        <h1 class="sa-view-title">⛪ Mes Églises</h1>
        <p class="sa-view-subtitle">
          Créez et gérez vos églises et sous-églises, puis affectez un Responsable, Secrétaire et Comptable à chacune.
        </p>
      </div>
      <div class="sa-view-actions">
        <button v-if="activeTab==='list'" class="sa-btn sa-btn-primary" @click="openCreate">
          ➕ Nouvelle église
        </button>
        <button v-if="activeTab==='detail'" class="sa-btn sa-btn-secondary" @click="activeTab='list'; selectedChurch=null">
          ← Retour à la liste
        </button>
      </div>
    </div>

    <div v-if="flashMsg" class="sa-flash" :class="`sa-flash-${flashType}`">
      {{ flashMsg }}
    </div>

    <div class="sa-tabs">
      <button class="sa-tab" :class="{ active: activeTab==='list' }" @click="activeTab='list'; selectedChurch=null">
        📋 Liste des églises
        <span class="sa-tab-badge">{{ meta.total || 0 }}</span>
      </button>
      <button
        class="sa-tab"
        :class="{ active: activeTab==='detail' }"
        :disabled="!selectedChurch"
        @click="selectedChurch && (activeTab='detail')"
      >
        🏛️ {{ selectedChurch ? selectedChurch.name : 'Détail / Personnel' }}
      </button>
    </div>

    <!-- LIST TAB -->
    <div v-if="activeTab==='list'" class="sa-view-body">

      <div class="sa-stats-grid">
        <div class="sa-stat-card">
          <div class="sa-stat-icon">🏛️</div>
          <div>
            <div class="sa-stat-label">Total églises</div>
            <div class="sa-stat-value">{{ stats.total ?? 0 }}</div>
          </div>
        </div>
        <div class="sa-stat-card">
          <div class="sa-stat-icon" style="background:#ecfdf5;color:#059669">✅</div>
          <div>
            <div class="sa-stat-label">Actives</div>
            <div class="sa-stat-value" style="color:#059669">{{ stats.active ?? 0 }}</div>
          </div>
        </div>
        <div class="sa-stat-card">
          <div class="sa-stat-icon" style="background:#fef2f2;color:#dc2626">⛔</div>
          <div>
            <div class="sa-stat-label">Inactives</div>
            <div class="sa-stat-value" style="color:#dc2626">{{ stats.inactive ?? 0 }}</div>
          </div>
        </div>
        <div class="sa-stat-card">
          <div class="sa-stat-icon" style="background:#eef2ff;color:#4f46e5">🔗</div>
          <div>
            <div class="sa-stat-label">Sous-églises</div>
            <div class="sa-stat-value" style="color:#4f46e5">{{ stats.with_parent ?? 0 }}</div>
          </div>
        </div>
      </div>

      <div class="sa-table-wrap">
        <div class="sa-table-toolbar">
          <div class="sa-search">
            <span>🔎</span>
            <input v-model="search" placeholder="Rechercher une église (nom, code, ville, email)" @keyup.enter="loadChurches" />
            <button class="sa-btn sa-btn-secondary" @click="loadChurches">OK</button>
          </div>
          <div class="sa-table-toolbar-right">
            <select v-model="statusFilter" @change="loadChurches" class="sa-filter-select">
              <option value="">Tous statuts</option>
              <option value="1">✅ Actives</option>
              <option value="0">⛔ Inactives</option>
            </select>
            <select v-model="perPage" @change="loadChurches" class="sa-filter-select">
              <option :value="10">10/page</option>
              <option :value="15">15/page</option>
              <option :value="30">30/page</option>
              <option :value="50">50/page</option>
            </select>
          </div>
        </div>

        <table class="sa-table">
          <thead>
            <tr>
              <th>⛪ Nom</th>
              <th>Code</th>
              <th>Type</th>
              <th>Ville / Contact</th>
              <th>Personnel</th>
              <th>Statut</th>
              <th style="width:200px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!churches.length">
              <td colspan="7" class="sa-empty-cell">
                Aucune église trouvée. Cliquez sur <strong>"Nouvelle église"</strong> pour commencer.
              </td>
            </tr>
            <tr v-for="c in churches" :key="c.id">
              <td>
                <strong style="font-size:14px">{{ c.name }}</strong>
                <div v-if="c.parent_name" class="sa-hint">⬆️ rattachée à {{ c.parent_name }}</div>
              </td>
              <td><span class="role-badge role-accountant">{{ c.code }}</span></td>
              <td>
                <span v-if="c.parent_church_id" class="status-badge status-pending">Sous-église</span>
                <span v-else class="status-badge status-approved">Église principale</span>
              </td>
              <td>
                <div v-if="c.city || c.address">📍 {{ c.city }} <span class="sa-hint">{{ c.address }}</span></div>
                <div v-if="c.phone">📞 <a :href="'tel:' + c.phone">{{ c.phone }}</a></div>
                <div v-if="c.email">✉️ <a :href="'mailto:' + c.email">{{ c.email }}</a></div>
              </td>
              <td>
                <span class="sa-stat-mini">👥 {{ c.users_count ?? 0 }}</span>
              </td>
              <td>
                <span v-if="c.status" class="status-badge status-approved">✅ Active</span>
                <span v-else class="status-badge status-rejected">⛔ Inactive</span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon btn-icon-primary" title="Voir détail & personnel" @click="selectChurchTab(c)">👁️</button>
                  <button class="btn-icon btn-icon-secondary" title="Modifier" @click="openEdit(c)">✏️</button>
                  <button class="btn-icon btn-icon-warn" title="Activer/désactiver" @click="confirmToggle(c)">⏻</button>
                  <button class="btn-icon btn-icon-danger" title="Supprimer" @click="confirmDelete(c)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="sa-pagination">
          <span>Page <strong>{{ meta.current_page }}</strong> / {{ meta.last_page }}</span>
          <span>👉 Total {{ meta.total }}</span>
        </div>
      </div>
    </div>

    <!-- DETAIL TAB -->
    <div v-if="activeTab==='detail' && selectedChurch" class="sa-view-body">

      <div class="sa-hero-card">
        <div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div class="sa-hero-icon">⛪</div>
            <div>
              <h2 style="margin:0;font-size:22px">{{ selectedChurch.name }}</h2>
              <div class="sa-hint" style="margin-top:2px">
                <span class="role-badge role-accountant">{{ selectedChurch.code }}</span>
                <span v-if="selectedChurch.parent_church_id" class="status-badge status-pending" style="margin-left:8px">Sous-église de {{ selectedChurch.parent_name || selectedChurch.parent?.name }}</span>
                <span v-else class="status-badge status-approved" style="margin-left:8px">Église principale</span>
                <span class="sa-hint" style="margin-left:8px">
                  {{ selectedChurch.city || '' }}
                  <template v-if="selectedChurch.address"> — {{ selectedChurch.address }}</template>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="sa-hero-stats">
          <div class="sa-stat-mini-card"><strong>{{ staffStats.total ?? 0 }}</strong><span>Total personnel</span></div>
          <div class="sa-stat-mini-card" style="color:#059669"><strong>{{ staffStats.active ?? 0 }}</strong><span>Actifs</span></div>
          <div class="sa-stat-mini-card" style="color:#f59e0b"><strong>{{ staffStats.responsibles ?? 0 }}</strong><span>Responsables</span></div>
          <div class="sa-stat-mini-card" style="color:#4338ca"><strong>{{ staffStats.secretaries ?? 0 }}</strong><span>Secrétaires</span></div>
          <div class="sa-stat-mini-card" style="color:#0e7490"><strong>{{ staffStats.accountants ?? 0 }}</strong><span>Comptables</span></div>
        </div>
        <div class="sa-hero-actions">
          <button class="sa-btn sa-btn-primary" @click="openAddStaff">➕ Ajouter un personnel</button>
          <button class="sa-btn sa-btn-secondary" @click="openEdit(selectedChurch)">✏️ Modifier l'église</button>
        </div>
      </div>

      <div class="sa-table-wrap" style="margin-top:24px">
        <div class="sa-table-toolbar">
          <h3 style="margin:0">👥 Personnel de l'église</h3>
          <div class="sa-table-toolbar-right">
            <button class="sa-btn sa-btn-primary" @click="openAddStaff">➕ Nouveau compte</button>
          </div>
        </div>

        <table class="sa-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Contact</th>
              <th>Statut</th>
              <th style="width:200px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!members.length">
              <td colspan="5" class="sa-empty-cell">
                Aucun personnel encore affecté. Cliquez sur <strong>"➕ Nouveau compte"</strong> pour créer un Responsable, Secrétaire ou Comptable.
              </td>
            </tr>
            <tr v-for="u in members" :key="u.id">
              <td>
                <strong>{{ u.name }}</strong>
                <div class="sa-hint">{{ u.email }}</div>
              </td>
              <td>
                <span :class="roleBadgeClass(u.role?.name)">{{ u.role?.name || 'Fidèle' }}</span>
              </td>
              <td>
                <div v-if="u.phone">📞 {{ u.phone }}</div>
                <div>✉️ {{ u.email }}</div>
              </td>
              <td>
                <span v-if="u.status" class="status-badge status-approved">✅ Actif</span>
                <span v-else class="status-badge status-rejected">⛔ Inactif</span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon btn-icon-secondary" title="Modifier" @click="openEditStaff(u)">✏️</button>
                  <button class="btn-icon btn-icon-warn" title="Activer/désactiver" @click="confirmToggleStaff(u)">⏻</button>
                  <button class="btn-icon btn-icon-danger" title="Supprimer" @click="confirmDeleteStaff(u)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===================== MODALS ===================== -->
    <!-- CREATE CHURCH -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal=false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>➕ Nouvelle église / sous-église</h3>
          <button class="modal-close" @click="showCreateModal=false">×</button>
        </div>
        <div class="modal-body">
          <div class="sa-form-grid">
            <div class="sa-form-field">
              <label>Nom de l'église *</label>
              <input v-model="createForm.name" placeholder="Ex : Église Source de Vie Agoè" />
              <span v-if="createErrors.name" class="sa-error">{{ createErrors.name }}</span>
            </div>
            <div class="sa-form-field">
              <label>Code interne (optionnel)</label>
              <input v-model="createForm.code" placeholder="Auto si vide : EGL-000001" />
              <span v-if="createErrors.code" class="sa-error">{{ createErrors.code }}</span>
            </div>
            <div class="sa-form-field">
              <label>Ville</label>
              <input v-model="createForm.city" placeholder="Lomé, Atakpamé..." />
            </div>
            <div class="sa-form-field">
              <label>Rattachée à (église parente)</label>
              <select v-model="createForm.parent_church_id">
                <option :value="null">— Église principale (indépendante) —</option>
                <option v-for="p in selectParents" :key="p.id" :value="p.id">
                  {{ p.name }} {{ p.code ? '(' + p.code + ')' : '' }}
                </option>
              </select>
            </div>
            <div class="sa-form-field">
              <label>Téléphone</label>
              <input v-model="createForm.phone" placeholder="+228 90 00 00 00" />
            </div>
            <div class="sa-form-field">
              <label>Email</label>
              <input v-model="createForm.email" type="email" placeholder="contact@eglise.org" />
            </div>
            <div class="sa-form-field sa-form-field-full">
              <label>Adresse</label>
              <input v-model="createForm.address" placeholder="Quartier, rue, repère..." />
            </div>
            <div class="sa-form-field sa-form-field-full">
              <label>Description / note</label>
              <textarea v-model="createForm.description" rows="3" placeholder="Description de l'église"></textarea>
            </div>
            <div class="sa-form-field">
              <label><input v-model="createForm.status" type="checkbox" :true-value="true" :false-value="false" style="margin-right:6px;vertical-align:middle"/> Statut actif</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="sa-btn sa-btn-secondary" @click="showCreateModal=false">Annuler</button>
          <button class="sa-btn sa-btn-primary" @click="submitCreate" :disabled="churchesStore.loading">Créer l'église</button>
        </div>
      </div>
    </div>

    <!-- EDIT CHURCH -->
    <div v-if="showEditModal" class="modal-backdrop" @click.self="showEditModal=false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>✏️ Modifier l'église</h3>
          <button class="modal-close" @click="showEditModal=false">×</button>
        </div>
        <div class="modal-body">
          <div class="sa-form-grid">
            <div class="sa-form-field">
              <label>Nom de l'église *</label>
              <input v-model="editForm.name" />
              <span v-if="editErrors.name" class="sa-error">{{ editErrors.name }}</span>
            </div>
            <div class="sa-form-field">
              <label>Code interne</label>
              <input v-model="editForm.code" />
              <span v-if="editErrors.code" class="sa-error">{{ editErrors.code }}</span>
            </div>
            <div class="sa-form-field">
              <label>Ville</label>
              <input v-model="editForm.city" />
            </div>
            <div class="sa-form-field">
              <label>Rattachée à</label>
              <select v-model="editForm.parent_church_id">
                <option :value="null">— Église principale —</option>
                <option v-for="p in selectParents" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="sa-form-field">
              <label>Téléphone</label>
              <input v-model="editForm.phone" />
            </div>
            <div class="sa-form-field">
              <label>Email</label>
              <input v-model="editForm.email" type="email" />
            </div>
            <div class="sa-form-field sa-form-field-full">
              <label>Adresse</label>
              <input v-model="editForm.address" />
            </div>
            <div class="sa-form-field sa-form-field-full">
              <label>Description</label>
              <textarea v-model="editForm.description" rows="3"></textarea>
            </div>
            <div class="sa-form-field">
              <label><input v-model="editForm.status" type="checkbox" :true-value="true" :false-value="false" style="margin-right:6px;vertical-align:middle"/> Actif</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="sa-btn sa-btn-secondary" @click="showEditModal=false">Annuler</button>
          <button class="sa-btn sa-btn-primary" @click="submitEdit" :disabled="churchesStore.loading">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- CONFIRM TOGGLE CHURCH -->
    <div v-if="showToggleModal" class="modal-backdrop" @click.self="showToggleModal=false">
      <div class="modal-dialog modal-dialog-sm">
        <div class="modal-header">
          <h3>⏻ Changer le statut ?</h3>
          <button class="modal-close" @click="showToggleModal=false">×</button>
        </div>
        <div class="modal-body">
          <p>Êtes-vous sûr de vouloir <strong>{{ modalTarget.row?.status ? 'désactiver' : 'activer' }}</strong> l'église « <em>{{ modalTarget.row?.name }}</em> » ?</p>
          <p class="sa-hint">Une église désactivée n'apparaît plus dans le sélecteur de la topbar.</p>
        </div>
        <div class="modal-footer">
          <button class="sa-btn sa-btn-secondary" @click="showToggleModal=false">Annuler</button>
          <button class="sa-btn sa-btn-primary" @click="submitToggle">Confirmer</button>
        </div>
      </div>
    </div>

    <!-- CONFIRM DELETE CHURCH -->
    <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal=false">
      <div class="modal-dialog modal-dialog-sm">
        <div class="modal-header">
          <h3>🗑️ Supprimer l'église ?</h3>
          <button class="modal-close" @click="showDeleteModal=false">×</button>
        </div>
        <div class="modal-body">
          <p>L'église « <em>{{ modalTarget.row?.name }}</em> » sera supprimée.</p>
          <p class="sa-hint" style="color:#b91c1c">⚠️ Impossible de supprimer une église qui a encore des utilisateurs ou des sous-églises rattachées.</p>
        </div>
        <div class="modal-footer">
          <button class="sa-btn sa-btn-secondary" @click="showDeleteModal=false">Annuler</button>
          <button class="sa-btn sa-btn-danger" @click="submitDelete">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- CREATE STAFF -->
    <div v-if="showStaffModal" class="modal-backdrop" @click.self="showStaffModal=false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>➕ Nouveau compte — {{ selectedChurch?.name }}</h3>
          <button class="modal-close" @click="showStaffModal=false">×</button>
        </div>
        <div class="modal-body">
          <div class="sa-form-grid">
            <div class="sa-form-field">
              <label>Nom & Prénoms *</label>
              <input v-model="createStaffForm.name" placeholder="Ex : Komlan Jean" />
              <span v-if="createStaffErrors.name" class="sa-error">{{ createStaffErrors.name }}</span>
            </div>
            <div class="sa-form-field">
              <label>Rôle *</label>
              <select v-model="createStaffForm.role_id">
                <option :value="null">-- Sélectionner --</option>
                <option v-for="r in staffRoles" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
              <span v-if="createStaffErrors.role_id" class="sa-error">{{ createStaffErrors.role_id }}</span>
            </div>
            <div class="sa-form-field">
              <label>Email *</label>
              <input v-model="createStaffForm.email" type="email" placeholder="jean.k@eglise.org" />
              <span v-if="createStaffErrors.email" class="sa-error">{{ createStaffErrors.email }}</span>
            </div>
            <div class="sa-form-field">
              <label>Téléphone</label>
              <input v-model="createStaffForm.phone" placeholder="+228..." />
            </div>
            <div class="sa-form-field">
              <label>Mot de passe *</label>
              <input v-model="createStaffForm.password" type="password" placeholder="Au moins 8 caractères" />
              <span v-if="createStaffErrors.password" class="sa-error">{{ createStaffErrors.password }}</span>
            </div>
            <div class="sa-form-field">
              <label>Confirmer mot de passe *</label>
              <input v-model="createStaffForm.password_confirmation" type="password" />
              <span v-if="createStaffErrors.password_confirmation" class="sa-error">{{ createStaffErrors.password_confirmation }}</span>
            </div>
            <div class="sa-form-field sa-form-field-full">
              <label>Adresse postale</label>
              <input v-model="createStaffForm.address" placeholder="Quartier..." />
            </div>
            <div class="sa-form-field">
              <label><input v-model="createStaffForm.status" type="checkbox" :true-value="true" :false-value="false" style="margin-right:6px;vertical-align:middle"/> Compte actif immédiatement</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="sa-btn sa-btn-secondary" @click="showStaffModal=false">Annuler</button>
          <button class="sa-btn sa-btn-primary" @click="submitAddStaff" :disabled="churchesStore.loading">Créer le compte</button>
        </div>
      </div>
    </div>

    <!-- EDIT STAFF -->
    <div v-if="showEditStaffModal" class="modal-backdrop" @click.self="showEditStaffModal=false">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>✏️ Modifier — {{ modalTargetStaff.row?.name }}</h3>
          <button class="modal-close" @click="showEditStaffModal=false">×</button>
        </div>
        <div class="modal-body">
          <div class="sa-form-grid">
            <div class="sa-form-field">
              <label>Nom *</label>
              <input v-model="editStaffForm.name" />
              <span v-if="editStaffErrors.name" class="sa-error">{{ editStaffErrors.name }}</span>
            </div>
            <div class="sa-form-field">
              <label>Rôle *</label>
              <select v-model="editStaffForm.role_id">
                <option :value="null">-- Fidèle --</option>
                <option v-for="r in staffRoles" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
              <span v-if="editStaffErrors.role_id" class="sa-error">{{ editStaffErrors.role_id }}</span>
            </div>
            <div class="sa-form-field">
              <label>Email *</label>
              <input v-model="editStaffForm.email" type="email" />
              <span v-if="editStaffErrors.email" class="sa-error">{{ editStaffErrors.email }}</span>
            </div>
            <div class="sa-form-field">
              <label>Téléphone</label>
              <input v-model="editStaffForm.phone" />
            </div>
            <div class="sa-form-field">
              <label>Nouveau mot de passe <em style="font-weight:400;color:#6b7280">(laisser vide pour conserver)</em></label>
              <input v-model="editStaffForm.password" type="password" />
              <span v-if="editStaffErrors.password" class="sa-error">{{ editStaffErrors.password }}</span>
            </div>
            <div class="sa-form-field">
              <label>Confirmer</label>
              <input v-model="editStaffForm.password_confirmation" type="password" />
              <span v-if="editStaffErrors.password_confirmation" class="sa-error">{{ editStaffErrors.password_confirmation }}</span>
            </div>
            <div class="sa-form-field sa-form-field-full">
              <label>Adresse</label>
              <input v-model="editStaffForm.address" />
            </div>
            <div class="sa-form-field">
              <label><input v-model="editStaffForm.status" type="checkbox" :true-value="true" :false-value="false" style="margin-right:6px;vertical-align:middle"/> Compte actif</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="sa-btn sa-btn-secondary" @click="showEditStaffModal=false">Annuler</button>
          <button class="sa-btn sa-btn-primary" @click="submitEditStaff" :disabled="churchesStore.loading">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- TOGGLE STAFF -->
    <div v-if="showToggleStaffModal" class="modal-backdrop" @click.self="showToggleStaffModal=false">
      <div class="modal-dialog modal-dialog-sm">
        <div class="modal-header"><h3>⏻ Statut du compte</h3><button class="modal-close" @click="showToggleStaffModal=false">×</button></div>
        <div class="modal-body">
          <p><strong>{{ modalTargetStaff.row?.name }}</strong> ({{ modalTargetStaff.row?.role?.name }}) sera <em>{{ modalTargetStaff.row?.status ? 'désactivé' : 'réactivé' }}</em>.</p>
        </div>
        <div class="modal-footer">
          <button class="sa-btn sa-btn-secondary" @click="showToggleStaffModal=false">Annuler</button>
          <button class="sa-btn sa-btn-primary" @click="submitToggleStaff">Confirmer</button>
        </div>
      </div>
    </div>

    <!-- DELETE STAFF -->
    <div v-if="showDeleteStaffModal" class="modal-backdrop" @click.self="showDeleteStaffModal=false">
      <div class="modal-dialog modal-dialog-sm">
        <div class="modal-header"><h3>🗑️ Supprimer le compte ?</h3><button class="modal-close" @click="showDeleteStaffModal=false">×</button></div>
        <div class="modal-body">
          <p>Êtes-vous sûr de vouloir supprimer définitivement le compte de <strong>{{ modalTargetStaff.row?.name }}</strong> ?</p>
        </div>
        <div class="modal-footer">
          <button class="sa-btn sa-btn-secondary" @click="showDeleteStaffModal=false">Annuler</button>
          <button class="sa-btn sa-btn-danger" @click="submitDeleteStaff">Supprimer</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.sa-view { max-width: 100%; padding: 4px 2px 24px 2px; }
.sa-view-header { display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:16px; }
.sa-view-title { margin:0;font-size:28px; }
.sa-view-subtitle { margin:8px 0 0;color:#6b7280;font-size:14px; }
.sa-view-actions { display:flex;gap:10px;flex-wrap:wrap; }
.sa-view-body { display:flex;flex-direction:column;gap:20px; }

.sa-btn { display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;font-weight:600;font-size:13px;border:1px solid transparent;cursor:pointer;transition:all .12s;white-space:nowrap; }
.sa-btn-primary { background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 6px 16px rgba(16,185,129,0.25); }
.sa-btn-primary:hover { filter:brightness(1.04);transform:translateY(-1px); }
.sa-btn-primary:disabled { opacity:.6;cursor:not-allowed; }
.sa-btn-secondary { background:#fff;color:#111827;border-color:#e5e7eb; }
.sa-btn-secondary:hover { background:#f9fafb;border-color:#d1d5db; }
.sa-btn-danger { background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff; }

.sa-flash { border-radius:12px;padding:12px 16px;margin-bottom:16px;font-weight:600;font-size:14px; }
.sa-flash-success { background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0; }
.sa-flash-danger { background:#fef2f2;color:#991b1b;border:1px solid #fecaca; }

.sa-tabs { display:flex;gap:8px;border-bottom:1px solid #e5e7eb;margin-bottom:18px;flex-wrap:wrap; }
.sa-tab { background:none;border:none;padding:12px 18px;font-weight:600;color:#6b7280;font-size:14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;border-radius:6px 6px 0 0; }
.sa-tab.active { color:#059669;border-bottom-color:#10b981;background:linear-gradient(180deg, #ecfdf5, transparent); }
.sa-tab:disabled { opacity:.4;cursor:not-allowed; }
.sa-tab-badge { display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;background:#e5e7eb;color:#111827;font-size:11px;font-weight:700; }

.sa-stats-grid { display:grid;grid-template-columns:repeat(auto-fit, minmax(210px,1fr));gap:14px; }
.sa-stat-card { background:#fff;border-radius:14px;border:1px solid #e5e7eb;padding:16px;display:flex;gap:14px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.03); }
.sa-stat-icon { width:50px;height:50px;border-radius:12px;background:#eff6ff;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0; }
.sa-stat-label { font-size:12px;color:#6b7280;font-weight:500; }
.sa-stat-value { font-size:22px;font-weight:800;color:#111827;margin-top:2px; }

.sa-table-wrap { background:#fff;border-radius:14px;border:1px solid #e5e7eb;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.03); }
.sa-table-toolbar { display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;align-items:center; }
.sa-search { display:flex;align-items:center;gap:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:6px 10px;min-width:320px;flex:1; }
.sa-search input { flex:1;border:none;background:transparent;outline:none;padding:6px;font-size:13px; }
.sa-table-toolbar-right { display:flex;gap:10px;align-items:center;flex-wrap:wrap; }
.sa-filter-select { padding:8px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;font-size:13px; }

.sa-table { width:100%;border-collapse:collapse;font-size:13.5px; }
.sa-table th { text-align:left;padding:12px 10px;border-bottom:1px solid #e5e7eb;background:#f9fafb;font-weight:700;color:#374151; }
.sa-table td { padding:14px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top; }
.sa-empty-cell { text-align:center;padding:40px 10px;color:#6b7280; }
.sa-hint { color:#6b7280;font-size:12px;margin-top:3px; }

.sa-pagination { display:flex;justify-content:space-between;align-items:center;padding:14px 4px 4px;color:#6b7280;font-size:13px; }
.row-actions { display:flex;gap:4px;flex-wrap:wrap; }
.btn-icon { width:34px;height:34px;border-radius:9px;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s;font-size:14px;background:#f9fafb; }
.btn-icon:hover { transform:translateY(-1px); }
.btn-icon-primary { color:#2563eb;background:#eff6ff;border-color:#bfdbfe; }
.btn-icon-secondary { color:#374151;background:#f9fafb;border-color:#e5e7eb; }
.btn-icon-warn { color:#92400e;background:#fef3c7;border-color:#fde68a; }
.btn-icon-danger { color:#991b1b;background:#fee2e2;border-color:#fecaca; }

.sa-form-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px; }
.sa-form-field { display:flex;flex-direction:column;gap:6px; }
.sa-form-field-full { grid-column:1 / -1; }
.sa-form-field label { font-size:13px;font-weight:600;color:#111827; }
.sa-form-field input, .sa-form-field select, .sa-form-field textarea { padding:10px 12px;border-radius:10px;border:1px solid #d1d5db;font-size:13.5px;background:#fff;outline:none;transition:border-color .12s; }
.sa-form-field input:focus, .sa-form-field select:focus, .sa-form-field textarea:focus { border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.15); }
.sa-error { color:#b91c1c;font-size:12px;font-weight:600; }

.role-badge { display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700; }
.role-admin { background:#fef3c7;color:#92400e; }
.role-manager { background:#dbeafe;color:#1e40af; }
.role-secretary { background:#ede9fe;color:#5b21b6; }
.role-accountant { background:#cffafe;color:#155e75; }
.role-member { background:#f3f4f6;color:#374151; }
.status-badge { display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700; }
.status-approved { background:#d1fae5;color:#065f46; }
.status-pending { background:#fef3c7;color:#92400e; }
.status-rejected { background:#fee2e2;color:#991b1b; }

.sa-hero-card { background:linear-gradient(135deg,#ffffff,#ecfdf5);border:1px solid #a7f3d0;border-radius:16px;padding:22px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;box-shadow:0 6px 18px rgba(16,185,129,0.08); }
.sa-hero-icon { width:68px;height:68px;border-radius:16px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px; }
.sa-hero-stats { display:flex;gap:10px;flex-wrap:wrap; }
.sa-stat-mini-card { min-width:100px;background:#fff;border:1px solid #a7f3d0;border-radius:12px;padding:10px 14px;text-align:center; }
.sa-stat-mini-card strong { display:block;font-size:18px;color:#111827; }
.sa-stat-mini-card span { font-size:11px;color:#6b7280;font-weight:600; }
.sa-hero-actions { display:flex;gap:10px;flex-wrap:wrap; }
.sa-stat-mini { display:inline-block;padding:4px 10px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:700; }

.modal-backdrop { position:fixed;inset:0;background:rgba(17,24,39,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px); }
.modal-dialog { background:#fff;border-radius:18px;width:min(720px, 100%);max-height:92vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,0.3);display:flex;flex-direction:column; }
.modal-dialog-sm { width:min(460px,100%); }
.modal-header { display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #f3f4f6; }
.modal-header h3 { margin:0;font-size:17px; }
.modal-close { border:none;background:none;font-size:24px;cursor:pointer;color:#6b7280;width:34px;height:34px;border-radius:8px; }
.modal-close:hover { background:#f3f4f6; }
.modal-body { padding:20px 22px; }
.modal-body p { margin:4px 0;font-size:14px; }
.modal-footer { display:flex;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid #f3f4f6;background:#fafafa;border-radius:0 0 18px 18px; }
</style>
