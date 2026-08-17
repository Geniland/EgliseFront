import { defineStore } from 'pinia'
import {
  listEvents, getEvent, createEvent, updateEvent, deleteEvent,
  publishEvent, cancelEvent, completeEvent, toggleFeaturedEvent,
  getEventsStats, getEventsCalendar, getEventTypesReferential,
} from '../api/events'

function buildErrorMap(data) {
  const errors = {}
  if (data && data.errors && typeof data.errors === 'object') {
    for (const k of Object.keys(data.errors)) {
      const v = data.errors[k]
      errors[k] = Array.isArray(v) ? v[0] : String(v)
    }
  }
  return errors
}

export const useEventsStore = defineStore('events', {
  state: () => ({
    items: [],
    pagination: {
      current_page: 1, last_page: 1, total: 0, per_page: 20, from: 0, to: 0,
    },
    referential: {
      types: {},
      statuses: {},
    },
    selected: null,
    stats: {
      overview: { total: 0, draft: 0, published: 0, cancelled: 0, completed: 0, upcoming: 0, featured: 0, this_month: 0, next_month: 0 },
      by_type: [],
      trend: [],
      upcoming_events: [],
    },
    calendar: [],
    loading: false,
    saving: false,
    deleting: false,
    error: '',
  }),
  actions: {
    async loadReferential() {
      try {
        const { data } = await getEventTypesReferential()
        if (data) {
          this.referential.types = data.types || {}
          this.referential.statuses = data.statuses || {}
        }
        return this.referential
      } catch (e) {
        return this.referential
      }
    },

    async loadItems(params = {}) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await listEvents(params)
        this.items = data?.data || []
        const meta = data?.meta || data || {}
        this.pagination = {
          current_page: meta.current_page || 1,
          last_page: meta.last_page || 1,
          total: meta.total || 0,
          per_page: meta.per_page || 20,
          from: meta.from || 0,
          to: meta.to || 0,
        }
      } catch (e) {
        this.error = e?.data?.message || e.message || 'Erreur de chargement'
        this.items = []
      } finally {
        this.loading = false
      }
    },

    async loadDetail(id) {
      try {
        const { data } = await getEvent(id)
        this.selected = data?.data || data
        return this.selected
      } catch (e) {
        this.error = e?.data?.message || e.message
        return null
      }
    },

    async createItem(payload) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await createEvent(payload)
        return { ok: true, message: data?.message, event: data?.event }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally {
        this.saving = false
      }
    },

    async updateItem(id, payload) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await updateEvent(id, payload)
        return { ok: true, message: data?.message, event: data?.event }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally {
        this.saving = false
      }
    },

    async removeItem(id) {
      this.deleting = true
      try {
        const { data } = await deleteEvent(id)
        this.items = this.items.filter(e => String(e.id) !== String(id))
        return { ok: true, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      } finally {
        this.deleting = false
      }
    },

    async publish(id) {
      try {
        const { data } = await publishEvent(id)
        return { ok: true, message: data?.message, event: data?.event }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async cancel(id) {
      try {
        const { data } = await cancelEvent(id)
        return { ok: true, message: data?.message, event: data?.event }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async complete(id) {
      try {
        const { data } = await completeEvent(id)
        return { ok: true, message: data?.message, event: data?.event }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async toggleFeatured(id) {
      try {
        const { data } = await toggleFeaturedEvent(id)
        return { ok: true, message: data?.message, event: data?.event }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async loadStats(params = {}) {
      try {
        const { data } = await getEventsStats(params)
        if (data) this.stats = { ...this.stats, ...data }
        return this.stats
      } catch (e) {
        return this.stats
      }
    },

    async loadCalendar(params = {}) {
      try {
        const { data } = await getEventsCalendar(params)
        this.calendar = Array.isArray(data) ? data : (data?.data || [])
        return this.calendar
      } catch (e) {
        return this.calendar
      }
    },
  },
})
