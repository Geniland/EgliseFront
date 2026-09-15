<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useMembersStore } from '../stores/members'

const authStore = useAuthStore()
const mStore = useMembersStore()

const search = ref('')
const memberTypeFilter = ref('')
const genderFilter = ref('')
const perPage = ref(15)
const currentPage = ref(1)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showConfirmModal = ref(false)
const confirmTarget = ref(null)
const confirmAction = ref('')
const showFamilyModal = ref(false)
const newFamily = reactive({ family_name: '', phone: '', address: '' })

const form = reactive({
  id: null,
  first_name: '', last_name: '', gender: 'Homme',
  birth_date: '', birth_place: '',
  phone: '', email: '', address: '', city: '', country: '',
  profession: '',
  marital_status: '', spouse_name: '',
  conversion_date: '', baptism_date: '', membership_date: '',
  photo_file: null, photo_preview: '',
  emergency_contact: '', emergency_phone: '',
  status: true,
  family_id: '',
  member_type: 'Membre',
  church_id: '',
  ministries: [],
  remove_photo: false,
})

const formErrors = reactive({})
const formAlert = reactive({ type: '', message: '' })
const familyAlert = reactive({ type: '', message: '' })
const confirmAlert = reactive({ type: '', message: '' })

const isEditing = computed(() => !!form.id)

function avatarColorFromId(id) {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6']
  const i = Number(String(id ?? '0').replace(/\D/g, '')) || 0
  return colors[i % colors.length]
}

function initials(first, last) {
  const a = (first || '').trim()[0] || ''
  const b = (last || '').trim()[0] || ''
  return (a + b).toUpperCase()
}

function memberBadgeClass(t) {
  if (t === 'Pasteur') return 'role-badge super'
  if (t === 'Responsable') return 'role-badge admin'
  if (t === 'Membre') return 'role-badge staff'
  if (t === 'Catéchumène') return 'role-badge default'
  return 'role-badge default'
}

const debouncedLoad = (() => {
  let t
  return () => {
    clearTimeout(t)
    currentPage.value = 1
    t = setTimeout(() => loadList(), 300)
  }
})()

async function loadList() {
  const params = {
    search: search.value || undefined,
    member_type: memberTypeFilter.value || undefined,
    gender: genderFilter.value || undefined,
    per_page: perPage.value,
    page: currentPage.value,
  }
  await mStore.loadMembers(params)
}

function memberPhoto(m) {
  if (!m?.photo) return null
  if (m.photo_url) return m.photo_url
  if (typeof m.photo === 'string' && m.photo.startsWith('http')) return m.photo
  const apiBase = (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:8000/api'
  const base = apiBase.replace(/\/api\/?$/, '')
  return `${base}/storage/${m.photo}`
}

function onPhotoPick(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    formAlert.type = 'danger'
    formAlert.message = 'La photo ne doit pas dépasser 2 Mo'
    return
  }
  form.photo_file = file
  form.remove_photo = false
  const r = new FileReader()
  r.onload = () => { form.photo_preview = r.result }
  r.readAsDataURL(file)
}

function removePhoto() {
  form.photo_file = null
  form.photo_preview = ''
  form.remove_photo = true
}

function resetForm() {
  form.id = null
  form.first_name = ''; form.last_name = ''; form.gender = 'Homme'
  form.birth_date = ''; form.birth_place = ''
  form.phone = ''; form.email = ''; form.address = ''; form.city = ''; form.country = ''
  form.profession = ''
  form.marital_status = ''; form.spouse_name = ''
  form.conversion_date = ''; form.baptism_date = ''; form.membership_date = ''
  form.photo_file = null; form.photo_preview = ''
  form.remove_photo = false
  form.emergency_contact = ''; form.emergency_phone = ''
  form.status = true
  form.family_id = ''
  form.member_type = 'Membre'
  form.church_id = authStore.currentChurchId ? String(authStore.currentChurchId) : (authStore.user?.church_id ? String(authStore.user.church_id) : '')
  form.ministries = []
  formAlert.type = ''; formAlert.message = ''
  Object.keys(formErrors).forEach(k => delete formErrors[k])
}

function resetFamily() {
  newFamily.family_name = ''
  newFamily.phone = ''
  newFamily.address = ''
  familyAlert.type = ''; familyAlert.message = ''
}

const closeModals = () => {
  showCreateModal.value = false
  showEditModal.value = false
  showConfirmModal.value = false
  showFamilyModal.value = false
  resetFamily()
}

