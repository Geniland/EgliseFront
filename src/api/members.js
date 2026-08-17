import api from '../utils/api'

export function listMembers(params) {
  return api.get('/members', params)
}

export function getMember(id) {
  return api.get(`/members/${id}`)
}

export function createMember(formData) {
  return api.post('/members', formData)
}

export function updateMember(id, formData) {
  return api.put(`/members/${id}`, formData)
}

export function deleteMember(id) {
  return api.delete(`/members/${id}`)
}

export function listMinistries() {
  return api.get('/referentiels/ministries')
}

export function listFamilies() {
  return api.get('/referentiels/families')
}

export function createFamily(data) {
  return api.post('/referentiels/families', data)
}

export function getMemberStatic() {
  return api.get('/referentiels/member-static')
}
