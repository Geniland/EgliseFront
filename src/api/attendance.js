import api from '../utils/api'

export function listSessions(params) {
  return api.get('/attendance/sessions', params)
}

export function getSession(id) {
  return api.get(`/attendance/sessions/${id}`)
}

export function createSession(data) {
  return api.post('/attendance/sessions', data)
}

export function updateSession(id, data) {
  return api.put(`/attendance/sessions/${id}`, data)
}

export function deleteSession(id) {
  return api.delete(`/attendance/sessions/${id}`)
}

export function generateSessionQr(id, validityMinutes) {
  return api.post(`/attendance/sessions/${id}/generate-qr`, { validity_minutes: validityMinutes })
}

export function invalidateSessionQr(id) {
  return api.post(`/attendance/sessions/${id}/invalidate-qr`)
}

export function markAllAbsent(id, override) {
  return api.post(`/attendance/sessions/${id}/mark-all-absent`, { override: !!override })
}

export function getSessionsStats(params) {
  return api.get('/attendance/sessions-stats', params)
}

export function listAttendances(params) {
  return api.get('/attendance', params)
}

export function getAttendance(id) {
  return api.get(`/attendance/${id}`)
}

export function createAttendance(data) {
  return api.post('/attendance', data)
}

export function bulkAttendance(data) {
  return api.post('/attendance/bulk', data)
}

export function updateAttendance(id, data) {
  return api.put(`/attendance/${id}`, data)
}

export function deleteAttendance(id) {
  return api.delete(`/attendance/${id}`)
}

export function scanAttendance(data) {
  return api.post('/attendance/scan', data)
}

export function getMemberAttendanceHistory(memberId, params) {
  return api.get(`/attendance/members/${memberId}/history`, params)
}

export function listAbsenceReasons(params) {
  return api.get('/attendance/reasons', params)
}

export function createAbsenceReason(data) {
  return api.post('/attendance/reasons', data)
}

export function updateAbsenceReason(id, data) {
  return api.put(`/attendance/reasons/${id}`, data)
}

export function deleteAbsenceReason(id) {
  return api.delete(`/attendance/reasons/${id}`)
}