const openCreate = async () => {
  resetForm()
  showCreateModal.value = true
  if (!mStore.ministries.length || !mStore.families.length) await mStore.loadReferentiels()
}

const openEdit = async (member) => {
  resetForm()
  if (!mStore.ministries.length || !mStore.families.length) await mStore.loadReferentiels()
  form.id = member.id
  form.first_name = member.first_name || ''
  form.last_name = member.last_name || ''
  form.gender = member.gender || 'Homme'
  form.birth_date = member.birth_date ? String(member.birth_date).slice(0, 10) : ''
  form.birth_place = member.birth_place || ''
  form.phone = member.phone || ''
  form.email = member.email || ''
  form.address = member.address || ''
  form.city = member.city || ''
  form.country = member.country || ''
  form.profession = member.profession || ''
  form.marital_status = member.marital_status || ''
  form.spouse_name = member.spouse_name || ''
  form.conversion_date = member.conversion_date ? String(member.conversion_date).slice(0, 10) : ''
  form.baptism_date = member.baptism_date ? String(member.baptism_date).slice(0, 10) : ''
  form.membership_date = member.membership_date ? String(member.membership_date).slice(0, 10) : ''
  form.emergency_contact = member.emergency_contact || ''
  form.emergency_phone = member.emergency_phone || ''
  form.status = member.status !== false
  form.family_id = member.family_id ? String(member.family_id) : ''
  form.member_type = member.member_type || 'Membre'
  form.church_id = member.church_id ? String(member.church_id) : (member.church?.id ? String(member.church.id) : '')
  form.ministries = (member.ministries || []).map(m => String(m.id))
  if (member.photo) {
    form.photo_preview = memberPhoto(member)
  }
  showEditModal.value = true
}

function validateForm() {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
  if (!form.first_name.trim()) formErrors.first_name = 'Le prénom est requis'
  if (!form.last_name.trim()) formErrors.last_name = 'Le nom est requis'
  if (!form.gender) formErrors.gender = 'Le genre est requis'
  if (!form.member_type) formErrors.member_type = 'Le type de membre est requis'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) formErrors.email = 'Email invalide'
  if (form.marital_status !== 'Marié' && form.spouse_name && !form.marital_status) {
    // pas d'erreur bloquante
  }
  return Object.keys(formErrors).length === 0
}

function buildFormPayload() {
  const fd = new FormData()
  const fields = [
    'first_name','last_name','gender','birth_date','birth_place','phone','email',
    'address','city','country','profession','marital_status','spouse_name',
    'conversion_date','baptism_date','membership_date','emergency_contact',
    'emergency_phone','member_type'
  ]
  fields.forEach(f => {
    const val = form[f]
    if (val !== null && val !== undefined && val !== '') {
      fd.append(f, val)
    }
  })
  if (form.family_id) fd.append('family_id', form.family_id)
  if (form.church_id) fd.append('church_id', form.church_id)
  fd.append('status', form.status ? '1' : '0')
  if (form.ministries?.length) {
    form.ministries.forEach((id, i) => fd.append(`ministries[${i}]`, id))
  }
  if (form.photo_file) fd.append('photo', form.photo_file)
  if (form.remove_photo) fd.append('remove_photo', '1')
  if (isEditing.value) fd.append('_method', 'PUT')
  return fd
}

async function submitForm() {
  formAlert.type = ''
  if (!validateForm()) {
    formAlert.type = 'danger'
    formAlert.message = 'Veuillez corriger les erreurs du formulaire'
    return
  }
  const payload = buildFormPayload()
  let result
  if (isEditing.value) {
    result = await mStore.update(form.id, payload)
  } else {
    result = await mStore.create(payload)
  }
  if (result.ok) {
    formAlert.type = 'success'
    formAlert.message = result.message || 'Opération réussie'
    await loadList()
    setTimeout(() => { closeModals(); resetForm() }, 500)
  } else {
    formAlert.type = 'danger'
    formAlert.message = result.message || 'Erreur lors de l\'enregistrement'
    if (result.errors) Object.assign(formErrors, result.errors)
  }
}

function askToggle(member) {
  confirmTarget.value = member
  confirmAction.value = member.status ? 'disable' : 'enable'
  confirmAlert.type = ''
  confirmAlert.message = ''
  showConfirmModal.value = true
}
function askDelete(member) {
  confirmTarget.value = member
  confirmAction.value = 'delete'
  confirmAlert.type = ''
  confirmAlert.message = ''
  showConfirmModal.value = true
}

