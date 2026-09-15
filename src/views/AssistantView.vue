<template>
  <div class="assistant-container">
    <!-- Barre latérale : Liste des discussions -->
    <aside class="conversations-sidebar" :class="{ 'mobile-open': showMobileSidebar }">
      <div class="sidebar-header">
        <button class="btn-new-chat" @click="createNewChat" :disabled="assistantStore.loading">
          <span class="icon">✨</span>
          <span>Nouvelle discussion</span>
        </button>
      </div>

      <div class="sidebar-list">
        <div v-if="assistantStore.loading && !assistantStore.conversations.length" class="sidebar-loading">
          <div class="spinner-sm"></div>
          <span>Chargement...</span>
        </div>

        <div v-else-if="!assistantStore.conversations.length" class="sidebar-empty">
          <p>Aucune discussion enregistrée.</p>
          <span class="subtext">Cliquez sur « Nouvelle discussion » pour débuter.</span>
        </div>

        <div
          v-for="conv in assistantStore.conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: currentConv?.id === conv.id }"
          @click="selectChat(conv.id)"
        >
          <div class="conv-icon">💬</div>
          <div class="conv-info">
            <h4 class="conv-title">{{ conv.titre || 'Discussion' }}</h4>
            <span class="conv-date">{{ formatDate(conv.updated_at) }}</span>
          </div>
          <button
            class="btn-delete-conv"
            title="Supprimer la discussion"
            @click.stop="confirmDelete(conv.id)"
          >
            🗑️
          </button>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="assistant-status">
          <span class="status-dot"></span>
          <span class="status-text">Assistant IA opérationnel</span>
        </div>
      </div>
    </aside>

    <!-- Zone principale de chat -->
    <main class="chat-main">
      <!-- En-tête du chat -->
      <header class="chat-header">
        <div class="header-left">
          <button class="btn-toggle-sidebar" @click="showMobileSidebar = !showMobileSidebar">
            ☰
          </button>
          <div class="assistant-avatar">
            <span>🕊️</span>
            <div class="avatar-badge"></div>
          </div>
          <div class="assistant-meta">
            <h2 class="assistant-name">Assistant Spirituel IA</h2>
            <p class="assistant-subtitle">Conseils bibliques, prières et édification personnelle</p>
          </div>
        </div>

        <div class="header-right">
          <span class="badge-spiritual">Foi & Évangile</span>
        </div>
      </header>

      <!-- Zone de défilement des messages -->
      <div class="messages-area" ref="messagesContainer">
        <!-- État d'accueil si aucun message -->
        <div v-if="!messages.length && !assistantStore.loading" class="welcome-screen">
          <div class="welcome-card">
            <div class="welcome-icon">✨</div>
            <h3>Bienvenue dans votre espace d'édification spirituelle</h3>
            <p>
              Je suis à votre disposition pour vous accompagner dans la méditation des Saintes Écritures, 
              répondre à vos interrogations sur la foi chrétienne ou vous encourager dans la prière.
            </p>

            <div class="suggestions-grid">
              <button
                v-for="(sug, idx) in suggestedPrompts"
                :key="idx"
                class="suggestion-btn"
                @click="sendPrompt(sug.text)"
              >
                <span class="sug-icon">{{ sug.icon }}</span>
                <span class="sug-text">{{ sug.text }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Liste des messages -->
        <div v-else class="messages-stream">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-row"
            :class="msg.expediteur === 'utilisateur' ? 'msg-user-row' : 'msg-bot-row'"
          >
            <div v-if="msg.expediteur !== 'utilisateur'" class="bot-avatar">
              🕊️
            </div>

            <div class="message-bubble" :class="msg.expediteur === 'utilisateur' ? 'bubble-user' : 'bubble-bot'">
              <div class="message-content">
                {{ msg.contenu }}
              </div>
              <div class="message-meta">
                <span>{{ formatTime(msg.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Indicateur de réflexion IA -->
          <div v-if="assistantStore.sending" class="message-row msg-bot-row">
            <div class="bot-avatar">🕊️</div>
            <div class="message-bubble bubble-bot thinking-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="thinking-text">L'assistant médite votre question...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Barre de saisie -->
      <footer class="chat-input-footer">
        <form class="input-form" @submit.prevent="submitMessage">
          <textarea
            v-model="inputContent"
            class="chat-textarea"
            placeholder="Posez une question, demandez un verset ou une prière... (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
            rows="1"
            ref="inputArea"
            @keydown.enter.exact.prevent="submitMessage"
            :disabled="assistantStore.sending"
          ></textarea>

          <button
            type="submit"
            class="btn-send"
            :disabled="!inputContent.trim() || assistantStore.sending"
            title="Envoyer"
          >
            <span v-if="!assistantStore.sending">➤</span>
            <div v-else class="spinner-sm white"></div>
          </button>
        </form>

        <p class="disclaimer-text">
          💡 Cet assistant est conçu pour vous encourager dans la foi. Pour tout accompagnement pastoral personnalisé, contactez directement les responsables de votre église.
        </p>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAssistantStore } from '@/stores/assistant'

const assistantStore = useAssistantStore()

const inputContent = ref('')
const inputArea = ref(null)
const messagesContainer = ref(null)
const showMobileSidebar = ref(false)

const currentConv = computed(() => assistantStore.currentConversation)
const messages = computed(() => assistantStore.messages)

const suggestedPrompts = [
  { icon: '📖', text: "Donne-moi un verset biblique pour fortifier ma journée" },
  { icon: '🙏', text: "Aide-moi à formuler une prière pour la paix intérieure" },
  { icon: '💡', text: "Que dit la Bible sur la persévérance dans l'épreuve ?" },
  { icon: '🕊️', text: "Comment puis-je approfondir ma relation quotidienne avec Dieu ?" },
]

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const createNewChat = async () => {
  try {
    await assistantStore.startNewConversation()
    showMobileSidebar.value = false
    await scrollToBottom()
  } catch (e) {}
}

const selectChat = async (id) => {
  await assistantStore.selectConversation(id)
  showMobileSidebar.value = false
  await scrollToBottom()
}

const confirmDelete = async (id) => {
  if (confirm('Voulez-vous vraiment supprimer cette discussion ?')) {
    await assistantStore.deleteConversation(id)
  }
}

const submitMessage = async () => {
  const text = inputContent.value.trim()
  if (!text || assistantStore.sending) return

  inputContent.value = ''
  await assistantStore.sendMessage(text)
  await scrollToBottom()
}

const sendPrompt = async (text) => {
  if (assistantStore.sending) return
  await assistantStore.sendMessage(text)
  await scrollToBottom()
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const formatTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await assistantStore.fetchConversations()
  if (assistantStore.conversations.length > 0) {
    await assistantStore.selectConversation(assistantStore.conversations[0].id)
    await scrollToBottom()
  }
})
</script>

<style scoped>
.assistant-container {
  display: flex;
  height: calc(100vh - 70px);
  background: #f8fafc;
  overflow: hidden;
}

/* Sidebar */
.conversations-sidebar {
  width: 320px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.btn-new-chat {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
}

.btn-new-chat:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sidebar-loading,
.sidebar-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}

.sidebar-empty .subtext {
  display: block;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.35rem;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.conversation-item:hover {
  background: #f1f5f9;
}

.conversation-item.active {
  background: #eef2ff;
  border-left: 3px solid #4f46e5;
}

.conv-icon {
  font-size: 1.1rem;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-date {
  font-size: 0.75rem;
  color: #94a3b8;
}

.btn-delete-conv {
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.4;
  padding: 0.25rem;
  font-size: 0.9rem;
  transition: opacity 0.2s ease;
}

.conversation-item:hover .btn-delete-conv {
  opacity: 0.8;
}

.btn-delete-conv:hover {
  opacity: 1 !important;
  transform: scale(1.1);
}

.sidebar-footer {
  padding: 0.85rem 1rem;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
}

.assistant-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #475569;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

/* Chat Main */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.btn-toggle-sidebar {
  display: none;
  background: transparent;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  color: #475569;
}

.assistant-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}

.avatar-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid #ffffff;
}

.assistant-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.assistant-subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
}

.badge-spiritual {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Messages Area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: #f8fafc;
}

.welcome-screen {
  max-width: 680px;
  margin: 2rem auto;
  text-align: center;
}

.welcome-card {
  background: #ffffff;
  padding: 2.5rem 2rem;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
}

.welcome-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.welcome-card h3 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.welcome-card p {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 1.75rem;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.75rem;
  text-align: left;
}

.suggestion-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: #334155;
  font-weight: 500;
}

