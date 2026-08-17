<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSuperAdminStore } from '@/stores/super-admin'

const authStore = useAuthStore()
const saStore = useSuperAdminStore()

const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const perPage = ref(15)
const currentPage = ref(1)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showConfirmModal = ref(false)
const confirmAction = reactive({ title: '', message: '', type: 'status', user: null })

const form = reactive({
  id: null,
  name: '',
  email: '',
  phone: '',
  address: '',
  role_id: '',
  fonction_id: '',
  password: '',
  password_confirmation: '',
  status: true,
})

const formErrors = reactive({})
const formAlert = reactive({ type: '', message: '' })
const isEditing = computed(() => !!form.id)

const statsCards = computed(() => [
  { icon: '👥', label: 'Total utilisateurs', value: saStore.stats.total, cls: 'primary' },
  { icon: '👑', label: 'Super Admins', value: saStore.stats.super_admins, cls: 'purple' },
  { icon: '🛡️', label: 'Administrateurs', value: saStore.stats.admins, cls: 'blue' },
  { icon: '👷', label: 'Équipe (staff)', value: saStore.stats.staff, cls: 'orange' },
  { icon: '✅', label: 'Comptes actifs', value: saStore.stats.active, cls: 'green' },
  { icon: '🚫', label: 'Comptes désactivés', value: saStore.stats.inactive, cls: 'red' },
])

const initialsFor = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p.charAt(0).toUpperCase()).join('')
}

const avatarVariant = (id) => {
  const variants = ['', 'variant2', 'variant3', 'variant4']
  return variants[(Number(id) || 0) % variants.length]
}

const roleBadgeClass = (roleName) => {
  if (!roleName) return 'role-badge default'
  if (roleName === 'Super Admin') return 'role-badge super'
  if (roleName === 'Administrateur') return 'role-badge admin'
  if (['Secrétaire', 'Comptable', 'Responsable'].includes(roleName)) return 'role-badge staff'
  return 'role-badge default'
}

const debouncedLoad = (() => {
  let t
  return () => {
    clearTimeout(t)
    currentPage.value = 1
    t = setTimeout(() => loadList(), 250)
  }
})()

async function loadList() {
  const params = {
    search: search.value,
    role_id: roleFilter.value || undefined,
    status: statusFilter.value === '' ? undefined : (statusFilter.value === '1'),
    per_page: perPage.value,
    page: currentPage.value,
  }
  await saStore.loadUsers(params)
}

const openCreate = async () => {
  resetForm()
  showCreateModal.value = true
  if (!saStore.roles.length) {
    const r = await saStore.loadRolesAndFonctions()
    if (!r.ok) {
      formAlert.type = 'error'
      formAlert.message = r.error || 'Impossible de charger les rôles et fonctions'
    }
  }
}

const openEdit = async (user) => {
  resetForm()
  if (!saStore.roles.length) {
    const r = await saStore.loadRolesAndFonctions()
    if (!r.ok) {
      formAlert.type = 'error'
      formAlert.message = r.error || 'Impossible de charger rôles/fonctions'
    }
  }
  form.id = user.id
  form.name = user.name
  form.email = user.email
  form.phone = user.phone || ''
  form.address = user.address || ''
  form.role_id = user.role_id ? String(user.role_id) : ''
  form.fonction_id = user.fonction_id ? String(user.fonction_id) : ''
  form.status = !!user.status
  showEditModal.value = true
}

function resetForm() {
  form.id = null
  form.name = ''
  form.email = ''
  form.phone = ''
  form.address = ''
  form.role_id = ''
  form.fonction_id = ''
  form.password = ''
  form.password_confirmation = ''
  form.status = true
  formAlert.type = ''
  formAlert.message = ''
  Object.keys(formErrors).forEach(k => delete formErrors[k])
}

const closeModals = () => {
  showCreateModal.value = false
  showEditModal.value = false
  showConfirmModal.value = false
}

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.name.trim()) formErrors.name = 'Le nom est requis'
  if (!form.email.trim()) formErrors.email = 'L\'email est requis'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) formErrors.email = 'Email invalide'
  if (!form.role_id) formErrors.role_id = 'Le rôle est requis'
  if (!isEditing.value || form.password) {
    if (!form.password) formErrors.password = 'Le mot de passe est requis'
    else if (form.password.length < 8) formErrors.password = '8 caractères minimum'
    if (form.password !== form.password_confirmation) formErrors.password_confirmation = 'Les mots de passe ne correspondent pas'
  }
  return Object.keys(formErrors).length === 0
}

