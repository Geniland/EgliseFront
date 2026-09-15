<template>
  <div class="media-studio-page">
    <!-- Toast Notification -->
    <transition name="toast-fade">
      <div v-if="toast.visible" :class="['studio-toast', toast.type]">
        <span class="toast-icon">{{ toast.icon }}</span>
        <span class="toast-msg">{{ toast.message }}</span>
      </div>
    </transition>

    <!-- Page Header -->
    <header class="studio-header">
      <div class="header-left">
        <div class="header-badge">
          <span class="badge-dot"></span>
          <span>Régie Multimédia</span>
        </div>
        <h1 class="page-title">Médias & Diffusion en Direct</h1>
        <p class="page-subtitle">
          Supervisez vos cultes en direct, programmez vos directs YouTube et archivez vos rediffusions VOD.
        </p>
      </div>

      <div class="header-actions">
        <button class="btn-secondary-action" @click="showObsModal = true">
          <span>⚙️</span>
          <span>Guide OBS Studio</span>
        </button>
        <button class="btn-primary-action" @click="openCreateModal">
          <span>✨</span>
          <span>+ Programmer un direct</span>
        </button>
      </div>
    </header>

    <!-- Hero Banner : Live Actif (si un stream est en direct) -->
    <section v-if="activeLive" class="hero-live-banner">
      <div class="hero-live-content">
        <div class="hero-live-header">
          <div class="live-pulse-badge">
            <span class="pulse-beacon"></span>
            <span class="pulse-dot"></span>
            <span>EN DIRECT MAINTENANT</span>
          </div>
          <span v-if="activeLive.event?.title" class="hero-event-tag">
            📍 {{ activeLive.event.title }}
          </span>
        </div>

        <h2 class="hero-live-title">{{ activeLive.title }}</h2>
        <p class="hero-live-desc">
          {{ activeLive.description || 'La diffusion en direct de notre église est en cours. Rejoignez la communauté des fidèles pour ce moment de louange et d’édification.' }}
        </p>

        <div class="hero-live-actions">
          <router-link
            :to="{ name: 'live-watch', params: { id: activeLive.id } }"
            class="btn-hero-primary"
          >
            <span>▶️</span>
            <span>Rejoindre le direct</span>
          </router-link>

          <router-link
            :to="{ name: 'live-manage', params: { id: activeLive.id } }"
            class="btn-hero-secondary"
          >
            <span>🎛️</span>
            <span>Ouvrir la régie</span>
          </router-link>

          <button class="btn-hero-share" @click="copyShareLink(activeLive)">
            <span>🔗</span>
            <span>Partager</span>
          </button>
        </div>
      </div>

      <div class="hero-live-visual" @click="goToWatch(activeLive.id)">
        <img
          v-if="activeLive.provider_live_input_id"
          :src="'https://img.youtube.com/vi/' + activeLive.provider_live_input_id + '/hqdefault.jpg'"
          :alt="activeLive.title"
          class="hero-img"
        />
        <div v-else class="hero-visual-fallback">
          <span>⛪</span>
        </div>
        <div class="hero-play-circle">
          <span>▶</span>
        </div>
      </div>
    </section>

    <!-- KPI Statistics Cards -->
    <section class="kpi-grid">
      <div class="kpi-card live-kpi" @click="selectedTab = 'live'">
        <div class="kpi-icon-wrap kpi-live-icon">
          <span>🔴</span>
        </div>
        <div class="kpi-details">
          <span class="kpi-label">En direct</span>
          <div class="kpi-value-row">
            <span class="kpi-number">{{ liveCount }}</span>
            <span v-if="liveCount > 0" class="kpi-badge-live">Actif</span>
          </div>
          <span class="kpi-subtext">Cultes retransmis en ce moment</span>
        </div>
      </div>

      <div class="kpi-card" @click="selectedTab = 'scheduled'">
        <div class="kpi-icon-wrap kpi-sched-icon">
          <span>📅</span>
        </div>
        <div class="kpi-details">
          <span class="kpi-label">Programmés</span>
          <span class="kpi-number">{{ scheduledCount }}</span>
          <span class="kpi-subtext">Directs à venir dans l'agenda</span>
        </div>
      </div>

      <div class="kpi-card" @click="selectedTab = 'ended'">
        <div class="kpi-icon-wrap kpi-vod-icon">
          <span>📼</span>
        </div>
        <div class="kpi-details">
          <span class="kpi-label">Replays & VOD</span>
          <span class="kpi-number">{{ endedCount }}</span>
          <span class="kpi-subtext">Vidéos archivées disponibles</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-wrap kpi-event-icon">
          <span>🤝</span>
        </div>
        <div class="kpi-details">
          <span class="kpi-label">Événements liés</span>
          <span class="kpi-number">{{ linkedEventsCount }}</span>
          <span class="kpi-subtext">Rattachés au calendrier paroissial</span>
        </div>
      </div>
    </section>

    <!-- Toolbar : Filtres & Recherche -->
    <section class="studio-toolbar">
      <div class="toolbar-left">
        <div class="tab-pills">
          <button
            class="tab-pill"
            :class="{ active: selectedTab === 'all' }"
            @click="selectedTab = 'all'"
          >
            <span>Tous les flux</span>
            <span class="pill-counter">{{ liveStreams.length }}</span>
          </button>
          <button
            class="tab-pill pill-live"
            :class="{ active: selectedTab === 'live' }"
            @click="selectedTab = 'live'"
          >
            <span class="pill-indicator-live"></span>
            <span>En direct</span>
            <span class="pill-counter">{{ liveCount }}</span>
          </button>
          <button
            class="tab-pill"
            :class="{ active: selectedTab === 'scheduled' }"
            @click="selectedTab = 'scheduled'"
          >
            <span>Programmés</span>
            <span class="pill-counter">{{ scheduledCount }}</span>
          </button>
          <button
            class="tab-pill"
            :class="{ active: selectedTab === 'ended' }"
            @click="selectedTab = 'ended'"
          >
            <span>Replays & VOD</span>
            <span class="pill-counter">{{ endedCount }}</span>
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher une diffusion ou un événement..."
            class="search-input"
          />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">✕</button>
        </div>

        <div class="sort-select-wrap">
          <select v-model="sortBy" class="sort-select">
            <option value="recent">Plus récents d'abord</option>
            <option value="scheduled">Date prévue</option>
            <option value="title">Titre alphabétique</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Error Alert -->
    <div v-if="error" class="studio-alert-danger">
      <span>⚠️</span>
      <span>{{ error }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !liveStreams.length" class="studio-loading-state">
      <div class="studio-spinner"></div>
      <p>Chargement des diffusions et de la régie...</p>
    </div>

    <!-- Streams Grid -->
    <section v-else-if="filteredStreams.length > 0" class="streams-grid">
      <div
        v-for="stream in filteredStreams"
        :key="stream.id"
        class="stream-grid-item"
      >
        <LiveCard
          :stream="stream"
          :canManage="true"
          @publish-resource="openPublishModal"
          @delete="handleDelete"
          @share-success="onShareSuccess"
        />
      </div>
    </section>

    <!-- Empty State -->
    <section v-else class="studio-empty-state">
      <div class="empty-card">
        <div class="empty-icon-circle">🎥</div>
        <h3>Aucune diffusion trouvée</h3>
        <p v-if="searchQuery || selectedTab !== 'all'">
          Aucun flux ne correspond à vos filtres actuels. Essayez de réinitialiser la recherche.
        </p>
        <p v-else>
          Vous n'avez pas encore programmé de diffusion en direct. Configurez votre premier culte en ligne pour toucher vos fidèles.
        </p>

        <div class="empty-actions">
          <button
            v-if="searchQuery || selectedTab !== 'all'"
            class="btn-empty-reset"
            @click="resetFilters"
          >
            Réinitialiser les filtres
          </button>
          <button class="btn-primary-action" @click="openCreateModal">
            <span>✨</span>
            <span>+ Programmer un direct</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- MODAL 1 : PROGRAMMATION RAPIDE DE DIRECT                   -->
    <!-- ======================================================== -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal-dialog-custom modal-lg">
        <div class="modal-header-custom">
          <div class="modal-title-wrap">
            <span class="modal-icon">📡</span>
            <div>
              <h3>Programmer une nouvelle diffusion</h3>
              <p>Liez votre flux YouTube Studio pour diffuser auprès de votre assemblée.</p>
            </div>
          </div>
          <button class="btn-close-modal" @click="showCreateModal = false">✕</button>
        </div>

        <form @submit.prevent="submitCreateStream" class="modal-body-custom">
          <div v-if="createError" class="modal-alert-danger">
            {{ createError }}
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Titre de la diffusion <span class="req">*</span></label>
            <input
              v-model="createForm.title"
              type="text"
              class="form-control-custom"
              placeholder="Ex : Culte d'action de grâce dominical"
              required
            />
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Lien YouTube du direct <span class="req">*</span></label>
            <div class="input-with-icon">
              <span class="icon-addon">🔗</span>
              <input
                v-model="createForm.youtube_url"
                type="url"
                class="form-control-custom with-addon"
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>
            <span class="field-hint">
              💡 Rendez-vous dans YouTube Studio, créez votre diffusion et collez ici le lien de partage.
            </span>
          </div>

          <div class="form-row mb-3">
            <div class="form-col">
              <label class="form-label">Date prévue</label>
              <input
                v-model="createForm.date"
                type="date"
                class="form-control-custom"
              />
            </div>
            <div class="form-col">
              <label class="form-label">Heure prévue</label>
              <input
                v-model="createForm.time"
                type="time"
                class="form-control-custom"
              />
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Rattacher à un événement (optionnel)</label>
            <select v-model="createForm.event_id" class="form-control-custom">
              <option :value="null">-- Aucun événement associé --</option>
              <option v-for="ev in churchEvents" :key="ev.id" :value="ev.id">
                {{ ev.title }} ({{ formatDate(ev.start_date || ev.date) }})
              </option>
            </select>
          </div>

          <div class="form-group mb-4">
            <label class="form-label">Description & Thème</label>
            <textarea
              v-model="createForm.description"
              class="form-control-custom textarea-custom"
              rows="3"
              placeholder="Orateur, passages bibliques médités, programme de louange..."
            ></textarea>
          </div>

          <div class="modal-footer-custom">
            <button
              type="button"
              class="btn-modal-cancel"
              @click="showCreateModal = false"
              :disabled="creating"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="btn-primary-action"
              :disabled="creating || !createForm.title || !createForm.youtube_url"
            >
              <span v-if="!creating">Enregistrer la diffusion</span>
              <span v-else class="spinner-sm"></span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 2 : PUBLIER LE REPLAY EN RESSOURCE D'ÉGLISE        -->
    <!-- ======================================================== -->
    <div v-if="showPublishModal" class="modal-backdrop" @click.self="showPublishModal = false">
      <div class="modal-dialog-custom">
        <div class="modal-header-custom">
          <div class="modal-title-wrap">
            <span class="modal-icon">📚</span>
            <div>
              <h3>Archiver en Ressource Paroissiale</h3>
              <p>Mettez ce replay à disposition dans la bibliothèque de ressources et formations.</p>
            </div>
          </div>
          <button class="btn-close-modal" @click="showPublishModal = false">✕</button>
        </div>

        <form @submit.prevent="submitPublishResource" class="modal-body-custom">
          <div v-if="publishError" class="modal-alert-danger">
            {{ publishError }}
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Titre de la ressource</label>
            <input
              v-model="publishForm.title"
              type="text"
              class="form-control-custom"
              required
            />
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Catégorie de ressource</label>
            <select v-model="publishForm.category_id" class="form-control-custom">
              <option :value="null">-- Choisir une catégorie --</option>
              <option v-for="cat in resourceCategories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Description</label>
            <textarea
              v-model="publishForm.description"
              class="form-control-custom textarea-custom"
              rows="3"
            ></textarea>
          </div>

          <div class="form-check-custom mb-4">
            <label class="check-container">
              <input type="checkbox" v-model="publishForm.is_free" />
              <span class="checkmark"></span>
              <span class="check-label">Accès libre et gratuit pour tous les fidèles</span>
            </label>
          </div>

          <div class="modal-footer-custom">
            <button
              type="button"
              class="btn-modal-cancel"
              @click="showPublishModal = false"
              :disabled="publishing"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="btn-primary-action"
              :disabled="publishing"
            >
              <span v-if="!publishing">Confirmer la publication</span>
              <span v-else class="spinner-sm"></span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 3 : GUIDE DE CONFIGURATION OBS STUDIO              -->
    <!-- ======================================================== -->
    <div v-if="showObsModal" class="modal-backdrop" @click.self="showObsModal = false">
      <div class="modal-dialog-custom modal-lg">
        <div class="modal-header-custom">
          <div class="modal-title-wrap">
            <span class="modal-icon">⚙️</span>
            <div>
              <h3>Guide de Configuration OBS Studio</h3>
              <p>Paramètres recommandés pour une diffusion fluide en direct.</p>
            </div>
          </div>
          <button class="btn-close-modal" @click="showObsModal = false">✕</button>
        </div>

        <div class="modal-body-custom">
          <div class="obs-guide-steps">
            <div class="step-card">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Créer le flux sur YouTube Studio</h4>
                <p>
                  Connectez-vous sur votre compte église sur <strong>studio.youtube.com</strong>, cliquez sur <em>Passer au direct</em>, puis copiez votre <strong>Clé de flux</strong>.
                </p>
              </div>
            </div>

            <div class="step-card">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Configurer OBS Studio</h4>
                <p>
                  Dans OBS Studio, rendez-vous dans <em>Paramètres &gt; Flux (Stream)</em>. Choisissez le service <strong>YouTube - RTMPS</strong> et collez votre clé de diffusion.
                </p>
              </div>
            </div>

            <div class="step-card">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Paramètres vidéo recommandés</h4>
                <div class="recommendations-box">
                  <div class="rec-item">
                    <span class="rec-label">Résolution :</span>
                    <span class="rec-val">1080p (1920x1080) ou 720p (1280x720)</span>
                  </div>
                  <div class="rec-item">
                    <span class="rec-label">Débit vidéo (Bitrate) :</span>
                    <span class="rec-val">4 500 à 6 000 Kbps (selon votre connexion fibre)</span>
                  </div>
                  <div class="rec-item">
                    <span class="rec-label">Images par seconde :</span>
                    <span class="rec-val">30 ou 60 FPS</span>
                  </div>
                  <div class="rec-item">
                    <span class="rec-label">Audio :</span>
                    <span class="rec-val">AAC 160 Kbps, 48 kHz</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="step-card">
              <div class="step-number">4</div>
              <div class="step-content">
                <h4>Lancer et Contrôler la Régie</h4>
                <p>
                  Cliquez sur <em>Commencer le streaming</em> dans OBS. Sur cette application, cliquez sur <strong>Passer en direct</strong> pour donner accès aux fidèles.
                </p>
              </div>
            </div>
          </div>

          <div class="modal-footer-custom">
            <button class="btn-primary-action" @click="showObsModal = false">
              J'ai compris, fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLiveStreamStore } from '@/stores/liveStream'
import LiveCard from '@/components/live/LiveCard.vue'
import api from '@/utils/api'

const router = useRouter()
const store = useLiveStreamStore()

// State
const selectedTab = ref('all')
const searchQuery = ref('')
const sortBy = ref('recent')
const showCreateModal = ref(false)
const showPublishModal = ref(false)
const showObsModal = ref(false)
const streamToPublish = ref(null)

const creating = ref(false)
const createError = ref('')
const publishing = ref(false)
const publishError = ref('')

const churchEvents = ref([])
const resourceCategories = ref([])

// Toast
const toast = ref({
  visible: false,
  message: '',
  icon: '✓',
  type: 'success',
})

const showToast = (message, icon = '✓', type = 'success') => {
  toast.value = { visible: true, message, icon, type }
  setTimeout(() => {
    toast.value.visible = false
  }, 3200)
}

const onShareSuccess = (title) => {
  showToast(`Lien de la diffusion copié dans le presse-papier !`, '🔗')
}

// Create Form
const createForm = ref({
  title: '',
  description: '',
  youtube_url: '',
  event_id: null,
  date: '',
  time: '',
})

// Publish Form
const publishForm = ref({
  title: '',
  description: '',
  category_id: null,
  is_free: true,
})

// Store computeds
const liveStreams = computed(() => store.liveStreams || [])
const loading = computed(() => store.loading)
const error = computed(() => store.error)

// Active Live Stream
const activeLive = computed(() => {
  return liveStreams.value.find(s => s.status === 'live') || store.activeLiveStream || null
})

// Counts
const liveCount = computed(() => {
  return liveStreams.value.filter(s => s.status === 'live').length
})

const scheduledCount = computed(() => {
  return liveStreams.value.filter(s => s.status === 'scheduled' || s.status === 'ready' || s.status === 'draft').length
})

const endedCount = computed(() => {
  return liveStreams.value.filter(s => s.status === 'ended' || s.status === 'processing').length
})

const linkedEventsCount = computed(() => {
  return liveStreams.value.filter(s => !!s.event_id || !!s.event).length
})

// Filtered and sorted streams
const filteredStreams = computed(() => {
  let list = [...liveStreams.value]

  // Tab filter
  if (selectedTab.value === 'live') {
    list = list.filter(s => s.status === 'live')
  } else if (selectedTab.value === 'scheduled') {
    list = list.filter(s => s.status === 'scheduled' || s.status === 'ready' || s.status === 'draft')
  } else if (selectedTab.value === 'ended') {
    list = list.filter(s => s.status === 'ended' || s.status === 'processing')
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(s => {
      const matchTitle = s.title && s.title.toLowerCase().includes(q)
      const matchDesc = s.description && s.description.toLowerCase().includes(q)
      const matchEvent = s.event?.title && s.event.title.toLowerCase().includes(q)
      return matchTitle || matchDesc || matchEvent
    })
  }

  // Sort
  if (sortBy.value === 'scheduled') {
    list.sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.created_at).getTime()
      const dateB = new Date(b.scheduled_at || b.created_at).getTime()
      return dateA - dateB
    })
  } else if (sortBy.value === 'title') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  } else {
    // Recent first
    list.sort((a, b) => {
      const dateA = new Date(a.created_at || a.scheduled_at || 0).getTime()
      const dateB = new Date(b.created_at || b.scheduled_at || 0).getTime()
      return dateB - dateA
    })
  }

  return list
})

