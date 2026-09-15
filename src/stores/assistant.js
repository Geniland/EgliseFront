import { defineStore } from 'pinia'
import {
  getAssistantConversations,
  createAssistantConversation,
  getAssistantConversation,
  sendAssistantMessage,
  deleteAssistantConversation,
} from '../api/assistant'

export const useAssistantStore = defineStore('assistant', {
  state: () => ({
    conversations: [],
    currentConversation: null,
    messages: [],
    loading: false,
    sending: false,
    error: '',
  }),

  getters: {
    hasConversations: (state) => state.conversations.length > 0,
  },

  actions: {
    async fetchConversations() {
      this.loading = true
      this.error = ''
      try {
        const res = await getAssistantConversations()
        const d = res?.data || res
        this.conversations = Array.isArray(d) ? d : (d?.data || [])
      } catch (err) {
        this.error = err?.data?.message || err?.message || 'Erreur lors du chargement des conversations'
      } finally {
        this.loading = false
      }
    },

    async selectConversation(id) {
      this.loading = true
      this.error = ''
      try {
        const res = await getAssistantConversation(id)
        const d = res?.data || res
        this.currentConversation = d?.conversation || null
        this.messages = d?.messages || []
      } catch (err) {
        this.error = err?.data?.message || err?.message || 'Erreur lors du chargement de la discussion'
      } finally {
        this.loading = false
      }
    },

    async startNewConversation(titre = 'Nouvelle discussion') {
      this.loading = true
      this.error = ''
      try {
        const res = await createAssistantConversation({ titre })
        const newConv = res?.data || res
        this.conversations.unshift(newConv)
        this.currentConversation = newConv
        this.messages = []
        return newConv
      } catch (err) {
        this.error = err?.data?.message || err?.message || 'Erreur lors de la création de la discussion'
        throw err
      } finally {
        this.loading = false
      }
    },

    async sendMessage(contenu) {
      if (!contenu?.trim()) return

      // Si aucune discussion active, en créer une d'abord
      if (!this.currentConversation) {
        await this.startNewConversation()
      }

      const convId = this.currentConversation.id

      // Ajout optimiste du message utilisateur
      const tempUserMsg = {
        id: 'temp-' + Date.now(),
        expediteur: 'utilisateur',
        contenu: contenu.trim(),
        created_at: new Date().toISOString(),
      }
      this.messages.push(tempUserMsg)

      this.sending = true
      this.error = ''

      try {
        const res = await sendAssistantMessage(convId, contenu.trim())
        const d = res?.data || res

        // Remplacer le message temporaire par le message confirmé
        const idx = this.messages.findIndex(m => m.id === tempUserMsg.id)
        if (idx !== -1 && d?.user_message) {
          this.messages[idx] = d.user_message
        }

        // Ajouter la réponse de l'assistant
        if (d?.assistant_message) {
          this.messages.push(d.assistant_message)
        }

        // Mettre à jour la conversation dans la liste (titre mis à jour, date)
        if (d?.conversation) {
          this.currentConversation = d.conversation
          const cIdx = this.conversations.findIndex(c => c.id === convId)
          if (cIdx !== -1) {
            this.conversations[cIdx] = d.conversation
          }
        }
      } catch (err) {
        this.error = err?.data?.message || err?.message || "Erreur lors de l'envoi du message à l'assistant"
        // Retirer le message optimiste en cas d'échec
        this.messages = this.messages.filter(m => m.id !== tempUserMsg.id)
      } finally {
        this.sending = false
      }
    },

    async deleteConversation(id) {
      try {
        await deleteAssistantConversation(id)
        this.conversations = this.conversations.filter(c => c.id !== id)
        if (this.currentConversation?.id === id) {
          this.currentConversation = null
          this.messages = []
        }
      } catch (err) {
        this.error = err?.data?.message || err?.message || 'Erreur lors de la suppression'
      }
    },
  },
})
