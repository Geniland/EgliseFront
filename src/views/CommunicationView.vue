<template>
  <div class="communication-container">
    <!-- Colonne gauche : Liste des contacts -->
    <aside class="contacts-panel" :class="{ 'mobile-hidden': activeContact && isMobileView }">
      <div class="contacts-header">
        <h3 class="panel-title">Messagerie Pastorale</h3>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un membre ou responsable..."
            class="search-input"
          />
        </div>

        <!-- Filtres par rôle -->
        <div class="filter-pills">
          <button
            class="pill"
            :class="{ active: selectedRoleFilter === 'all' }"
            @click="selectedRoleFilter = 'all'"
          >
            Tous
          </button>
          <button
            class="pill"
            :class="{ active: selectedRoleFilter === 'staff' }"
            @click="selectedRoleFilter = 'staff'"
          >
            Responsables & Pasteurs
          </button>
          <button
            class="pill"
            :class="{ active: selectedRoleFilter === 'fidele' }"
            @click="selectedRoleFilter = 'fidele'"
          >
            Fidèles
          </button>
        </div>
      </div>

      <div class="contacts-list">
        <div v-if="chatStore.loadingContacts && !chatStore.contacts.length" class="loading-state">
          <div class="spinner-sm"></div>
          <span>Chargement des contacts...</span>
        </div>

        <div v-else-if="!filteredContacts.length" class="empty-state">
          <p>Aucun contact trouvé dans votre communauté.</p>
        </div>

        <div
          v-for="contact in filteredContacts"
          :key="contact.id"
          class="contact-item"
          :class="{ active: activeContact?.id === contact.id }"
          @click="selectContact(contact)"
        >
          <div class="avatar" :class="getAvatarClass(contact.role_id)">
            {{ contact.initiales }}
          </div>

          <div class="contact-details">
            <div class="contact-top">
              <span class="contact-name">{{ contact.name }}</span>
              <span v-if="contact.last_message" class="contact-time">
                {{ formatContactTime(contact.last_message.created_at) }}
              </span>
            </div>

            <div class="contact-bottom">
              <p class="contact-snippet">
                <span v-if="contact.last_message?.is_mine" class="snippet-prefix">Vous: </span>
                {{ contact.last_message?.contenu || 'Aucun message pour le moment' }}
              </p>
              <span v-if="contact.unread_count > 0" class="unread-badge">
                {{ contact.unread_count }}
              </span>
            </div>

            <div class="contact-tags">
              <span class="role-badge" :class="getRoleTagClass(contact.role_id)">
                {{ contact.role_name }}
              </span>
              <span v-if="contact.church_name" class="church-badge">
                ⛪ {{ contact.church_name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Colonne droite : Discussion active -->
    <main class="chat-panel" :class="{ 'mobile-hidden': !activeContact && isMobileView }">
      <div v-if="activeContact" class="chat-active-box">
        <!-- Header de conversation -->
        <header class="chat-box-header">
          <div class="header-user-info">
            <button v-if="isMobileView" class="btn-back" @click="activeContact = null">
              ←
            </button>
            <div class="avatar" :class="getAvatarClass(activeContact.role_id)">
              {{ activeContact.initiales }}
            </div>
            <div>
              <h3 class="active-name">{{ activeContact.name }}</h3>
              <p class="active-status">
                {{ activeContact.role_name }} • {{ activeContact.church_name || 'Église' }}
              </p>
            </div>
          </div>

          <!-- Menu Messages Éphémères -->
          <div class="ephemeral-dropdown-wrap">
            <button
              class="btn-ephemeral"
              :class="{ active: !!chatStore.ephemeralDuration }"
              @click="showDurationMenu = !showDurationMenu"
              title="Configurer la durée de suppression automatique"
            >
              <span class="ephemeral-icon">⏱️</span>
              <span class="ephemeral-label">
                {{ getDurationLabel(chatStore.ephemeralDuration) }}
              </span>
              <span class="chevron">▼</span>
            </button>

            <div v-if="showDurationMenu" class="duration-menu">
              <div class="menu-title">Suppression automatique</div>
              <button
                class="duration-option"
                :class="{ selected: !chatStore.ephemeralDuration }"
                @click="changeDuration(null)"
              >
                <span>Désactivé (Permanent)</span>
                <span v-if="!chatStore.ephemeralDuration">✓</span>
              </button>
              <button
                class="duration-option"
                :class="{ selected: chatStore.ephemeralDuration === '24h' }"
                @click="changeDuration('24h')"
              >
                <span>24 heures</span>
                <span v-if="chatStore.ephemeralDuration === '24h'">✓</span>
              </button>
              <button
                class="duration-option"
                :class="{ selected: chatStore.ephemeralDuration === '7j' }"
                @click="changeDuration('7j')"
              >
                <span>7 jours</span>
                <span v-if="chatStore.ephemeralDuration === '7j'">✓</span>
              </button>
              <button
                class="duration-option"
                :class="{ selected: chatStore.ephemeralDuration === '1mois' }"
                @click="changeDuration('1mois')"
              >
                <span>1 mois</span>
                <span v-if="chatStore.ephemeralDuration === '1mois'">✓</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Bandeau d'information messages éphémères -->
        <div v-if="chatStore.ephemeralDuration" class="ephemeral-banner">
          <span class="banner-icon">⏱️</span>
          <span>
            Les nouveaux messages s'effaceront automatiquement après
            <strong>{{ getDurationLabel(chatStore.ephemeralDuration) }}</strong>.
          </span>
        </div>

        <!-- Flux des messages -->
        <div class="messages-flow" ref="messagesContainer">
          <div v-if="chatStore.loadingMessages && !chatStore.messages.length" class="messages-loading">
            <div class="spinner-sm"></div>
            <span>Chargement des messages...</span>
          </div>

          <div v-else-if="!chatStore.messages.length" class="no-messages">
            <p>🕊️ Aucun message pour l'instant avec {{ activeContact.name }}.</p>
            <span class="subtext">Envoyez une salutation fraternelle pour commencer la discussion.</span>
          </div>

          <div v-else class="messages-stack">
            <div
              v-for="msg in chatStore.messages"
              :key="msg.id"
              class="chat-bubble-row"
              :class="msg.is_mine ? 'mine-row' : 'theirs-row'"
            >
              <div class="bubble" :class="msg.is_mine ? 'bubble-mine' : 'bubble-theirs'">
                <p class="bubble-text">{{ msg.contenu }}</p>
                <div class="bubble-footer">
                  <span v-if="msg.expires_at" class="ephemeral-tag" title="Message éphémère">
                    ⏱️
                  </span>
                  <span class="bubble-time">{{ formatBubbleTime(msg.created_at) }}</span>
                  <span v-if="msg.is_mine" class="read-receipt" :class="{ read: msg.lu }">
                    {{ msg.lu ? '✓✓' : '✓' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Zone de saisie du message -->
        <footer class="message-composer">
          <form class="composer-form" @submit.prevent="sendMessage">
            <input
              v-model="newMessageText"
              type="text"
              placeholder="Écrivez votre message..."
              class="composer-input"
              ref="composerInput"
              :disabled="chatStore.sending"
            />
            <button
              type="submit"
              class="btn-send-message"
              :disabled="!newMessageText.trim() || chatStore.sending"
            >
              <span v-if="!chatStore.sending">Envoyer ➤</span>
              <div v-else class="spinner-sm white"></div>
            </button>
          </form>
        </footer>
      </div>

      <!-- État sans contact sélectionné -->
      <div v-else class="chat-unselected">
        <div class="unselected-card">
          <div class="unselected-icon">💬</div>
          <h3>Messagerie Fraternelle & Pastorale</h3>
          <p>
            Sélectionnez un responsable, un pasteur ou un membre de votre église dans la liste de gauche pour échanger en toute confidentialité.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()

const searchQuery = ref('')
const selectedRoleFilter = ref('all')
const newMessageText = ref('')
const showDurationMenu = ref(false)
const messagesContainer = ref(null)
const composerInput = ref(null)
const isMobileView = ref(window.innerWidth <= 768)

const activeContact = computed({
  get: () => chatStore.activeContact,
  set: (val) => { chatStore.activeContact = val },
})

const filteredContacts = computed(() => {
  let list = chatStore.contacts || []

  // Filtre de recherche
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.role_name && c.role_name.toLowerCase().includes(q)) ||
      (c.church_name && c.church_name.toLowerCase().includes(q))
    )
  }

  // Filtre par rôle
  if (selectedRoleFilter.value === 'staff') {
    list = list.filter(c => [1, 2, 3, 5].includes(Number(c.role_id)))
  } else if (selectedRoleFilter.value === 'fidele') {
    list = list.filter(c => Number(c.role_id) === 6)
  }

  return list
})

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const selectContact = async (contact) => {
  await chatStore.selectContact(contact)
  showDurationMenu.value = false
  await scrollToBottom()
  nextTick(() => {
    composerInput.value?.focus()
  })
}

const sendMessage = async () => {
  const text = newMessageText.value.trim()
  if (!text || chatStore.sending) return

  newMessageText.value = ''
  await chatStore.sendMessage(text)
  await scrollToBottom()
}

const changeDuration = async (duree) => {
  await chatStore.setDuration(duree)
  showDurationMenu.value = false
}

const getDurationLabel = (duree) => {
  switch (duree) {
    case '24h': return '24 heures'
    case '7j': return '7 jours'
    case '1mois': return '1 mois'
    default: return 'Permanent'
  }
}

const getAvatarClass = (roleId) => {
  const id = Number(roleId)
  if (id === 1) return 'avatar-superadmin'
  if (id === 2 || id === 5) return 'avatar-pastor'
  return 'avatar-member'
}

const getRoleTagClass = (roleId) => {
  const id = Number(roleId)
  if (id === 1 || id === 2 || id === 5) return 'tag-pastor'
  return 'tag-member'
}

const formatContactTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const formatBubbleTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const handleResize = () => {
  isMobileView.value = window.innerWidth <= 768
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await chatStore.fetchContacts()
  await chatStore.fetchUnreadCount()
  chatStore.startPolling(5000)

  // Fermer le menu durée au clic extérieur
  document.addEventListener('click', (e) => {
    if (showDurationMenu.value && !e.target.closest('.ephemeral-dropdown-wrap')) {
      showDurationMenu.value = false
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chatStore.stopPolling()
})
</script>

<style scoped>
.communication-container {
  display: flex;
  height: calc(100vh - 70px);
  background: #f8fafc;
  overflow: hidden;
}

/* Contacts Panel */
.contacts-panel {
  width: 360px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.contacts-header {
  padding: 1.25rem 1rem 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.panel-title {
  margin: 0 0 0.85rem 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
}

.search-icon {
  font-size: 0.9rem;
  color: #94a3b8;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.85rem;
  width: 100%;
  color: #1e293b;
}

.filter-pills {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.75rem;
  overflow-x: auto;
}

.pill {
  padding: 0.3rem 0.65rem;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.pill.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

.contacts-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.loading-state,
.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
  margin-bottom: 0.25rem;
}

.contact-item:hover {
  background: #f8fafc;
}

.contact-item.active {
  background: #eef2ff;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.avatar-pastor {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #ffffff;
}

.avatar-superadmin {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: #ffffff;
}

.avatar-member {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
}

.contact-details {
  flex: 1;
  min-width: 0;
}

.contact-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.contact-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-time {
  font-size: 0.7rem;
  color: #94a3b8;
}

.contact-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.2rem;
}

.contact-snippet {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.snippet-prefix {
  font-weight: 500;
  color: #475569;
}

.unread-badge {
  background: #10b981;
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 10px;
  padding: 0.15rem 0.45rem;
  min-width: 18px;
  text-align: center;
}

.contact-tags {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.role-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.tag-pastor {
  background: #dbeafe;
  color: #1d4ed8;
}

.tag-member {
  background: #d1fae5;
  color: #047857;
}

.church-badge {
  font-size: 0.65rem;
  color: #64748b;
}

/* Chat Panel */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  height: 100%;
}

.chat-active-box {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.header-user-info {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.btn-back {
  background: transparent;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
}

.active-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.active-status {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
}

/* Ephemeral Menu */
.ephemeral-dropdown-wrap {
  position: relative;
}

.btn-ephemeral {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-ephemeral.active {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #4f46e5;
}

.duration-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  width: 210px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  padding: 0.5rem 0;
  z-index: 50;
}

.menu-title {
  padding: 0.4rem 1rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #94a3b8;
}

.duration-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 0.85rem;
  color: #334155;
  cursor: pointer;
}

.duration-option:hover {
  background: #f1f5f9;
}

.duration-option.selected {
  font-weight: 600;
  color: #4f46e5;
}

/* Ephemeral Banner */
.ephemeral-banner {
  background: #fffbeb;
  border-bottom: 1px solid #fef3c7;
  padding: 0.45rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #92400e;
}

/* Messages Flow */
.messages-flow {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: #f8fafc;
}

.messages-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 800px;
  margin: 0 auto;
}

.chat-bubble-row {
  display: flex;
}

.mine-row {
  justify-content: flex-end;
}

.theirs-row {
  justify-content: flex-start;
}

.bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.bubble-mine {
  background: #4f46e5;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.bubble-theirs {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
}

.bubble-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  word-break: break-word;
}

.bubble-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-top: 0.35rem;
  font-size: 0.68rem;
  opacity: 0.8;
}

.read-receipt {
  font-weight: 700;
}

.read-receipt.read {
  color: #93c5fd;
}

/* Composer */
.message-composer {
  padding: 1rem 1.5rem;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.composer-form {
  display: flex;
  gap: 0.75rem;
}

.composer-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  font-size: 0.9rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.composer-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.btn-send-message {
  padding: 0.75rem 1.25rem;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-send-message:hover:not(:disabled) {
  background: #4338ca;
}

.btn-send-message:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Unselected State */
.chat-unselected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 2rem;
}

.unselected-card {
  text-align: center;
  max-width: 440px;
}

.unselected-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.unselected-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.unselected-card p {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.6;
}

/* Mobile */
@media (max-width: 768px) {
  .contacts-panel {
    width: 100%;
  }

  .mobile-hidden {
    display: none !important;
  }
}
</style>
