import api from '@/utils/api'

export function globalSearch(query) {
  return api.get('/search', { q: query })
}
