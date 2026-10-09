<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMembersStore } from '@/stores/members'

const authStore = useAuthStore()
const mStore = useMembersStore()

const loading = ref(false)
const error = ref('')

const qrSize = ref(280)
const qrData = computed(() => mStore.myQrCode)

const userFullName = computed(() => {
  const u = authStore.user
  if (!u) return ''
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`
  if (u.member?.first_name && u.member?.last_name) return `${u.member.first_name} ${u.member.last_name}`
  return u.name || 'Utilisateur'
})
const userMemberCode = computed(() => {
  return authStore.user?.member?.member_code || authStore.user?.member_code || ''
})
const userChurchName = computed(() => {
  return authStore.userChurchName || authStore.user?.church?.name || ''
})

async function loadMyQr() {
  loading.value = true
  error.value = ''
  try {
    const data = await mStore.loadMyQrCode(qrSize.value)
    if (!data) {
      error.value = 'Aucun QR code trouvé pour votre compte. Contactez l\'administrateur de votre église.'
    }
  } catch (e) {
    error.value = e?.message || 'Erreur de chargement du QR code.'
  } finally {
    loading.value = false
  }
}

function downloadPng() {
  const d = qrData.value?.qr_data_url
  if (!d) return
  const name = `Mon_QR_Code_${userMemberCode.value || authStore.user?.id || 'moi'}.png`
  const a = document.createElement('a')
  a.href = d
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}
function copyPayload() {
  const d = qrData.value?.qr_data_string
  if (!d) return
  navigator?.clipboard?.writeText(d)?.then(() => {
    const el = document.createElement('div')
    el.textContent = '✅ Contenu QR copié'
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#059669;color:#fff;padding:10px 20px;border-radius:10px;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.2);font-size:13px;font-weight:600;'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1800)
  })
}
function copyToken() {
  const d = qrData.value?.qr_token
  if (!d) return
  navigator?.clipboard?.writeText(d)?.then(() => {
    const el = document.createElement('div')
    el.textContent = '✅ Token copié'
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#4f46e5;color:#fff;padding:10px 20px;border-radius:10px;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.2);font-size:13px;font-weight:600;'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1800)
  })
}

onMounted(loadMyQr)
</script>

<template>
  <div class="myqr-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">🪪 Mon QR Code Personnel</h1>
        <p class="page-subtitle">Présentez ce code à l'accueil pour enregistrer votre présence.</p>
      </div>
      <button class="btn-secondary" @click="loadMyQr" :disabled="loading">
        <span v-if="loading">⏳ Chargement...</span>
        <span v-else>🔄 Recharger</span>
      </button>
    </div>

    <div class="myqr-grid">
      <div class="myqr-card qr-display-card">
        <div class="card-header">
          <h3>Mon QR Code</h3>
        </div>
        <div class="card-body qr-body">
          <div v-if="loading" class="empty-state">⏳ Chargement...</div>
          <div v-else-if="error" class="form-alert danger" style="margin:0">{{ error }}</div>
          <div v-else-if="qrData" class="qr-box">
            <div class="qr-border">
              <img :src="qrData.qr_data_url" alt="Mon QR Code" :width="qrSize" :height="qrSize" />
            </div>
            <div class="qr-note">
              Valable en permanence. Ne partagez pas ce code publiquement.
            </div>
          </div>
          <div v-else class="empty-state">Aucun QR code disponible.</div>
        </div>
      </div>

      <div class="myqr-card info-card">
        <div class="card-header">
          <h3>Informations</h3>
        </div>
        <div class="card-body">
          <div class="info-user">
            <div class="avatar" :style="{ background: `hsl(${(Number(authStore.user?.id || 0) * 53) % 360}, 60%, 55%)` }">
              {{ userFullName.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="user-name">{{ userFullName }}</div>
              <div v-if="userMemberCode" class="user-meta">
                <code class="member-code">{{ userMemberCode }}</code>
              </div>
              <div v-if="userChurchName" class="user-church">⛪ {{ userChurchName }}</div>
            </div>
          </div>

          <div v-if="qrData" class="info-list">
            <div class="info-item">
              <span class="info-label">Token permanent</span>
              <div class="info-val">
                <code>{{ qrData.qr_token || '—' }}</code>
                <button v-if="qrData.qr_token" class="btn-icon-sm" @click="copyToken" title="Copier">📋</button>
              </div>
            </div>
            <div class="info-item">
              <span class="info-label">Taille</span>
              <div class="info-val">
                <select v-model.number="qrSize" @change="qrSize = Number(qrSize); loadMyQr()" class="small-select">
                  <option :value="200">Petit (200px)</option>
                  <option :value="280">Standard (280px)</option>
                  <option :value="400">Grand (400px)</option>
                </select>
              </div>
            </div>
          </div>

          <div class="actions-row" v-if="qrData">
            <button class="btn-secondary" @click="copyPayload" :disabled="!qrData.qr_data_string">
              📋 Copier le contenu QR
            </button>
            <button class="btn-primary" @click="downloadPng" :disabled="!qrData.qr_data_url">
              ⬇️ Télécharger PNG
            </button>
          </div>
        </div>
      </div>

      <div class="myqr-card help-card">
        <div class="card-header">
          <h3>💡 Comment utiliser</h3>
        </div>
        <div class="card-body">
          <ol class="help-list">
            <li>Enregistrez ce QR code en image sur votre téléphone.</li>
            <li>Vous pouvez aussi l'imprimer sur une carte de fidèle.</li>
            <li>À chaque culte ou réunion, présentez-le à l'accueil.</li>
            <li>Le responsable scanne le code et votre présence est enregistrée instantanément.</li>
          </ol>
          <div class="help-tip">
            <strong>Perdu ?</strong> Retrouvez toujours votre QR code ici ou dans votre message de bienvenue dans la <strong>Messagerie Pastorale</strong>.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.myqr-page { padding: 0 0 24px; }

.page-header {
  display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 22px; gap: 16px; flex-wrap: wrap;
}
.page-title { margin: 0 0 4px; font-size: 24px; font-weight: 700; color: var(--text-primary); }
.page-subtitle { margin: 0; color: var(--text-muted); font-size: 14px; }

.btn-primary {
  background: linear-gradient(135deg, var(--primary), #4f46e5); color: #fff;
  border: none; padding: 10px 18px; border-radius: 10px; font-weight: 600;
  cursor: pointer; box-shadow: 0 4px 14px rgba(99,102,241,.25); transition: transform .15s;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-secondary {
  background: #fff; color: var(--text-primary); border: 1px solid var(--border);
  padding: 10px 16px; border-radius: 10px; cursor: pointer; font-weight: 500;
  transition: all .15s;
}
.btn-secondary:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.btn-secondary:disabled { opacity: .6; cursor: not-allowed; }
.small-select { padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px; background: #fff; font-size: 13px; cursor: pointer; }
.btn-icon-sm {
  background: #eef2ff; border: none; color: #4338ca; padding: 4px 8px; border-radius: 6px;
  cursor: pointer; font-size: 13px; margin-left: 8px; transition: background .15s;
}
.btn-icon-sm:hover { background: #e0e7ff; }

.myqr-grid {
  display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; max-width: 1100px;
}
@media (max-width: 900px) { .myqr-grid { grid-template-columns: 1fr; } }

.myqr-card {
  background: #fff; border-radius: 16px; border: 1px solid var(--border-light);
  box-shadow: var(--card-shadow); overflow: hidden;
}
.card-header {
  padding: 14px 20px; border-bottom: 1px solid var(--border-light);
  background: linear-gradient(180deg, #fafbff, #ffffff);
}
.card-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary); }
.card-body { padding: 20px; }

.qr-display-card { }
.qr-body { text-align: center; }
.qr-box { margin-bottom: 8px; }
.qr-border {
  display: inline-block; padding: 20px; background: #fff;
  border: 3px dashed #6366f1; border-radius: 18px; margin-bottom: 14px;
}
.qr-border img { display: block; }
.qr-note { font-size: 13px; color: #b45309; background: #fffbeb; padding: 8px 12px; border-radius: 8px; display: inline-block; }

.empty-state { padding: 40px 20px; color: var(--text-muted); font-size: 14px; }

.info-card .info-user {
  display: flex; align-items: center; gap: 12px; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px dashed var(--border-light);
}
.info-card .avatar {
  width: 50px; height: 50px; border-radius: 50%; color: #fff; font-weight: 700;
  display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
}
.info-card .user-name { font-weight: 700; font-size: 16px; color: var(--text-primary); }
.info-card .user-meta { margin: 2px 0; }
.info-card .user-church { font-size: 12px; color: var(--text-muted); }
.member-code {
  background: #f1f5f9; padding: 3px 8px; border-radius: 6px;
  font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--text-primary);
}
.info-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; }
.info-val {
  display: flex; align-items: center; justify-content: space-between;
  background: #f8fafc; border: 1px solid var(--border-light); padding: 8px 12px; border-radius: 8px;
  font-family: ui-monospace, Menlo, monospace; font-size: 13px; word-break: break-all;
}
.actions-row { display: flex; gap: 10px; flex-wrap: wrap; }
.actions-row .btn-primary, .actions-row .btn-secondary { flex: 1; min-width: 180px; }

.form-alert { padding: 12px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; }
.form-alert.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

.help-card { grid-column: 1 / -1; }
.help-list { margin: 0 0 12px 18px; padding: 0; color: var(--text-secondary); line-height: 1.7; }
.help-list li { margin-bottom: 6px; }
.help-tip {
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 14px;
  color: #1e40af; font-size: 13px; margin-top: 6px;
}
</style>
