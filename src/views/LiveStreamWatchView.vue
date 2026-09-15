<template>
  <div class="live-watch-view bg-dark min-vh-100 text-white pb-5">
    <!-- Navbar / Header minimaliste -->
    <div class="container pt-4 pb-3">
      <router-link :to="{ name: 'live-streams' }" class="text-white text-decoration-none">
        <i class="bi bi-arrow-left"></i> Retour aux diffusions
      </router-link>
    </div>

    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-light" role="status"></div>
    </div>
    
    <div class="container" v-else-if="stream">
      <div class="row">
        <!-- Zone Vidéo -->
        <div class="col-lg-8 mx-auto">
          
          <div class="mb-3 d-flex justify-content-between align-items-center">
            <h3 class="mb-0">{{ stream.title }}</h3>
            <LiveStatus :status="stream.status" />
          </div>

          <div v-if="stream.status === 'live' || stream.status === 'ended' || stream.status === 'processing'" class="mb-4 shadow-lg rounded">
            <!-- Player Video Cloudflare -->
            <LivePlayer 
              :videoId="stream.provider_live_input_id" 
              :playbackUrl="stream.playback_url" 
            />
          </div>
          
          <div v-else class="alert alert-secondary text-center py-5">
            <i class="bi bi-clock" style="font-size: 2rem;"></i>
            <h4 class="mt-3">La diffusion n'a pas encore commencé</h4>
            <p>Date prévue : {{ stream.scheduled_at ? new Date(stream.scheduled_at).toLocaleString('fr-FR') : 'Bientôt' }}</p>
          </div>

          <div class="bg-darker p-4 rounded mt-4">
            <h5>À propos</h5>
            <p class="text-light-50">{{ stream.description || 'Aucune description.' }}</p>
          </div>

        </div>
      </div>
    </div>

    <div v-else class="text-center mt-5">
      <h3>Diffusion introuvable</h3>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/utils/api'
import LiveStatus from '@/components/live/LiveStatus.vue'
import LivePlayer from '@/components/live/LivePlayer.vue'

const route = useRoute()
const stream = ref(null)
const loading = ref(true)
let statusPolling = null

const loadStream = async () => {
  try {
    // Si ID fourni dans la route, le charger
    if (route.params.id) {
      const response = await api.get(`/live-streams/${route.params.id}`)
      stream.value = response.data.data || response.data
    } else {
      // Sinon charger le live actif
      const response = await api.get(`/live-streams/active`)
      stream.value = response.data.data || response.data || null
    }
  } catch (err) {
    console.error("Erreur lors du chargement de la diffusion", err)
  } finally {
    loading.value = false
  }
}

// Poll status every 15s to update badge (draft -> live -> ended)
const pollStatus = async () => {
  if (!stream.value) return
  try {
    const response = await api.get(`/live-streams/${stream.value.id}/status`)
    if (stream.value.status !== response.data.status) {
      stream.value.status = response.data.status
    }
  } catch(err) {
    // ignore polling errors
  }
}

onMounted(() => {
  loadStream()
  statusPolling = setInterval(pollStatus, 15000)
})

onUnmounted(() => {
  if (statusPolling) clearInterval(statusPolling)
})
</script>

<style scoped>
.bg-darker {
  background-color: #1a1a1a;
}
.text-light-50 {
  color: rgba(255, 255, 255, 0.7);
}
</style>
