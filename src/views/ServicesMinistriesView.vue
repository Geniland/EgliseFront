<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useMinistriesStore } from '@/stores/ministries'
import { useMembersStore } from '@/stores/members'
import { useAuthStore } from '@/stores/auth'

const minStore = useMinistriesStore()
const memStore = useMembersStore()
const authStore = useAuthStore()

// State
const search = ref('')
const statusFilter = ref('')
const viewMode = ref('grid') // 'grid' | 'table'

// Modals
const showFormModal = ref(false)
const showMembersModal = ref(false)
const showDeleteConfirm = ref(false)
const targetMinistry = ref(null)

// Forms
const form = reactive({
  id: null,
  name: '',
  description: '',
  leader_id: '',
  meeting_schedule: '',
  status: true,
})
const formErrors = reactive({})
const selectedNewMemberId = ref('')

onMounted(async () => {
  await Promise.all([
    minStore.fetchMinistries(),
    memStore.loadMembers({ per_page: 100 })
  ])
})

// Filtered ministries
const filteredMinistries = computed(() => {
  return minStore.ministries.filter(m => {
    const matchesSearch = !search.value || 
      m.name.toLowerCase().includes(search.value.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.value.toLowerCase())) ||
      (m.meeting_schedule && m.meeting_schedule.toLowerCase().includes(search.value.toLowerCase()))
    
    const matchesStatus = statusFilter.value === '' || 
      String(m.status) === String(statusFilter.value)

    return matchesSearch && matchesStatus
  })
})

// Members not yet assigned to the current selected ministry
const availableMembersToAdd = computed(() => {
  if (!targetMinistry.value || !minStore.currentMinistry?.members) return memStore.members
  const assignedIds = new Set(minStore.currentMinistry.members.map(m => m.id))
  return memStore.members.filter(m => !assignedIds.has(m.id))
})

// Permissions check
const canManage = computed(() => {
  const roleId = Number(authStore.user?.role_id)
  return roleId === 1 || roleId === 2 || roleId === 5
})

// Actions: Open Create/Edit Modal
const openCreateModal = () => {
  form.id = null
  form.name = ''
  form.description = ''
  form.leader_id = ''
  form.meeting_schedule = ''
  form.status = true
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  showFormModal.value = true
}

const openEditModal = (m) => {
  form.id = m.id
  form.name = m.name
  form.description = m.description || ''
  form.leader_id = m.leader_id || (m.leader?.id || '')
  form.meeting_schedule = m.meeting_schedule || ''
  form.status = Boolean(m.status)
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  showFormModal.value = true
}

// Save Ministry
const saveMinistry = async () => {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.name.trim()) {
    formErrors.name = 'Le nom du ministère est obligatoire'
    return
  }

  const payload = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    leader_id: form.leader_id ? Number(form.leader_id) : null,
    meeting_schedule: form.meeting_schedule.trim() || null,
    status: form.status
  }

  try {
    if (form.id) {
      await minStore.updateMinistry(form.id, payload)
    } else {
      await minStore.createMinistry(payload)
    }
    showFormModal.value = false
  } catch (err) {
    if (err?.data?.errors) {
      Object.assign(formErrors, err.data.errors)
    }
  }
}

// Open Members Modal
const openMembersModal = async (m) => {
  targetMinistry.value = m
  selectedNewMemberId.value = ''
  showMembersModal.value = true
  await minStore.fetchMinistry(m.id)
}

// Add member to ministry
const handleAddMember = async () => {
  if (!selectedNewMemberId.value || !targetMinistry.value) return
  await minStore.assignMembers(targetMinistry.value.id, [Number(selectedNewMemberId.value)])
  selectedNewMemberId.value = ''
}

// Remove member from ministry
const handleRemoveMember = async (memberId) => {
  if (!targetMinistry.value) return
  await minStore.removeMember(targetMinistry.value.id, memberId)
}

// Delete Ministry
const confirmDelete = (m) => {
  targetMinistry.value = m
  showDeleteConfirm.value = true
}

