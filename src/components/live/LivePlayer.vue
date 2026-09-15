<template>
  <div class="live-player-container">
    <iframe
      v-if="playbackUrl || videoId"
      :src="iframeSrc"
      style="border: none; width: 100%; height: 100%; aspect-ratio: 16/9;"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      allowfullscreen="true"
    ></iframe>
    <div v-else class="no-video">
      <p>Vidéo non disponible pour le moment.</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  playbackUrl: {
    type: String,
    default: ''
  },
  videoId: {
    type: String,
    default: '' // YouTube Video ID
  }
})

// Compute the YouTube iframe URL
const iframeSrc = computed(() => {
  if (props.videoId) {
    return `https://www.youtube.com/embed/${props.videoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0`
  }
  return props.playbackUrl
})
</script>

<style scoped>
.live-player-container {
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.no-video {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16/9;
  color: #fff;
  background: #333;
}
</style>
