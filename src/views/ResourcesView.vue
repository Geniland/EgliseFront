<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useResourceStore } from '@/stores/resource'
import { useAuthStore } from '@/stores/auth'
import { downloadResourceFile, getFormation } from '@/api/resources'

const store = useResourceStore()
const authStore = useAuthStore()

// Navigation & Tabs
const activeTab = ref('faithful') // 'faithful' | 'resources' | 'formations' | 'categories'
const faithfulFilter = ref('all') // 'all' | 'pdf' | 'video' | 'audio' | 'formation'
const searchQuery = ref('')

// Computed User Info & Roles
const currentUser = computed(() => authStore.user)
const isChurchAdmin = computed(() => {
  const roleId = Number(currentUser.value?.role_id)
  return roleId === 1 || roleId === 2
})
const isResponsableOrAdmin = computed(() => {
  const roleId = Number(currentUser.value?.role_id)
  return roleId === 1 || roleId === 2 || roleId === 5
})

// State
const categories = computed(() => store.categories || [])
const resources = computed(() => store.resources || [])
const formations = computed(() => store.formations || [])

// Modals
const showCatModal = ref(false)
const showResModal = ref(false)
const showFormModal = ref(false)
const showPurchaseModal = ref(false)
const showMediaViewer = ref(false)
const showFormationViewer = ref(false)
const currentMedia = ref(null)
const currentFormation = ref(null)
const activeModuleIdx = ref(0)
const activeContentIdx = ref(0)
const targetItem = ref(null)

// Forms
const catForm = reactive({ id: null, name: '', description: '', type: 'resource' })
const resForm = reactive({ id: null, title: '', description: '', type: 'pdf', is_free: true, price: 0, status: 'published', category_id: '' })
const formForm = reactive({ 
  id: null, 
  title: '', 
  description: '', 
  is_free: true, 
  price: 0, 
  status: 'published', 
  category_id: '',
  modules: [],
  contents: []
})
const newModuleInput = ref('')

// File uploads
const resFile = ref(null)
const resCover = ref(null)
const formCover = ref(null)
const coverPreview = ref(null)

// Alerts / Feedback
const alertMsg = reactive({ type: '', text: '' })
const isSubmitting = ref(false)

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    await Promise.all([
      store.fetchCategories(),
      store.fetchResources(),
      store.fetchFormations()
    ])
  } catch (e) {
    console.error('Erreur chargement données', e)
  }
}

const showAlert = (type, text) => {
  alertMsg.type = type
  alertMsg.text = text
  setTimeout(() => { alertMsg.text = '' }, 4000)
}

// ==========================================
// CATEGORIES (RUBRIQUES)
// ==========================================
const openCatModal = (c = null) => {
  if (c) {
    catForm.id = c.id
    catForm.name = c.name
    catForm.description = c.description
    catForm.type = c.type
  } else {
    catForm.id = null
    catForm.name = ''
    catForm.description = ''
    catForm.type = 'resource'
  }
  showCatModal.value = true
}

const saveCategory = async () => {
  if (!catForm.name.trim()) {
    showAlert('error', 'Le nom de la rubrique est obligatoire')
    return
  }
  isSubmitting.value = true
  try {
    if (catForm.id) {
      await store.updateCategory(catForm.id, catForm)
      showAlert('success', 'Rubrique modifiée avec succès')
    } else {
      await store.createCategory(catForm)
      showAlert('success', 'Nouvelle rubrique créée avec succès')
    }
    showCatModal.value = false
    await store.fetchCategories()
  } catch (err) {
    showAlert('error', err?.data?.message || 'Erreur lors de la sauvegarde de la rubrique')
  } finally {
    isSubmitting.value = false
  }
}

// ==========================================
// RESSOURCES
// ==========================================
const openResModal = (r = null) => {
  resFile.value = null
  resCover.value = null
  coverPreview.value = null
  if (r) {
    resForm.id = r.id
    resForm.title = r.title
    resForm.description = r.description || ''
    resForm.type = r.type
    resForm.is_free = Boolean(r.is_free)
    resForm.price = r.price || 0
    resForm.status = r.status || 'published'
    resForm.category_id = r.category_id || ''
  } else {
    resForm.id = null
    resForm.title = ''
    resForm.description = ''
    resForm.type = 'pdf'
    resForm.is_free = true
    resForm.price = 0
    resForm.status = 'published'
    resForm.category_id = ''
  }
  showResModal.value = true
}

const saveResource = async () => {
  if (!resForm.title.trim()) {
    showAlert('error', 'Le titre de la ressource est requis')
    return
  }
  isSubmitting.value = true
  const fd = new FormData()
  fd.append('title', resForm.title.trim())
  fd.append('description', resForm.description ? resForm.description.trim() : '')
  fd.append('type', resForm.type)
  fd.append('is_free', resForm.is_free ? 1 : 0)
  fd.append('price', resForm.is_free ? 0 : (resForm.price || 0))
  fd.append('status', resForm.status)
  
  if (resForm.category_id) {
    fd.append('category_id', resForm.category_id)
  }
  if (resFile.value) {
    fd.append('file', resFile.value)
  }
  if (resCover.value) {
    fd.append('cover_image', resCover.value)
  }

  try {
    if (resForm.id) {
      await store.updateResource(resForm.id, fd)
      showAlert('success', 'Ressource mise à jour avec succès')
    } else {
      await store.createResource(fd)
      showAlert('success', 'Nouvelle ressource créée avec succès')
    }
    showResModal.value = false
    await store.fetchResources()
  } catch (err) {
    showAlert('error', err?.data?.message || 'Erreur lors de l\'enregistrement de la ressource')
  } finally {
    isSubmitting.value = false
  }
}

// ==========================================
// FORMATIONS (REVUE & CREATION)
// ==========================================
const openFormModal = async (f = null) => {
  formCover.value = null
  coverPreview.value = null
  newModuleInput.value = ''
  if (f) {
    let fullFormation = f
    try {
      const { data } = await getFormation(f.id)
      if (data) fullFormation = data
    } catch (e) {
      console.warn('Utilisation données en cache pour la formation', e)
    }

    formForm.id = fullFormation.id
    formForm.title = fullFormation.title
    formForm.description = fullFormation.description || ''
    formForm.is_free = Boolean(fullFormation.is_free)
    formForm.price = fullFormation.price || 0
    formForm.status = fullFormation.status || 'published'
    formForm.category_id = fullFormation.category_id || ''
    formForm.modules = fullFormation.modules ? fullFormation.modules.map(m => m.title) : []
    formForm.contents = []

    if (fullFormation.modules && fullFormation.modules.length) {
      fullFormation.modules.forEach((m, mIdx) => {
        if (m.contents && m.contents.length) {
          m.contents.forEach(c => {
            const isUrl = c.content_data && (c.content_data.startsWith('http://') || c.content_data.startsWith('https://'))
            formForm.contents.push({
              id: c.id,
              title: c.title,
              type: c.type || 'document',
              source_type: isUrl ? 'url' : 'file',
              external_url: isUrl ? c.content_data : '',
              file: null,
              file_name: isUrl ? '' : (c.content_data ? c.content_data.split('/').pop() : ''),
              file_url: c.file_url || null,
              module_index: mIdx,
              is_preview: Boolean(c.is_preview),
              duration: c.duration || ''
            })
          })
        }
      })
    }
  } else {
    formForm.id = null
    formForm.title = ''
    formForm.description = ''
    formForm.is_free = true
    formForm.price = 0
    formForm.status = 'published'
    formForm.category_id = ''
    formForm.modules = ['Module 1 : Introduction']
    formForm.contents = []
  }
  showFormModal.value = true
}

const addModuleToForm = () => {
  if (newModuleInput.value.trim()) {
    formForm.modules.push(newModuleInput.value.trim())
    newModuleInput.value = ''
  }
}

const removeModuleFromForm = (idx) => {
  formForm.modules.splice(idx, 1)
  // Réajuster les module_index des contenus rattachés
  formForm.contents.forEach(c => {
    if (c.module_index === idx) {
      c.module_index = 0
    } else if (c.module_index > idx) {
      c.module_index -= 1
    }
  })
}

