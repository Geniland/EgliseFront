import { defineStore } from 'pinia'
import {
  listSessions, getSession, createSession, updateSession, deleteSession,
  generateSessionQr, invalidateSessionQr, markAllAbsent, getSessionsStats,
  listAttendances, createAttendance, bulkAttendance, updateAttendance, deleteAttendance,
  listAbsenceReasons, createAbsenceReason, updateAbsenceReason, deleteAbsenceReason,
} from '../api/attendance'

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

export const useAttendanceStore = defineStore('attendance', {
  state: () => ({
    sessions: [],
    sessionsPagination: {
      current_page: 1, last_page: 1, total: 0, per_page: 20, from: 0, to: 0,
    },
    attendances: [],
    attendancesPagination: {
      current_page: 1, last_page: 1, total: 0, per_page: 30, from: 0, to: 0,
    },
    absenceReasons: [],
    stats: {
      sessions: { total: 0, active: 0 },
      attendances: { total: 0, present: 0, absent: 0, late: 0, attendance_rate: 0 },
      trend: [],
      repeated_absences: [],
    },
    selectedSession: null,
    qrData: null,
    loading: false,
    saving: false,
    deleting: false,
    error: '',
  }),
  actions: {
    async loadSessions(params = {}) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await listSessions(params)
        this.sessions = data?.data || []
        const meta = data?.meta || data || {}
        this.sessionsPagination = {
          current_page: meta.current_page || 1,
          last_page: meta.last_page || 1,
          total: meta.total || 0,
          per_page: meta.per_page || 20,
          from: meta.from || 0,
          to: meta.to || 0,
        }
      } catch (e) {
        this.error = e?.data?.message || e.message || 'Erreur de chargement'
        this.sessions = []
      } finally {
        this.loading = false
      }
    },

    async loadSessionDetail(id) {
      try {
        const { data } = await getSession(id)
        this.selectedSession = data?.data || data
        return this.selectedSession
      } catch (e) {
        this.error = e?.data?.message || e.message
        return null
      }
    },

    async createSessionItem(payload) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await createSession(payload)
        return { ok: true, message: data?.message, session: data?.session }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally {
        this.saving = false
      }
    },

    async updateSessionItem(id, payload) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await updateSession(id, payload)
        return { ok: true, message: data?.message, session: data?.session }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally {
        this.saving = false
      }
    },

    async removeSession(id) {
      this.deleting = true
      try {
        const { data } = await deleteSession(id)
        this.sessions = this.sessions.filter(s => String(s.id) !== String(id))
        return { ok: true, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      } finally {
        this.deleting = false
      }
    },

    async generateQr(id, validityMinutes = 180) {
      try {
        const { data } = await generateSessionQr(id, validityMinutes)
        this.qrData = data?.qr || null
        return { ok: true, qr: data?.qr, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async invalidateQr(id) {
      try {
        const { data } = await invalidateSessionQr(id)
        this.qrData = null
        return { ok: true, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async markAbsent(id, override = false) {
      try {
        const { data } = await markAllAbsent(id, override)
        return { ok: true, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async loadStats(params = {}) {
      try {
        const { data } = await getSessionsStats(params)
        if (data) this.stats = { ...this.stats, ...data }
        return this.stats
      } catch (e) {
        return this.stats
      }
    },

    async loadAttendances(params = {}) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await listAttendances(params)
        this.attendances = data?.data || []
        const meta = data?.meta || data || {}
        this.attendancesPagination = {
          current_page: meta.current_page || 1,
          last_page: meta.last_page || 1,
          total: meta.total || 0,
          per_page: meta.per_page || 30,
          from: meta.from || 0,
          to: meta.to || 0,
        }
      } catch (e) {
        this.error = e?.data?.message || e.message || 'Erreur de chargement'
        this.attendances = []
      } finally {
        this.loading = false
      }
    },

    async createAttendanceItem(payload) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await createAttendance(payload)
        return { ok: true, message: data?.message, attendance: data?.attendance }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally {
        this.saving = false
      }
    },

    async bulkAttendanceItems(sessionId, entries) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await bulkAttendance({ session_id: sessionId, entries })
        return { ok: true, message: data?.message, created: data?.created, updated: data?.updated, errors: data?.errors || [] }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      } finally {
        this.saving = false
      }
    },

    async updateAttendanceItem(id, payload) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await updateAttendance(id, payload)
        return { ok: true, message: data?.message, attendance: data?.attendance }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally {
        this.saving = false
      }
    },

    async removeAttendance(id) {
      this.deleting = true
      try {
        const { data } = await deleteAttendance(id)
        this.attendances = this.attendances.filter(a => String(a.id) !== String(id))
        return { ok: true, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      } finally {
        this.deleting = false
      }
    },

    async loadAbsenceReasons(params = { all: 'true' }) {
      try {
        const { data } = await listAbsenceReasons(params)
        this.absenceReasons = Array.isArray(data) ? data : (data?.data || [])
        return this.absenceReasons
      } catch (e) {
        return this.absenceReasons
      }
    },

    async createReason(payload) {
      try {
        const { data } = await createAbsenceReason(payload)
        return { ok: true, reason: data?.reason, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async updateReason(id, payload) {
      try {
        const { data } = await updateAbsenceReason(id, payload)
        return { ok: true, reason: data?.reason, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },

    async removeReason(id) {
      try {
        const { data } = await deleteAbsenceReason(id)
        this.absenceReasons = this.absenceReasons.filter(r => String(r.id) !== String(id))
        return { ok: true, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      }
    },
  },
})
