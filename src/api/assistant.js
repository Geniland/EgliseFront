import api from '../utils/api'

export function getAssistantConversations() {
  return api.get('/assistant/conversations')
}

export function createAssistantConversation(data = {}) {
  return api.post('/assistant/conversations', data)
}

export function getAssistantConversation(id) {
  return api.get(`/assistant/conversations/${id}`)
}

export function sendAssistantMessage(id, contenu) {
  return api.post(`/assistant/conversations/${id}/messages`, { contenu })
}

export function deleteAssistantConversation(id) {
  return api.delete(`/assistant/conversations/${id}`)
}
