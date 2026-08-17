const DEFAULT_BASE_URL = 'http://localhost:8000/api'

const baseURL = (import.meta.env && import.meta.env.VITE_API_URL) || DEFAULT_BASE_URL

const HEADER_CHURCH_CONTEXT = 'X-Church-Context'

const getToken = () => {
  try {
    return localStorage.getItem('auth_token') || null
  } catch (e) {
    return null
  }
}

const getChurchContext = () => {
  try {
    const raw = localStorage.getItem('current_church_id')
    if (!raw || raw === '' || raw === 'all' || raw === null || raw === undefined) {
      return null
    }
    const n = Number(raw)
    return Number.isInteger(n) && n > 0 ? n : null
  } catch (e) {
    return null
  }
}

const setToken = (t) => {
  try {
    localStorage.setItem('auth_token', t || '')
  } catch (e) { /* ignore */ }
}

const clearAuth = () => {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('current_church_id')
    localStorage.removeItem('auth_churches')
  } catch (e) { /* ignore */ }
}

const handleResponse = async (res) => {
  let data = null
  const text = await res.text()
  try {
    data = text ? JSON.parse(text) : null
  } catch (e) {
    data = { message: text }
  }

  if (res.status === 401) {
    clearAuth()
    if (typeof window !== 'undefined' &&
      window.location &&
      !['/login', '/register'].some(p => window.location.pathname.startsWith(p))) {
      window.location.href = '/login'
    }
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Erreur HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    err.response = res
    throw err
  }

  return { data, status: res.status, headers: res.headers, ok: res.ok }
}

const request = async (method, url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`
  const headers = new Headers(options.headers || {})

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  if (options.body instanceof FormData) {
    // Ne pas définir Content-Type, le navigateur le fait avec boundary
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const ctx = getChurchContext()
  if (ctx) {
    headers.set(HEADER_CHURCH_CONTEXT, String(ctx))
  }

  let body = options.body
  if (body && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== 'string') {
    body = JSON.stringify(body)
  }

  const init = {
    method,
    headers,
    ...(method !== 'GET' && method !== 'HEAD' ? { body } : {}),
    credentials: options.credentials || 'omit',
    signal: options.signal || undefined,
  }

  const res = await fetch(fullUrl, init)
  return handleResponse(res)
}

const api = {
  get: (url, params) => {
    let u = url
    if (params && Object.keys(params).length) {
      const qs = new URLSearchParams()
      for (const k of Object.keys(params)) {
        const v = params[k]
        if (v !== undefined && v !== null) qs.append(k, v)
      }
      const str = qs.toString()
      if (str) u += (u.includes('?') ? '&' : '?') + str
    }
    return request('GET', u)
  },
  post: (url, data, opts = {}) => request('POST', url, { ...opts, body: data }),
  put: (url, data, opts = {}) => request('PUT', url, { ...opts, body: data }),
  patch: (url, data, opts = {}) => request('PATCH', url, { ...opts, body: data }),
  delete: (url, data, opts = {}) => request('DELETE', url, { ...opts, body: data }),
}

export default api
export { api, baseURL, getToken, setToken, clearAuth, HEADER_CHURCH_CONTEXT }
