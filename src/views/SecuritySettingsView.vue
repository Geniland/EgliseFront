<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/utils/api'

const sessions = ref([])
const sessionsLoading = ref(true)
const sessionsError = ref('')
const passwordSaving = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')
const revokeOpen = ref(false)
const revokePassword = ref('')
const revokeLoading = ref(false)
const revokeError = ref('')
const revokeSuccess = ref('')
const passwordForm = ref({ current_password: '', password: '', password_confirmation: '' })
const otherSessions = computed(() => sessions.value.filter((session) => !session.is_current))
const messageFromError = (error, fallback) => error?.data?.message || error?.message || fallback

const loadSessions = async () => {
  sessionsLoading.value = true
  sessionsError.value = ''
  try {
    const response = await api.get('/me/security/sessions')
    sessions.value = Array.isArray(response.data?.sessions) ? response.data.sessions : []
  } catch (error) {
    sessionsError.value = messageFromError(error, 'Impossible de charger vos connexions.')
  } finally {
    sessionsLoading.value = false
  }
}

const changePassword = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''
  passwordSaving.value = true
  try {
    const response = await api.patch('/me/security/password', passwordForm.value)
    passwordSuccess.value = response.data?.message || 'Votre mot de passe a été modifié.'
    passwordForm.value = { current_password: '', password: '', password_confirmation: '' }
  } catch (error) {
    passwordError.value = error?.data?.errors?.current_password?.[0]
      || error?.data?.errors?.password?.[0]
      || messageFromError(error, 'La modification du mot de passe a échoué.')
  } finally {
    passwordSaving.value = false
  }
}

const revokeOtherSessions = async () => {
  revokeError.value = ''
  revokeSuccess.value = ''
  revokeLoading.value = true
  try {
    const response = await api.delete('/me/security/sessions/others', { current_password: revokePassword.value })
    revokeSuccess.value = response.data?.message || 'Les autres connexions ont été déconnectées.'
    revokePassword.value = ''
    revokeOpen.value = false
    await loadSessions()
  } catch (error) {
    revokeError.value = error?.data?.errors?.current_password?.[0]
      || messageFromError(error, 'La déconnexion des autres appareils a échoué.')
  } finally {
    revokeLoading.value = false
  }
}

const formatDate = (value) => {
  if (!value) return 'Aucune activité enregistrée'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date inconnue'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const sessionName = (session) => {
  if (session.is_current) return 'Cet appareil'
  if (session.name === 'auth_token') return 'Connexion à l’application'
  return session.name || 'Appareil connecté'
}

onMounted(loadSessions)
</script>

