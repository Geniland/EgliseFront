import { defineStore } from 'pinia'
import churchApi from '@/api/churches'
import { useAuthStore } from '@/stores/auth'

export const useChurchesStore = defineStore('churches', {
  state: () => ({
    churches: [],
    churchesMeta: { total: 0, current_page: 1, per_page: 15, last_page: 1 },
    stats: { total: 0, active: 0, inactive: 0, with_parent: 0 },
    selectOptions: [],

    currentChurchId: null,
    currentChurch: null,
    currentMembers: [],
    currentStaffStats: {},

    staffRoles: [],

    loading: false,
    error: null,
  }),

  actions: {
    setError(msg) {
      this.error = msg || null
    },

    async loadChurches(params = {}) {
      this.loading = true
      this.setError(null)
      try {
        const res = await churchApi.list(params)
        this.churches = res.data?.churches?.data || res.data?.data || []
        this.churchesMeta = {
          total: res.data?.churches?.total ?? res.data?.total ?? 0,
          current_page: res.data?.churches?.current_page ?? res.data?.current_page ?? 1,
          per_page: res.data?.churches?.per_page ?? res.data?.per_page ?? 15,
          last_page: res.data?.churches?.last_page ?? res.data?.last_page ?? 1,
        }
        this.stats = res.data?.stats || this.stats
        this.selectOptions = res.data?.select_options || this.selectOptions
        return this.churches
      } catch (e) {
        this.setError(e.data?.message || e.message || 'Erreur de chargement')
        throw e
      } finally {
        this.loading = false
      }
    },

    async loadSelectOptions() {
      try {
        const res = await churchApi.myChurches()
        this.selectOptions = res.data?.churches || []
        return this.selectOptions
      } catch (e) {
        if (!this.selectOptions || this.selectOptions.length === 0) {
          try { this.selectOptions = useAuthStore().churches || [] } catch (_) {}
        }
        return this.selectOptions
      }
    },

    async createChurch(payload) {
      this.loading = true
      this.setError(null)
      try {
        const res = await churchApi.create(payload)
        await this.loadChurches({ per_page: this.churchesMeta.per_page })
        const auth = useAuthStore()
        try { await auth.fetchChurches() } catch (_) {}
        return res.data?.church
      } catch (e) {
        this.setError(e.data?.message || e.message || 'Erreur création église')
        throw e
      } finally {
        this.loading = false
      }
    },

    async updateChurch(id, payload) {
      this.loading = true
      this.setError(null)
      try {
        const res = await churchApi.update(id, payload)
        await this.loadChurches({ per_page: this.churchesMeta.per_page })
        return res.data?.church
      } catch (e) {
        this.setError(e.data?.message || e.message || 'Erreur mise à jour')
        throw e
      } finally {
        this.loading = false
      }
    },

    async toggleChurchStatus(id) {
      this.setError(null)
      try {
        const res = await churchApi.toggleStatus(id)
        await this.loadChurches({ per_page: this.churchesMeta.per_page })
        return res.data
      } catch (e) {
        this.setError(e.data?.message || e.message)
        throw e
      }
    },

    async removeChurch(id) {
      this.setError(null)
      try {
        const res = await churchApi.remove(id)
        await this.loadChurches({ per_page: this.churchesMeta.per_page })
        const auth = useAuthStore()
        try { await auth.fetchChurches() } catch (_) {}
        return res.data
      } catch (e) {
        this.setError(e.data?.message || e.message)
        throw e
      }
    },

    async loadChurchDetail(id) {
      this.loading = true
      this.setError(null)
      try {
        const res = await churchApi.get(id)
        this.currentChurchId = id
        this.currentChurch = res.data?.church
        this.currentMembers = res.data?.members || []
        this.currentStaffStats = res.data?.stats || {}
        return this.currentChurch
      } catch (e) {
        this.setError(e.data?.message || e.message)
        throw e
      } finally {
        this.loading = false
      }
    },

    async loadStaffRoles() {
      try {
        const res = await churchApi.staffRoles()
        this.staffRoles = res.data?.roles || []
        if (!this.staffRoles || this.staffRoles.length === 0) {
          this.staffRoles = [
            { id: 5, name: 'Responsable', description: 'Rôle Responsable' },
            { id: 3, name: 'Secrétaire', description: 'Rôle Secrétaire' },
            { id: 4, name: 'Comptable', description: 'Rôle Comptable' },
            { id: 6, name: 'Fidèle', description: 'Rôle Fidèle' },
          ]
        }
        return this.staffRoles
      } catch (e) {
        if (!this.staffRoles || this.staffRoles.length === 0) {
          this.staffRoles = [
            { id: 5, name: 'Responsable', description: 'Rôle Responsable' },
            { id: 3, name: 'Secrétaire', description: 'Rôle Secrétaire' },
            { id: 4, name: 'Comptable', description: 'Rôle Comptable' },
            { id: 6, name: 'Fidèle', description: 'Rôle Fidèle' },
          ]
        }
        return this.staffRoles
      }
    },

    async loadStaff(churchId, params = {}) {
      this.loading = true
      this.setError(null)
      try {
        const res = await churchApi.listStaff(churchId, params)
        this.currentMembers = res.data?.staff?.data || res.data?.staff || []
        this.currentStaffStats = res.data?.stats || this.currentStaffStats
        return {
          list: this.currentMembers,
          stats: this.currentStaffStats,
          meta: res.data?.staff || null,
        }
      } catch (e) {
        this.setError(e.data?.message || e.message)
        throw e
      } finally {
        this.loading = false
      }
    },

    async addStaff(churchId, payload) {
      this.loading = true
      this.setError(null)
      try {
        const res = await churchApi.addStaff(churchId, payload)
        await this.loadStaff(churchId, { per_page: 20 })
        return res.data
      } catch (e) {
        this.setError(e.data?.message || e.message || 'Erreur création compte')
        throw e
      } finally {
        this.loading = false
      }
    },

    async updateStaff(churchId, userId, payload) {
      this.setError(null)
      try {
        const res = await churchApi.updateStaff(churchId, userId, payload)
        await this.loadStaff(churchId, { per_page: 20 })
        return res.data
      } catch (e) {
        this.setError(e.data?.message || e.message)
        throw e
      }
    },

    async toggleStaff(churchId, userId) {
      this.setError(null)
      try {
        const res = await churchApi.toggleStaffStatus(churchId, userId)
        await this.loadStaff(churchId, { per_page: 20 })
        return res.data
      } catch (e) {
        this.setError(e.data?.message || e.message)
        throw e
      }
    },

    async removeStaff(churchId, userId) {
      this.setError(null)
      try {
        const res = await churchApi.removeStaff(churchId, userId)
        await this.loadStaff(churchId, { per_page: 20 })
        return res.data
      } catch (e) {
        this.setError(e.data?.message || e.message)
        throw e
      }
    },
  },
})
