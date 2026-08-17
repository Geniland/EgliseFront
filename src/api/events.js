import api from '../utils/api'

export function listEvents(params) {
  return api.get('/events', params)
}

export function getEvent(id) {
  return api.get(`/events/${id}`)
}

export function createEvent(data) {
  return api.post('/events', data)
}

export function updateEvent(id, data) {
  return api.put(`/events/${id}`, data)
}

export function deleteEvent(id) {
  return api.delete(`/events/${id}`)
}

export function publishEvent(id) {
  return api.patch(`/events/${id}/publish`)
}

export function cancelEvent(id) {
  return api.patch(`/events/${id}/cancel`)
}

export function completeEvent(id) {
  return api.patch(`/events/${id}/complete`)
}

export function toggleFeaturedEvent(id) {
  return api.patch(`/events/${id}/toggle-featured`)
}

export function getEventsStats(params) {
  return api.get('/events-stats', params)
}

export function getEventsCalendar(params) {
  return api.get('/events-calendar', params)
}

export function getEventTypesReferential() {
  return api.get('/referentiels/event-types')
}