async function confirmActionFn() {
  const m = confirmTarget.value
  if (!m) return
  if (confirmAction.value === 'delete') {
    const r = await mStore.remove(m.id)
    if (r.ok) {
      showConfirmModal.value = false
      confirmTarget.value = null
      await loadList()
    } else {
      confirmAlert.type = 'danger'
      confirmAlert.message = r.message || 'Erreur lors de la suppression'
    }
  } else if (confirmAction.value === 'disable' || confirmAction.value === 'enable') {
    const r = await mStore.toggleStatus(m.id)
    if (r.ok) {
      showConfirmModal.value = false
      confirmTarget.value = null
    } else {
      confirmAlert.type = 'danger'
      confirmAlert.message = r.message || 'Erreur lors du changement de statut'
    }
  }
}

function openAddFamily() {
  resetFamily()
  showFamilyModal.value = true
}

async function submitFamily() {
  familyAlert.type = ''
  if (!newFamily.family_name.trim()) {
    familyAlert.type = 'danger'
    familyAlert.message = 'Le nom de famille est requis'
    return
  }
  try {
    const fam = await mStore.createFamilyInline({
      family_name: newFamily.family_name.trim(),
      phone: newFamily.phone.trim() || undefined,
      address: newFamily.address.trim() || undefined,
    })
    if (fam) {
      form.family_id = String(fam.id)
      closeModals()
    } else {
      familyAlert.type = 'danger'
      familyAlert.message = 'Impossible de créer la famille'
    }
  } catch (e) {
    familyAlert.type = 'danger'
    familyAlert.message = e?.data?.message || e.message || 'Erreur'
  }
}

const pagesToShow = computed(() => {
  const current = mStore.pagination.current_page || 1
  const last = mStore.pagination.last_page || 1
  const pages = []
  const w = 2
  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= current - w && i <= current + w)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }
  return pages
})

watch(search, debouncedLoad)
watch(memberTypeFilter, loadList)
watch(genderFilter, loadList)
watch(perPage, loadList)
watch(currentPage, loadList)

onMounted(async () => {
  await mStore.loadReferentiels()
  await loadList()
})
</script>

