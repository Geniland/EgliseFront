<template>
  <span :class="['live-status-pill', statusKey]">
    <span v-if="statusKey === 'live'" class="beacon-wrap">
      <span class="beacon-pulse"></span>
      <span class="beacon-core"></span>
    </span>
    <span v-else class="status-icon">{{ statusIcon }}</span>
    <span class="status-text">{{ statusLabel }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  }
})

const statusMap = {
  draft: { label: 'Brouillon', icon: '📝' },
  scheduled: { label: 'Programmé', icon: '📅' },
  ready: { label: 'Prêt à diffuser', icon: '⚡' },
  live: { label: 'EN DIRECT', icon: '🔴' },
  ending: { label: 'Clôture en cours', icon: '⏳' },
  processing: { label: 'Traitement VOD', icon: '⚙️' },
  ended: { label: 'Replay VOD', icon: '📼' },
  cancelled: { label: 'Annulé', icon: '❌' },
  error: { label: 'Erreur', icon: '⚠️' }
}

const statusKey = computed(() => props.status || 'draft')
const statusLabel = computed(() => statusMap[statusKey.value]?.label || statusKey.value)
const statusIcon = computed(() => statusMap[statusKey.value]?.icon || '•')
</script>

<style scoped>
.live-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}

.status-icon {
  font-size: 0.8rem;
  line-height: 1;
}

/* Status variants */
.live-status-pill.live {
  background: rgba(220, 38, 38, 0.92);
  color: #ffffff;
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.6);
  border: 1px solid rgba(254, 202, 202, 0.5);
}

.live-status-pill.scheduled {
  background: rgba(14, 165, 233, 0.15);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.3);
}

.live-status-pill.ready {
  background: rgba(99, 102, 241, 0.15);
  color: #4f46e5;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.live-status-pill.ended {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.live-status-pill.processing,
.live-status-pill.ending {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.live-status-pill.draft,
.live-status-pill.cancelled {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

/* Pulsing radar dot for live */
.beacon-wrap {
  position: relative;
  display: inline-flex;
  width: 8px;
  height: 8px;
}

.beacon-core {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffffff;
}

.beacon-pulse {
  position: absolute;
  top: -3px;
  left: -3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  opacity: 0.75;
  animation: beacon-ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes beacon-ping {
  0% { transform: scale(0.8); opacity: 0.9; }
  80%, 100% { transform: scale(2.2); opacity: 0; }
}
</style>
