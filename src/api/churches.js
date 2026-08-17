import api from '@/utils/api'

export default {
  list: (params) => api.get('/churches', params),
  get: (id) => api.get(`/churches/${id}`),
  create: (payload) => api.post('/churches', payload),
  update: (id, payload) => api.patch(`/churches/${id}`, payload),
  toggleStatus: (id) => api.patch(`/churches/${id}/toggle-status`),
  remove: (id) => api.delete(`/churches/${id}`),
  myChurches: () => api.get('/me/churches'),
  staffRoles: () => api.get('/church-staff-roles'),
  listStaff: (churchId, params) => api.get(`/churches/${churchId}/staff`, params),
  addStaff: (churchId, payload) => api.post(`/churches/${churchId}/staff`, payload),
  updateStaff: (churchId, userId, payload) => api.patch(`/churches/${churchId}/staff/${userId}`, payload),
  toggleStaffStatus: (churchId, userId) => api.patch(`/churches/${churchId}/staff/${userId}/toggle-status`),
  removeStaff: (churchId, userId) => api.delete(`/churches/${churchId}/staff/${userId}`),
}