<template>
  <main class="security-page">
    <header class="security-heading">
      <div class="security-heading-icon" aria-hidden="true">🛡️</div>
      <div>
        <p class="security-eyebrow">Compte et accès</p>
        <h1>Paramètres de sécurité</h1>
        <p class="security-subtitle">Gérez votre mot de passe et les appareils connectés à votre compte.</p>
      </div>
    </header>

    <div v-if="passwordSuccess" class="security-alert security-alert--success" role="status">{{ passwordSuccess }}</div>

    <div class="security-grid">
      <section class="security-card">
        <div class="security-card-heading">
          <div class="security-card-icon security-card-icon--blue" aria-hidden="true">🔑</div>
          <div><h2>Modifier le mot de passe</h2><p>Choisissez un mot de passe d’au moins 8 caractères.</p></div>
        </div>
        <div v-if="passwordError" class="security-alert security-alert--error" role="alert">{{ passwordError }}</div>
        <form class="security-form" @submit.prevent="changePassword">
          <label><span>Mot de passe actuel</span><input v-model="passwordForm.current_password" type="password" autocomplete="current-password" required /></label>
          <label><span>Nouveau mot de passe</span><input v-model="passwordForm.password" type="password" autocomplete="new-password" minlength="8" required /></label>
          <label><span>Confirmer le nouveau mot de passe</span><input v-model="passwordForm.password_confirmation" type="password" autocomplete="new-password" minlength="8" required /></label>
          <button class="security-button security-button--primary" type="submit" :disabled="passwordSaving">
            {{ passwordSaving ? 'Enregistrement…' : 'Mettre à jour le mot de passe' }}
          </button>
        </form>
      </section>

      <section class="security-card">
        <div class="security-card-heading">
          <div class="security-card-icon security-card-icon--green" aria-hidden="true">📱</div>
          <div><h2>Appareils connectés</h2><p>Consultez vos connexions et fermez celles que vous ne reconnaissez pas.</p></div>
        </div>
        <div v-if="sessionsError" class="security-alert security-alert--error" role="alert">
          {{ sessionsError }} <button class="security-text-button" type="button" @click="loadSessions">Réessayer</button>
        </div>
        <p v-else-if="sessionsLoading" class="security-muted">Chargement des connexions…</p>
        <p v-else-if="sessions.length === 0" class="security-muted">Aucune connexion active trouvée.</p>
        <ul v-else class="session-list">
          <li v-for="session in sessions" :key="session.id" class="session-item">
            <div class="session-device-icon" aria-hidden="true">▣</div>
            <div class="session-details">
              <div class="session-title-row"><strong>{{ sessionName(session) }}</strong><span v-if="session.is_current" class="session-current">Session actuelle</span></div>
              <span>Dernière activité : {{ formatDate(session.last_used_at) }}</span>
              <span>Connecté depuis le {{ formatDate(session.created_at) }}</span>
            </div>
          </li>
        </ul>
        <div v-if="otherSessions.length > 0 && !revokeOpen" class="revoke-action">
          <p>{{ otherSessions.length }} autre{{ otherSessions.length > 1 ? 's' : '' }} connexion{{ otherSessions.length > 1 ? 's' : '' }} active{{ otherSessions.length > 1 ? 's' : '' }}.</p>
          <button class="security-button security-button--danger-outline" type="button" @click="revokeOpen = true">Déconnecter les autres appareils</button>
        </div>
        <p v-else-if="!sessionsLoading && !sessionsError && sessions.length > 0 && otherSessions.length === 0" class="security-muted security-no-other">Aucun autre appareil n’est connecté.</p>
        <form v-if="revokeOpen" class="revoke-form" @submit.prevent="revokeOtherSessions">
          <p>Confirmez votre mot de passe pour fermer toutes les autres connexions.</p>
          <label><span>Mot de passe actuel</span><input v-model="revokePassword" type="password" autocomplete="current-password" required /></label>
          <div v-if="revokeError" class="security-alert security-alert--error" role="alert">{{ revokeError }}</div>
          <div class="revoke-buttons">
            <button class="security-button security-button--danger" type="submit" :disabled="revokeLoading">{{ revokeLoading ? 'Déconnexion…' : 'Confirmer la déconnexion' }}</button>
            <button class="security-button security-button--secondary" type="button" @click="revokeOpen = false; revokeError = ''; revokePassword = ''">Annuler</button>
          </div>
        </form>
        <div v-if="revokeSuccess" class="security-alert security-alert--success" role="status">{{ revokeSuccess }}</div>
      </section>
    </div>

    <aside class="security-note"><span aria-hidden="true">ℹ️</span><p>Ne partagez jamais votre mot de passe. Si vous pensez que votre compte a été utilisé par une autre personne, changez-le puis déconnectez les autres appareils.</p></aside>
  </main>
</template>

