import api from '../utils/api'

// --- CATEGORIES ---
export function listCategories(params = {}) {
  return api.get('/resource-categories', params)
}

export function createCategory(data) {
  return api.post('/resource-categories', data)
}

export function updateCategory(id, data) {
  return api.put(`/resource-categories/${id}`, data)
}

export function deleteCategory(id) {
  return api.delete(`/resource-categories/${id}`)
}

// --- RESOURCES ---
export function listResources(params = {}) {
  return api.get('/resources', params)
}

export function getResource(id) {
  return api.get(`/resources/${id}`)
}

export function createResource(formData) {
  return api.post('/resources', formData)
}

export function updateResource(id, formData) {
  formData.append('_method', 'PUT')
  return api.post(`/resources/${id}`, formData)
}

export function deleteResource(id) {
  return api.delete(`/resources/${id}`)
}

// --- FORMATIONS ---
export function listFormations(params = {}) {
  return api.get('/formations', params)
}

export function getFormation(id) {
  return api.get(`/formations/${id}`)
}

export function createFormation(formData) {
  return api.post('/formations', formData)
}

export function updateFormation(id, formData) {
  formData.append('_method', 'PUT')
  return api.post(`/formations/${id}`, formData)
}

export function deleteFormation(id) {
  return api.delete(`/formations/${id}`)
}

export function addFormationModule(formationId, data) {
  return api.post(`/formations/${formationId}/modules`, data)
}

export function deleteFormationModule(formationId, moduleId) {
  return api.delete(`/formations/${formationId}/modules/${moduleId}`)
}

export function addFormationContent(formationId, moduleId, formData) {
  return api.post(`/formations/${formationId}/modules/${moduleId}/contents`, formData)
}

export function deleteFormationContent(formationId, contentId) {
  return api.delete(`/formations/${formationId}/contents/${contentId}`)
}

export function enrollFormation(formationId) {
  return api.post('/formations/enroll', { formation_id: formationId })
}

// --- DOWNLOAD HELPER ---
export async function downloadResourceFile(id, filename = 'document') {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const url = `http://localhost:8000/api/resources/${id}/download`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || 'Accès non autorisé au document payant.')
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(downloadUrl)
}