const resetFilters = () => {
  selectedTab.value = 'all'
  searchQuery.value = ''
  sortBy.value = 'recent'
}

const goToWatch = (id) => {
  router.push({ name: 'live-watch', params: { id } })
}

const copyShareLink = async (stream) => {
  try {
    const url = `${window.location.origin}/live-streams/watch/${stream.id}`
    await navigator.clipboard.writeText(url)
    showToast(`Lien du direct copié ! Partagez-le avec vos fidèles.`, '🔗')
  } catch (e) {
    console.error(e)
  }
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Modal actions
const openCreateModal = () => {
  createError.value = ''
  createForm.value = {
    title: '',
    description: '',
    youtube_url: '',
    event_id: null,
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
  }
  showCreateModal.value = true
}

const submitCreateStream = async () => {
  creating.value = true
  createError.value = ''
  try {
    let scheduled_at = null
    if (createForm.value.date && createForm.value.time) {
      scheduled_at = `${createForm.value.date}T${createForm.value.time}:00`
    }

    const payload = {
      title: createForm.value.title.trim(),
      description: createForm.value.description?.trim() || null,
      youtube_url: createForm.value.youtube_url.trim(),
      event_id: createForm.value.event_id || null,
      scheduled_at,
      status: 'scheduled',
    }

    const res = await store.createLiveStream(payload)
    showCreateModal.value = false
    showToast(`Diffusion « ${res.title} » programmée avec succès !`, '✨')
  } catch (err) {
    createError.value = err?.data?.message || err?.message || 'Erreur lors de la création de la diffusion'
  } finally {
    creating.value = false
  }
}

const openPublishModal = (stream) => {
  streamToPublish.value = stream
  publishError.value = ''
  publishForm.value = {
    title: stream.title,
    description: stream.description || '',
    category_id: null,
    is_free: true,
  }
  showPublishModal.value = true
}

const submitPublishResource = async () => {
  if (!streamToPublish.value) return
  publishing.value = true
  publishError.value = ''
  try {
    const payload = {
      title: publishForm.value.title.trim(),
      description: publishForm.value.description?.trim() || null,
      category_id: publishForm.value.category_id || null,
      is_free: publishForm.value.is_free,
      status: 'published',
    }
    await store.publishAsResource(streamToPublish.value.id, payload)
    showPublishModal.value = false
    showToast(`Replay archivé dans vos Ressources avec succès !`, '📚')
  } catch (err) {
    publishError.value = err?.data?.message || err?.message || 'Erreur lors de la publication'
  } finally {
    publishing.value = false
  }
}

const handleDelete = async (stream) => {
  if (confirm(`Voulez-vous vraiment supprimer la diffusion « ${stream.title} » ?`)) {
    try {
      await store.deleteLiveStream(stream.id)
      showToast(`Diffusion supprimée avec succès.`, '🗑️')
    } catch (err) {
      alert(err?.data?.message || err?.message || 'Erreur lors de la suppression')
    }
  }
}

// Load metadata
const loadContextData = async () => {
  try {
    const [eventsRes, catRes] = await Promise.allSettled([
      api.get('/events'),
      api.get('/resource-categories'),
    ])
    if (eventsRes.status === 'fulfilled') {
      const d = eventsRes.value?.data || eventsRes.value
      churchEvents.value = Array.isArray(d) ? d : (d?.data || [])
    }
    if (catRes.status === 'fulfilled') {
      const d = catRes.value?.data || catRes.value
      resourceCategories.value = Array.isArray(d) ? d : (d?.data || [])
    }
  } catch (e) {
    // Non-bloquant
  }
}

onMounted(async () => {
  await store.fetchLiveStreams()
  await store.fetchActiveLiveStream()
  loadContextData()
})
</script>

<style scoped>
.media-studio-page {
  padding: 1.75rem 2rem 3rem 2rem;
  background: #f8fafc;
  min-height: calc(100vh - 70px);
}

/* Toast */
.studio-toast {
  position: fixed;
  top: 85px;
  right: 25px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #0f172a;
  color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  font-size: 0.9rem;
  font-weight: 600;
}

.studio-toast.success {
  border-left: 4px solid #10b981;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Header */
.studio-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4f46e5;
}

.page-title {
  margin: 0 0 0.4rem 0;
  font-size: 1.85rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.page-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
  max-width: 680px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-primary-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.4rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  border: none;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.3);
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary-action:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
}

