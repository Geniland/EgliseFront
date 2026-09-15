import api from '../utils/api'

export function getChatContacts() {
  return api.get('/chat/contacts')
}

export function getChatMessages(userId) {
  return api.get(`/chat/conversations/${userId}`)
}

export function sendChatMessage(recipientId, contenu) {
  return api.post('/chat/messages', {
    recipient_id: recipientId,
    contenu,
  })
}

export function setEphemeralDuration(contactId, duree) {
  return api.post('/chat/duration', {
    contact_id: contactId,
    duree,
  })
}

export function getUnreadMessagesCount() {
  return api.get('/chat/unread-count')
}