const executeDelete = async () => {
  if (targetMinistry.value) {
    await minStore.deleteMinistry(targetMinistry.value.id)
    showDeleteConfirm.value = false
    targetMinistry.value = null
  }
}

const getMemberPhoto = (member) => {
  if (member?.photo_url) return member.photo_url
  if (member?.photo) return 'http://localhost:8000/storage/' + member.photo
  return null
}
</script>

<template>
  <div class="services-wrapper">
    <!-- Header -->
    <div class="header-section">
      <div class="header-info">
        <h1>🤲 Services & Ministères</h1>
        <p>Pilotez les départements, les équipes d'engagement et la mobilisation des fidèles</p>
      </div>
      <div class="header-actions" v-if="canManage">
        <button class="btn-primary" @click="openCreateModal">
          <span class="btn-icon">＋</span> Nouveau Ministère
        </button>
      </div>
    </div>

    <!-- KPIs Bar -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon-box bg-blue">🏢</div>
        <div class="kpi-content">
          <span class="kpi-label">Total Ministères</span>
          <span class="kpi-value">{{ minStore.totalMinistries }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-box bg-green">✨</div>
        <div class="kpi-content">
          <span class="kpi-label">Ministères Actifs</span>
          <span class="kpi-value">{{ minStore.activeMinistriesCount }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-box bg-purple">👥</div>
        <div class="kpi-content">
          <span class="kpi-label">Membres Engagés</span>
          <span class="kpi-value">{{ minStore.totalEngagedMembers }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon-box bg-amber">⏱️</div>
        <div class="kpi-content">
          <span class="kpi-label">Moyenne par Service</span>
          <span class="kpi-value">
            {{ minStore.totalMinistries ? Math.round(minStore.totalEngagedMembers / minStore.totalMinistries) : 0 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Controls Bar -->
    <div class="controls-card">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          v-model="search" 
          placeholder="Rechercher par nom, responsable, horaires..." 
          class="search-input"
        />
      </div>

      <div class="filter-group">
        <select v-model="statusFilter" class="select-filter">
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>

        <div class="view-switch">
          <button 
            :class="['switch-btn', { active: viewMode === 'grid' }]" 
            @click="viewMode = 'grid'" 
            title="Vue en Grille"
          >
            ▦
          </button>
          <button 
            :class="['switch-btn', { active: viewMode === 'table' }]" 
            @click="viewMode = 'table'" 
            title="Vue en Tableau"
          >
            ☰
          </button>
        </div>
      </div>
    </div>

    <!-- Content: Empty State -->
    <div v-if="!minStore.loading && filteredMinistries.length === 0" class="empty-state">
      <div class="empty-icon">🤝</div>
      <h3>Aucun ministère trouvé</h3>
      <p>Créez votre premier ministère ou ajustez vos filtres de recherche.</p>
      <button v-if="canManage" class="btn-primary" @click="openCreateModal" style="margin-top: 15px;">
        + Créer un ministère
      </button>
    </div>

    <!-- Content: Grid View -->
    <div v-else-if="viewMode === 'grid'" class="ministry-grid">
      <div v-for="m in filteredMinistries" :key="m.id" class="ministry-card">
        <div class="card-top">
          <div class="ministry-badge" :class="m.status ? 'badge-active' : 'badge-inactive'">
            {{ m.status ? 'Actif' : 'Inactif' }}
          </div>
          <div class="card-actions" v-if="canManage">
            <button class="action-btn" @click="openEditModal(m)" title="Modifier">✏️</button>
            <button class="action-btn btn-del" @click="confirmDelete(m)" title="Supprimer">🗑️</button>
          </div>
        </div>

        <div class="card-main">
          <h2 class="ministry-title">{{ m.name }}</h2>
          <p class="ministry-desc">{{ m.description || 'Aucune description renseignée pour ce ministère.' }}</p>
        </div>

        <!-- Leader Info -->
        <div class="leader-badge-box">
          <div class="leader-avatar">
            <img v-if="getMemberPhoto(m.leader)" :src="getMemberPhoto(m.leader)" class="avatar-img" />
            <span v-else class="avatar-fallback">👤</span>
          </div>
          <div class="leader-meta">
            <span class="leader-role">Responsable / Leader</span>
            <span class="leader-name">
              {{ m.leader ? (m.leader.first_name + ' ' + m.leader.last_name) : 'Non assigné' }}
            </span>
          </div>
        </div>

        <!-- Schedule -->
        <div class="schedule-box" v-if="m.meeting_schedule">
          <span class="schedule-icon">📅</span>
          <span class="schedule-text">{{ m.meeting_schedule }}</span>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <div class="members-badge">
            <span class="members-icon">👥</span>
            <strong>{{ m.members_count || 0 }}</strong> membre(s)
          </div>
          <button class="btn-members" @click="openMembersModal(m)">
            Membres ➔
          </button>
        </div>
      </div>
    </div>

    <!-- Content: Table View -->
    <div v-else class="table-container">
      <table class="modern-table">
        <thead>
          <tr>
            <th>Ministère / Service</th>
            <th>Responsable / Leader</th>
            <th>Horaires de réunion</th>
            <th>Membres</th>
            <th>Statut</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filteredMinistries" :key="m.id">
            <td>
              <div class="cell-ministry">
                <strong>{{ m.name }}</strong>
                <small class="cell-sub">{{ m.description || 'Sans description' }}</small>
              </div>
            </td>
            <td>
              <div class="cell-leader">
                <span class="avatar-mini">
                  <img v-if="getMemberPhoto(m.leader)" :src="getMemberPhoto(m.leader)" class="mini-img" />
                  <span v-else>👤</span>
                </span>
                <span>{{ m.leader ? (m.leader.first_name + ' ' + m.leader.last_name) : '—' }}</span>
              </div>
            </td>
            <td>
              <span v-if="m.meeting_schedule" class="schedule-pill">📅 {{ m.meeting_schedule }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <button class="pill-btn" @click="openMembersModal(m)">
                👥 {{ m.members_count || 0 }} membre(s)
              </button>
            </td>
            <td>
              <span :class="m.status ? 'badge-active' : 'badge-inactive'">
                {{ m.status ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td style="text-align: right;">
              <div class="inline-actions">
                <button class="action-btn" @click="openMembersModal(m)" title="Gérer les membres">👥</button>
                <button v-if="canManage" class="action-btn" @click="openEditModal(m)" title="Modifier">✏️</button>
                <button v-if="canManage" class="action-btn btn-del" @click="confirmDelete(m)" title="Supprimer">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL: Créer / Modifier Ministère -->
    <div v-if="showFormModal" class="modal-backdrop" @click.self="showFormModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ form.id ? 'Modifier le Ministère' : 'Nouveau Ministère / Service' }}</h3>
          <button class="btn-close" @click="showFormModal = false">✕</button>
        </div>

        <form @submit.prevent="saveMinistry" class="modal-body">
          <div class="form-group">
            <label>Nom du Ministère / Département <span class="required">*</span></label>
            <input 
              type="text" 
              v-model="form.name" 
              class="form-control" 
              placeholder="Ex: Chorale, Jeunesse, Intercession, Protocole..."
            />
            <span v-if="formErrors.name" class="form-error">{{ formErrors.name }}</span>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea 
              v-model="form.description" 
              class="form-control" 
              rows="3" 
              placeholder="Rôle, mission et objectifs du service..."
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Responsable / Leader (Fidèle)</label>
              <select v-model="form.leader_id" class="form-control">
                <option value="">-- Aucun leader assigné --</option>
                <option v-for="mem in memStore.members" :key="mem.id" :value="mem.id">
                  {{ mem.first_name }} {{ mem.last_name }} ({{ mem.phone || 'Sans tel' }})
                </option>
              </select>
            </div>

            <div class="form-group flex-1">
              <label>Statut</label>
              <select v-model="form.status" class="form-control">
                <option :value="true">Actif</option>
                <option :value="false">Inactif</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Jours & Horaires de Réunion</label>
            <input 
              type="text" 
              v-model="form.meeting_schedule" 
              class="form-control" 
              placeholder="Ex: Samedis 16h00 - 18h00, Dimanches après le culte"
            />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="showFormModal = false">Annuler</button>
            <button type="submit" class="btn-primary" :disabled="minStore.saving">
              {{ minStore.saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: Gestion des Membres du Ministère -->
    <div v-if="showMembersModal" class="modal-backdrop" @click.self="showMembersModal = false">
      <div class="modal-card modal-wide">
        <div class="modal-header">
          <div>
            <h3>Membres de : {{ targetMinistry?.name }}</h3>
            <p class="modal-subtitle">Gérez l'affectation des fidèles engagés dans ce service</p>
          </div>
          <button class="btn-close" @click="showMembersModal = false">✕</button>
        </div>

        <div class="modal-body">
          <!-- Ajouter un membre -->
          <div class="add-member-bar" v-if="canManage">
            <select v-model="selectedNewMemberId" class="form-control flex-1">
              <option value="">-- Sélectionner un membre à ajouter --</option>
              <option v-for="m in availableMembersToAdd" :key="m.id" :value="m.id">
                {{ m.first_name }} {{ m.last_name }} - {{ m.phone || 'Sans tel' }}
              </option>
            </select>
            <button 
              class="btn-primary" 
              :disabled="!selectedNewMemberId || minStore.saving" 
              @click="handleAddMember"
            >
              + Affecter au service
            </button>
          </div>

          <!-- Liste des membres -->
          <div class="assigned-list">
            <h4>Membres actuellement affectés ({{ minStore.currentMinistry?.members?.length || 0 }})</h4>
            
            <div v-if="!minStore.currentMinistry?.members?.length" class="empty-members">
              Aucun membre affecté pour le moment dans ce ministère.
            </div>

            <div v-else class="members-items-grid">
              <div 
                v-for="mem in minStore.currentMinistry?.members" 
                :key="mem.id" 
                class="member-item-card"
              >
                <div class="item-avatar">
                  <img v-if="getMemberPhoto(mem)" :src="getMemberPhoto(mem)" class="avatar-img" />
                  <span v-else>👤</span>
                </div>
                <div class="item-meta">
                  <strong>{{ mem.first_name }} {{ mem.last_name }}</strong>
                  <small>{{ mem.phone || mem.email || 'Membre actif' }}</small>
                </div>
                <button 
                  v-if="canManage"
                  class="btn-remove-member" 
                  @click="handleRemoveMember(mem.id)" 
                  title="Retirer du ministère"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showMembersModal = false">Fermer</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Confirmation Suppression -->
    <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="showDeleteConfirm = false">
      <div class="modal-card modal-confirm">
        <h3>Supprimer le ministère</h3>
        <p>Êtes-vous sûr de vouloir supprimer le ministère <strong>{{ targetMinistry?.name }}</strong> ? Cette action détachera tous les membres associés.</p>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showDeleteConfirm = false">Annuler</button>
          <button class="btn-danger" @click="executeDelete">Confirmer la suppression</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.services-wrapper {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}
.header-info h1 {
  font-size: 26px;
  color: #0f172a;
  margin: 0 0 6px;
  font-weight: 800;
}
.header-info p {
  color: #64748b;
  margin: 0;
  font-size: 14px;
}

/* KPI Bar */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.kpi-card {
  background: white;
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s, box-shadow 0.2s;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
}
.kpi-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.bg-blue { background: #eff6ff; }
.bg-green { background: #f0fdf4; }
.bg-purple { background: #faf5ff; }
.bg-amber { background: #fffbeb; }
.kpi-content {
  display: flex;
  flex-direction: column;
}
.kpi-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.kpi-value {
  font-size: 24px;
  color: #0f172a;
  font-weight: 800;
}

/* Controls Card */
.controls-card {
  background: white;
  border-radius: 14px;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.search-box {
  position: relative;
  flex: 1;
  min-width: 260px;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: #94a3b8;
}
.search-input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: #3b82f6;
  outline: none;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.select-filter {
  padding: 10px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  background: white;
  color: #334155;
  cursor: pointer;
}
.view-switch {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
}
.switch-btn {
  background: transparent;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}
.switch-btn.active {
  background: white;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

/* Ministry Grid */
.ministry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.ministry-card {
  background: white;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  padding: 22px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 6px 25px rgba(0,0,0,0.02);
  transition: transform 0.2s, box-shadow 0.2s;
}
.ministry-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.06);
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.card-main {
  flex: 1;
}
.ministry-title {
  font-size: 18px;
  color: #0f172a;
  font-weight: 700;
  margin: 0 0 8px;
}
.ministry-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.badge-active {
  background: #dcfce7;
  color: #15803d;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.badge-inactive {
  background: #f1f5f9;
  color: #64748b;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* Leader Box */
.leader-badge-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 10px 14px;
  border-radius: 12px;
  margin-bottom: 12px;
}
.leader-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.leader-meta {
  display: flex;
  flex-direction: column;
}
.leader-role {
  font-size: 10px;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 700;
}
.leader-name {
  font-size: 13px;
  color: #1e293b;
  font-weight: 600;
}

/* Schedule */
.schedule-box {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #475569;
  background: #fdf4ff;
  border: 1px solid #f5d0fe;
  padding: 6px 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}
.members-badge {
  font-size: 13px;
  color: #475569;
}
.btn-members {
  background: #eff6ff;
  color: #2563eb;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-members:hover {
  background: #2563eb;
  color: white;
}

/* Table */
.table-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.modern-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.modern-table th {
  padding: 14px 18px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}
.modern-table td {
  padding: 16px 18px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 14px;
}
.cell-ministry strong {
  display: block;
  color: #0f172a;
}
.cell-sub {
  color: #64748b;
  font-size: 12px;
}
.cell-leader {
  display: flex;
  align-items: center;
  gap: 8px;
}
.avatar-mini {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 12px;
}
.mini-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.schedule-pill {
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: #334155;
}
.pill-btn {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.inline-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Common Buttons */
.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
}
.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary:hover {
  background: #e2e8f0;
}
.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}
.action-btn {
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  transition: transform 0.15s;
}
.action-btn:hover {
  transform: scale(1.15);
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}
.modal-card {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 26px;
}
.modal-wide {
  max-width: 720px;
}
.modal-confirm {
  max-width: 420px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
}
.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}
.modal-subtitle {
  color: #64748b;
  font-size: 13px;
  margin: 4px 0 0;
}
.btn-close {
  background: #f1f5f9;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}
.required {
  color: #ef4444;
}
.form-control {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  transition: border-color 0.2s;
}
.form-control:focus {
  border-color: #3b82f6;
  outline: none;
}
.form-error {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}
.form-row {
  display: flex;
  gap: 12px;
}
.flex-1 {
  flex: 1;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

/* Assigned Members Modal */
.add-member-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.assigned-list h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #475569;
}
.empty-members {
  padding: 24px;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 14px;
}
.members-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}
.member-item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 12px;
}
.item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 14px;
}
.item-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.item-meta strong {
  font-size: 13px;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-meta small {
  font-size: 11px;
  color: #64748b;
}
.btn-remove-member {
  background: #fee2e2;
  color: #b91c1c;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-remove-member:hover {
  background: #ef4444;
  color: white;
}

/* Empty State */
.empty-state {
  background: white;
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
  padding: 48px;
  text-align: center;
  margin-top: 20px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-state h3 {
  margin: 0 0 6px;
  color: #1e293b;
}
.empty-state p {
  color: #64748b;
  margin: 0;
  font-size: 14px;
}
</style>
