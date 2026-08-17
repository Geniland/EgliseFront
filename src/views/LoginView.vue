<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const remember = ref(true)
const submitting = ref(false)
const errorMsg = ref('')

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
  }
})

const handleSubmit = async () => {
  errorMsg.value = ''
  submitting.value = true
  const result = await authStore.login({
    email: email.value,
    password: password.value,
  })
  submitting.value = false
  if (result.success) {
    router.push('/dashboard')
  } else {
    errorMsg.value = result.error || 'Identifiants incorrects'
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="auth-logo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" opacity="0.9"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1>YAFINTECH Solution</h1>
        <p>Gestion d'Église Professionnelle</p>
      </div>

      <h2 class="auth-title">Bienvenue 👋</h2>
      <p class="auth-subtitle">Connectez-vous pour accéder à votre tableau de bord.</p>

      <div v-if="errorMsg" class="auth-error">{{ errorMsg }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="admin@eglise.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>

        <button class="btn btn-primary" type="submit" :disabled="submitting">
          <span v-if="!submitting">Se connecter</span>
          <span v-else>Connexion en cours...</span>
        </button>
      </form>

      <div class="auth-link">
        Pas encore de compte&nbsp;?
        <RouterLink to="/register">Créer un compte</RouterLink>
      </div>
    </div>
  </div>
</template>
