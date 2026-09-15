<template>
  <div class="broadcast-settings p-4 bg-light rounded border">
    <h5 class="mb-4"><i class="bi bi-broadcast"></i> Configuration OBS</h5>
    
    <div class="mb-3">
      <label class="form-label fw-bold">URL du Serveur</label>
      <div class="input-group">
        <input 
          type="text" 
          class="form-control font-monospace text-muted" 
          :value="serverUrl" 
          readonly 
          ref="urlInput"
        />
        <button class="btn btn-outline-secondary" type="button" @click="copyText(serverUrl, 'url')">
          <i :class="copiedUrl ? 'bi bi-check2 text-success' : 'bi bi-clipboard'"></i> Copier
        </button>
      </div>
    </div>

    <div class="mb-4">
      <label class="form-label fw-bold">Clé de diffusion</label>
      <div class="input-group">
        <input 
          :type="showKey ? 'text' : 'password'" 
          class="form-control font-monospace text-muted" 
          :value="streamKey" 
          readonly 
        />
        <button class="btn btn-outline-secondary" type="button" @click="showKey = !showKey">
          <i :class="showKey ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
        </button>
        <button class="btn btn-outline-secondary" type="button" @click="copyText(streamKey, 'key')">
          <i :class="copiedKey ? 'bi bi-check2 text-success' : 'bi bi-clipboard'"></i> Copier
        </button>
      </div>
      <div class="form-text text-danger mt-1">
        <i class="bi bi-exclamation-triangle"></i> Ne partagez jamais cette clé.
      </div>
    </div>

    <div class="instructions mt-4">
      <h6><i class="bi bi-info-circle"></i> Instructions OBS Studio :</h6>
      <ol class="small text-muted mb-0">
        <li>Ouvrez OBS Studio et allez dans <strong>Paramètres</strong>.</li>
        <li>Cliquez sur l'onglet <strong>Flux (Stream)</strong>.</li>
        <li>Dans "Service", choisissez <strong>Personnalisé</strong>.</li>
        <li>Collez l'URL du serveur et la clé de diffusion copiées ci-dessus.</li>
        <li>Cliquez sur <strong>Appliquer</strong> puis <strong>Commencer le streaming</strong>.</li>
      </ol>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  serverUrl: {
    type: String,
    required: true
  },
  streamKey: {
    type: String,
    required: true
  }
})

const showKey = ref(false)
const copiedUrl = ref(false)
const copiedKey = ref(false)

const copyText = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'url') {
      copiedUrl.value = true
      setTimeout(() => copiedUrl.value = false, 2000)
    } else {
      copiedKey.value = true
      setTimeout(() => copiedKey.value = false, 2000)
    }
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}
</script>