.btn-secondary-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  background: #ffffff;
  color: #334155;
  border: 1px solid #e2e8f0;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary-action:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

/* Hero Live Banner */
.hero-live-banner {
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%);
  border-radius: 20px;
  padding: 2rem;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.hero-live-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -20%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.hero-live-content {
  flex: 1;
  z-index: 2;
}

.hero-live-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
}

.live-pulse-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 30px;
  background: rgba(220, 38, 38, 0.35);
  border: 1px solid rgba(239, 68, 68, 0.6);
  color: #fca5a5;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  position: relative;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.pulse-beacon {
  position: absolute;
  left: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.8);
  animation: beacon-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.hero-event-tag {
  background: rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.hero-live-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.3;
}

.hero-live-desc {
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
  color: #cbd5e1;
  line-height: 1.55;
  max-width: 600px;
}

.hero-live-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-hero-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.4rem;
  border-radius: 12px;
  background: #ef4444;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.92rem;
  text-decoration: none;
  box-shadow: 0 4px 18px rgba(239, 68, 68, 0.4);
  transition: all 0.2s ease;
}

.btn-hero-primary:hover {
  background: #dc2626;
  transform: translateY(-2px);
}

.btn-hero-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-weight: 600;
  font-size: 0.92rem;
  text-decoration: none;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}