const submitForm = async () => {
  formAlert.type = ''
  if (!validateForm()) return
  const payload = {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    role_id: Number(form.role_id),
    fonction_id: form.fonction_id ? Number(form.fonction_id) : null,
    status: !!form.status,
  }
  let result
  if (isEditing.value) {
    if (form.password) {
      payload.password = form.password
      payload.password_confirmation = form.password_confirmation
    }
    result = await saStore.updateUser(form.id, payload)
  } else {
    payload.password = form.password
    payload.password_confirmation = form.password_confirmation
    result = await saStore.createUser(payload)
  }

  if (result.ok) {
    formAlert.type = 'success'
    formAlert.message = result.data?.message || (isEditing.value ? 'Mis à jour' : 'Créé avec succès')
    await loadList()
    if (!isEditing.value) {
      setTimeout(() => {
        showCreateModal.value = false
        resetForm()
      }, 800)
    }
  } else {
    formAlert.type = 'error'
    formAlert.message = result.error || 'Une erreur est survenue'
    if (result.raw?.errors) {
      for (const [k, v] of Object.entries(result.raw.errors)) {
        if (!formErrors[k]) formErrors[k] = Array.isArray(v) ? v[0] : String(v)
      }
    }
  }
}

const askToggle = (user) => {
  confirmAction.type = 'status'
  confirmAction.user = user
  confirmAction.title = user.status ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'
  confirmAction.message = user.status
    ? `Êtes-vous sûr de vouloir désactiver le compte de « ${user.name} » ? Il ne pourra plus se connecter.`
    : `Vous allez réactiver le compte de « ${user.name} ». Il pourra de nouveau se connecter.`
  showConfirmModal.value = true
}

const askDelete = (user) => {
  confirmAction.type = 'delete'
  confirmAction.user = user
  confirmAction.title = 'Supprimer ce compte ?'
  confirmAction.message = `Cette action est irréversible. Voulez-vous vraiment supprimer définitivement le compte de « ${user.name} » ?`
  showConfirmModal.value = true
}

const executeConfirm = async () => {
  if (!confirmAction.user) return
  let result
  if (confirmAction.type === 'status') {
    result = await saStore.toggleStatus(confirmAction.user.id)
  } else {
    result = await saStore.deleteUser(confirmAction.user.id)
  }
  if (result.ok) {
    showConfirmModal.value = false
    await loadList()
  } else {
    formAlert.type = 'error'
    formAlert.message = result.error || 'Erreur'
    showConfirmModal.value = false
  }
}

const canToggle = (user) => {
  if ((user.role?.name || '') === 'Super Admin') return false
  if (String(user.id) === String(authStore.user?.id)) return false
  return true
}

const canDelete = (user) => canToggle(user)

const pagesToShow = computed(() => {
  const current = saStore.pagination.current_page || 1
  const last = saStore.pagination.last_page || 1
  const pages = []
  const window = 2
  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= current - window && i <= current + window)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }
  return pages
})

watch(search, debouncedLoad)
watch(roleFilter, loadList)
watch(statusFilter, loadList)
watch(perPage, loadList)
watch(currentPage, loadList)

