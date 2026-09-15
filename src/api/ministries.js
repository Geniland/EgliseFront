import api from '../utils/api'

export function listMinistries(params = {}) {
  return api.get('/ministries', params)
}

export function getMinistry(id) {
  return api.get(`/ministries/${id}`)
}

export function createMinistry(data) {
  return api.post('/ministries', data)
}

export function updateMinistry(id, data) {
  return api.put(`/ministries/${id}`, data)
}

export function deleteMinistry(id) {
  return api.delete(`/ministries/${id}`)
}

export function assignMembers(id, memberIds) {
  return api.post(`/ministries/${id}/members`, { member_ids: memberIds })
}

export function removeMember(id, memberId) {
  return api.delete(`/ministries/${id}/members/${memberId}`)
}
