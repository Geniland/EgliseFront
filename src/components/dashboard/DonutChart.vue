<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  size: { type: Number, default: 200 },
  thickness: { type: Number, default: 30 },
})

const radius = computed(() => (props.size - props.thickness) / 2)
const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const normalized = computed(() => {
  const total = props.items.reduce((s, it) => s + (it.count || 0), 0) || 1
  return props.items.map((it) => ({
    ...it,
    count: it.count || 0,
    _fraction: (it.count || 0) / total,
  }))
})

const arcs = computed(() => {
  const circ = circumference.value
  let offset = 0
  return normalized.value.map((it) => {
    const dash = it._fraction * circ
    const gap = circ - dash
    const res = {
      ...it,
      dashArray: `${dash} ${gap}`,
      dashOffset: -offset,
    }
    offset += dash
    return res
  })
})
</script>

<template>
  <div class="donut-wrapper">
    <div class="donut-container" :style="{ width: size + 'px', height: size + 'px' }">
      <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size">
        <circle
          :cx="cx"
          :cy="cy"
          :r="radius"
          fill="none"
          stroke="#F3F4F6"
          :stroke-width="thickness"
        />
        <circle
          v-for="(arc, i) in arcs"
          :key="'arc-'+i"
          :cx="cx"
          :cy="cy"
          :r="radius"
          fill="none"
          :stroke="arc.color"
          :stroke-width="thickness"
          :stroke-dasharray="arc.dashArray"
          :stroke-dashoffset="arc.dashOffset"
          transform="rotate(-90, cx, cy)"
          stroke-linecap="butt"
        />
      </svg>
      <div class="donut-center">
        <div class="donut-center-label">Total</div>
        <div class="donut-center-value">{{ total.toLocaleString('fr-FR') }}</div>
      </div>
    </div>

    <div class="donut-legend">
      <div v-for="(item, i) in items" :key="'lg-'+i" class="donut-legend-item">
        <div class="donut-legend-left">
          <span class="donut-legend-color" :style="{ background: item.color }"></span>
          <span class="donut-legend-name">{{ item.name }}</span>
        </div>
        <div class="donut-legend-stats">
          {{ item.count.toLocaleString('fr-FR') }}
          <span style="margin:0 2px;color:var(--text-muted)">(</span>
          {{ item.percentage }}%
          <span style="margin:0 2px;color:var(--text-muted)">)</span>
        </div>
      </div>
    </div>
  </div>
</template>
