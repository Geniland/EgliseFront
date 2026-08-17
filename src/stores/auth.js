import { defineStore } from 'pinia'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
    token: localStorage.getItem('auth_token') || null,
    loading: false,
    error: null,
    churches: JSON.parse(localStorage.getItem('auth_churches') || '[]'),
    currentChurchId: (() => {
      try {
        const raw = localStorage.getItem('current_church_id')
        if (!raw || raw === '' || raw === 'all' || raw === null) return null
        const n = Number(raw)
        return Number.isInteger(n) && n > 0 ? n : null
      } catch (e) { return null }
    })(),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    userName: (state) => state.user?.name || 'Utilisateur',
    userRole: (state) => state.user?.role?.name || 'Fidèle',
    userChurchName: (state) => {
      if (state.currentChurchId) {
        const c = state.churches.find(c => c.id === state.currentChurchId)
        return c?.name || state.user?.church_name || ''
      }
      if (state.churches.length === 1) return state.churches[0].name
      return state.user?.church_name || ''
    },
    isAdmin: (state) => {
      const role = state.user?.role?.name
      return role === 'Super Admin' || role === 'Administrateur'
    },
    isSuperAdmin: (state) => {
      return (state.user?.role?.name || '') === 'Super Admin'
    },
    canManageChurches: (state) => {
      const role = state.user?.role?.name
      return role === 'Super Admin' || role === 'Administrateur' || role === 'Responsable'
    },
    churchesCount: (state) => state.churches.length,
    showChurchSwitcher: (state) => {
      const role = state.user?.role?.name
      if (role === 'Super Admin') return true
      return state.churches.length > 1
    },
  },

  actions: {
    async login(credentials) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/login', credentials)
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem('auth_token', this.token)
        localStorage.setItem('auth_user', JSON.stringify(this.user))
        this.currentChurchId = null
        localStorage.setItem('current_church_id', 'all')
        try { await this.fetchChurches({ silent: true }) } catch (e) { /* ignore */ }
        return { success: true, data: response.data }
      } catch (err) {
        this.error = err.response?.data?.message || 'Erreur de connexion'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async register(data) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/register', data)
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem('auth_token', this.token)
        localStorage.setItem('auth_user', JSON.stringify(this.user))
        this.currentChurchId = null
        localStorage.setItem('current_church_id', 'all')
        return { success: true, data: response.data }
      } catch (err) {
        this.error = err.response?.data?.message || 'Erreur d\'inscription'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        if (this.token) {
          await api.post('/logout')
        }
      } catch (err) {
        console.warn('Logout API error:', err)
      } finally {
        this.token = null
        this.user = null
        this.churches = []
        this.currentChurchId = null
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_churches')
        localStorage.removeItem('current_church_id')
      }
    },

    async fetchUser() {
      try {
        const response = await api.get('/user')
        this.user = response.data
        localStorage.setItem('auth_user', JSON.stringify(this.user))
      } catch (err) {
        console.warn('Fetch user error:', err)
      }
    },

    async fetchChurches({ silent = false } = {}) {
      try {
        const response = await api.get('/me/churches')
        const list = response.data?.churches || []
        this.churches = Array.isArray(list) ? list : []
        localStorage.setItem('auth_churches', JSON.stringify(this.churches))
        // Si l'église courante n'existe plus, reset à ALL
        if (this.currentChurchId && !this.churches.some(c => c.id === this.currentChurchId)) {
          this.currentChurchId = null
          localStorage.setItem('current_church_id', 'all')
        }
        return this.churches
      } catch (err) {
        if (!silent) {
          console.warn('Fetch churches error:', err)
        }
        return this.churches
      }
    },

    switchChurch(churchIdOrAll) {
      if (churchIdOrAll === null || churchIdOrAll === undefined || String(churchIdOrAll) === 'all' || String(churchIdOrAll) === '') {
        this.currentChurchId = null
        localStorage.setItem('current_church_id', 'all')
      } else {
        const id = Number(churchIdOrAll)
        if (this.churches.length) {
          const valid = this.churches.some(c => c.id === id)
          if (!valid) {
            throw new Error('Église invalide (hors de vos droits)')
          }
        }
        this.currentChurchId = id
        localStorage.setItem('current_church_id', String(id))
      }
      return this.currentChurchId
    },
  },
})
