<script setup>
import { computed } from 'vue'

const props = defineProps({
  labels: { type: Array, default: () => [] },
  datasets: { type: Array, default: () => [] },
  height: { type: Number, default: 220 },
})

const width = 600
const padLeft = 44
const padRight = 44
const padTop = 10
const padBottom = 28
const innerW = width - padLeft - padRight
const innerH = props.height - padTop - padBottom

const yLeftTicks = computed(() => {
  const ds = props.datasets[0]?.data || []
  const max = Math.max(1, ...ds)
  const step = Math.ceil(max / 4 / 10) * 10 || 1
  const ticks = []
  for (let i = 0; i <= 4; i++) ticks.push(i * step)
  return ticks
})

const yRightTicks = computed(() => {
  const ds = props.datasets[1]?.data || []
  const max = Math.max(1, ...ds)
  const step = Math.ceil(max / 4 / 100000) * 100000 || 100000
  const ticks = []
  for (let i = 0; i <= 4; i++) ticks.push(i * step)
  return ticks
})

const fmtYLeft = (v) => {
  if (v >= 1000) return (v / 1000).toFixed(0) + 'K'
  return String(v)
}
const fmtYRight = (v) => {
  if (v >= 1000000) return (v / 1000000).toFixed(0) + 'M'
  if (v >= 1000) return (v / 1000).toFixed(0) + 'K'
  return String(v)
}

const linesPath = (dataArr, maxValue) => {
  if (!dataArr.length) return ''
  const max = Math.max(1, ...dataArr, maxValue || 0)
  const stepX = innerW / (Math.max(1, dataArr.length - 1))
  const pts = dataArr.map((v, i) => {
    const x = padLeft + i * stepX
    const y = padTop + innerH - (v / max) * innerH
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  return 'M' + pts.join(' L')
}

const areaPath = (dataArr, maxValue) => {
  if (!dataArr.length) return ''
  const max = Math.max(1, ...dataArr, maxValue || 0)
  const stepX = innerW / (Math.max(1, dataArr.length - 1))
  const pts = dataArr.map((v, i) => {
    const x = padLeft + i * stepX
    const y = padTop + innerH - (v / max) * innerH
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const first = `${padLeft},${padTop + innerH}`
  const last = `${padLeft + (dataArr.length - 1) * stepX},${padTop + innerH}`
  return `M${first} L${pts.join(' L')} L${last} Z`
}

const line0Color = computed(() => props.datasets[0]?.borderColor || '#3B82F6')
const line1Color = computed(() => props.datasets[1]?.borderColor || '#10B981')
const data0 = computed(() => props.datasets[0]?.data || [])
const data1 = computed(() => props.datasets[1]?.data || [])

const xStep = computed(() => {
  const n = props.labels.length
  if (n <= 8) return 1
  return Math.ceil(n / 8)
})
</script>

<template>
  <svg class="chart-svg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none">
    <defs>
      <linearGradient id="gradPresences" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="line0Color" stop-opacity="0.25"/>
        <stop offset="100%" :stop-color="line0Color" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="gradDonations" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="line1Color" stop-opacity="0.25"/>
        <stop offset="100%" :stop-color="line1Color" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <g>
      <line
        v-for="(tick, i) in yLeftTicks"
        :key="'hl-'+i"
        :x1="padLeft"
        :x2="width - padRight"
        :y1="padTop + innerH - (i / (yLeftTicks.length - 1)) * innerH"
        :y2="padTop + innerH - (i / (yLeftTicks.length - 1)) * innerH"
        class="chart-grid"
      />
    </g>

    <g>
      <text
        v-for="(tick, i) in yLeftTicks"
        :key="'yl-'+i"
        :x="padLeft - 8"
        :y="padTop + innerH - (i / (yLeftTicks.length - 1)) * innerH + 3"
        text-anchor="end"
        class="chart-y-label"
      >{{ fmtYLeft(tick) }}</text>

      <text
        v-for="(tick, i) in yRightTicks"
        :key="'yr-'+i"
        :x="width - padRight + 8"
        :y="padTop + innerH - (i / (yRightTicks.length - 1)) * innerH + 3"
        text-anchor="start"
        class="chart-y-label"
      >{{ fmtYRight(tick) }}</text>
    </g>

    <path
      :d="areaPath(data0, Math.max(...yLeftTicks))"
      fill="url(#gradPresences)"
    />
    <path
      :d="areaPath(data1, Math.max(...yRightTicks))"
      fill="url(#gradDonations)"
    />

    <path
      :d="linesPath(data0, Math.max(...yLeftTicks))"
      class="chart-line"
      :stroke="line0Color"
    />
    <path
      :d="linesPath(data1, Math.max(...yRightTicks))"
      class="chart-line"
      :stroke="line1Color"
    />

    <g>
      <text
        v-for="(lbl, i) in labels"
        v-show="i % xStep === 0"
        :key="'xl-'+i"
        :x="padLeft + i * (innerW / Math.max(1, labels.length - 1))"
        :y="height - 8"
        text-anchor="middle"
        class="chart-x-label"
      >{{ lbl }}</text>
    </g>
  </svg>
</template>
