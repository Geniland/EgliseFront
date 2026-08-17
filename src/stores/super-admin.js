import { defineStore } from 'pinia'
import { superAdminApi } from '@/api/super-admin'

export const useSuperAdminStore = defineStore('superAdmin', {
  state: () => ({
    users: [],
    pagination: { current_page: 1, last_page: 1, total: 0, per_page: 15 },
    stats: { total: 0, super_admins: 0, admins: 0, staff: 0, active: 0, inactive: 0 },
    roles: [],
    fonctions: [],
    loading: false,
    saving: false,
    error: null,
  }),

  actions: {
    async loadUsers(params = {}) {
      this.loading = true
      this.error = null
      try {
        const res = await superAdminApi.listUsers(params)
        const data = res.data
        this.users = data.users?.data || []
        const { current_page, last_page, total, per_page } = data.users || {}
        this.pagination = { current_page, last_page, total, per_page }
        this.stats = data.stats || this.stats
        return { ok: true }
      } catch (e) {
        this.error = e.message || 'Erreur de chargement'
        return { ok: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async loadRolesAndFonctions() {
      try {
        const res = await superAdminApi.getRolesAndFonctions()
        this.roles = res.data.roles || []
        this.fonctions = res.data.fonctions || []
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e.message }
      }
    },

    async createUser(data) {
      this.saving = true
      this.error = null
      try {
        const res = await superAdminApi.createUser(data)
        return { ok: true, data: res.data }
      } catch (e) {
        this.error = e.message || 'Erreur lors de la création'
        if (e.data?.errors) {
          this.error = Object.values(e.data.errors).flat().join(' ')
        }
        return { ok: false, error: this.error, raw: e.data }
      } finally {
        this.saving = false
      }
    },

    async updateUser(id, data) {
      this.saving = true
      this.error = null
      try {
        const res = await superAdminApi.updateUser(id, data)
        return { ok: true, data: res.data }
      } catch (e) {
        this.error = e.message || 'Erreur lors de la mise à jour'
        if (e.data?.errors) {
          this.error = Object.values(e.data.errors).flat().join(' ')
        }
        return { ok: false, error: this.error, raw: e.data }
      } finally {
        this.saving = false
      }
    },

    async toggleStatus(id) {
      try {
        const res = await superAdminApi.toggleStatus(id)
        const idx = this.users.findIndex(u => String(u.id) === String(id))
        if (idx >= 0 && res.data?.user) {
          this.users.splice(idx, 1, res.data.user)
        }
        return { ok: true, data: res.data }
      } catch (e) {
        return { ok: false, error: e.data?.message || e.message }
      }
    },

    async deleteUser(id) {
      try {
        const res = await superAdminApi.deleteUser(id)
        this.users = this.users.filter(u => String(u.id) !== String(id))
        return { ok: true, data: res.data }
      } catch (e) {
        return { ok: false, error: e.data?.message || e.message }
      }
    },
  },
})
