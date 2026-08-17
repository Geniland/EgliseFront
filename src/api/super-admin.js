import api from '@/utils/api'

export const superAdminApi = {
  listUsers(params = {}) {
    return api.get('/super-admin/users', params)
  },
  getUser(id) {
    return api.get(`/super-admin/users/${id}`)
  },
  createUser(data) {
    return api.post('/super-admin/users', data)
  },
  updateUser(id, data) {
    return api.put(`/super-admin/users/${id}`, data)
  },
  toggleStatus(id) {
    return api.patch(`/super-admin/users/${id}/toggle-status`)
  },
  deleteUser(id) {
    return api.delete(`/super-admin/users/${id}`)
  },
  getRolesAndFonctions() {
    return api.get('/super-admin/roles-and-fonctions')
  },
}