// Gestion des contenus/fichiers/médias dans le formulaire de formation
const addContentToForm = () => {
  formForm.contents.push({
    id: null,
    title: '',
    type: 'video',
    source_type: 'file',
    external_url: '',
    file: null,
    file_name: '',
    file_url: null,
    module_index: 0,
    is_preview: false,
    duration: ''
  })
}

const removeContentFromForm = (idx) => {
  formForm.contents.splice(idx, 1)
}

const handleContentFile = (e, idx) => {
  if (e.target.files.length) {
    const file = e.target.files[0]
    formForm.contents[idx].file = file
    formForm.contents[idx].file_name = file.name
  }
}

const saveFormation = async () => {
  if (!formForm.title.trim()) {
    showAlert('error', 'Le titre de la formation est obligatoire')
    return
  }
  isSubmitting.value = true
  const fd = new FormData()
  fd.append('title', formForm.title.trim())
  fd.append('description', formForm.description ? formForm.description.trim() : '')
  fd.append('is_free', formForm.is_free ? 1 : 0)
  fd.append('price', formForm.is_free ? 0 : (formForm.price || 0))
  fd.append('status', formForm.status)
  
  if (formForm.category_id) {
    fd.append('category_id', formForm.category_id)
  }
  if (formCover.value) {
    fd.append('cover_image', formCover.value)
  }

  // Modules
  if (formForm.modules.length > 0) {
    const modulesData = formForm.modules.map(title => ({ title }))
    fd.append('modules', JSON.stringify(modulesData))
  }

  // Contenus / Médias (fichiers, vidéos, audios, documents)
  if (formForm.contents.length > 0) {
    const contentsMeta = formForm.contents.map((c, idx) => ({
      id: c.id || null,
      title: (c.title || `Contenu ${idx + 1}`).trim(),
      type: c.type,
      module_index: c.module_index || 0,
      is_preview: Boolean(c.is_preview),
      duration: c.duration || '',
      external_url: c.source_type === 'url' ? (c.external_url || '') : ''
    }))
    fd.append('contents_meta', JSON.stringify(contentsMeta))

    formForm.contents.forEach((c, idx) => {
      if (c.file) {
        fd.append(`content_file_${idx}`, c.file)
      }
    })
  }

  try {
    if (formForm.id) {
      await store.updateFormation(formForm.id, fd)
      showAlert('success', 'Formation mise à jour avec succès')
    } else {
      await store.createFormation(fd)
      showAlert('success', 'Nouvelle formation créée avec succès')
    }
    showFormModal.value = false
    await store.fetchFormations()
  } catch (err) {
    showAlert('error', err?.data?.message || 'Erreur lors de l\'enregistrement de la formation')
  } finally {
    isSubmitting.value = false
  }
}

// Helper pour compter les supports médias d'une formation
const getFormationContentsCount = (f) => {
  if (!f?.modules) return 0
  return f.modules.reduce((acc, m) => acc + (m.contents ? m.contents.length : 0), 0)
}

// Lecteur / Visualiseur de Formation (LMS Player)
const openFormationViewer = async (f) => {
  currentFormation.value = f
  activeModuleIdx.value = 0
  activeContentIdx.value = 0
  showFormationViewer.value = true

  // Récupérer la version complète avec tous les modules et contents
  try {
    const { data } = await getFormation(f.id)
    if (data) {
      currentFormation.value = data
      // Sélectionner automatiquement le premier cours contenant du contenu
      if (data.modules && data.modules.length) {
        const firstWithContent = data.modules.findIndex(m => m.contents && m.contents.length > 0)
        if (firstWithContent !== -1) {
          activeModuleIdx.value = firstWithContent
          activeContentIdx.value = 0
        }
      }
    }
  } catch (e) {
    console.error('Erreur chargement formation', e)
  }
}

const selectLesson = (mIdx, cIdx) => {
  activeModuleIdx.value = mIdx
  activeContentIdx.value = cIdx
}

const activeLesson = computed(() => {
  if (!currentFormation.value?.modules || !currentFormation.value.modules.length) return null
  const mod = currentFormation.value.modules[activeModuleIdx.value] || currentFormation.value.modules[0]
  if (!mod?.contents || !mod.contents.length) return null
  return mod.contents[activeContentIdx.value] || mod.contents[0] || null
})