<style scoped>
.security-page { width: 100%; max-width: 1180px; margin: 0 auto; padding: 32px; }
.security-heading { display: flex; align-items: center; gap: 18px; margin-bottom: 26px; }
.security-heading-icon { display: grid; place-items: center; width: 58px; height: 58px; flex: 0 0 auto; border-radius: 18px; background: #e0e7ff; font-size: 27px; }
.security-eyebrow { margin: 0 0 3px; color: #4f46e5; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.security-heading h1 { margin: 0; color: #111827; font-size: clamp(24px, 3vw, 30px); line-height: 1.2; }
.security-subtitle { margin: 7px 0 0; color: #6b7280; }
.security-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
.security-card { min-width: 0; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; box-shadow: 0 4px 14px rgba(15, 23, 42, .04); }
.security-card-heading { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
.security-card-heading h2 { margin: 1px 0 4px; font-size: 17px; }
.security-card-heading p, .security-muted { margin: 0; color: #6b7280; font-size: 13px; line-height: 1.55; }
.security-card-icon { display: grid; place-items: center; width: 42px; height: 42px; flex: 0 0 auto; border-radius: 12px; font-size: 20px; }
.security-card-icon--blue { background: #eef2ff; }
.security-card-icon--green { background: #dcfce7; }
.security-form, .revoke-form { display: grid; gap: 16px; }
.security-form label, .revoke-form label { display: grid; gap: 7px; color: #374151; font-size: 13px; font-weight: 650; }
.security-form input, .revoke-form input { width: 100%; min-height: 43px; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 9px; background: #fff; color: #111827; font: inherit; }
.security-form input:focus, .revoke-form input:focus { outline: 3px solid rgba(79, 70, 229, .14); border-color: #4f46e5; }
.security-button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; padding: 10px 15px; border: 0; border-radius: 9px; font-size: 13px; font-weight: 700; transition: background .15s ease, opacity .15s ease; }
.security-button:disabled { cursor: wait; opacity: .65; }
.security-button--primary { width: 100%; margin-top: 2px; background: #4f46e5; color: #fff; }
.security-button--primary:hover { background: #4338ca; }
.security-button--secondary { border: 1px solid #d1d5db; background: #fff; color: #374151; }
.security-button--danger { background: #dc2626; color: #fff; }
.security-button--danger:hover { background: #b91c1c; }
.security-button--danger-outline { border: 1px solid #fecaca; background: #fff; color: #b91c1c; }
.security-button--danger-outline:hover { background: #fef2f2; }
.security-alert { margin-bottom: 16px; padding: 11px 13px; border-radius: 9px; font-size: 13px; line-height: 1.5; }
.security-alert--success { border: 1px solid #a7f3d0; background: #ecfdf5; color: #047857; }
.security-alert--error { border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; }
.session-list { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.session-item { display: flex; gap: 12px; padding: 15px 0; border-top: 1px solid #f1f5f9; }
.session-device-icon { display: grid; width: 38px; height: 38px; flex: 0 0 auto; place-items: center; border-radius: 11px; background: #f3f4f6; color: #4b5563; font-size: 19px; }
.session-details { display: grid; min-width: 0; gap: 4px; color: #6b7280; font-size: 12px; }
.session-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: #111827; font-size: 13px; }
.session-current { padding: 3px 8px; border-radius: 999px; background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 800; }
.revoke-action { display: grid; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
.revoke-action p { margin: 0; color: #4b5563; font-size: 13px; }
.revoke-form { margin-top: 17px; padding: 16px; border: 1px solid #fee2e2; border-radius: 12px; background: #fffafa; }
.revoke-form > p { margin: 0; color: #7f1d1d; font-size: 13px; line-height: 1.5; }
.revoke-buttons { display: flex; flex-wrap: wrap; gap: 9px; }
.security-text-button { margin-left: 8px; padding: 0; border: 0; background: transparent; color: #4f46e5; font-weight: 700; text-decoration: underline; }
.security-no-other { margin-top: 14px; }
.security-note { display: flex; align-items: flex-start; gap: 10px; margin-top: 20px; padding: 15px 17px; border: 1px solid #bfdbfe; border-radius: 12px; background: #eff6ff; color: #1e40af; }
.security-note p { margin: 0; font-size: 13px; line-height: 1.55; }
@media (max-width: 850px) { .security-page { padding: 24px 18px; } .security-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .security-page { padding: 20px 14px; } .security-heading { align-items: flex-start; gap: 12px; } .security-heading-icon { width: 48px; height: 48px; border-radius: 14px; font-size: 23px; } .security-card { padding: 19px 16px; } .revoke-buttons { flex-direction: column; } .revoke-buttons .security-button { width: 100%; } }
</style>
