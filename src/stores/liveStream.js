import { defineStore } from 'pinia'

import api from '@/utils/api'

export const useLiveStreamStore = defineStore('liveStream', {
  state: () => ({
    liveStreams: [],
    activeLiveStream: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchLiveStreams() {
      this.loading = true
      try {
        const response = await api.get('/live-streams')
        this.liveStreams = response.data.data || response.data
      } catch (err) {
        this.error = err.response?.data?.message || err.message
      } finally {
        this.loading = false
      }
    },

    async fetchActiveLiveStream() {
      try {
        const response = await api.get('/live-streams/active')
        this.activeLiveStream = response.data.data || response.data || null
      } catch (err) {
        console.error('Failed to fetch active live stream', err)
        this.activeLiveStream = null
      }
    },

    async createLiveStream(data) {
      this.loading = true
      try {
        const response = await api.post('/live-streams', data)
        this.liveStreams.unshift(response.data.data || response.data)
        return response.data.data || response.data
      } catch (err) {
        this.error = err.response?.data?.message || err.message
        throw err
      } finally {
        this.loading = false
      }
    },

    async getBroadcastConfig(id) {
      try {
        const response = await api.get(`/live-streams/${id}/broadcast-config`)
        return response.data
      } catch (err) {
        this.error = err.response?.data?.message || err.message
        throw err
      }
    },

    async startLiveStream(id) {
      try {
        const response = await api.post(`/live-streams/${id}/start`)
        const index = this.liveStreams.findIndex(l => l.id === id)
        if (index !== -1) {
          this.liveStreams[index] = response.data.data || response.data
        }
        if (this.activeLiveStream && this.activeLiveStream.id === id) {
          this.activeLiveStream = response.data.data || response.data
        }
        return response.data.data || response.data
      } catch (err) {
        this.error = err.response?.data?.message || err.message
        throw err
      }
    },

    async endLiveStream(id) {
      try {
        const response = await api.post(`/live-streams/${id}/end`)
        const updated = response?.data?.data || response?.data || response
        const index = this.liveStreams.findIndex(l => l.id === id)
        if (index !== -1) {
          this.liveStreams[index] = updated
        }
        if (this.activeLiveStream && this.activeLiveStream.id === id) {
          this.activeLiveStream = updated
        }
        return updated
      } catch (err) {
        this.error = err?.data?.message || err?.message
        throw err
      }
    },

    async fetchLiveStream(id) {
      try {
        const response = await api.get(`/live-streams/${id}`)
        return response?.data?.data || response?.data || response
      } catch (err) {
        this.error = err?.data?.message || err?.message
        throw err
      }
    },

    async updateLiveStream(id, data) {
      try {
        const response = await api.put(`/live-streams/${id}`, data)
        const updated = response?.data?.data || response?.data || response
        const index = this.liveStreams.findIndex(l => l.id === id)
        if (index !== -1) {
          this.liveStreams[index] = updated
        }
        if (this.activeLiveStream && this.activeLiveStream.id === id) {
          this.activeLiveStream = updated
        }
        return updated
      } catch (err) {
        this.error = err?.data?.message || err?.message
        throw err
      }
    },

    async deleteLiveStream(id) {
      try {
        await api.delete(`/live-streams/${id}`)
        this.liveStreams = this.liveStreams.filter(l => l.id !== id)
        if (this.activeLiveStream && this.activeLiveStream.id === id) {
          this.activeLiveStream = null
        }
        return true
      } catch (err) {
        this.error = err?.data?.message || err?.message
        throw err
      }
    },

    async publishAsResource(id, payload) {
      try {
        const response = await api.post(`/live-streams/${id}/publish-resource`, payload)
        return response?.data || response
      } catch (err) {
        this.error = err?.data?.message || err?.message
        throw err
      }
    }
  }
})
