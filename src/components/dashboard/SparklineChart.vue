<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, required: true },
  color: { type: String, default: '#4F46E5' },
  height: { type: Number, default: 32 },
  width: { type: Number, default: 200 },
  stroke: { type: Number, default: 2 },
  filled: { type: Boolean, default: true },
})

const pathD = computed(() => {
  const arr = props.data
  if (!arr || arr.length === 0) return ''
  const w = props.width
  const h = props.height
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const range = max - min || 1
  const stepX = w / (arr.length - 1 || 1)
  const points = arr.map((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  return 'M' + points.join(' L')
})

const fillPathD = computed(() => {
  const arr = props.data
  if (!arr || arr.length === 0) return ''
  const w = props.width
  const h = props.height
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const range = max - min || 1
  const stepX = w / (arr.length - 1 || 1)
  const pts = arr.map((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const first = `0,${h}`
  const last = `${((arr.length - 1) * stepX).toFixed(2)},${h}`
  return `M${first} L${pts.join(' L')} L${last} Z`
})
</script>

<template>
  <svg class="sparkline" :viewBox="`0 0 ${width} ${height}`" :width="'100%'" :height="height + 'px'" preserveAspectRatio="none">
    <defs>
      <linearGradient :id="'sparkFill-'+color.replace('#','')" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.35"/>
        <stop offset="100%" :stop-color="color" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path
      v-if="filled"
      :d="fillPathD"
      :fill="`url(#sparkFill-${color.replace('#','')})`"
    />
    <path
      :d="pathD"
      fill="none"
      :stroke="color"
      :stroke-width="stroke"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