onMounted(async () => {
  await saStore.loadRolesAndFonctions()
  await loadList()
})
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">
        <h2>👑 Super Administrateur</h2>
        <p>Gérez les comptes administrateurs de toutes les églises, créez-en de nouveaux et activez/désactivez les accès.</p>
      </div>
      <div class="page-header-actions">
        <button class="sa-btn-primary" @click="openCreate" :disabled="saStore.saving">
          <span>➕</span>
          <span>Créer un administrateur</span>
        </button>
      </div>
    </div>

    <div class="sa-stats-grid">
      <div v-for="s in statsCards" :key="s.label" class="sa-stat-card">
        <div class="sa-stat-icon" :class="s.cls">{{ s.icon }}</div>
        <div>
          <div class="sa-stat-value">{{ s.value.toLocaleString('fr-FR') }}</div>
          <div class="sa-stat-label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <div v-if="formAlert.type && !showCreateModal && !showEditModal && !showConfirmModal"
         class="sa-alert" :class="formAlert.type">
      <span>{{ formAlert.type === 'success' ? '✅' : '⚠️' }}</span>
      <span>{{ formAlert.message }}</span>
    </div>

    <div class="sa-page-toolbar">
      <div class="sa-search">
        <span class="sa-search-icon">🔍</span>
        <input
          type="text"
          v-model="search"
          placeholder="Rechercher par nom, email, téléphone..."
        />
      </div>
      <select class="sa-filter-select" v-model="roleFilter">
        <option value="">Tous les rôles</option>
        <option v-for="r in saStore.roles" :key="r.id" :value="String(r.id)">{{ r.name }}</option>
      </select>
      <select class="sa-filter-select" v-model="statusFilter">
        <option value="">Tous les statuts</option>
        <option value="1">✅ Actifs</option>
        <option value="0">🚫 Désactivés</option>
      </select>
      <select class="sa-filter-select" v-model.number="perPage">
        <option :value="10">10 / page</option>
        <option :value="15">15 / page</option>
        <option :value="25">25 / page</option>
        <option :value="50">50 / page</option>
      </select>
    </div>

    <div class="sa-table-wrap">
      <div v-if="saStore.loading && !saStore.users.length" class="loading-state">
        <span>Chargement des utilisateurs...</span>
      </div>

      <table v-else class="sa-table">
        <thead>
          <tr>
            <th style="width:32%">Utilisateur</th>
            <th style="width:14%">Rôle</th>
            <th style="width:18%">Fonction</th>
            <th style="width:14%">Statut</th>
            <th style="width:12%">Accès</th>
            <th style="width:10%;text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!saStore.users.length">
            <td colspan="6">
              <div class="sa-empty">
                <div class="sa-empty-icon">👤</div>
                <h4>Aucun compte trouvé</h4>
                <p>Créez votre premier administrateur d'église avec le bouton ci-dessus.</p>
              </div>
            </td>
          </tr>
          <tr v-for="user in saStore.users" :key="user.id">
            <td data-label="Utilisateur">
              <div class="sa-user-cell">
                <div class="sa-user-avatar" :class="avatarVariant(user.id)">{{ initialsFor(user.name) }}</div>
                <div class="sa-user-info">
                  <p class="sa-user-name">{{ user.name }}</p>
                  <p class="sa-user-email">{{ user.email }}</p>
                </div>
              </div>
            </td>
            <td data-label="Rôle">
              <span class="role-badge" :class="roleBadgeClass(user.role?.name)">
                {{ user.role?.name || '—' }}
              </span>
            </td>
            <td data-label="Fonction">
              <span style="font-size:13px;color:var(--text)">
                {{ user.fonction?.name || '—' }}
              </span>
            </td>
            <td data-label="Statut">
              <span class="status-badge" :class="user.status ? 'active' : 'inactive'">
                <span class="status-dot"></span>
                {{ user.status ? 'Actif' : 'Désactivé' }}
              </span>
            </td>
            <td data-label="Accès">
              <div
                class="toggle-switch"
                :class="{ on: !!user.status, disabled: !canToggle(user) }"
                :title="canToggle(user) ? (user.status ? 'Cliquer pour désactiver' : 'Cliquer pour réactiver') : 'Non modifiable'"
                @click="canToggle(user) && askToggle(user)"
              ></div>
            </td>
            <td data-label="Actions">
              <div class="sa-actions">
                <button
                  class="sa-btn-icon primary"
                  title="Modifier"
                  @click="openEdit(user)"
                >✏️</button>
                <button
                  class="sa-btn-icon danger"
                  title="Supprimer"
                  :disabled="!canDelete(user)"
                  @click="canDelete(user) && askDelete(user)"
                  :style="canDelete(user) ? '' : 'opacity:0.4;cursor:not-allowed'"
                >🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="saStore.pagination.last_page > 1" class="sa-pagination">
        <div class="sa-pagination-info">
          Affichage de
          <b>{{ ((saStore.pagination.current_page - 1) * saStore.pagination.per_page) + 1 }}</b>
          à
          <b>{{ Math.min(saStore.pagination.current_page * saStore.pagination.per_page, saStore.pagination.total) }}</b>
          sur <b>{{ saStore.pagination.total }}</b> comptes
        </div>
        <div class="sa-pagination-controls">
          <button
            class="sa-page-btn"
            :disabled="saStore.pagination.current_page <= 1"
            @click="currentPage = Math.max(1, currentPage - 1)"
          >‹</button>
          <template v-for="p, i in pagesToShow" :key="i">
            <span v-if="p === '...'" style="padding:0 6px;color:var(--text-muted)">…</span>
            <button
              v-else
              class="sa-page-btn"
              :class="{ active: p === saStore.pagination.current_page }"
              @click="currentPage = p"
            >{{ p }}</button>
          </template>
          <button
            class="sa-page-btn"
            :disabled="saStore.pagination.current_page >= saStore.pagination.last_page"
            @click="currentPage = Math.min(saStore.pagination.last_page, currentPage + 1)"
          >›</button>
        </div>
      </div>
    </div>

    <!-- CREATE / EDIT MODAL -->
    <Teleport to="body">
      <div v-if="showCreateModal || showEditModal" class="sa-modal-backdrop" @click.self="closeModals">
        <div class="sa-modal">
          <div class="sa-modal-header">
            <h3 class="sa-modal-title">
              {{ isEditing ? '✏️ Modifier un compte' : '➕ Créer un administrateur d\'église' }}
            </h3>
            <button class="sa-modal-close" @click="closeModals">✕</button>
          </div>
          <div class="sa-modal-body">
            <div v-if="formAlert.type" class="sa-alert" :class="formAlert.type">
              <span>{{ formAlert.type === 'success' ? '✅' : '⚠️' }}</span>
              <span>{{ formAlert.message }}</span>
            </div>

            <div class="sa-form-row one-col">
              <div>
                <label class="sa-label">Nom complet *</label>
                <input class="sa-input" v-model="form.name" type="text" placeholder="Ex: Koffi Jean" />
                <div v-if="formErrors.name" class="sa-field-error">{{ formErrors.name }}</div>
              </div>
            </div>

            <div class="sa-form-row">
              <div>
                <label class="sa-label">Email *</label>
                <input class="sa-input" v-model="form.email" type="email" placeholder="nom@eglise.com" />
                <div v-if="formErrors.email" class="sa-field-error">{{ formErrors.email }}</div>
              </div>
              <div>
                <label class="sa-label">Téléphone</label>
                <input class="sa-input" v-model="form.phone" type="text" placeholder="+228 90 00 00 00" />
              </div>
            </div>

            <div class="sa-form-row">
              <div>
                <label class="sa-label">Rôle *</label>
                <select class="sa-select" v-model="form.role_id">
                  <option value="">Choisir un rôle...</option>
                  <option v-for="r in saStore.roles" :key="r.id" :value="String(r.id)">{{ r.name }}</option>
                </select>
                <div v-if="formErrors.role_id" class="sa-field-error">{{ formErrors.role_id }}</div>
              </div>
              <div>
                <label class="sa-label">Fonction</label>
                <select class="sa-select" v-model="form.fonction_id">
                  <option value="">Aucune</option>
                  <option v-for="f in saStore.fonctions" :key="f.id" :value="String(f.id)">{{ f.name }}</option>
                </select>
              </div>
            </div>

            <div class="sa-form-row one-col">
              <div>
                <label class="sa-label">Adresse</label>
                <textarea class="sa-textarea" v-model="form.address" placeholder="Adresse postale (optionnel)"></textarea>
              </div>
            </div>

            <div class="sa-form-row">
              <div>
                <label class="sa-label">
                  {{ isEditing ? 'Nouveau mot de passe (laisser vide pour garder)' : 'Mot de passe *' }}
                </label>
                <input class="sa-input" v-model="form.password" type="password" placeholder="••••••••" />
                <div v-if="formErrors.password" class="sa-field-error">{{ formErrors.password }}</div>
              </div>
              <div>
                <label class="sa-label">Confirmer le mot de passe{{ isEditing ? '' : ' *' }}</label>
                <input class="sa-input" v-model="form.password_confirmation" type="password" placeholder="••••••••" />
                <div v-if="formErrors.password_confirmation" class="sa-field-error">{{ formErrors.password_confirmation }}</div>
              </div>
            </div>

            <div class="sa-form-row one-col">
              <div style="display:flex;align-items:center;gap:12px">
                <div
                  class="toggle-switch"
                  :class="{ on: !!form.status }"
                  @click="form.status = !form.status"
                ></div>
                <span style="font-size:14px;font-weight:600;color:var(--text)">
                  Compte {{ form.status ? 'actif (peut se connecter)' : 'désactivé' }}
                </span>
              </div>
            </div>
          </div>
          <div class="sa-modal-footer">
            <button class="sa-btn-secondary" @click="closeModals" :disabled="saStore.saving">Annuler</button>
            <button class="sa-btn-primary" @click="submitForm" :disabled="saStore.saving">
              {{ saStore.saving ? 'Enregistrement...' : (isEditing ? 'Enregistrer' : 'Créer le compte') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- CONFIRM MODAL -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="sa-modal-backdrop" @click.self="closeModals">
        <div class="sa-modal" style="max-width: 460px">
          <div class="sa-modal-body">
            <div class="sa-confirm-icon">
              {{ confirmAction.type === 'delete' ? '🗑️' : (confirmAction.user?.status ? '🚫' : '✅') }}
            </div>
            <div class="sa-confirm-text">
              <h4>{{ confirmAction.title }}</h4>
              <p>{{ confirmAction.message }}</p>
            </div>
          </div>
          <div class="sa-modal-footer" style="justify-content:center">
            <button class="sa-btn-secondary" @click="closeModals">Annuler</button>
            <button
              class="sa-btn"
              :class="confirmAction.type === 'delete' ? 'sa-btn-danger' : 'sa-btn-primary'"
              @click="executeConfirm"
            >
              {{ confirmAction.type === 'delete' ? 'Supprimer' : 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
