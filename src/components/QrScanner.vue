<script setup>
import { ref, onBeforeUnmount, watch, nextTick, computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  autoStart: { type: Boolean, default: true },
  preferFrontCamera: { type: Boolean, default: false },
  scanIntervalMs: { type: Number, default: 350 },
  maxWidth: { type: Number, default: 640 },
  once: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'detected', 'error', 'camera-ready', 'camera-stopped'])

const videoEl = ref(null)
const canvasEl = ref(null)
const videoContainer = ref(null)
const stream = ref(null)
const running = ref(false)
const errorMessage = ref('')
const scanFeedback = ref('')
const detectedOnce = ref(false)
const availableCameras = ref([])
const selectedDeviceId = ref('')
const scanTimer = ref(null)
const loading = ref(false)

const isNativeMobileScanner = computed(() =>
  typeof window !== 'undefined' &&
  window.__CHURCH_MOBILE_NATIVE__ === true &&
  typeof window.flutter_inappwebview?.callHandler === 'function',
)

const hasSecureCameraContext = computed(() =>
  typeof window === 'undefined' || window.isSecureContext === true,
)

async function enumerateDevices() {
  try {
    if (!navigator?.mediaDevices?.enumerateDevices) return
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cams = devices.filter(d => d.kind === 'videoinput')
    availableCameras.value = cams
    if (!selectedDeviceId.value && cams.length) {
      const firstRear = cams.find(c => /back|rear|environ/i.test(c.label || ''))
      const firstFront = cams.find(c => /front|user|avant/i.test(c.label || ''))
      selectedDeviceId.value = (props.preferFrontCamera ? (firstFront || cams[0]) : (firstRear || cams[0]))?.deviceId || ''
    }
  } catch {
    // ignore
  }
}

async function startCamera() {
  if (isNativeMobileScanner.value) {
    loading.value = true
    errorMessage.value = ''
    scanFeedback.value = ''
    detectedOnce.value = false
    try {
      const value = await window.flutter_inappwebview.callHandler('churchStartQrScan')
      if (typeof value === 'string' && value.trim()) {
        onDetected(value.trim())
      } else {
        scanFeedback.value = 'Scan annulé.'
      }
    } catch (err) {
      errorMessage.value = err?.message || "Impossible d'ouvrir le scanner natif."
      emit('error', err)
    } finally {
      loading.value = false
    }
    return
  }

  if (!hasSecureCameraContext.value) {
    errorMessage.value = "La caméra du navigateur exige HTTPS. Dans l'application mobile, utilisez le scanner natif."
    emit('error', new Error(errorMessage.value))
    return
  }

  if (!navigator?.mediaDevices?.getUserMedia) {
    errorMessage.value = "Votre navigateur ne supporte pas l'accès à la caméra."
    emit('error', new Error(errorMessage.value))
    return
  }
  if (running.value) return
  loading.value = true
  errorMessage.value = ''
  scanFeedback.value = ''
  detectedOnce.value = false
  try {
    const constraints = {
      audio: false,
      video: {
        width: { ideal: props.maxWidth, max: 1280 },
        height: { ideal: Math.round(props.maxWidth * 0.75), max: 960 },
        facingMode: selectedDeviceId.value
          ? undefined
          : { ideal: props.preferFrontCamera ? 'user' : 'environment' },
        ...(selectedDeviceId.value ? { deviceId: { exact: selectedDeviceId.value } } : {}),
      },
    }
    stream.value = await navigator.mediaDevices.getUserMedia(constraints)
    if (videoEl.value) {
      videoEl.value.srcObject = stream.value
      try {
        await videoEl.value.play()
      } catch {
        videoEl.value.play().catch(() => {})
      }
    }
    await enumerateDevices()
    running.value = true
    loading.value = false
    emit('camera-ready')
    scheduleNextScan()
  } catch (err) {
    loading.value = false
    running.value = false
    stream.value = null
    const msg = err?.name === 'NotAllowedError' || err?.code === 1
      ? "🔒 Autorisation d'accès à la caméra refusée. Autorisez-la dans les paramètres de votre navigateur."
      : err?.name === 'NotFoundError'
      ? "❌ Aucune caméra détectée sur cet appareil."
      : err?.name === 'OverconstrainedError'
      ? "⚠️ Caméra indisponible avec ces contraintes. Changez de caméra si possible."
      : err?.message
      ? err.message
      : "Erreur lors du démarrage de la caméra."
    errorMessage.value = msg
    emit('error', err)
  }
}