const getEmbedUrl = (url) => {
  if (!url) return null
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0`
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }
  return url
}

// Upload preview helper
const handleFileUpload = (e, target) => {
  if (e.target.files.length) {
    const file = e.target.files[0]
    if (target === 'resFile') resFile.value = file
    if (target === 'resCover') {
      resCover.value = file
      coverPreview.value = URL.createObjectURL(file)
    }
    if (target === 'formCover') {
      formCover.value = file
      coverPreview.value = URL.createObjectURL(file)
    }
  }
}

// ==========================================
// TÉLÉCHARGEMENT & CONSULTATION DOCUMENT / VIDÉO
// ==========================================
const openMediaViewer = (item) => {
  if (!item.can_access) {
    openPurchaseModal(item)
    return
  }
  if (!item.file_url) {
    showAlert('error', 'Le fichier média n\'a pas encore été téléversé pour cette ressource.')
    return
  }
  currentMedia.value = item
  showMediaViewer.value = true
}

const handleDownload = async (item) => {
  if (!item.can_access) {
    openPurchaseModal(item)
    return
  }
  try {
    const ext = item.type === 'video' ? 'mp4' : (item.type === 'audio' ? 'mp3' : 'pdf')
    const cleanName = (item.title || 'document').replace(/[^a-zA-Z0-9_\-]/g, '_')
    const filename = `${cleanName}.${ext}`
    showAlert('info', 'Préparation du téléchargement...')
    if (typeof store.downloadResource === 'function') {
      await store.downloadResource(item.id, filename)
    } else {
      await downloadResourceFile(item.id, filename)
    }
    showAlert('success', 'Téléchargement réussi')
  } catch (err) {
    showAlert('error', err.message || 'Accès restreint au document.')
  }
}

const openPurchaseModal = (item) => {
  targetItem.value = item
  showPurchaseModal.value = true
}

const handleEnrollFreeFormation = async (f) => {
  try {
    await store.enrollFormation(f.id)
    showAlert('success', 'Félicitations, vous êtes inscrit à cette formation !')
    await store.fetchFormations()
  } catch (err) {
    showAlert('error', err?.data?.message || 'Erreur lors de l\'inscription.')
  }
}

// ==========================================
// CATALOGUE FIDÈLE COMPUTED ITEMS
// ==========================================
const faithfulItems = computed(() => {
  const list = []
  
  // Resources
  resources.value.forEach(r => {
    list.push({
      ...r,
      item_type: 'resource',
      badge_type: r.type.toUpperCase(),
      category_name: r.category?.name || 'Ressource générale'
    })
  })

  // Formations
  formations.value.forEach(f => {
    list.push({
      ...f,
      item_type: 'formation',
      badge_type: 'FORMATION',
      category_name: f.category?.name || 'Formation biblique'
    })
  })

  return list.filter(item => {
    // Search
    const q = searchQuery.value.toLowerCase()
    const matchesSearch = !q || 
      item.title.toLowerCase().includes(q) || 
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.category_name.toLowerCase().includes(q)

    // Type filter
    let matchesType = true
    if (faithfulFilter.value === 'formation') matchesType = item.item_type === 'formation'
    else if (faithfulFilter.value === 'pdf') matchesType = item.type === 'pdf'
    else if (faithfulFilter.value === 'video') matchesType = item.type === 'video'
    else if (faithfulFilter.value === 'audio') matchesType = item.type === 'audio'

    return matchesSearch && matchesType
  })
})

const getItemCover = (item) => {
  if (item.cover_url) return item.cover_url
  if (item.cover_image) return 'http://localhost:8000/storage/' + item.cover_image
  return null
}
</script>

<template>
  <div class="resources-wrapper">
    <!-- Feedback Alert Toast -->
    <div v-if="alertMsg.text" :class="['alert-toast', 'alert-' + alertMsg.type]">
      {{ alertMsg.text }}
    </div>

    <!-- Header -->
    <div class="sa-header">
      <div class="sa-title">
        <h1>📚 Ressources & Formations</h1>
        <p>Bibliothèque chrétienne, documents pastoraux, e-Learning et supports d'édification</p>
      </div>
      <div class="sa-actions" v-if="isResponsableOrAdmin">
        <button class="sa-btn glass-btn" @click="openResModal()">+ Ressource</button>
        <button class="sa-btn glass-btn-alt" @click="openFormModal()">+ Formation</button>
        <button class="sa-btn btn-outline" @click="openCatModal()">+ Rubrique</button>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="sa-tabs-bar">
      <div class="sa-tabs">
        <button 
          :class="['sa-tab', { active: activeTab === 'faithful' }]" 
          @click="activeTab = 'faithful'"
        >
          🌟 Catalogue Fidèles (Aperçu)
        </button>
        <button 
          :class="['sa-tab', { active: activeTab === 'resources' }]" 
          @click="activeTab = 'resources'"
        >
          📖 Ressources ({{ resources.length }})
        </button>
        <button 
          :class="['sa-tab', { active: activeTab === 'formations' }]" 
          @click="activeTab = 'formations'"
        >
          🎓 Formations ({{ formations.length }})
        </button>
        <button 
          :class="['sa-tab', { active: activeTab === 'categories' }]" 
          @click="activeTab = 'categories'"
        >
          📁 Rubriques ({{ categories.length }})
        </button>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 1: CATALOGUE FIDÈLES (AVEC RESTRICTIONS ET BYPASS ADMINISTRATEUR)    -->
    <!-- ========================================================================= -->
    <div v-if="activeTab === 'faithful'" class="faithful-container">
      
      <!-- Role info banner -->
      <div class="role-banner" v-if="isResponsableOrAdmin">
        <span class="role-icon">👑</span>
        <div>
          <strong>Mode Responsable / Administrateur Activé :</strong> Vous avez un accès débloqué et illimité à l'ensemble des documents et formations de votre église, qu'ils soient payants ou gratuits.
        </div>
      </div>
      <div class="role-banner banner-faithful" v-else>
        <span class="role-icon">👤</span>
        <div>
          <strong>Espace Fidèles :</strong> Les ressources gratuites sont accessibles immédiatement. Les documents et formations avec cadenas nécessitent un accès ou une acquisition.
        </div>
      </div>

      <!-- Filter Chips & Search -->
      <div class="catalog-filters">
        <div class="filter-chips">
          <button :class="['chip-btn', { active: faithfulFilter === 'all' }]" @click="faithfulFilter = 'all'">Tous</button>
          <button :class="['chip-btn', { active: faithfulFilter === 'formation' }]" @click="faithfulFilter = 'formation'">🎓 Formations</button>
          <button :class="['chip-btn', { active: faithfulFilter === 'pdf' }]" @click="faithfulFilter = 'pdf'">📄 Livres & PDF</button>
          <button :class="['chip-btn', { active: faithfulFilter === 'video' }]" @click="faithfulFilter = 'video'">🎬 Vidéos</button>
          <button :class="['chip-btn', { active: faithfulFilter === 'audio' }]" @click="faithfulFilter = 'audio'">🎧 Audios</button>
        </div>
        <div class="catalog-search">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Rechercher un document ou cours..." 
            class="catalog-search-input"
          />
        </div>
      </div>

      <!-- Faithful Catalog Grid -->
      <div v-if="faithfulItems.length === 0" class="empty-catalog">
        <div class="empty-icon">📖</div>
        <h3>Aucun contenu trouvé</h3>
        <p>Aucun document ou formation ne correspond à vos critères de recherche.</p>
      </div>

      <div v-else class="catalog-grid">
        <div v-for="item in faithfulItems" :key="item.item_type + '-' + item.id" class="media-card">
          
          <!-- Image & Format Badge -->
          <div class="card-media-header">
            <img v-if="getItemCover(item)" :src="getItemCover(item)" class="media-img" />
            <div v-else class="media-placeholder">
              <span>{{ item.item_type === 'formation' ? '🎓' : (item.type === 'pdf' ? '📄' : (item.type === 'video' ? '🎬' : '🎧')) }}</span>
            </div>
            
            <div class="format-pill">{{ item.badge_type }}</div>
            
            <!-- Price Pill -->
            <div class="price-pill" :class="item.is_free ? 'pill-free' : 'pill-paid'">
              {{ item.is_free ? 'Gratuit' : item.price + ' FCFA' }}
            </div>
          </div>

          <!-- Content Body -->
          <div class="media-card-body">
            <span class="category-tag">{{ item.category_name }}</span>
            <h3 class="item-title">{{ item.title }}</h3>
            <p class="item-desc">{{ item.description || 'Support d\'apprentissage et d\'édification spirituelle.' }}</p>

            <div v-if="item.item_type === 'formation'" class="formation-meta">
              <span>📚 {{ item.modules?.length || item.modules_count || 0 }} module(s)</span>
              <span v-if="getFormationContentsCount(item) > 0" class="contents-count-pill">
                • 🎬 {{ getFormationContentsCount(item) }} support(s) média
              </span>
            </div>
          </div>

          <!-- Card Footer & Restrictions -->
          <div class="media-card-footer">
            
            <!-- CAS 1: RESPONSABLE, ADMINISTRATEUR DE L'ÉGLISE OU SUPER ADMIN (BYPASS TOTAL) -->
            <div v-if="isResponsableOrAdmin" class="admin-access-block">
              <div class="admin-badge">
                <span>👑 Accès Gestionnaire Débloqué</span>
              </div>
              <div class="card-btn-group">
                <button 
                  v-if="item.item_type === 'resource'" 
                  class="btn-action-primary flex-1" 
                  @click="openMediaViewer(item)"
                >
                  {{ item.type === 'video' ? '▶️ Regarder la vidéo' : (item.type === 'audio' ? '🎧 Écouter' : '📖 Consulter') }}
                </button>
                <button 
                  v-if="item.item_type === 'resource'" 
                  class="btn-action-icon" 
                  @click="handleDownload(item)"
                  title="Télécharger"
                >
                  📥
                </button>
                <button 
                  v-else 
                  class="btn-action-primary flex-1" 
                  @click="openFormationViewer(item)"
                >
                  🎓 Voir le cours
                </button>
              </div>
            </div>

            <!-- CAS 2: FIDÈLE OU UTILISATEUR STANDARD -->
            <div v-else class="user-access-block">
              <!-- Si gratuit -->
              <template v-if="item.is_free">
                <div class="card-btn-group">
                  <button 
                    v-if="item.item_type === 'resource'" 
                    class="btn-action-free flex-1" 
                    @click="openMediaViewer(item)"
                  >
                    {{ item.type === 'video' ? '▶️ Regarder la vidéo' : (item.type === 'audio' ? '🎧 Écouter' : '📖 Consulter') }}
                  </button>
                  <button 
                    v-if="item.item_type === 'resource'" 
                    class="btn-action-icon" 
                    @click="handleDownload(item)"
                    title="Télécharger"
                  >
                    📥
                  </button>
                  <template v-else>
                    <button 
                      v-if="item.is_enrolled" 
                      class="btn-action-primary flex-1" 
                      @click="openFormationViewer(item)"
                    >
                      🎓 Accéder au cours
                    </button>
                    <button 
                      v-else 
                      class="btn-action-free flex-1" 
                      @click="handleEnrollFreeFormation(item)"
                    >
                      🎓 S'inscrire gratuitement
                    </button>
                  </template>
                </div>
              </template>

              <!-- Si payant -->
              <template v-else>
                <!-- Déjà acquis -->
                <div v-if="item.can_access" class="purchased-block">
                  <span class="badge-purchased">✅ Déjà acquis</span>
                  <div class="card-btn-group">
                    <button 
                      v-if="item.item_type === 'resource'" 
                      class="btn-action-primary flex-1" 
                      @click="openMediaViewer(item)"
                    >
                      {{ item.type === 'video' ? '▶️ Regarder la vidéo' : (item.type === 'audio' ? '🎧 Écouter' : '📖 Consulter') }}
                    </button>
                    <button 
                      v-if="item.item_type === 'resource'" 
                      class="btn-action-icon" 
                      @click="handleDownload(item)"
                      title="Télécharger"
                    >
                      📥
                    </button>
                    <button 
                      v-else 
                      class="btn-action-primary flex-1" 
                      @click="openFormationViewer(item)"
                    >
                      🎓 Continuer le cours
                    </button>
                  </div>
                </div>

                <!-- Non acquis : ACCÈS VERROUILLÉ -->
                <div v-else class="locked-block">
                  <div class="lock-notice">
                    <span>🔒 Document payant - Accès réservé</span>
                  </div>
                  <button 
                    class="btn-action-buy" 
                    @click="openPurchaseModal(item)"
                  >
                    💳 Débloquer ({{ item.price }} FCFA)
                  </button>
                </div>
              </template>
            </div>

          </div>

        </div>
      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- TAB 2: GESTION DES RESSOURCES                                             -->
    <!-- ========================================================================= -->
    <div v-if="activeTab === 'resources'" class="premium-card">
      <div class="tab-header-row">
        <h3>Documents & Médias de l'Église</h3>
        <button v-if="isResponsableOrAdmin" class="sa-btn sa-btn-primary" @click="openResModal()">+ Ajouter une ressource</button>
      </div>

      <table class="sa-table modern-table">
        <thead>
          <tr>
            <th>Aperçu</th>
            <th>Titre & Rubrique</th>
            <th>Type</th>
            <th>Tarif</th>
            <th>Statut</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in resources" :key="r.id">
            <td>
              <img v-if="getItemCover(r)" :src="getItemCover(r)" class="cover-thumb"/>
              <div v-else class="cover-placeholder">{{ r.type.toUpperCase() }}</div>
            </td>
            <td>
              <strong>{{ r.title }}</strong><br>
              <small class="text-muted">{{ r.category?.name || 'Sans rubrique' }}</small>
            </td>
            <td><span class="badge badge-info">{{ r.type.toUpperCase() }}</span></td>
            <td>
              <span v-if="r.is_free" class="badge badge-success">Gratuit</span>
              <span v-else class="badge badge-warning">{{ r.price }} FCFA</span>
            </td>
            <td>
              <span :class="r.status === 'published' ? 'badge badge-primary' : 'badge badge-draft'">
                {{ r.status === 'published' ? 'Publié' : 'Brouillon' }}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="icon-btn" @click="openMediaViewer(r)" title="Visualiser / Lire">▶️</button>
              <button class="icon-btn" @click="handleDownload(r)" title="Télécharger">📥</button>
              <button v-if="isResponsableOrAdmin" class="icon-btn" @click="openResModal(r)" title="Modifier">✏️</button>
              <button v-if="isResponsableOrAdmin" class="icon-btn text-danger" @click="store.deleteResource(r.id); store.fetchResources()" title="Supprimer">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 3: GESTION DES FORMATIONS                                             -->
    <!-- ========================================================================= -->
    <div v-if="activeTab === 'formations'" class="premium-card">
      <div class="tab-header-row">
        <h3>Programmes & Formations</h3>
        <button v-if="isResponsableOrAdmin" class="sa-btn sa-btn-primary" @click="openFormModal()">+ Créer une formation</button>
      </div>

      <table class="sa-table modern-table">
        <thead>
          <tr>
            <th>Couverture</th>
            <th>Titre & Rubrique</th>
            <th>Modules</th>
            <th>Tarif</th>
            <th>Statut</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in formations" :key="f.id">
            <td>
              <img v-if="getItemCover(f)" :src="getItemCover(f)" class="cover-thumb"/>
              <div v-else class="cover-placeholder">🎓</div>
            </td>
            <td>
              <strong>{{ f.title }}</strong><br>
              <small class="text-muted">{{ f.category?.name || 'Sans rubrique' }}</small>
            </td>
            <td>
              <span class="badge badge-secondary">{{ f.modules?.length || f.modules_count || 0 }} module(s)</span>
              <div v-if="getFormationContentsCount(f) > 0" style="margin-top:4px;">
                <span class="badge badge-info" style="font-size:11px;">🎬 {{ getFormationContentsCount(f) }} média(s)</span>
              </div>
            </td>
            <td>
              <span v-if="f.is_free" class="badge badge-success">Gratuit</span>
              <span v-else class="badge badge-warning">{{ f.price }} FCFA</span>
            </td>
            <td>
              <span :class="f.status === 'published' ? 'badge badge-primary' : 'badge badge-draft'">
                {{ f.status === 'published' ? 'Publié' : 'Brouillon' }}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="icon-btn" @click="openFormationViewer(f)" title="Aperçu du cours">🎓</button>
              <button v-if="isResponsableOrAdmin" class="icon-btn" @click="openFormModal(f)" title="Modifier">✏️</button>
              <button v-if="isResponsableOrAdmin" class="icon-btn text-danger" @click="store.deleteFormation(f.id); store.fetchFormations()" title="Supprimer">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 4: RUBRIQUES & CATÉGORIES                                            -->
    <!-- ========================================================================= -->
    <div v-if="activeTab === 'categories'" class="premium-card">
      <div class="tab-header-row">
        <h3>Rubriques des Médias & Formations</h3>
        <button v-if="isResponsableOrAdmin" class="sa-btn sa-btn-primary" @click="openCatModal()">+ Nouvelle Rubrique</button>
      </div>

      <table class="sa-table modern-table">
        <thead>
          <tr>
            <th>Nom de la rubrique</th>
            <th>Description</th>
            <th>Type d'usage</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in categories" :key="c.id">
            <td><strong>{{ c.name }}</strong></td>
            <td>{{ c.description || '—' }}</td>
            <td>
              <span class="badge" :class="c.type === 'resource' ? 'badge-info' : 'badge-primary'">
                {{ c.type === 'resource' ? 'Ressource' : 'Formation' }}
              </span>
            </td>
            <td style="text-align: right;">
              <button v-if="isResponsableOrAdmin" class="icon-btn" @click="openCatModal(c)" title="Modifier">✏️</button>
              <button v-if="isResponsableOrAdmin" class="icon-btn text-danger" @click="store.deleteCategory(c.id); store.fetchCategories()" title="Supprimer">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: CRÉER / MODIFIER RUBRIQUE                                          -->
    <!-- ========================================================================= -->
    <div v-if="showCatModal" class="sa-modal-backdrop" @click.self="showCatModal = false">
      <div class="sa-modal glass-modal">
        <h3>{{ catForm.id ? 'Modifier la Rubrique' : 'Nouvelle Rubrique' }}</h3>
        
        <div class="sa-form-group">
          <label>Nom de la rubrique <span class="text-danger">*</span></label>
          <input type="text" v-model="catForm.name" class="sa-input" placeholder="Ex: Théologie, Jeunesse, Vie de prière..." />
        </div>

        <div class="sa-form-group">
          <label>Description</label>
          <textarea v-model="catForm.description" class="sa-input" rows="2" placeholder="Brève description de la thématique..."></textarea>
        </div>

        <div class="sa-form-group">
          <label>Type d'application</label>
          <select v-model="catForm.type" class="sa-input">
            <option value="resource">Ressource unitaire (Livre, PDF, Vidéo, Audio)</option>
            <option value="formation">Formation structurée (Modules & Cours)</option>
          </select>
        </div>

        <div class="sa-modal-actions">
          <button class="sa-btn sa-btn-secondary" @click="showCatModal = false">Annuler</button>
          <button class="sa-btn sa-btn-primary" :disabled="isSubmitting" @click="saveCategory">
            {{ isSubmitting ? 'Enregistrement...' : 'Enregistrer la rubrique' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: CRÉER / MODIFIER RESSOURCE                                         -->
    <!-- ========================================================================= -->
    <div v-if="showResModal" class="sa-modal-backdrop" @click.self="showResModal = false">
      <div class="sa-modal glass-modal" style="width: 540px;">
        <h3>{{ resForm.id ? 'Modifier' : 'Ajouter' }} une Ressource</h3>
        
        <div class="sa-form-group">
          <label>Titre de la ressource <span class="text-danger">*</span></label>
          <input type="text" v-model="resForm.title" class="sa-input" placeholder="Titre du livre, document ou prédication" />
        </div>

        <div class="sa-form-group">
          <label>Description</label>
          <textarea v-model="resForm.description" class="sa-input" rows="2" placeholder="Résumé ou présentation du contenu..."></textarea>
        </div>

        <div class="form-row-2">
          <div class="sa-form-group">
            <label>Rubrique</label>
            <select v-model="resForm.category_id" class="sa-input">
              <option value="">-- Aucune rubrique --</option>
              <option v-for="c in categories.filter(c => c.type === 'resource')" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <div class="sa-form-group">
            <label>Format</label>
            <select v-model="resForm.type" class="sa-input">
              <option value="pdf">Document PDF</option>
              <option value="video">Vidéo</option>
              <option value="audio">Audio / Prédication</option>
              <option value="document">Autre Document</option>
            </select>
          </div>
        </div>

        <div class="form-row-2">
          <div class="sa-form-group">
            <label>Accès Fidèles</label>
            <select v-model="resForm.is_free" class="sa-input">
              <option :value="true">Gratuit pour tous</option>
              <option :value="false">Document Payant</option>
            </select>
          </div>

          <div class="sa-form-group" v-if="!resForm.is_free">
            <label>Prix (FCFA) <span class="text-danger">*</span></label>
            <input type="number" v-model="resForm.price" class="sa-input" placeholder="Ex: 2500" min="100" />
          </div>
        </div>
        
        <div class="sa-form-group">
          <label>Fichier Document / Support</label>
          <input type="file" @change="e => handleFileUpload(e, 'resFile')" class="sa-input file-input" />
          <small class="text-muted">PDF, Audio, Vidéo (Max 100 Mo)</small>
        </div>

        <div class="sa-form-group">
          <label>Image de Couverture</label>
          <input type="file" accept="image/*" @change="e => handleFileUpload(e, 'resCover')" class="sa-input file-input" />
        </div>

        <div class="sa-form-group">
          <label>Statut de Publication</label>
          <select v-model="resForm.status" class="sa-input">
            <option value="published">Publié (visible au catalogue)</option>
            <option value="draft">Brouillon</option>
          </select>
        </div>

        <div class="sa-modal-actions">
          <button class="sa-btn sa-btn-secondary" @click="showResModal = false">Annuler</button>
          <button class="sa-btn sa-btn-primary" :disabled="isSubmitting" @click="saveResource">
            {{ isSubmitting ? 'Enregistrement...' : 'Enregistrer la ressource' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: CRÉER / MODIFIER FORMATION (REVUE COMPLÈTE & MODULES)              -->
    <!-- ========================================================================= -->
    <div v-if="showFormModal" class="sa-modal-backdrop" @click.self="showFormModal = false">
      <div class="sa-modal glass-modal modal-wide">
        <h3>{{ formForm.id ? 'Modifier' : 'Créer' }} une Formation</h3>
        <p class="text-muted" style="margin-top:-6px; margin-bottom:16px; font-size:13px;">
          Configurez le cours, ses rubriques, sa tarification et son programme de cours.
        </p>

        <div class="sa-form-group">
          <label>Titre de la formation <span class="text-danger">*</span></label>
          <input type="text" v-model="formForm.title" class="sa-input" placeholder="Ex: École de Ministère, Fondements de la Foi..." />
        </div>

        <div class="sa-form-group">
          <label>Description pédagogique</label>
          <textarea v-model="formForm.description" class="sa-input" rows="3" placeholder="Objectifs de la formation, prérequis, public cible..."></textarea>
        </div>

        <div class="form-row-2">
          <div class="sa-form-group">
            <label>Rubrique de Formation</label>
            <select v-model="formForm.category_id" class="sa-input">
              <option value="">-- Aucune rubrique --</option>
              <option v-for="c in categories.filter(c => c.type === 'formation')" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <div class="sa-form-group">
            <label>Statut</label>
            <select v-model="formForm.status" class="sa-input">
              <option value="published">Publiée (ouverte aux inscriptions)</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>
        </div>

        <div class="form-row-2">
          <div class="sa-form-group">
            <label>Tarification</label>
            <select v-model="formForm.is_free" class="sa-input">
              <option :value="true">Gratuite</option>
              <option :value="false">Formation Payante</option>
            </select>
          </div>

          <div class="sa-form-group" v-if="!formForm.is_free">
            <label>Prix de la formation (FCFA) <span class="text-danger">*</span></label>
            <input type="number" v-model="formForm.price" class="sa-input" placeholder="Ex: 5000" min="500" />
          </div>
        </div>

        <!-- Programme / Modules de formation -->
        <div class="modules-builder-box">
          <label class="modules-label">📚 Modules / Chapitres du programme</label>
          <div class="modules-add-row">
            <input 
              type="text" 
              v-model="newModuleInput" 
              @keyup.enter.prevent="addModuleToForm"
              class="sa-input" 
              placeholder="Nom du module (ex: Module 1 : Introduction à la doctrine)" 
            />
            <button type="button" class="btn-add-module" @click="addModuleToForm">+ Ajouter</button>
          </div>

          <div v-if="formForm.modules.length" class="modules-chips-list">
            <div v-for="(mod, idx) in formForm.modules" :key="idx" class="module-chip">
              <span>{{ idx + 1 }}. {{ mod }}</span>
              <button type="button" @click="removeModuleFromForm(idx)" class="chip-del">✕</button>
            </div>
          </div>
        </div>

        <!-- Supports pédagogiques : Fichiers, Vidéos, Audios -->
        <div class="contents-builder-box">
          <div class="contents-builder-header">
            <div>
              <label class="modules-label">🎬 Supports & Médias pédagogiques (Fichiers, Vidéos, Audios)</label>
              <p class="section-subtext">Ajoutez les vidéos, fichiers audio, présentations ou documents PDF du cours.</p>
            </div>
            <button type="button" class="btn-add-content" @click="addContentToForm">
              + Ajouter un fichier / média
            </button>
          </div>

          <div v-if="formForm.contents.length === 0" class="empty-contents-notice">
            <span>ℹ️ Aucun fichier ou média rattaché. Cliquez sur <strong>+ Ajouter un fichier / média</strong> ci-dessus pour ajouter des vidéos, audios ou PDF.</span>
          </div>

          <div v-else class="contents-items-list">
            <div v-for="(cnt, idx) in formForm.contents" :key="idx" class="content-item-card">
              <div class="content-card-top">
                <span class="content-index-badge">Support #{{ idx + 1 }}</span>
                <button type="button" @click="removeContentFromForm(idx)" class="btn-remove-content" title="Supprimer ce contenu">✕ Retirer</button>
              </div>

              <div class="form-row-2">
                <div class="sa-form-group">
                  <label>Titre de la leçon / ressource <span class="text-danger">*</span></label>
                  <input type="text" v-model="cnt.title" class="sa-input" placeholder="Ex: Vidéo 1 : Introduction, Support PDF du cours..." />
                </div>

                <div class="sa-form-group">
                  <label>Type de média</label>
                  <select v-model="cnt.type" class="sa-input">
                    <option value="video">🎬 Vidéo</option>
                    <option value="audio">🎧 Audio / Prédication</option>
                    <option value="pdf">📄 Document PDF</option>
                    <option value="document">📑 Autre document (Word, PowerPoint)</option>
                  </select>
                </div>
              </div>

              <!-- Choix de la source si vidéo -->
              <div v-if="cnt.type === 'video'" class="form-row-2">
                <div class="sa-form-group">
                  <label>Origine de la vidéo</label>
                  <select v-model="cnt.source_type" class="sa-input">
                    <option value="file">Fichier vidéo à téléverser (MP4, WebM)</option>
                    <option value="url">Lien vidéo externe (YouTube, Vimeo, Web)</option>
                  </select>
                </div>

                <div class="sa-form-group" v-if="cnt.source_type === 'url'">
                  <label>URL de la vidéo <span class="text-danger">*</span></label>
                  <input type="url" v-model="cnt.external_url" class="sa-input" placeholder="https://www.youtube.com/watch?v=..." />
                </div>
              </div>

              <!-- Téléversement du fichier -->
              <div v-if="cnt.type !== 'video' || cnt.source_type === 'file'" class="sa-form-group">
                <label>Fichier à téléverser <span v-if="!cnt.file_name && !cnt.file_url" class="text-danger">*</span></label>
                <input 
                  type="file" 
                  :accept="cnt.type === 'video' ? 'video/*' : (cnt.type === 'audio' ? 'audio/*' : (cnt.type === 'pdf' ? 'application/pdf' : '*'))" 
                  @change="e => handleContentFile(e, idx)" 
                  class="sa-input file-input" 
                />
                <small v-if="cnt.file_name" class="text-success font-semibold" style="display:block; margin-top:4px;">
                  📎 Fichier sélectionné : {{ cnt.file_name }}
                </small>
                <small v-else-if="cnt.file_url" class="text-success font-semibold" style="display:block; margin-top:4px;">
                  📎 Fichier actuellement en ligne disponible
                </small>
                <small v-else class="text-muted" style="display:block; margin-top:4px;">
                  {{ cnt.type === 'video' ? 'Formats recommandés : MP4, WebM (Max 100 Mo)' : (cnt.type === 'audio' ? 'Formats recommandés : MP3, WAV, M4A' : 'Fichiers PDF, DOC, PPT') }}
                </small>
              </div>

              <div class="form-row-3">
                <div class="sa-form-group">
                  <label>Module rattaché</label>
                  <select v-model="cnt.module_index" class="sa-input">
                    <option v-for="(m, mIdx) in formForm.modules" :key="mIdx" :value="mIdx">
                      {{ mIdx + 1 }}. {{ m }}
                    </option>
                    <option v-if="formForm.modules.length === 0" :value="0">Module 1 (Par défaut)</option>
                  </select>
                </div>

                <div class="sa-form-group">
                  <label>Durée estimée (optionnel)</label>
                  <input type="text" v-model="cnt.duration" class="sa-input" placeholder="Ex: 25 min" />
                </div>

                <div class="sa-form-group checkbox-group-inline" style="padding-top:24px;">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="cnt.is_preview" />
                    <span>Aperçu gratuit sans inscription</span>
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="sa-form-group">
          <label>Image de Couverture</label>
          <input type="file" accept="image/*" @change="e => handleFileUpload(e, 'formCover')" class="sa-input file-input" />
        </div>

        <div class="sa-modal-actions">
          <button class="sa-btn sa-btn-secondary" @click="showFormModal = false">Annuler</button>
          <button class="sa-btn sa-btn-primary" :disabled="isSubmitting" @click="saveFormation">
            {{ isSubmitting ? 'Enregistrement...' : 'Enregistrer la formation' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: DÉBLOCAGE / ACHAT D'UN DOCUMENT PAYANT                             -->
    <!-- ========================================================================= -->
    <div v-if="showPurchaseModal" class="sa-modal-backdrop" @click.self="showPurchaseModal = false">
      <div class="sa-modal glass-modal modal-purchase">
        <div class="purchase-icon">🔒</div>
        <h3>Document Payant</h3>
        <p class="purchase-title">{{ targetItem?.title }}</p>
        <p class="purchase-desc">
          Ce document requiert une participation financière pour soutenir l'œuvre et les supports d'édification de l'église.
        </p>

        <div class="price-display-box">
          <span class="price-label">Tarif d'accès</span>
          <span class="price-amount">{{ targetItem?.price }} FCFA</span>
        </div>

        <div class="purchase-info-alert">
          ℹ️ <strong>Rappel :</strong> Les administrateurs de l'église bénéficient d'un accès gratuit et complet à l'ensemble des documents.
        </div>

        <div class="sa-modal-actions" style="margin-top:20px;">
          <button class="sa-btn sa-btn-secondary" @click="showPurchaseModal = false">Fermer</button>
          <button 
            class="sa-btn sa-btn-primary" 
            @click="showAlert('info', 'Module de paiement en ligne en cours de finalisation.'); showPurchaseModal = false;"
          >
            💳 Payer {{ targetItem?.price }} FCFA
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: VISUALISEUR MÉDIA (VIDÉO, AUDIO, DOCUMENT)                        -->
    <!-- ========================================================================= -->
    <div v-if="showMediaViewer" class="sa-modal-backdrop" @click.self="showMediaViewer = false">
      <div class="sa-modal glass-modal modal-player">
        <div class="player-header">
          <div>
            <span class="category-tag">{{ currentMedia?.category?.name || 'Média' }}</span>
            <h3 class="player-title">{{ currentMedia?.title }}</h3>
          </div>
          <button class="btn-close" @click="showMediaViewer = false">✕</button>
        </div>

        <div class="player-body">
          <!-- Vidéo -->
          <div v-if="currentMedia?.type === 'video'" class="video-wrapper">
            <video 
              v-if="currentMedia?.file_url" 
              :src="currentMedia.file_url" 
              controls 
              autoplay 
              playsinline 
              class="media-video-element"
            >
              Votre navigateur ne supporte pas la lecture de cette vidéo.
            </video>
            <div v-else class="media-unavailable-box">
              ⚠️ Le fichier vidéo n'est pas encore disponible ou n'a pas été téléversé.
            </div>
          </div>

          <!-- Audio -->
          <div v-else-if="currentMedia?.type === 'audio'" class="audio-wrapper">
            <div class="audio-artwork">
              <img v-if="getItemCover(currentMedia)" :src="getItemCover(currentMedia)" class="audio-img" />
              <span v-else class="audio-placeholder">🎧</span>
            </div>
            <audio 
              v-if="currentMedia?.file_url" 
              :src="currentMedia.file_url" 
              controls 
              autoplay 
              class="media-audio-element"
            >
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
            <div v-else class="media-unavailable-box">
              ⚠️ Le fichier audio n'est pas encore disponible sur le serveur.
            </div>
          </div>

          <!-- PDF / Document -->
          <div v-else class="document-wrapper">
            <iframe 
              v-if="currentMedia?.file_url" 
              :src="currentMedia.file_url" 
              class="media-doc-iframe"
            ></iframe>
            <div v-else class="media-unavailable-box">
              ⚠️ Le document n'est pas encore disponible sur le serveur.
            </div>
          </div>

          <p v-if="currentMedia?.description" class="player-description">
            {{ currentMedia.description }}
          </p>
        </div>

        <div class="player-footer">
          <button class="sa-btn sa-btn-secondary" @click="showMediaViewer = false">Fermer</button>
          <button class="sa-btn sa-btn-primary" @click="handleDownload(currentMedia)">
            📥 Télécharger le fichier
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL: LECTEUR DE FORMATION (LMS & CONSULTATION DU COURS)                -->
    <!-- ========================================================================= -->
    <div v-if="showFormationViewer" class="sa-modal-backdrop" @click.self="showFormationViewer = false">
      <div class="sa-modal glass-modal modal-lms-viewer">
        
        <div class="lms-header">
          <div class="lms-title-block">
            <span class="category-tag">{{ currentFormation?.category?.name || 'Formation Biblique' }}</span>
            <h2 class="lms-course-title">🎓 {{ currentFormation?.title }}</h2>
          </div>
          <div class="lms-header-actions">
            <span v-if="currentFormation?.is_free" class="badge badge-success">Formation Gratuite</span>
            <span v-else class="badge badge-warning">{{ currentFormation?.price }} FCFA</span>
            <button class="btn-close" @click="showFormationViewer = false">✕</button>
          </div>
        </div>

        <div class="lms-main-layout">
          <!-- Sidebar: Modules et leçons -->
          <div class="lms-sidebar">
            <div class="lms-sidebar-header">
              <h4>📚 Programme & Modules</h4>
              <span class="modules-counter">{{ currentFormation?.modules?.length || 0 }} module(s)</span>
            </div>

            <div v-if="!currentFormation?.modules || currentFormation.modules.length === 0" class="empty-lms-sidebar">
              <p>Aucun module n'a encore été publié pour cette formation.</p>
            </div>

            <div v-else class="lms-modules-list">
              <div 
                v-for="(mod, mIdx) in currentFormation.modules" 
                :key="mod.id || mIdx"
                class="lms-module-card"
              >
                <div class="lms-module-header">
                  <strong>Module {{ mIdx + 1 }}: {{ mod.title }}</strong>
                </div>

                <div v-if="!mod.contents || mod.contents.length === 0" class="empty-module-lessons">
                  <small class="text-muted">Aucune ressource dans ce module</small>
                </div>

                <div v-else class="lms-lessons-list">
                  <button
                    v-for="(cnt, cIdx) in mod.contents"
                    :key="cnt.id || cIdx"
                    :class="['lms-lesson-btn', { active: activeModuleIdx === mIdx && activeContentIdx === cIdx }]"
                    @click="selectLesson(mIdx, cIdx)"
                  >
                    <span class="lesson-icon">
                      {{ cnt.type === 'video' ? '🎬' : (cnt.type === 'audio' ? '🎧' : (cnt.type === 'pdf' ? '📄' : '📑')) }}
                    </span>
                    <span class="lesson-name">{{ cnt.title }}</span>
                    <span v-if="cnt.is_preview" class="preview-badge">Aperçu</span>
                    <span v-if="cnt.duration" class="duration-badge">{{ cnt.duration }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Zone de lecture active -->
          <div class="lms-viewport">
            <template v-if="activeLesson">
              <div class="lms-lesson-header">
                <div>
                  <span class="lesson-type-badge">{{ activeLesson.type?.toUpperCase() }}</span>
                  <h3 class="active-lesson-title">{{ activeLesson.title }}</h3>
                </div>
                <div class="lms-lesson-actions">
                  <a 
                    v-if="activeLesson.file_url" 
                    :href="activeLesson.file_url" 
                    target="_blank" 
                    download 
                    class="sa-btn sa-btn-secondary btn-sm"
                  >
                    📥 Télécharger le support
                  </a>
                </div>
              </div>

              <!-- Contenu Vidéo -->
              <div v-if="activeLesson.type === 'video'" class="lms-media-container">
                <!-- Lien externe (YouTube / Vimeo / etc.) -->
                <iframe 
                  v-if="activeLesson.content_data && (activeLesson.content_data.startsWith('http://') || activeLesson.content_data.startsWith('https://'))"
                  :src="getEmbedUrl(activeLesson.content_data)"
                  class="lms-video-frame"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>

                <!-- Fichier vidéo hébergé -->
                <video 
                  v-else-if="activeLesson.file_url"
                  :src="activeLesson.file_url"
                  controls
                  playsinline
                  class="lms-video-element"
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>

                <div v-else class="media-unavailable-box">
                  🔒 Cette vidéo nécessite une inscription active ou n'est pas encore disponible.
                </div>
              </div>

              <!-- Contenu Audio -->
              <div v-else-if="activeLesson.type === 'audio'" class="lms-audio-container">
                <div class="audio-player-card">
                  <div class="audio-disc">🎧</div>
                  <h4>{{ activeLesson.title }}</h4>
                  <audio 
                    v-if="activeLesson.file_url" 
                    :src="activeLesson.file_url" 
                    controls 
                    class="lms-audio-element"
                  >
                    Votre navigateur ne supporte pas la lecture audio.
                  </audio>
                  <div v-else class="media-unavailable-box">
                    🔒 L'audio n'est pas accessible sans inscription active.
                  </div>
                </div>
              </div>

              <!-- Contenu Document / PDF -->
              <div v-else class="lms-document-container">
                <div v-if="activeLesson.file_url" class="lms-doc-actions-bar">
                  <a :href="activeLesson.file_url" target="_blank" class="sa-btn sa-btn-primary btn-sm">
                    📄 Ouvrir en plein écran
                  </a>
                  <a :href="activeLesson.file_url" download class="sa-btn sa-btn-secondary btn-sm">
                    📥 Télécharger le fichier
                  </a>
                </div>
                <iframe 
                  v-if="activeLesson.file_url"
                  :src="activeLesson.file_url"
                  class="lms-doc-frame"
                ></iframe>
                <div v-else class="media-unavailable-box">
                  🔒 Document réservé aux fidèles inscrits à la formation.
                </div>
              </div>
            </template>

            <div v-else class="empty-viewport-notice">
              <div class="empty-icon">🎓</div>
              <h3>Sélectionnez une leçon dans le programme</h3>
              <p>Choisissez un module et cliquez sur une leçon à gauche pour démarrer la lecture.</p>
            </div>
          </div>
        </div>

        <div class="sa-modal-actions lms-footer">
          <button class="sa-btn sa-btn-secondary" @click="showFormationViewer = false">Fermer</button>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.resources-wrapper {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Toast alert */
.alert-toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10000;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.alert-success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.alert-error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.alert-info { background: #e0f2fe; color: #075985; border: 1px solid #7dd3fc; }

/* Header */
.sa-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}
.sa-title h1 {
  font-size: 26px;
  color: #0f172a;
  margin: 0 0 6px;
  font-weight: 800;
}
.sa-title p {
  color: #64748b;
  margin: 0;
  font-size: 14px;
}
.sa-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.glass-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  box-shadow: 0 4px 15px rgba(59,130,246,0.3);
}
.glass-btn-alt {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
  border: none;
  box-shadow: 0 4px 15px rgba(139,92,246,0.3);
}
.btn-outline {
  background: white;
  color: #475569;
  border: 1px solid #cbd5e1;
}
.btn-outline:hover {
  background: #f8fafc;
}

/* Tabs */
.sa-tabs-bar {
  border-bottom: 2px solid #f1f5f9;
  margin-bottom: 24px;
}
.sa-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.sa-tab {
  background: transparent;
  border: none;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.sa-tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}
.sa-tab:hover:not(.active) {
  color: #1e293b;
  background: #f8fafc;
  border-radius: 8px 8px 0 0;
}

/* Role Banner */
.role-banner {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1px solid #fde68a;
  border-radius: 14px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 14px;
  color: #92400e;
  margin-bottom: 20px;
}
.banner-faithful {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
  color: #1e40af;
}
.role-icon {
  font-size: 24px;
}

/* Catalog Filters */
.catalog-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip-btn {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}
.chip-btn.active, .chip-btn:hover {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}
.catalog-search {
  flex: 1;
  max-width: 360px;
  min-width: 240px;
}
.catalog-search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 24px;
  font-size: 13px;
}

/* Catalog Grid */
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;
}
.media-card {
  background: white;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}
.media-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.08);
}
.card-media-header {
  position: relative;
  height: 180px;
  background: #f1f5f9;
  overflow: hidden;
}
.media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
}
.format-pill {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(15, 23, 42, 0.75);
  color: white;
  backdrop-filter: blur(4px);
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.price-pill {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.pill-free {
  background: #22c55e;
  color: white;
}
.pill-paid {
  background: #f59e0b;
  color: white;
}

/* Card Body */
.media-card-body {
  padding: 16px 18px;
  flex: 1;
}
.category-tag {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.item-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 6px 0 8px;
  line-height: 1.4;
}
.item-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}
.formation-meta {
  margin-top: 10px;
  font-size: 12px;
  color: #8b5cf6;
  font-weight: 600;
}

/* Card Footer */
.media-card-footer {
  padding: 14px 18px;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
}
.admin-access-block, .user-access-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.admin-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #d97706;
}
.btn-action-primary {
  width: 100%;
  background: #2563eb;
  color: white;
  border: none;
  padding: 9px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-action-primary:hover {
  background: #1d4ed8;
}
.btn-action-free {
  width: 100%;
  background: #10b981;
  color: white;
  border: none;
  padding: 9px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.btn-action-free:hover {
  background: #059669;
}
.locked-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lock-notice {
  font-size: 11px;
  color: #dc2626;
  font-weight: 700;
  text-align: center;
}
.btn-action-buy {
  width: 100%;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  padding: 9px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(245,158,11,0.3);
}
.btn-action-buy:hover {
  filter: brightness(1.05);
}
.badge-purchased {
  font-size: 11px;
  color: #166534;
  font-weight: 700;
}

/* Empty Catalog */
.empty-catalog {
  background: white;
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
  padding: 48px;
  text-align: center;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* Table Design */
.premium-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
  border: 1px solid #e2e8f0;
}
.tab-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.tab-header-row h3 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}
.modern-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.modern-table th {
  padding: 12px 16px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  border-bottom: 2px solid #f1f5f9;
}
.modern-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 14px;
}
.cover-thumb {
  width: 44px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.cover-placeholder {
  width: 44px;
  height: 56px;
  background: #f1f5f9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
}

/* Badges */
.badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}
.badge-info { background: #e0f2fe; color: #0284c7; }
.badge-success { background: #dcfce7; color: #166534; }
.badge-warning { background: #fef3c7; color: #d97706; }
.badge-primary { background: #dbeafe; color: #1e40af; }
.badge-draft { background: #f1f5f9; color: #475569; }
.badge-secondary { background: #f3f4f6; color: #374151; }

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  font-size: 16px;
}
.text-danger { color: #ef4444; }

/* Modals */
.sa-modal-backdrop {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}
.sa-modal {
  background: white;
  border-radius: 20px;
  padding: 28px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}
.modal-wide {
  max-width: 650px;
}
.modal-purchase {
  max-width: 440px;
  text-align: center;
}
.purchase-icon {
  font-size: 42px;
  margin-bottom: 8px;
}
.purchase-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 6px 0;
}
.purchase-desc {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}
.price-display-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  margin: 16px 0;
}
.price-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
}
.price-amount {
  font-size: 26px;
  font-weight: 800;
  color: #d97706;
}
.purchase-info-alert {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  text-align: left;
}

.sa-form-group {
  margin-bottom: 14px;
}
.sa-form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}
.sa-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
}
.sa-input:focus {
  border-color: #3b82f6;
  outline: none;
}
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.file-input {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  cursor: pointer;
}
.sa-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
.sa-btn {
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.sa-btn-primary {
  background: #2563eb;
  color: white;
  border: none;
}
.sa-btn-primary:hover {
  background: #1d4ed8;
}
.sa-btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: none;
}
.sa-btn-secondary:hover {
  background: #e2e8f0;
}

/* Modules builder */
.modules-builder-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 14px;
}
.modules-label {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  display: block;
  margin-bottom: 8px;
}
.modules-add-row {
  display: flex;
  gap: 8px;
}
.btn-add-module {
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.modules-chips-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.module-chip {
  background: white;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chip-del {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-weight: 700;
}

/* Card Button Group */
.card-btn-group {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}
.flex-1 {
  flex: 1;
}
.btn-action-icon {
  background: #e0f2fe;
  color: #0284c7;
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.btn-action-icon:hover {
  background: #0284c7;
  color: white;
}

/* Media Viewer Modal */
.modal-player {
  max-width: 820px;
  width: 100%;
}
.player-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
}
.player-title {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}
.video-wrapper {
  background: #0f172a;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
}
.media-video-element {
  width: 100%;
  max-height: 480px;
  outline: none;
}
.audio-wrapper {
  background: linear-gradient(135deg, #f8fafc, #eff6ff);
  border: 1px solid #dbeafe;
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
}
.audio-artwork {
  width: 120px;
  height: 120px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
}
.audio-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media-audio-element {
  width: 100%;
  max-width: 520px;
}
.document-wrapper {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  height: 480px;
  margin-bottom: 16px;
}
.media-doc-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.media-unavailable-box {
  padding: 36px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}
.player-description {
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
  margin: 12px 0 0;
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 10px;
}
.player-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  border-top: 1px solid #f1f5f9;
  padding-top: 14px;
}

/* Contents Builder Box in Form */
.contents-builder-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 20px;
}
.contents-builder-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
  gap: 12px;
  flex-wrap: wrap;
}
.section-subtext {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0;
}
.btn-add-content {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(16,185,129,0.25);
}
.btn-add-content:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}
.empty-contents-notice {
  background: white;
  border: 1px dashed #cbd5e1;
  padding: 16px 20px;
  border-radius: 10px;
  font-size: 13px;
  color: #64748b;
  text-align: center;
}
.contents-items-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.content-item-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  position: relative;
}
.content-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}
.content-index-badge {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  background: #e0e7ff;
  color: #4338ca;
  padding: 3px 10px;
  border-radius: 12px;
}
.btn-remove-content {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.btn-remove-content:hover {
  background: #fee2e2;
}

/* LMS Course Viewer Modal */
.modal-lms-viewer {
  width: 100%;
  max-width: 1150px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 24px;
  border-radius: 20px;
}
.lms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 18px;
  gap: 16px;
}
.lms-course-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  margin: 4px 0 0;
}
.lms-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.lms-main-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  min-height: 480px;
  overflow: hidden;
  flex: 1;
}
@media (max-width: 860px) {
  .lms-main-layout {
    grid-template-columns: 1fr;
  }
}
.lms-sidebar {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px;
  overflow-y: auto;
  max-height: 520px;
}
.lms-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}
.lms-sidebar-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}
.modules-counter {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}
.lms-modules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lms-module-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.lms-module-header {
  background: #f1f5f9;
  padding: 10px 14px;
  font-size: 13px;
  color: #334155;
  border-bottom: 1px solid #e2e8f0;
}
.lms-lessons-list {
  display: flex;
  flex-direction: column;
}
.lms-lesson-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  border-bottom: 1px solid #f8fafc;
  transition: all 0.15s;
}
.lms-lesson-btn:hover {
  background: #eff6ff;
  color: #2563eb;
}
.lms-lesson-btn.active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
  border-left: 4px solid #2563eb;
}
.lesson-icon {
  font-size: 15px;
}
.lesson-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.preview-badge {
  font-size: 10px;
  background: #dcfce7;
  color: #15803d;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 700;
}
.duration-badge {
  font-size: 10px;
  color: #94a3b8;
}
.lms-viewport {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 520px;
}
.lms-lesson-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
  gap: 12px;
}
.lesson-type-badge {
  font-size: 11px;
  font-weight: 800;
  color: #6366f1;
  background: #e0e7ff;
  padding: 2px 8px;
  border-radius: 8px;
  letter-spacing: 0.5px;
}
.active-lesson-title {
  margin: 6px 0 0;
  font-size: 18px;
  color: #0f172a;
}
.lms-media-container {
  height: 380px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lms-video-frame, .lms-video-element {
  width: 100%;
  height: 100%;
  border: none;
}
.lms-audio-container {
  padding: 40px 20px;
  display: flex;
  justify-content: center;
}
.audio-player-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 30px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 480px;
  text-align: center;
}
.audio-disc {
  font-size: 48px;
  width: 80px;
  height: 80px;
  background: #e0e7ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(99,102,241,0.15);
}
.lms-document-container {
  height: 420px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.lms-doc-frame {
  width: 100%;
  height: 100%;
  border: none;
}
.empty-viewport-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 60px 20px;
  text-align: center;
  color: #64748b;
}
.lms-footer {
  margin-top: 16px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.contents-count-pill {
  color: #2563eb;
  font-weight: 700;
  font-size: 12px;
}
.lms-doc-actions-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
</style>
