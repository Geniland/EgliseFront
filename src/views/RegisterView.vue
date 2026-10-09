<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const firstName = ref('')
const lastName = ref('')
const gender = ref('Homme')
const churchCode = ref('')
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

const fullName = ref('')
watch([firstName, lastName], ([f, l]) => {
  fullName.value = `${f} ${l}`.trim()
})

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!firstName.value.trim()) {
    errorMsg.value = 'Le prénom est requis'
    return
  }
  if (!lastName.value.trim()) {
    errorMsg.value = 'Le nom est requis'
    return
  }
  if (!gender.value) {
    errorMsg.value = 'Le genre est requis'
    return
  }
  if (!churchCode.value.trim()) {
    errorMsg.value = 'Le code de l\'église est requis (ex: EGL-000001)'
    return
  }
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
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    name: fullName.value || `${firstName.value.trim()} ${lastName.value.trim()}`,
    gender: gender.value,
    church_code: churchCode.value.trim(),
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
      <p class="auth-subtitle">Inscrivez-vous pour rejoindre votre communauté ecclésiale.</p>

      <div v-if="errorMsg" class="auth-error">{{ errorMsg }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="form-row-2">
          <div class="form-group">
            <label for="firstName">Prénom *</label>
            <input
              id="firstName"
              v-model="firstName"
              type="text"
              placeholder="Jean"
              required
              autocomplete="given-name"
            />
          </div>

          <div class="form-group">
            <label for="lastName">Nom *</label>
            <input
              id="lastName"
              v-model="lastName"
              type="text"
              placeholder="Dupont"
              required
              autocomplete="family-name"
            />
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label for="gender">Genre *</label>
            <select id="gender" v-model="gender" required>
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
            </select>
          </div>

          <div class="form-group">
            <label for="churchCode">Code église * <span class="hint" title="Fourni par votre église (ex: EGL-000001)">ⓘ</span></label>
            <input
              id="churchCode"
              v-model="churchCode"
              type="text"
              placeholder="EGL-000001"
              required
              autocomplete="off"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="jean@eglise.com"
            autocomplete="email"
          />
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label for="password">Mot de passe *</label>
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
            <label for="confirm">Confirmer *</label>
            <input
              id="confirm"
              v-model="confirmPassword"
              type="password"
              placeholder="Répétez le mot de passe"
              required
              autocomplete="new-password"
            />
          </div>
        </div>

        <button class="btn btn-primary" type="submit" :disabled="submitting">
          <span v-if="!submitting">S'inscrire &amp; recevoir mon QR code</span>
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

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ecfeff 100%);
  padding: 20px;
}
.auth-card {
  background: #fff;
  border-radius: 20px;
  padding: 36px 32px;
  max-width: 560px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(79, 70, 229, .15);
}
.auth-logo {
  text-align: center;
  margin-bottom: 24px;
}
.auth-logo-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 12px;
}
.auth-logo h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}
.auth-logo p {
  margin: 2px 0 0;
  font-size: 13px;
  color: #64748b;
}
.auth-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}
.auth-subtitle {
  margin: 0 0 20px;
  font-size: 13px;
  color: #64748b;
}
.auth-error {
  padding: 10px 14px;
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
  font-weight: 500;
}
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 520px) {
  .form-row-2 { grid-template-columns: 1fr; }
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 4px;
}
.form-group label .hint {
  font-weight: 400;
  color: #6366f1;
  cursor: help;
  font-size: 13px;
}
.form-group input, .form-group select {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  background: #fff;
}
.form-group input:focus, .form-group select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, .12);
}
.btn-primary {
  width: 100%;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border: none;
  padding: 12px 18px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: transform .15s, box-shadow .15s;
  margin-top: 8px;
  box-shadow: 0 4px 14px rgba(99, 102, 241, .3);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, .35);
}
.btn-primary:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.auth-link {
  text-align: center;
  margin-top: 18px;
  font-size: 13px;
  color: #64748b;
}
.auth-link a {
  color: #4f46e5;
  font-weight: 600;
  text-decoration: none;
}
.auth-link a:hover { text-decoration: underline; }
</style>
