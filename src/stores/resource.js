import { defineStore } from 'pinia'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  listFormations,
  getFormation,
  createFormation,
  updateFormation,
  deleteFormation,
  addFormationModule,
  deleteFormationModule,
  addFormationContent,
  deleteFormationContent,
  enrollFormation,
  downloadResourceFile,
} from '@/api/resources'

export const useResourceStore = defineStore('resource', {
  state: () => ({
    categories: [],
    resources: [],
    formations: [],
    loading: false,
    error: null,
  }),
  actions: {
    // --- CATEGORIES ---
    async fetchCategories(params = {}) {
      try {
        const { data } = await listCategories(params)
        this.categories = data
        return data
      } catch (err) {
        throw err
      }
    },
    async createCategory(payload) {
      const { data } = await createCategory(payload)
      return data
    },
    async updateCategory(id, payload) {
      const { data } = await updateCategory(id, payload)
      return data
    },
    async deleteCategory(id) {
      await deleteCategory(id)
    },

    // --- RESOURCES ---
    async fetchResources(params = {}) {
      this.loading = true
      try {
        const { data } = await listResources(params)
        this.resources = data.data || data
        return data
      } finally {
        this.loading = false
      }
    },
    async createResource(formData) {
      const { data } = await createResource(formData)
      return data
    },
    async updateResource(id, formData) {
      const { data } = await updateResource(id, formData)
      return data
    },
    async deleteResource(id) {
      await deleteResource(id)
    },
    async downloadResource(id, filename) {
      return await downloadResourceFile(id, filename)
    },

    // --- FORMATIONS ---
    async fetchFormations(params = {}) {
      this.loading = true
      try {
        const { data } = await listFormations(params)
        this.formations = data.data || data
        return data
      } finally {
        this.loading = false
      }
    },
    async createFormation(formData) {
      const { data } = await createFormation(formData)
      return data
    },
    async updateFormation(id, formData) {
      const { data } = await updateFormation(id, formData)
      return data
    },
    async deleteFormation(id) {
      await deleteFormation(id)
    },
    async addFormationModule(formationId, payload) {
      const { data } = await addFormationModule(formationId, payload)
      return data
    },
    async deleteFormationModule(formationId, moduleId) {
      await deleteFormationModule(formationId, moduleId)
    },
    async addFormationContent(formationId, moduleId, formData) {
      const { data } = await addFormationContent(formationId, moduleId, formData)
      return data
    },
    async deleteFormationContent(formationId, contentId) {
      await deleteFormationContent(formationId, contentId)
    },
    async enrollFormation(formationId) {
      const { data } = await enrollFormation(formationId)
      return data
    }
  }
})
