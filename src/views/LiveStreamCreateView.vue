<template>
  <div class="live-stream-create-view container-fluid px-4 mt-4 mb-5">
    
    <!-- En-tête -->
    <div class="page-header d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="page-title"><i class="bi bi-broadcast text-danger"></i> Programmer une diffusion</h2>
        <p class="text-muted">Configurez votre direct YouTube pour le rendre accessible aux fidèles.</p>
      </div>
      <router-link :to="{ name: 'live-streams' }" class="btn btn-light shadow-sm btn-back">
        <i class="bi bi-arrow-left"></i> Retour
      </router-link>
    </div>

    <!-- Formulaire -->
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <div class="premium-card">
          <div class="card-body p-4 p-md-5">
            <form @submit.prevent="submitForm">
              
              <div v-if="error" class="alert alert-danger custom-alert d-flex align-items-center">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                {{ error }}
              </div>

              <!-- Bloc: Informations de base -->
              <h5 class="section-title"><i class="bi bi-info-circle text-primary"></i> Informations générales</h5>
              
              <div class="form-group mb-4">
                <label for="title" class="premium-label">Titre de la diffusion <span class="text-danger">*</span></label>
                <input type="text" class="form-control premium-input" id="title" v-model="form.title" required placeholder="Ex: Culte d'action de grâce - Dimanche">
              </div>

              <div class="form-group mb-5">
                <label for="description" class="premium-label">Description (Optionnelle)</label>
                <textarea class="form-control premium-input" id="description" v-model="form.description" rows="3" placeholder="Sujets abordés, versets, intervenants..."></textarea>
              </div>

              <!-- Bloc: Lien Vidéo -->
              <h5 class="section-title"><i class="bi bi-youtube text-danger"></i> Source vidéo</h5>
              
              <div class="form-group mb-5">
                <label for="youtube_url" class="premium-label">Lien YouTube du direct <span class="text-danger">*</span></label>
                <div class="input-group premium-input-group">
                  <span class="input-group-text"><i class="bi bi-link-45deg"></i></span>
                  <input type="url" class="form-control premium-input" id="youtube_url" v-model="form.youtube_url" required placeholder="https://www.youtube.com/watch?v=...">
                </div>
                <div class="form-text mt-2 text-muted">
                  <i class="bi bi-lightbulb"></i> Astuce : Créez la diffusion sur YouTube Studio, copiez le lien "Partager" et collez-le ici.
                </div>
              </div>

              <!-- Bloc: Planification -->
              <h5 class="section-title"><i class="bi bi-calendar-event text-success"></i> Planification & Liaison</h5>
              
              <div class="row mb-4">
                <div class="col-md-6 form-group">
                  <label for="scheduled_date" class="premium-label">Date prévue</label>
                  <input type="date" class="form-control premium-input" id="scheduled_date" v-model="form.date">
                </div>
                <div class="col-md-6 form-group">
                  <label for="scheduled_time" class="premium-label">Heure prévue</label>
                  <input type="time" class="form-control premium-input" id="scheduled_time" v-model="form.time">
                </div>
              </div>

              <div class="form-group mb-5">
                <label for="event_id" class="premium-label">Lier à un événement existant (ID)</label>
                <input type="number" class="form-control premium-input" id="event_id" v-model="form.event_id" placeholder="Ex: 12 (Laissez vide si aucun)">
              </div>

              <!-- Bouton de soumission -->
              <hr class="my-4">
              <div class="d-grid">
                <button type="submit" class="btn btn-premium btn-lg" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <i v-else class="bi bi-check-circle me-2"></i>
                  {{ loading ? 'Enregistrement en cours...' : 'Enregistrer la diffusion' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLiveStreamStore } from '@/stores/liveStream'

const store = useLiveStreamStore()
const router = useRouter()

const loading = computed(() => store.loading)
const error = ref(null)

const form = ref({
  title: '',
  description: '',
  youtube_url: '',
  event_id: null,
  date: '',
  time: ''
})

const submitForm = async () => {
  error.value = null
  try {
    let scheduled_at = null
    if (form.value.date && form.value.time) {
      scheduled_at = `${form.value.date}T${form.value.time}:00`
    }

    const payload = {
      title: form.value.title,
      description: form.value.description,
      youtube_url: form.value.youtube_url,
      event_id: form.value.event_id || null,
      scheduled_at: scheduled_at,
      status: 'scheduled'
    }

    const createdLive = await store.createLiveStream(payload)
    router.push({ name: 'live-manage', params: { id: createdLive.id } })
  } catch (err) {
    error.value = store.error || "Une erreur est survenue lors de la création."
  }
}
</script>

<style scoped>
/* Page Header */
.page-title {
  font-weight: 800;
  color: #1f2937;
  letter-spacing: -0.5px;
}
.btn-back {
  border-radius: 12px;
  font-weight: 600;
  color: #4b5563;
  transition: all 0.2s ease;
}
.btn-back:hover {
  transform: translateY(-2px);
  background-color: #f3f4f6;
}

/* Premium Card */
.premium-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0,0,0,0.02);
  border: 1px solid rgba(229, 231, 235, 0.5);
  overflow: hidden;
}

/* Typography & Layout */
.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f3f4f6;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Form Controls */
.premium-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;
  margin-bottom: 0.5rem;
}

.premium-input {
  border-radius: 12px;
  border: 1px solid #d1d5db;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: #1f2937;
  background-color: #f9fafb;
  transition: all 0.3s ease;
}

.premium-input:focus {
  background-color: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  outline: none;
}

.premium-input-group .input-group-text {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-right: none;
  border-radius: 12px 0 0 12px;
  color: #6b7280;
}

.premium-input-group .premium-input {
  border-radius: 0 12px 12px 0;
  border-left: none;
}

.premium-input-group .premium-input:focus {
  border-left: 1px solid #6366f1;
}

/* Premium Button */
.btn-premium {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1rem;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
  transition: all 0.3s ease;
}

.btn-premium:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
}

.btn-premium:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-premium:disabled {
  background: #9ca3af;
  box-shadow: none;
  cursor: not-allowed;
}

/* Alerts */
.custom-alert {
  border-radius: 12px;
  border: none;
  background-color: #fef2f2;
  color: #991b1b;
  font-weight: 500;
}
</style>