<template>
  <div class="members-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">👥 Gestion des Membres</h1>
        <p class="page-subtitle">Créez, modifiez et organisez les membres de l'église</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        ➕ Nouveau membre
      </button>
    </div>

    <div class="sa-stats-grid">
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#eef2ff;color:#6366f1">👥</div>
        <div class="sa-stat-value">{{ mStore.pagination.total }}</div>
        <div class="sa-stat-label">Total membres</div>
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#ecfdf5;color:#10b981">🙋</div>
        <div class="sa-stat-value">
          {{ mStore.members.filter(m => m.gender === 'Homme').length + (mStore.loading ? '...' : '') }}
        </div>
        <div class="sa-stat-label">Hommes (page)</div>
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#fdf2f8;color:#ec4899">🙋‍♀️</div>
        <div class="sa-stat-value">
          {{ mStore.members.filter(m => m.gender === 'Femme').length + (mStore.loading ? '...' : '') }}
        </div>
        <div class="sa-stat-label">Femmes (page)</div>
      </div>
      <div class="sa-stat-card">
        <div class="sa-stat-icon" style="background:#fef3c7;color:#f59e0b">⚜️</div>
        <div class="sa-stat-value">{{ mStore.ministries.length }}</div>
        <div class="sa-stat-label">Ministères</div>
      </div>
    </div>

    <div class="sa-toolbar">
      <div class="search-input-wrap">
        <span>🔍</span>
        <input v-model="search" placeholder="Rechercher (prénom, nom, matricule, téléphone)" />
      </div>
      <select v-model="memberTypeFilter">
        <option value="">Tous types</option>
        <option v-for="t in mStore.statics.member_types" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="genderFilter">
        <option value="">Tous genres</option>
        <option v-for="g in mStore.statics.genders" :key="g" :value="g">{{ g }}</option>
      </select>
      <select v-model="perPage">
        <option :value="10">10 / page</option>
        <option :value="15">15 / page</option>
        <option :value="25">25 / page</option>
        <option :value="50">50 / page</option>
      </select>
    </div>

    <div class="sa-table-wrap">
      <table class="sa-table">
        <thead>
          <tr>
            <th>Membre</th>
            <th>Matricule</th>
            <th>Genre</th>
            <th>Type</th>
            <th>Famille</th>
            <th>Ministères</th>
            <th>Contact</th>
            <th>Statut</th>
            <th>Accès</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="mStore.loading">
            <td colspan="10" class="sa-empty">⏳ Chargement...</td>
          </tr>
          <tr v-else-if="!mStore.members.length">
            <td colspan="10" class="sa-empty">Aucun membre trouvé</td>
          </tr>
          <tr v-for="m in mStore.members" :key="m.id">
            <td data-label="Membre">
              <div class="sa-user-cell">
                <div class="sa-user-avatar" v-if="memberPhoto(m)" :style="{backgroundSize:'cover',backgroundImage:`url(${memberPhoto(m)})`}"></div>
                <div class="sa-user-avatar" v-else :style="{background: avatarColorFromId(m.id)}">{{ initials(m.first_name, m.last_name) }}</div>
                <div>
                  <div class="sa-user-name">{{ m.first_name }} {{ m.last_name }}</div>
                  <div class="sa-user-sub">
                    {{ m.profession || (m.city ? '📍 ' + m.city : '—') }}
                    <span v-if="m.church?.name" class="church-sub-tag">• ⛪ {{ m.church.name }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td data-label="Matricule"><code class="member-code">{{ m.member_code }}</code></td>
            <td data-label="Genre">
              <span :class="m.gender === 'Homme' ? 'role-badge admin' : 'role-badge staff'">
                {{ m.gender === 'Homme' ? '♂ Homme' : '♀ Femme' }}
              </span>
            </td>
            <td data-label="Type"><span :class="memberBadgeClass(m.member_type)">{{ m.member_type || 'Membre' }}</span></td>
            <td data-label="Famille">{{ m.family?.family_name || '—' }}</td>
            <td data-label="Ministères">
              <div class="ministry-chips">
                <span v-if="!m.ministries?.length" class="sa-subtle">—</span>
                <span v-for="min in (m.ministries || []).slice(0,3)" :key="min.id" class="ministry-chip">{{ min.name }}</span>
                <span v-if="(m.ministries || []).length > 3" class="sa-subtle">+{{ (m.ministries || []).length - 3 }}</span>
              </div>
            </td>
            <td data-label="Contact">
              <div class="sa-user-sub">📞 {{ m.phone || '—' }}</div>
              <div class="sa-user-sub" v-if="m.email">✉️ {{ m.email }}</div>
            </td>
            <td data-label="Statut">
              <span :class="m.status ? 'status-badge active' : 'status-badge inactive'">
                {{ m.status ? 'Actif' : 'Désactivé' }}
              </span>
            </td>
            <td data-label="Accès">
              <label class="toggle-switch">
                <input type="checkbox" :checked="!!m.status" @click.prevent="askToggle(m)" />
                <span class="slider"></span>
              </label>
            </td>
            <td data-label="Actions">
              <div class="row-actions">
                <button class="btn-icon edit" @click="openEdit(m)" title="Modifier">✏️</button>
                <button class="btn-icon delete" @click="askDelete(m)" title="Supprimer">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sa-pagination">
      <div class="sa-pagination-info">
        Affichage {{ mStore.pagination.from || 0 }}-{{ mStore.pagination.to || 0 }} sur {{ mStore.pagination.total || 0 }}
      </div>
      <div class="sa-pagination-btns">
        <button
          class="page-btn"
          :disabled="(mStore.pagination.current_page || 1) <= 1"
          @click="currentPage--"
        >Précédent</button>
        <template v-for="p, i in pagesToShow" :key="i">
          <span v-if="p === '...'" class="page-ellipsis">…</span>
          <button
            v-else
            class="page-btn"
            :class="{ active: (mStore.pagination.current_page || 1) === p }"
            @click="currentPage = p"
          >{{ p }}</button>
        </template>
        <button
          class="page-btn"
          :disabled="(mStore.pagination.current_page || 1) >= (mStore.pagination.last_page || 1)"
          @click="currentPage++"
        >Suivant</button>
      </div>
    </div>
  </div>

  <!-- Modal create/edit member -->
  <Teleport to="body">
    <div v-if="showCreateModal || showEditModal" class="modal-backdrop" @click.self="closeModals">
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h3>{{ isEditing ? '✏️ Modifier un membre' : '➕ Nouveau membre' }}</h3>
          <button class="modal-close" @click="closeModals">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="formAlert.message" :class="['form-alert', formAlert.type]">{{ formAlert.message }}</div>

          <div class="form-section-title">📷 Photo & identité</div>
          <div class="form-row" v-if="authStore.isAdmin || (authStore.churches && authStore.churches.length > 1)">
            <div class="form-group wide">
              <label>Église de rattachement</label>
              <select v-model="form.church_id">
                <option value="">— Église active par défaut —</option>
                <option v-for="c in authStore.churches" :key="c.id" :value="String(c.id)">{{ c.name }} ({{ c.code }})</option>
              </select>
            </div>
          </div>

          <div class="form-row row-3">
            <div class="form-group photo-group">
              <div class="photo-preview">
                <img v-if="form.photo_preview" :src="form.photo_preview" alt="preview" />
                <div v-else class="photo-placeholder">📷<br/><span>Aucune photo</span></div>
              </div>
              <div style="display:flex; gap:8px; justify-content:center; margin-top:8px;">
                <label class="btn-secondary" style="text-align:center;cursor:pointer;padding:6px 12px;font-size:12px;">
                  Choisir photo
                  <input type="file" accept="image/*" style="display:none" @change="onPhotoPick" />
                </label>
                <button v-if="form.photo_preview" type="button" class="btn-secondary" style="color:var(--danger);cursor:pointer;padding:6px 10px;font-size:12px;" @click="removePhoto" title="Supprimer la photo">
                  ✕
                </button>
              </div>
              <div class="sa-subtle">JPG/PNG, 2 Mo max</div>
            </div>

            <div class="form-group">
              <label>Prénom * <span v-if="formErrors.first_name" class="err">{{ formErrors.first_name }}</span></label>
              <input v-model="form.first_name" placeholder="Jean" :class="{err: formErrors.first_name}" />
            </div>
            <div class="form-group">
              <label>Nom * <span v-if="formErrors.last_name" class="err">{{ formErrors.last_name }}</span></label>
              <input v-model="form.last_name" placeholder="Dupont" :class="{err: formErrors.last_name}" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Genre * <span v-if="formErrors.gender" class="err">{{ formErrors.gender }}</span></label>
              <select v-model="form.gender" :class="{err: formErrors.gender}">
                <option v-for="g in mStore.statics.genders" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Type * <span v-if="formErrors.member_type" class="err">{{ formErrors.member_type }}</span></label>
              <select v-model="form.member_type" :class="{err: formErrors.member_type}">
                <option v-for="t in mStore.statics.member_types" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date naissance</label>
              <input type="date" v-model="form.birth_date" />
            </div>
            <div class="form-group">
              <label>Lieu naissance</label>
              <input v-model="form.birth_place" placeholder="Lomé" />
            </div>
          </div>

          <div class="form-section-title">📞 Contact & localisation</div>
          <div class="form-row">
            <div class="form-group">
              <label>Téléphone</label>
              <input v-model="form.phone" placeholder="+228 90 00 00 00" />
            </div>
            <div class="form-group">
              <label>Email <span v-if="formErrors.email" class="err">{{ formErrors.email }}</span></label>
              <input v-model="form.email" placeholder="jean@exemple.com" :class="{err: formErrors.email}" />
            </div>
            <div class="form-group">
              <label>Profession</label>
              <input v-model="form.profession" placeholder="Ingénieur" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group wide">
              <label>Adresse</label>
              <input v-model="form.address" placeholder="Rue principale" />
            </div>
            <div class="form-group">
              <label>Ville</label>
              <input v-model="form.city" placeholder="Lomé" />
            </div>
            <div class="form-group">
              <label>Pays</label>
              <input v-model="form.country" placeholder="Togo" />
            </div>
          </div>

          <div class="form-section-title">💍 Situation familiale</div>
          <div class="form-row">
            <div class="form-group">
              <label>Situation matrimoniale</label>
              <select v-model="form.marital_status">
                <option value="">— Non renseigné —</option>
                <option v-for="s in mStore.statics.marital_statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Nom du conjoint</label>
              <input v-model="form.spouse_name" :disabled="form.marital_status !== 'Marié'" placeholder="Si marié" />
            </div>
            <div class="form-group">
              <label>Famille</label>
              <div style="display:flex;gap:6px">
                <select v-model="form.family_id" style="flex:1">
                  <option value="">— Aucune —</option>
                  <option v-for="f in mStore.families" :key="f.id" :value="String(f.id)">
                    {{ f.family_name }} ({{ f.family_code }})
                  </option>
                </select>
                <button class="btn-secondary" @click="openAddFamily" title="Nouvelle famille">➕ Famille</button>
              </div>
            </div>
          </div>

          <div class="form-section-title">✝️ Parcours spirituel</div>
          <div class="form-row">
            <div class="form-group">
              <label>Date conversion</label>
              <input type="date" v-model="form.conversion_date" />
            </div>
            <div class="form-group">
              <label>Date baptême</label>
              <input type="date" v-model="form.baptism_date" />
            </div>
            <div class="form-group">
              <label>Date d'adhésion</label>
              <input type="date" v-model="form.membership_date" />
            </div>
          </div>

          <div class="form-section-title">🤲 Ministères</div>
          <div class="ministries-grid">
            <label v-for="min in mStore.ministries" :key="min.id" class="ministry-check">
              <input
                type="checkbox"
                :value="String(min.id)"
                v-model="form.ministries"
              />
              <span>{{ min.name }}</span>
            </label>
            <div v-if="!mStore.ministries.length" class="sa-subtle">Aucun ministère disponible — créez-en d'abord dans l'admin</div>
          </div>

          <div class="form-section-title">🚨 Contact d'urgence & statut</div>
          <div class="form-row">
            <div class="form-group">
              <label>Nom contact urgence</label>
              <input v-model="form.emergency_contact" placeholder="Nom" />
            </div>
            <div class="form-group">
              <label>Téléphone urgence</label>
              <input v-model="form.emergency_phone" placeholder="+228..." />
            </div>
            <div class="form-group">
              <label>Statut du compte</label>
              <div style="padding-top:10px">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="form.status" />
                  <span class="slider"></span>
                </label>
                <span style="margin-left:10px;font-size:13px;color:var(--text-muted)">{{ form.status ? 'Actif' : 'Désactivé' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModals">Annuler</button>
          <button class="btn-primary" :disabled="mStore.saving" @click="submitForm">
            <span v-if="mStore.saving">💾 Enregistrement...</span>
            <span v-else>{{ isEditing ? '💾 Enregistrer' : '✅ Créer le membre' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal create family (inline) -->
  <Teleport to="body">
    <div v-if="showFamilyModal" class="modal-backdrop" @click.self="closeModals">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>👪 Nouvelle famille</h3>
          <button class="modal-close" @click="closeModals">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="familyAlert.message" :class="['form-alert', familyAlert.type]">{{ familyAlert.message }}</div>
          <div class="form-group">
            <label>Nom de la famille *</label>
            <input v-model="newFamily.family_name" placeholder="Ex: Famille KOSSI" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Téléphone</label>
              <input v-model="newFamily.phone" />
            </div>
            <div class="form-group">
              <label>Adresse</label>
              <input v-model="newFamily.address" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModals">Annuler</button>
          <button class="btn-primary" @click="submitFamily">Créer & associer</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Confirm modal -->
  <Teleport to="body">
    <div v-if="showConfirmModal" class="modal-backdrop" @click.self="showConfirmModal=false">
      <div class="modal-dialog confirm-dialog">
        <div class="confirm-icon" :class="{
          danger: confirmAction==='delete',
          warning: confirmAction==='disable',
          success: confirmAction==='enable'
        }">
          <span v-if="confirmAction==='delete'">🗑️</span>
          <span v-else-if="confirmAction==='disable'">⏸️</span>
          <span v-else>▶️</span>
        </div>
        <h3 v-if="confirmAction==='delete'">Supprimer ce membre ?</h3>
        <h3 v-else-if="confirmAction==='disable'">Désactiver {{ confirmTarget?.first_name }} ?</h3>
        <h3 v-else>Réactiver {{ confirmTarget?.first_name }} ?</h3>
        <div v-if="confirmAlert.message" :class="['form-alert', confirmAlert.type]" style="margin-top: 10px;">{{ confirmAlert.message }}</div>
        <p class="confirm-text">
          <template v-if="confirmAction==='delete'">Cette action est irréversible. Le membre sera supprimé (suppression logique).</template>
          <template v-else-if="confirmAction==='disable'">Ce membre ne pourra plus se connecter si c'est un utilisateur.</template>
          <template v-else>Le compte redeviendra actif immédiatement.</template>
        </p>
        <div class="modal-footer justify-center">
          <button class="btn-secondary" @click="showConfirmModal=false">Annuler</button>
          <button
            :class="confirmAction==='delete' ? 'btn-danger' : 'btn-primary'"
            :disabled="mStore.deleting || mStore.saving"
            @click="confirmActionFn"
          >
            {{ confirmAction==='delete' ? 'Supprimer' : (confirmAction==='disable' ? 'Désactiver' : 'Réactiver') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.members-page { padding: 0 0 20px; }

.page-header {
  display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; gap: 16px; flex-wrap: wrap;
}
.page-title { margin: 0 0 4px; font-size: 24px; font-weight: 700; color: var(--text-primary); }
.page-subtitle { margin: 0; color: var(--text-muted); font-size: 14px; }

.btn-primary {
  background: linear-gradient(135deg, var(--primary), #4f46e5); color: #fff;
  border: none; padding: 10px 18px; border-radius: 10px; font-weight: 600;
  cursor: pointer; box-shadow: 0 4px 14px rgba(99,102,241,.25); transition: transform .15s;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-secondary {
  background: #fff; color: var(--text-primary); border: 1px solid var(--border);
  padding: 10px 16px; border-radius: 10px; cursor: pointer; font-weight: 500;
  transition: all .15s;
}
.btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
.btn-danger {
  background: linear-gradient(135deg, var(--danger), #dc2626); color: #fff;
  border: none; padding: 10px 18px; border-radius: 10px; cursor: pointer; font-weight: 600;
}

.sa-stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;
}
@media (max-width: 1024px) { .sa-stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .sa-stats-grid { grid-template-columns: 1fr; } }
.sa-stat-card {
  background: #fff; border-radius: 14px; padding: 18px; box-shadow: var(--card-shadow);
  border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 6px;
}
.sa-stat-icon {
  width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; margin-bottom: 6px;
}
.sa-stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.sa-stat-label { color: var(--text-muted); font-size: 13px; }

.sa-toolbar {
  display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; align-items: center;
  background: #fff; padding: 14px; border-radius: 12px; border: 1px solid var(--border-light);
}
.search-input-wrap {
  flex: 1 1 320px; position: relative; display: flex; align-items: center;
  background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px;
}
.search-input-wrap span { color: var(--text-muted); margin-right: 8px; }
.search-input-wrap input {
  flex: 1; padding: 10px 0; border: none; background: transparent; outline: none; font-size: 14px;
}
.sa-toolbar select {
  padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: #fff; font-size: 14px; cursor: pointer;
}

.sa-table-wrap {
  background: #fff; border-radius: 14px; border: 1px solid var(--border-light);
  box-shadow: var(--card-shadow); overflow-x: auto;
}
.sa-table { width: 100%; border-collapse: collapse; }
.sa-table thead th {
  text-align: left; padding: 14px 16px; font-size: 12px; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text-muted); background: #f8fafc; border-bottom: 1px solid var(--border);
  font-weight: 600;
}
.sa-table tbody td {
  padding: 14px 16px; border-bottom: 1px solid var(--border-light); vertical-align: middle; font-size: 14px;
}
.sa-table tbody tr:last-child td { border-bottom: none; }
.sa-table tbody tr:hover { background: #fafbff; }
.sa-empty { text-align: center; padding: 40px 20px !important; color: var(--text-muted); }

.sa-user-cell { display: flex; align-items: center; gap: 12px; }
.sa-user-avatar {
  width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 600; font-size: 15px; flex-shrink: 0; background-repeat: no-repeat; background-position: center;
}
.sa-user-name { font-weight: 600; color: var(--text-primary); }
.sa-user-sub { color: var(--text-muted); font-size: 12px; }
.sa-subtle { color: var(--text-muted); font-size: 13px; }

.member-code {
  background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; color: var(--text-primary);
}

.role-badge {
  display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
}
.role-badge.super { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; }
.role-badge.admin { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #3730a3; }
.role-badge.staff { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1e40af; }
.role-badge.default { background: linear-gradient(135deg, #e2e8f0, #cbd5e1); color: #334155; }

.status-badge {
  display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
}
.status-badge.active { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46; }
.status-badge.inactive { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #4b5563; }

.ministry-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.ministry-chip {
  display: inline-block; padding: 3px 10px; background: #f5f3ff; color: #5b21b6; border-radius: 12px;
  font-size: 11px; font-weight: 500;
}

.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; cursor: pointer; inset: 0; background-color: #cbd5e1; transition: .2s; border-radius: 24px;
}
.slider:before {
  position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
  background-color: #fff; transition: .2s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.toggle-switch input:checked + .slider { background-color: var(--success); }
.toggle-switch input:checked + .slider:before { transform: translateX(20px); }

.row-actions { display: flex; gap: 8px; }
.btn-icon {
  width: 34px; height: 34px; border-radius: 8px; border: none; cursor: pointer; font-size: 15px; transition: all .15s;
}
.btn-icon.edit { background: #eff6ff; color: #1d4ed8; }
.btn-icon.edit:hover { background: #dbeafe; }
.btn-icon.delete { background: #fef2f2; color: #b91c1c; }
.btn-icon.delete:hover { background: #fee2e2; }

.sa-pagination {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 4px; gap: 12px; flex-wrap: wrap;
}
.sa-pagination-info { color: var(--text-muted); font-size: 14px; }
.sa-pagination-btns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.page-btn {
  padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border); background: #fff;
  cursor: pointer; font-size: 13px; color: var(--text-primary); min-width: 36px;
}
.page-btn:hover:not(:disabled):not(.active) { border-color: var(--primary); color: var(--primary); }
.page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
.page-ellipsis { padding: 0 4px; color: var(--text-muted); }

@media (max-width: 1024px) {
  .sa-table thead { display: none; }
  .sa-table tbody tr { display: block; border-bottom: 1px solid var(--border-light); padding: 4px 0; }
  .sa-table tbody td {
    display: flex; justify-content: space-between; align-items: center; text-align: right;
    padding: 10px 16px; border: none; gap: 12px;
  }
  .sa-table tbody td::before {
    content: attr(data-label); font-weight: 600; color: var(--text-muted); font-size: 12px;
    text-transform: uppercase; letter-spacing: .5px; text-align: left; flex: 1;
  }
  .sa-table tbody td:first-child::before { content: ''; flex: 0; }
  .sa-user-cell { justify-content: flex-end; }
}

/* Modals */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(15,23,42,.55); display: flex;
  align-items: center; justify-content: center; z-index: 9999; padding: 20px;
  animation: fadeIn .2s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: none; opacity: 1 } }
.modal-dialog {
  background: #fff; border-radius: 16px; width: 100%; max-width: 520px;
  box-shadow: 0 20px 60px rgba(15,23,42,.3);
  animation: slideUp .25s ease; max-height: 92vh; display: flex; flex-direction: column;
}
.modal-dialog.modal-lg { max-width: 960px; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 24px; border-bottom: 1px solid var(--border-light);
}
.modal-header h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
.modal-close {
  background: transparent; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted);
  width: 34px; height: 34px; border-radius: 8px;
}
.modal-close:hover { background: #f1f5f9; color: var(--danger); }
.modal-body { padding: 24px; overflow-y: auto; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}
.modal-footer.justify-center { justify-content: center; }

.form-section-title {
  font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px;
  color: var(--primary); margin: 0 0 12px; padding-bottom: 8px;
  border-bottom: 1px dashed var(--border-light);
}
.form-section-title:not(:first-child) { margin-top: 20px; }

.form-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 14px;
}
.form-row.row-3 { grid-template-columns: 1.2fr 1fr 1fr; }
@media (max-width: 1024px) { .form-row, .form-row.row-3 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .form-row, .form-row.row-3 { grid-template-columns: 1fr; } }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.wide { grid-column: span 1; }
.form-group label {
  font-size: 12px; font-weight: 600; color: var(--text-secondary);
}
.form-group label .err { color: var(--danger); font-weight: 500; margin-left: 6px; font-size: 11px; }
.form-group input, .form-group select {
  padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 13px; outline: none; background: #fff; color: var(--text-primary);
  transition: border-color .15s, box-shadow .15s;
}
.form-group input:focus, .form-group select:focus {
  border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.12);
}
.form-group input.err, .form-group select.err { border-color: var(--danger); }
.form-group input:disabled { background: #f8fafc; color: var(--text-muted); }

.photo-group { align-items: center; text-align: center; }
.photo-preview {
  width: 150px; height: 150px; border-radius: 14px; border: 2px dashed var(--border);
  background: #f8fafc; display: flex; align-items: center; justify-content: center;
  overflow: hidden; margin: 0 auto;
}
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: var(--text-muted); font-size: 32px;
}
.photo-placeholder span { font-size: 12px; font-weight: 500; }

.ministries-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;
  margin-bottom: 12px;
}
.ministry-check {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 13px;
  transition: all .15s;
}
.ministry-check:hover { border-color: var(--primary); background: #f5f3ff; }
.ministry-check input { accent-color: var(--primary); }

.form-alert {
  padding: 12px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; font-weight: 500;
}
.form-alert.success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.form-alert.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.err { color: var(--danger); }

.confirm-dialog { text-align: center; max-width: 440px; }
.confirm-icon {
  width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  margin: 10px auto 16px; font-size: 30px;
}
.confirm-icon.danger { background: #fee2e2; }
.confirm-icon.warning { background: #fef3c7; }
.confirm-icon.success { background: #d1fae5; }
.confirm-dialog h3 { margin: 0 0 8px; color: var(--text-primary); font-size: 17px; }
.confirm-text { color: var(--text-muted); font-size: 14px; margin: 0 0 16px; }

.church-sub-tag {
  display: inline-block;
  font-weight: 500;
  color: #4f46e5;
  margin-left: 4px;
}
</style>
