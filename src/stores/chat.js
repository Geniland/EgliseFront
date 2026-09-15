import { defineStore } from 'pinia'
import {
  getChatContacts,
  getChatMessages,
  sendChatMessage,
  setEphemeralDuration,
  getUnreadMessagesCount,
} from '../api/chat'

export const useChatStore = defineStore('chat', {
  state: () => ({
    contacts: [],
    activeContact: null,
    messages: [],
    ephemeralDuration: null,
    unreadTotal: 0,
    loadingContacts: false,
    loadingMessages: false,
    sending: false,
    error: '',
    pollingTimer: null,
  }),

  getters: {
    hasContacts: (state) => state.contacts.length > 0,
  },

  actions: {
    async fetchContacts() {
      this.loadingContacts = true
      try {
        const res = await getChatContacts()
        const d = res?.data || res
        this.contacts = Array.isArray(d) ? d : (d?.data || [])
      } catch (err) {
        this.error = err?.data?.message || err?.message || 'Erreur lors du chargement des contacts'
      } finally {
        this.loadingContacts = false
      }
    },

    async fetchUnreadCount() {
      try {
        const res = await getUnreadMessagesCount()
        const d = res?.data || res
        this.unreadTotal = d?.unread_count || 0
      } catch (err) {
        // Ignorer silencieusement pour le polling
      }
    },

    async selectContact(contact) {
      if (!contact) return
      this.activeContact = contact
      this.loadingMessages = true
      this.error = ''

      try {
        const res = await getChatMessages(contact.id)
        const d = res?.data || res
        this.messages = d?.messages || []
        this.ephemeralDuration = d?.ephemeral_duration || null

        // Mettre à jour le statut non lu du contact dans la liste
        const c = this.contacts.find(x => x.id === contact.id)
        if (c) {
          c.unread_count = 0
        }
        await this.fetchUnreadCount()
      } catch (err) {
        this.error = err?.data?.message || err?.message || 'Erreur lors du chargement des messages'
      } finally {
        this.loadingMessages = false
      }
    },

    async refreshActiveMessages() {
      if (!this.activeContact) return
      try {
        const res = await getChatMessages(this.activeContact.id)
        const d = res?.data || res
        this.messages = d?.messages || []
        this.ephemeralDuration = d?.ephemeral_duration || null
      } catch (e) {
        // En arrière-plan
      }
    },

    async sendMessage(contenu) {
      if (!contenu?.trim() || !this.activeContact) return

      const contactId = this.activeContact.id
      const tempMsg = {
        id: 'temp-' + Date.now(),
        sender_id: null,
        recipient_id: contactId,
        contenu: contenu.trim(),
        lu: false,
        is_mine: true,
        created_at: new Date().toISOString(),
      }
      this.messages.push(tempMsg)

      this.sending = true
      try {
        const res = await sendChatMessage(contactId, contenu.trim())
        const savedMsg = res?.data || res
        const idx = this.messages.findIndex(m => m.id === tempMsg.id)
        if (idx !== -1) {
          this.messages[idx] = savedMsg
        }

        // Mettre à jour le dernier message dans la liste des contacts
        const c = this.contacts.find(x => x.id === contactId)
        if (c) {
          c.last_message = {
            id: savedMsg.id,
            contenu: savedMsg.contenu,
            created_at: savedMsg.created_at,
            is_mine: true,
          }
        }
      } catch (err) {
        this.error = err?.data?.message || err?.message || "Erreur lors de l'envoi du message"
        this.messages = this.messages.filter(m => m.id !== tempMsg.id)
      } finally {
        this.sending = false
      }
    },

    async setDuration(duree) {
      if (!this.activeContact) return
      try {
        const res = await setEphemeralDuration(this.activeContact.id, duree)
        const d = res?.data || res
        this.ephemeralDuration = d?.duree || null
      } catch (err) {
        this.error = err?.data?.message || err?.message || 'Erreur lors de la configuration de la durée'
      }
    },

    startPolling(intervalMs = 6000) {
      this.stopPolling()
      this.pollingTimer = setInterval(() => {
        if (this.activeContact) {
          this.refreshActiveMessages()
        }
        this.fetchContacts()
        this.fetchUnreadCount()
      }, intervalMs)
    },

    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },
  },
})
