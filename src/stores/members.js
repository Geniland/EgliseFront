import { defineStore } from 'pinia'
import {
  listMembers, getMember, createMember, updateMember, deleteMember,
  listMinistries, listFamilies, createFamily, getMemberStatic,
} from '../api/members'

function buildErrorMap(data) {
  const errors = {}
  if (data && data.errors && typeof data.errors === 'object') {
    for (const k of Object.keys(data.errors)) {
      const v = data.errors[k]
      errors[k] = Array.isArray(v) ? v[0] : String(v)
    }
  }
  return errors
}

export const useMembersStore = defineStore('members', {
  state: () => ({
    members: [],
    pagination: {
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 15,
      from: 0,
      to: 0,
    },
    ministries: [],
    families: [],
    statics: { genders: [], marital_statuses: [], member_types: [] },
    loading: false,
    saving: false,
    deleting: false,
    error: '',
  }),
  actions: {
    async loadMembers(params = {}) {
      this.loading = true
      this.error = ''
      try {
        const { data } = await listMembers(params)
        this.members = data?.data || []
        const meta = data?.meta || data || {}
        this.pagination = {
          current_page: meta.current_page || 1,
          last_page: meta.last_page || 1,
          total: meta.total || 0,
          per_page: meta.per_page || 15,
          from: meta.from || 0,
          to: meta.to || 0,
        }
      } catch (e) {
        this.error = e?.data?.message || e.message || 'Erreur de chargement'
        this.members = []
      } finally {
        this.loading = false
      }
    },
    async loadReferentiels() {
      try {
        const [m, f, s] = await Promise.all([listMinistries(), listFamilies(), getMemberStatic()])
        this.ministries = m?.data || []
        this.families = f?.data || []
        if (s?.data) this.statics = s.data
      } catch (e) {
        // fallback enums (mémorisation côté front si API indisponible)
        if (!this.statics.genders.length) {
          this.statics = {
            genders: ['Homme', 'Femme'],
            marital_statuses: ['Célibataire', 'Marié', 'Divorcé', 'Veuf'],
            member_types: ['Visiteur', 'Catéchumène', 'Membre', 'Responsable', 'Pasteur'],
          }
        }
      }
    },
    async refreshFamilies() {
      try {
        const { data } = await listFamilies()
        this.families = data || []
      } catch (e) { /* ignore */ }
    },
    async createFamilyInline(payload) {
      const { data } = await createFamily(payload)
      if (data?.family) this.families.push(data.family)
      return data?.family
    },
    async create(payload) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await createMember(payload)
        return { ok: true, message: data?.message, member: data?.member }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally {
        this.saving = false
      }
    },
    async update(id, payload) {
      this.saving = true
      this.error = ''
      try {
        const { data } = await updateMember(id, payload)
        return { ok: true, message: data?.message, member: data?.member }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message, errors: buildErrorMap(e?.data) }
      } finally {
        this.saving = false
      }
    },
    async remove(id) {
      this.deleting = true
      try {
        const { data } = await deleteMember(id)
        this.members = this.members.filter(m => String(m.id) !== String(id))
        return { ok: true, message: data?.message }
      } catch (e) {
        return { ok: false, message: e?.data?.message || e.message }
      } finally {
        this.deleting = false
      }
    },
  },
})