.btn-hero-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.btn-hero-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: transparent;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-hero-share:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.hero-live-visual {
  position: relative;
  width: 380px;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  flex-shrink: 0;
  border: 2px solid rgba(239, 68, 68, 0.5);
  transition: transform 0.25s ease;
}

.hero-live-visual:hover {
  transform: scale(1.03);
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-visual-fallback {
  width: 100%;
  height: 100%;
  background: #1e1b4b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

.hero-play-circle {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 1.8rem;
  transition: background 0.2s ease;
}

.hero-live-visual:hover .hero-play-circle {
  background: rgba(0, 0, 0, 0.1);
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 1.35rem 1.25rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  border-color: #cbd5e1;
}

.kpi-card.live-kpi:hover {
  border-color: #fca5a5;
}

.kpi-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.kpi-live-icon {
  background: #fef2f2;
}

.kpi-sched-icon {
  background: #e0f2fe;
}

.kpi-vod-icon {
  background: #f0fdf4;
}

.kpi-event-icon {
  background: #f5f3ff;
}

.kpi-details {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.kpi-value-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kpi-number {
  font-size: 1.65rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.kpi-badge-live {
  background: #ef4444;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 10px;
  animation: beacon-ping 2s infinite;
}

.kpi-subtext {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
}

/* Toolbar */
.studio-toolbar {
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.tab-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.55rem 1rem;
  border-radius: 30px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab-pill:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.tab-pill.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.tab-pill.active .pill-counter {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.pill-counter {
  background: #e2e8f0;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 12px;
}

.pill-indicator-live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 0.5rem 0.85rem;
  min-width: 260px;
}

.search-icon {
  font-size: 0.9rem;
  color: #94a3b8;
  margin-right: 6px;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.85rem;
  color: #0f172a;
  width: 100%;
}

.clear-search {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.8rem;
}

.sort-select-wrap {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.45rem 0.65rem;
}

.sort-select {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.82rem;
  color: #334155;
  font-weight: 600;
  cursor: pointer;
}

/* Streams Grid */
.streams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.stream-grid-item {
  height: 100%;
}

/* Loading State */
.studio-loading-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #64748b;
}

.studio-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Alert */
.studio-alert-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.9rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

/* Empty State */
.studio-empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-card {
  max-width: 500px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  border: 1px solid #e2e8f0;
}

.empty-icon-circle {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 1.25rem auto;
}

.empty-card h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.empty-card p {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.55;
  margin-bottom: 1.5rem;
}

.empty-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-empty-reset {
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  background: #f1f5f9;
  color: #334155;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-empty-reset:hover {
  background: #e2e8f0;
}

/* ================= MODAL STYLES ================= */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 999;
}

.modal-dialog-custom {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  border: 1px solid #e2e8f0;
}

.modal-dialog-custom.modal-lg {
  max-width: 720px;
}

.modal-header-custom {
  padding: 1.5rem 1.75rem 1.25rem 1.75rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.modal-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.modal-icon {
  font-size: 1.6rem;
  background: #eef2ff;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-title-wrap h3 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}

.modal-title-wrap p {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.btn-close-modal {
  background: #f1f5f9;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close-modal:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.modal-body-custom {
  padding: 1.5rem 1.75rem;
}

.modal-alert-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  margin-bottom: 1.25rem;
  font-size: 0.85rem;
}

.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.4rem;
}

.form-label .req {
  color: #ef4444;
}

.form-control-custom {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-size: 0.92rem;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
}

.form-control-custom:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.textarea-custom {
  resize: vertical;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.icon-addon {
  position: absolute;
  left: 12px;
  font-size: 1rem;
  color: #94a3b8;
}

.form-control-custom.with-addon {
  padding-left: 2.4rem;
}

.field-hint {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 4px;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-col {
  flex: 1;
}

.form-check-custom {
  background: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.check-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  color: #334155;
}

.modal-footer-custom {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.btn-modal-cancel {
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-modal-cancel:hover {
  background: #e2e8f0;
}

.spinner-sm {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* OBS Guide inside modal */
.obs-guide-steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.step-card {
  display: flex;
  gap: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.1rem;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #4f46e5;
  color: #ffffff;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.step-content p {
  margin: 0;
  font-size: 0.85rem;
  color: #475569;
  line-height: 1.45;
}

.recommendations-box {
  margin-top: 0.75rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rec-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.rec-label {
  font-weight: 600;
  color: #334155;
}

.rec-val {
  color: #4f46e5;
  font-weight: 700;
}

/* Responsive */
@media (max-width: 900px) {
  .hero-live-banner {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-live-visual {
    width: 100%;
  }
  .studio-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-right {
    flex-direction: column;
    align-items: stretch;
  }
  .search-box {
    width: 100%;
  }
}
</style>