function stopCamera() {
  try {
    if (scanTimer.value) { clearTimeout(scanTimer.value); scanTimer.value = null }
    if (stream.value) {
      stream.value.getTracks().forEach(t => {
        try { t.stop() } catch {}
      })
    }
  } catch {}
  stream.value = null
  running.value = false
  if (videoEl.value) {
    try { videoEl.value.pause() } catch {}
    videoEl.value.srcObject = null
  }
  emit('camera-stopped')
}

function onDetected(data) {
  scanFeedback.value = `✅ Détecté : ${data.slice(0, 40)}${data.length > 40 ? '…' : ''}`
  if (props.once && detectedOnce.value) return
  detectedOnce.value = true
  emit('update:modelValue', data)
  emit('detected', data)
  if (props.once) {
    setTimeout(() => stopCamera(), 400)
  }
}

function scheduleNextScan() {
  if (!running.value) return
  scanTimer.value = setTimeout(() => {
    try {
      processFrame()
    } finally {
      scheduleNextScan()
    }
  }, props.scanIntervalMs)
}

function processFrame() {
  if (!running.value || !videoEl.value || !canvasEl.value) return
  const video = videoEl.value
  if (!video.videoWidth || !video.videoHeight) return
  const canvas = canvasEl.value
  const W = Math.min(props.maxWidth, video.videoWidth)
  const scale = W / video.videoWidth
  const H = Math.round(video.videoHeight * scale)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  ctx.drawImage(video, 0, 0, W, H)
  let jsqr
  try {
    jsqr = window.__jsQR || null
    if (!jsqr) {
      import('jsqr').then(mod => {
        const fn = mod.default || mod
        window.__jsQR = fn
      }).catch(() => {})
    }
  } catch {}
  if (!jsqr) return
  try {
    const imageData = ctx.getImageData(0, 0, W, H)
    const code = jsqr(imageData.data, W, H, { inversionAttempts: 'dontInvert' })
    if (code && code.data) {
      onDetected(code.data)
    }
  } catch (e) {
    // ignore decode errors
  }
}

watch(selectedDeviceId, async (nv) => {
  if (!nv) return
  const wasRunning = running.value
  if (wasRunning) stopCamera()
  await nextTick()
  if (wasRunning || props.autoStart) await startCamera()
})

watch(() => props.autoStart, async (nv) => {
  if (nv && !running.value) await startCamera()
  else if (!nv && running.value) stopCamera()
})

defineExpose({ startCamera, stopCamera })

onBeforeUnmount(() => {
  stopCamera()
})
</script>

