<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const errorMsg = ref('')

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
  }
})

const handleSubmit = async () => {
  errorMsg.value = ''
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Les mots de passe ne correspondent pas'
    return
  }
  if (password.value.length < 8) {
    errorMsg.value = 'Le mot de passe doit contenir au moins 8 caractères'
    return
  }
  submitting.value = true
  const result = await authStore.register({
    name: name.value,
    email: email.value,
    password: password.value,
  })
  submitting.value = false
  if (result.success) {
    router.push('/dashboard')
  } else {
    errorMsg.value = result.error || "Erreur lors de l'inscription"
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

      <h2 class="auth-title">Créer un compte ✝</h2>
      <p class="auth-subtitle">Inscrivez-vous pour commencer à gérer votre église.</p>

      <div v-if="errorMsg" class="auth-error">{{ errorMsg }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="name">Nom complet</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Jean Dupont"
            required
            autocomplete="name"
          />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="jean@eglise.com"
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
            placeholder="8 caractères minimum"
            required
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label for="confirm">Confirmer le mot de passe</label>
          <input
            id="confirm"
            v-model="confirmPassword"
            type="password"
            placeholder="Répétez le mot de passe"
            required
            autocomplete="new-password"
          />
        </div>

        <button class="btn btn-primary" type="submit" :disabled="submitting">
          <span v-if="!submitting">S'inscrire</span>
          <span v-else>Inscription en cours...</span>
        </button>
      </form>

      <div class="auth-link">
        Déjà un compte&nbsp;?
        <RouterLink to="/login">Se connecter</RouterLink>
      </div>
    </div>
  </div>
</template>
