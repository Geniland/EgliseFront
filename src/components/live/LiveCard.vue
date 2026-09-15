<template>
  <div class="stream-card">
    <!-- Thumbnail Container -->
    <div class="thumbnail-wrapper" @click="handlePrimaryClick">
      <img
        v-if="youtubeThumbnail"
        :src="youtubeThumbnail"
        :alt="stream.title"
        class="thumbnail-img"
        @error="thumbnailError = true"
      />
      <div v-if="!youtubeThumbnail || thumbnailError" class="thumbnail-fallback">
        <span class="fallback-icon">⛪</span>
        <span class="fallback-text">Diffusion Paroissiale</span>
      </div>

      <!-- Gradient overlay -->
      <div class="thumbnail-overlay"></div>

      <!-- Top Badges -->
      <div class="thumbnail-top-bar">
        <LiveStatus :status="stream.status" />
        <span v-if="stream.event?.title" class="event-tag">
          📍 {{ stream.event.title }}
        </span>
      </div>

      <!-- Play Button Overlay -->
      <div class="play-overlay">
        <div class="play-btn-circle">
          <span class="play-icon">{{ stream.status === 'live' ? '🔴' : '▶' }}</span>
        </div>
      </div>

      <!-- Bottom Timestamp on thumbnail -->
      <div class="thumbnail-bottom-bar">
        <span class="date-chip">
          📅 {{ formattedDate }}
        </span>
      </div>
    </div>

    <!-- Content Body -->
    <div class="card-content">
      <h3 class="stream-title" :title="stream.title" @click="handlePrimaryClick">
        {{ stream.title }}
      </h3>
      <p class="stream-desc">
        {{ stream.description || 'Aucune description détaillée pour cette diffusion.' }}
      </p>

      <!-- Footer Actions -->
      <div class="card-footer-actions">
        <button
          v-if="stream.status === 'live'"
          class="btn-action btn-watch-live"
          @click="goToWatch"
        >
          <span>🔴</span>
          <span>Regarder en direct</span>
        </button>

        <button
          v-else-if="stream.status === 'ended' || stream.status === 'processing'"
          class="btn-action btn-watch-replay"
          @click="goToWatch"
        >
          <span>▶️</span>
          <span>Voir le Replay</span>
        </button>

        <button
          v-else
          class="btn-action btn-manage-studio"
          @click="goToManage"
        >
          <span>🎛️</span>
          <span>Accéder à la Régie</span>
        </button>

        <!-- Secondary Button Group -->
        <div class="secondary-actions">
          <button
            class="btn-icon-action"
            title="Partager le lien"
            @click="copyShareLink"
          >
            <span>🔗</span>
            <span v-if="copied" class="copied-tooltip">Lien copié !</span>
          </button>

          <div class="dropdown-wrap" ref="dropdownRef">
            <button
              class="btn-icon-action"
              title="Options supplémentaires"
              @click="showMenu = !showMenu"
            >
              <span>⋮</span>
            </button>

            <div v-if="showMenu" class="dropdown-menu-custom">
              <button
                v-if="canManage"
                class="dropdown-item"
                @click="goToManage"
              >
                <span>⚙️</span>
                <span>Gérer la régie</span>
              </button>

              <button
                v-if="canManage && (stream.status === 'ended' || stream.status === 'processing')"
                class="dropdown-item"
                @click="emitPublish"
              >
                <span>📚</span>
                <span>Publier en Ressource</span>
              </button>

              <a
                v-if="stream.provider_live_input_id"
                :href="'https://www.youtube.com/watch?v=' + stream.provider_live_input_id"
                target="_blank"
                rel="noopener"
                class="dropdown-item"
                @click="showMenu = false"
              >
                <span>📺</span>
                <span>Ouvrir sur YouTube ↗</span>
              </a>

              <button
                v-if="canManage"
                class="dropdown-item item-danger"
                @click="emitDelete"
              >
                <span>🗑️</span>
                <span>Supprimer la diffusion</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import LiveStatus from './LiveStatus.vue'