<template>
  <div class="qr-scanner-wrap" ref="videoContainer">
    <div v-if="!isNativeMobileScanner && !hasSecureCameraContext" class="qr-scanner-err danger">
      La caméra dans un navigateur nécessite <strong>HTTPS</strong>. Utilisez le scanner de l'application mobile ou ouvrez le site en HTTPS.
    </div>
    <div v-if="errorMessage" class="qr-scanner-err danger">{{ errorMessage }}</div>
    <div v-if="scanFeedback" class="qr-scanner-err success">{{ scanFeedback }}</div>

    <p v-if="isNativeMobileScanner" class="qr-scanner-native-help">
      Le scan s'ouvrira dans l'écran caméra de l'application.
    </p>

    <div v-if="!isNativeMobileScanner" class="qr-scanner-video-wrap">
      <video ref="videoEl" playsinline muted class="qr-scanner-video" :style="{ aspectRatio: '4/3' }"></video>
      <canvas ref="canvasEl" class="qr-scanner-canvas"></canvas>
      <div v-if="running" class="qr-scanner-overlay">
        <div class="qr-aimer"></div>
        <div class="qr-scanner-hint">Placez un QR code dans le cadre</div>
      </div>
      <div v-if="loading" class="qr-scanner-loading">
        <div class="qr-spinner"></div>
        <div>Ouverture de la caméra…</div>
      </div>
    </div>

    <div class="qr-scanner-actions">
      <div v-if="!isNativeMobileScanner" class="qr-cam-pick">
        <label for="qrCam" style="font-size:13px;color:var(--text-muted);margin-right:8px">Caméra :</label>
        <select
          id="qrCam"
          v-if="availableCameras.length"
          v-model="selectedDeviceId"
          class="small-select"
          style="min-width:220px"
        >
          <option v-for="(c,i) in availableCameras" :key="c.deviceId" :value="c.deviceId">
            📷 {{ c.label || `Caméra ${i + 1}` }}
          </option>
        </select>
      </div>
      <div class="qr-cam-buttons">
        <button
          v-if="!running"
          type="button"
          class="btn-secondary"
          @click="startCamera"
          :disabled="loading"
        >
          {{ isNativeMobileScanner ? '📷 Scanner le QR code' : '🎥 Démarrer la caméra' }}
        </button>
        <button
          v-else
          type="button"
          class="btn-secondary"
          @click="stopCamera"
        >
          ⏹️ Arrêter
        </button>
      </div>
    </div>

    <div class="qr-scanner-tip">
      💡 Si le scan ne fonctionne pas, utilisez une appli externe (ex: caméra de votre téléphone) et collez le contenu
      détecté dans le champ texte ci-dessous.
    </div>
  </div>
</template>

<style scoped>
.qr-scanner-wrap { display: flex; flex-direction: column; gap: 12px; }
.qr-scanner-video-wrap { position: relative; width: 100%; max-width: 520px; margin: 0 auto; border-radius: 14px; overflow: hidden; background: #000; border: 1px solid var(--border); aspect-ratio: 4/3; }
.qr-scanner-video { width: 100%; height: 100%; object-fit: cover; display: block; }
.qr-scanner-canvas { display: none; }
.qr-scanner-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; pointer-events: none; }
.qr-aimer { width: 60%; aspect-ratio: 1; border: 3px dashed #6366f1; border-radius: 18px; box-shadow: 0 0 0 9999px rgba(0,0,0,.45); animation: qr-pulse 1.6s ease-in-out infinite; }
@keyframes qr-pulse { 0%,100% { transform: scale(1); opacity: .95 } 50% { transform: scale(1.02); opacity: 1 } }
.qr-scanner-hint { margin-top: 14px; color: #fff; font-size: 13px; background: rgba(0,0,0,.5); padding: 6px 12px; border-radius: 999px; }
.qr-scanner-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #fff; background: rgba(0,0,0,.55); font-size: 14px; }
.qr-spinner { width: 44px; height: 44px; border: 4px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: qr-spin 1s linear infinite; }
@keyframes qr-spin { to { transform: rotate(360deg); } }
.qr-scanner-err { padding: 10px 12px; border-radius: 10px; font-size: 13px; }
.qr-scanner-err.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.qr-scanner-err.success { background: #ecfdf5; color: #166534; border: 1px solid #86efac; }
.qr-scanner-actions { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.qr-cam-pick, .qr-cam-buttons { display: flex; align-items: center; gap: 8px; }
.qr-scanner-tip { font-size: 12px; color: var(--text-muted); background: #f8fafc; border: 1px dashed var(--border); padding: 10px 12px; border-radius: 10px; }
.qr-scanner-native-help { margin: 0; color: var(--text-muted); font-size: 13px; }
.btn-secondary { background: #fff; color: var(--text-primary); border: 1px solid var(--border); padding: 8px 14px; border-radius: 10px; cursor: pointer; font-weight: 500; }
.btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
.btn-secondary:disabled { opacity: .55; cursor: not-allowed; }
.small-select { padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px; background: #fff; font-size: 13px; cursor: pointer; }
</style>
