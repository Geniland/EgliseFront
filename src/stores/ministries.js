import { defineStore } from 'pinia'
import {
  listMinistries,
  getMinistry,
  createMinistry,
  updateMinistry,
  deleteMinistry,
  assignMembers,
  removeMember,
} from '../api/ministries'

export const useMinistriesStore = defineStore('ministries', {
  state: () => ({
    ministries: [],
    currentMinistry: null,
    pagination: {
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 15,
    },
    loading: false,
    saving: false,
    error: '',
  }),

  getters: {
    totalMinistries: (state) => state.pagination.total || state.ministries.length,
    activeMinistriesCount: (state) => state.ministries.filter(m => m.status).length,
    totalEngagedMembers: (state) => {
      return state.ministries.reduce((acc, m) => acc + (m.members_count || 0), 0)
    }
  },

  actions: {
    async fetchMinistries(params = {}) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await listMinistries(params)
        if (Array.isArray(data)) {
          this.ministries = data
          this.pagination.total = data.length
        } else {
          this.ministries = data?.data || []
          this.pagination = {
            current_page: data?.current_page || 1,
            last_page: data?.last_page || 1,
            total: data?.total || 0,
            per_page: data?.per_page || 15,
          }
        }
        return data
      } catch (err) {
        this.error = err?.data?.message || err.message || 'Erreur lors du chargement des ministères'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchMinistry(id) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await getMinistry(id)
        this.currentMinistry = data
        return data
      } catch (err) {
        this.error = err?.data?.message || err.message || 'Ministère introuvable'
        throw err
      } finally {
        this.loading = false
      }
    },

    async createMinistry(formData) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await createMinistry(formData)
        await this.fetchMinistries()
        return data
      } catch (err) {
        this.error = err?.data?.message || err.message || 'Erreur lors de la création'
        throw err
      } finally {
        this.saving = false
      }
    },

    async updateMinistry(id, formData) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await updateMinistry(id, formData)
        await this.fetchMinistries()
        return data
      } catch (err) {
        this.error = err?.data?.message || err.message || 'Erreur lors de la mise à jour'
        throw err
      } finally {
        this.saving = false
      }
    },

    async deleteMinistry(id) {
      this.loading = true
      try {
        await deleteMinistry(id)
        this.ministries = this.ministries.filter(m => m.id !== id)
        this.pagination.total = Math.max(0, this.pagination.total - 1)
      } catch (err) {
        this.error = err?.data?.message || err.message || 'Erreur lors de la suppression'
        throw err
      } finally {
        this.loading = false
      }
    },

    async assignMembers(id, memberIds) {
      this.saving = true
      try {
        const { data } = await assignMembers(id, memberIds)
        // Mettre à jour dans le tableau local
        const target = this.ministries.find(m => m.id === id)
        if (target) {
          target.members_count = data.members_count
        }
        if (this.currentMinistry && this.currentMinistry.id === id) {
          this.currentMinistry.members_count = data.members_count
          this.currentMinistry.members = data.members
        }
        return data
      } catch (err) {
        this.error = err?.data?.message || err.message || 'Erreur lors de l\'assignation'
        throw err
      } finally {
        this.saving = false
      }
    },

    async removeMember(id, memberId) {
      this.saving = true
      try {
        const { data } = await removeMember(id, memberId)
        const target = this.ministries.find(m => m.id === id)
        if (target) {
          target.members_count = data.members_count
        }
        if (this.currentMinistry && this.currentMinistry.id === id) {
          this.currentMinistry.members_count = data.members_count
          this.currentMinistry.members = this.currentMinistry.members.filter(m => m.id !== memberId)
        }
        return data
      } catch (err) {
        this.error = err?.data?.message || err.message || 'Erreur lors du retrait'
        throw err
      } finally {
        this.saving = false
      }
    }
  }
})