const props = defineProps({
  stream: {
    type: Object,
    required: true,
  },
  canManage: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['publish-resource', 'delete', 'share-success'])

const router = useRouter()
const thumbnailError = ref(false)
const copied = ref(false)
const showMenu = ref(false)
const dropdownRef = ref(null)

const youtubeThumbnail = computed(() => {
  if (thumbnailError.value) return null
  const id = props.stream.provider_live_input_id
  if (!id) return null
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
})

const formattedDate = computed(() => {
  const dStr = props.stream.scheduled_at || props.stream.started_at || props.stream.created_at
  if (!dStr) return 'Date indéterminée'
  const date = new Date(dStr)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})

const goToWatch = () => {
  router.push({ name: 'live-watch', params: { id: props.stream.id } })
}

const goToManage = () => {
  router.push({ name: 'live-manage', params: { id: props.stream.id } })
}

const handlePrimaryClick = () => {
  if (props.stream.status === 'live' || props.stream.status === 'ended' || props.stream.status === 'processing') {
    goToWatch()
  } else {
    goToManage()
  }
}

const copyShareLink = async () => {
  try {
    const url = `${window.location.origin}/live-streams/watch/${props.stream.id}`
    await navigator.clipboard.writeText(url)
    copied.value = true
    emit('share-success', props.stream.title)
    setTimeout(() => {
      copied.value = false
    }, 2200)
  } catch (e) {
    console.error('Erreur copie presse-papier', e)
  }
}

const emitPublish = () => {
  showMenu.value = false
  emit('publish-resource', props.stream)
}

const emitDelete = () => {
  showMenu.value = false
  emit('delete', props.stream)
}

const handleClickOutside = (e) => {
  if (showMenu.value && dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.stream-card {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.stream-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  border-color: #cbd5e1;
}

/* Thumbnail */
.thumbnail-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #0f172a;
  overflow: hidden;
  cursor: pointer;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.stream-card:hover .thumbnail-img {
  transform: scale(1.05);
}

.thumbnail-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
  color: #ffffff;
  gap: 6px;
}

.fallback-icon {
  font-size: 2.2rem;
}

.fallback-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: #c7d2fe;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, transparent 40%, rgba(0, 0, 0, 0.75) 100%);
  pointer-events: none;
}

.thumbnail-top-bar {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
  gap: 8px;
}

.event-tag {
  background: rgba(15, 23, 42, 0.75);
  color: #e2e8f0;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
  max-width: 50%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-bottom-bar {
  position: absolute;
  bottom: 8px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
}

.date-chip {
  background: rgba(0, 0, 0, 0.65);
  color: #f1f5f9;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

/* Play button center overlay */
.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.stream-card:hover .play-overlay {
  opacity: 1;
}

.play-btn-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  transform: scale(0.9);
  transition: transform 0.2s ease;
}

.stream-card:hover .play-btn-circle {
  transform: scale(1);
}

.play-icon {
  font-size: 1.1rem;
  color: #0f172a;
  margin-left: 2px;
}

/* Card Content */
.card-content {
  padding: 1.25rem 1.25rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.stream-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
  transition: color 0.15s ease;
}

.stream-title:hover {
  color: #4f46e5;
}

.stream-desc {
  margin: 0 0 1.25rem 0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

/* Footer Actions */
.card-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.btn-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-watch-live {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.3);
}

.btn-watch-live:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-1px);
}

.btn-watch-replay {
  background: #f1f5f9;
  color: #0f172a;
}

.btn-watch-replay:hover {
  background: #e2e8f0;
  color: #000000;
  transform: translateY(-1px);
}

.btn-manage-studio {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(79, 70, 229, 0.25);
}

.btn-manage-studio:hover {
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
  transform: translateY(-1px);
}

.secondary-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-icon-action {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon-action:hover {
  background: #f8fafc;
  color: #0f172a;
  border-color: #cbd5e1;
}

.copied-tooltip {
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #ffffff;
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

/* Dropdown */
.dropdown-wrap {
  position: relative;
}

.dropdown-menu-custom {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 6px;
  width: 210px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  padding: 6px;
  z-index: 30;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  text-align: left;
  transition: background 0.12s ease;
}

.dropdown-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.dropdown-item.item-danger {
  color: #ef4444;
}

.dropdown-item.item-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}
</style>