.suggestion-btn:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #4f46e5;
  transform: translateY(-1px);
}

.messages-stream {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.message-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.msg-user-row {
  justify-content: flex-end;
}

.msg-bot-row {
  justify-content: flex-start;
}

.bot-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0e7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 75%;
  padding: 0.9rem 1.15rem;
  border-radius: 16px;
  font-size: 0.95rem;
  line-height: 1.55;
  word-break: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.bubble-user {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.bubble-bot {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
  white-space: pre-wrap;
}

.message-meta {
  font-size: 0.7rem;
  margin-top: 0.4rem;
  text-align: right;
  opacity: 0.75;
}

.thinking-bubble {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #64748b;
  font-style: italic;
  font-size: 0.85rem;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6366f1;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* Chat Input Footer */
.chat-input-footer {
  padding: 1rem 1.5rem;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.input-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 0.5rem 0.75rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-form:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  background: #ffffff;
}

.chat-textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
  color: #0f172a;
  max-height: 120px;
}

.btn-send {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.btn-send:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.disclaimer-text {
  margin: 0.5rem 0 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid #c7d2fe;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-sm.white {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .btn-toggle-sidebar {
    display: block;
  }

  .conversations-sidebar {
    position: absolute;
    top: 70px;
    bottom: 0;
    left: 0;
    z-index: 50;
    transform: translateX(-100%);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
  }

  .conversations-sidebar.mobile-open {
    transform: translateX(0);
  }
}
</style>
