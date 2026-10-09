<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChurchesStore } from '@/stores/churches'
import { useChatStore } from '@/stores/chat'
import { dashboardApi } from '@/api/dashboard'
import { globalSearch } from '@/api/search'

const authStore = useAuthStore()
const churchesStore = useChurchesStore()
const chatStore = useChatStore()
const router = useRouter()
const route = useRoute()
const mobileMenuOpen = ref(false)

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

const navItems = [
  { key: 'dashboard', icon: '📊', label: 'Tableau de bord', path: '/dashboard', active: true },
  { key: 'my-qr', icon: '🪪', label: 'Mon QR Code', path: '/mon-qr-code' },
  { key: 'churches', icon: '⛪', label: 'Mes Églises', path: '/churches', churchManager: true },
  { key: 'members', icon: '👥', label: 'Membres', path: '/members', permissions: ['members.view'] },
  { key: 'presences', icon: '📅', label: 'Présences', path: '/presences', permissions: ['attendance.view'] },
  { key: 'communication', icon: '💬', label: 'Messagerie Pastorale', path: '/communication' },
  { key: 'assistant', icon: '🕊️', label: 'Assistant IA Spirituel', path: '/assistant' },
  { key: 'requests', icon: '📋', label: 'Demandes à traiter', path: '/requests', permissions: ['finance.view'] },
  { key: 'services', icon: '🤝', label: 'Services & Ministères', path: '/services', permissions: ['ministries.view'] },
  { key: 'events', icon: '🎉', label: 'Événements', path: '/events', permissions: ['events.view'] },
  { key: 'finances', icon: '💰', label: 'Finances', path: '/finances', permissions: ['finance.view'] },
  { key: 'resources', icon: '📚', label: 'Ressources & Formation', path: '/resources', permissions: ['resources.view', 'formations.view'] },
  { key: 'media', icon: '🎥', label: 'Médias & Diffusion', path: '/live-streams', permissions: ['live_streams.view'] },
  { key: 'reports', icon: '📈', label: 'Rapports', path: '/reports', permissions: ['reports.view', 'finance.reports', 'finance.view'] },
  { key: 'settings', icon: '⚙️', label: 'Paramètres & Sécurité', path: '/settings' },
]

const superAdminNav = {
  key: 'super-admin',
  icon: '👑',
  label: 'Super Admin',
  path: '/super-admin',
  badge: 'SA',
}

const shortcutItems = [
  { icon: '👥', label: 'Ajouter un membre', color: '#10B981', path: '/members', permission: 'members.create' },
  { icon: '📅', label: 'Enregistrer une présence', color: '#3B82F6', path: '/presences', permission: 'attendance.create' },
  { icon: '💬', label: 'Envoyer un message', color: '#F59E0B', path: '/communication' },
  { icon: '🕊️', label: 'Assistant Spirituel', color: '#8B5CF6', path: '/assistant' },
  { icon: '💰', label: 'Nouvelle transaction', color: '#10B981', path: '/finances', permission: 'finance.create' },
]

const activeRoute = computed(() => router.currentRoute.value.path)

const isSuperAdmin = computed(() => authStore.isSuperAdmin)
const canManageChurches = computed(() => authStore.canManageChurches)
const searchQuery = ref('')
const searchResults = ref([])
const searchOpen = ref(false)
const searchLoading = ref(false)
const searchError = ref('')
const notificationOpen = ref(false)
const notificationLoading = ref(false)
const notifications = ref([])
let searchTimer = null
let searchSequence = 0
const visibleNav = computed(() => navItems.filter(item => {
  if (item.churchManager) return canManageChurches.value || isSuperAdmin.value
  return !item.permissions || authStore.hasAnyPermission(item.permissions)
}))
const shortcuts = computed(() => shortcutItems.filter(item =>
  !item.permission || authStore.hasPermission(item.permission)
))

const churchDropdownOpen = ref(false)
const selectChurchLabel = computed(() => {
  if (!authStore.showChurchSwitcher) {
    return authStore.userChurchName || 'Église'
  }
  if (authStore.currentChurchId) {
    const c = authStore.churches.find(c => c.id === authStore.currentChurchId)
    return c?.name || 'Église'
  }
  return 'Toutes mes églises'
})
const selectChurchBadge = computed(() => {
  if (!authStore.currentChurchId) return '🌐'
  return '⛪'
})

const toggleChurchDropdown = () => {
  churchDropdownOpen.value = !churchDropdownOpen.value
}

const switchTo = (opt) => {
  try {
    if (opt === 'all') {
      authStore.switchChurch('all')
    } else {
      authStore.switchChurch(opt.id)
    }
    churchDropdownOpen.value = false
    // recharger la page pour rafraîchir toutes les listes avec le nouveau contexte
    window.location.reload()
  } catch (e) {
    console.error('Switch église error', e)
  }
}

watch(searchQuery, (value) => {
  window.clearTimeout(searchTimer)
  const query = value.trim()
  const sequence = ++searchSequence
  if (query.length < 2) {
    searchResults.value = []
    searchError.value = ''
    searchOpen.value = false
    searchLoading.value = false
    return
  }
  searchOpen.value = true
  searchLoading.value = true
  searchError.value = ''
  searchTimer = window.setTimeout(async () => {
    try {
      const response = await globalSearch(query)
      if (sequence === searchSequence) searchResults.value = response?.data?.results || []
    } catch (error) {
      if (sequence === searchSequence) {
        searchResults.value = []
        searchError.value = error?.data?.message || 'La recherche a échoué.'
      }
    } finally {
      if (sequence === searchSequence) searchLoading.value = false
    }
  }, 300)
})

const handleDocumentClick = (event) => {
  const target = event.target
  if (!target?.closest('.church-select')) churchDropdownOpen.value = false
  if (!target?.closest('.search-shell')) searchOpen.value = false
  if (!target?.closest('.notifications-shell')) notificationOpen.value = false
}

onMounted(async () => {
  try {
    if (authStore.isAuthenticated) {
      if (authStore.churches.length === 0) {
        await authStore.fetchChurches({ silent: true })
      }
      await chatStore.fetchUnreadCount()
    }
  } catch (e) {}
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.clearTimeout(searchTimer)
})

const openSearchResult = (result) => {
  searchOpen.value = false
  searchQuery.value = ''
  router.push(result.url || '/dashboard')
}

const goToActivity = (activity) => {
  notificationOpen.value = false
  const destinations = {
    new_member: '/members', donation: '/finances', event: '/events',
    live: '/live-streams', attendance: '/presences', message: '/communication',
  }
  router.push(destinations[activity.type] || '/dashboard')
}

const toggleNotifications = async () => {
  notificationOpen.value = !notificationOpen.value
  searchOpen.value = false
  if (!notificationOpen.value) return
  notificationLoading.value = true
  try {
    await chatStore.fetchUnreadCount()
    const response = await dashboardApi.getRecentActivities(8)
    notifications.value = Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    notifications.value = []
  } finally {
    notificationLoading.value = false
  }
}

const goTo = (path) => {
  mobileMenuOpen.value = false
  if (path && path.startsWith('/')) {
    router.push(path)
  }
}

const logout = async () => {
  mobileMenuOpen.value = false
  await authStore.logout()
  router.push('/login')
}

const userInitial = computed(() => {
  const name = authStore.user?.name || 'U'
  return name.charAt(0).toUpperCase()
})
</script>

<template>
  <div class="admin-layout" :class="{ 'mobile-menu-open': mobileMenuOpen }">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">Y</div>
        <div class="sidebar-logo-text">
          <h1>YAFINTECH</h1>
          <span>SOLUTION</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Navigation</div>
        <button
          v-for="item in visibleNav"
          :key="item.key"
          class="nav-item"
          :class="{ active: activeRoute === item.path || (item.key === 'dashboard' && activeRoute === '/') }"
          @click="goTo(item.path)"
        >
          <span class="nav-item-icon">{{ item.icon }}</span>
          <span class="nav-item-text">{{ item.label }}</span>
          <span v-if="item.key === 'communication' && chatStore.unreadTotal > 0" class="nav-unread-badge">
            {{ chatStore.unreadTotal }}
          </span>
          <span class="nav-item-arrow">›</span>
        </button>

        <template v-if="isSuperAdmin">
          <div class="nav-section-title" style="margin-top:4px">Espace Super Admin</div>
          <button
            class="nav-item"
            :class="{ active: activeRoute === '/super-admin' }"
            @click="goTo(superAdminNav.path)"
            style="background: linear-gradient(135deg, rgba(254,243,199,0.15), transparent); border: 1px solid rgba(254,243,199,0.2);"
          >
            <span class="nav-item-icon">{{ superAdminNav.icon }}</span>
            <span class="nav-item-text" style="display:flex;align-items:center;gap:8px;color:#FDE68A">
              {{ superAdminNav.label }}
              <span style="font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;background:#FDE68A;color:#78350F">{{ superAdminNav.badge }}</span>
            </span>
            <span class="nav-item-arrow">›</span>
          </button>
        </template>

        <div class="sidebar-shortcuts">
          <div class="shortcuts-title">Raccourcis</div>
          <div
            v-for="(sc, i) in shortcuts"
            :key="i"
            class="shortcut-item"
            @click="goTo(sc.path || '/members')"
          >
            <span class="shortcut-icon" :style="{ background: sc.color }">
              {{ sc.icon }}
            </span>
            <span>{{ sc.label }}</span>
          </div>
        </div>
      </nav>
    </aside>

    <div
      v-if="mobileMenuOpen"
      class="mobile-nav-backdrop"
      aria-hidden="true"
      @click="mobileMenuOpen = false"
    ></div>

    <div class="main-wrapper">
      <header class="topbar">
        <button
          type="button"
          class="mobile-menu-toggle"
          :aria-label="mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span aria-hidden="true">{{ mobileMenuOpen ? '✕' : '☰' }}</span>
        </button>
        <div class="search-shell">
          <div class="search-bar">
            <span class="search-bar-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Rechercher un membre, demande, événement..."
              aria-label="Recherche globale"
              autocomplete="off"
              @focus="searchOpen = searchQuery.trim().length >= 2"
              @keydown.enter.prevent="searchResults[0] && openSearchResult(searchResults[0])"
              @keydown.esc="searchOpen = false"
            />
            <span v-if="searchLoading" class="search-loading" aria-label="Recherche en cours">…</span>
          </div>
          <div v-if="searchOpen" class="search-popover">
            <p v-if="searchError" class="popover-message error">{{ searchError }}</p>
            <p v-else-if="searchLoading" class="popover-message">Recherche…</p>
            <p v-else-if="!searchResults.length" class="popover-message">Aucun résultat.</p>
            <button v-for="result in searchResults" :key="result.id" type="button" class="search-result" @click="openSearchResult(result)">
              <span class="result-type">{{ result.type }}</span>
              <span class="result-copy"><strong>{{ result.title }}</strong><small>{{ result.description || 'Ouvrir la section' }}</small></span>
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
        <div class="topbar-right">
          <div class="notifications-shell">
            <button class="topbar-icon-btn" title="Notifications et activités" aria-label="Ouvrir les notifications" :aria-expanded="notificationOpen" @click.stop="toggleNotifications">
              🔔
              <span v-if="chatStore.unreadTotal > 0" class="notif-count">{{ chatStore.unreadTotal > 99 ? '99+' : chatStore.unreadTotal }}</span>
            </button>
            <div v-if="notificationOpen" class="notification-popover" @click.stop>
              <div class="notification-heading"><strong>Activités récentes</strong><span v-if="chatStore.unreadTotal">{{ chatStore.unreadTotal }} message(s) non lu(s)</span></div>
              <button v-if="chatStore.unreadTotal" type="button" class="unread-link" @click="goToActivity({ type: 'message' })">Ouvrir la messagerie</button>
              <p v-if="notificationLoading" class="popover-message">Chargement…</p>
              <p v-else-if="!notifications.length" class="popover-message">Aucune activité récente.</p>
              <button v-for="activity in notifications" :key="activity.id" type="button" class="activity-item" @click="goToActivity(activity)">
                <strong>{{ activity.title }}</strong><span>{{ activity.description }}</span><small>{{ activity.time_ago }}</small>
              </button>
            </div>
          </div>
          <button class="topbar-icon-btn" title="Messagerie Pastorale" @click="goTo('/communication')">
            💬
            <span v-if="chatStore.unreadTotal > 0" class="notif-dot"></span>
          </button>

          <div class="church-select" v-if="authStore.showChurchSwitcher || authStore.churches.length" @click.stop>
            <div class="church-select-trigger" @click="toggleChurchDropdown">
              <span>{{ selectChurchBadge }}</span>
              <span class="church-select-label">{{ selectChurchLabel }}</span>
              <span class="church-select-caret">▾</span>
            </div>
            <div v-if="churchDropdownOpen" class="church-dropdown" @click.stop>
              <div class="church-dropdown-title">Contexte église</div>
              <div
                class="church-dropdown-item"
                :class="{ active: !authStore.currentChurchId }"
                @click="switchTo('all')"
              >
                <span>🌐</span>
                <span>Toutes mes églises (consolidé)</span>
                <span v-if="!authStore.currentChurchId" style="margin-left:auto;color:#10B981;font-weight:700">✓</span>
              </div>
              <div class="church-dropdown-divider" v-if="authStore.churches.length"></div>
              <div
                v-for="c in authStore.churches"
                :key="c.id"
                class="church-dropdown-item"
                :class="{ active: authStore.currentChurchId === c.id }"
                @click="switchTo(c)"
              >
                <span>⛪</span>
                <span>
                  <strong>{{ c.name }}</strong>
                  <span v-if="c.code" class="church-code">{{ c.code }}</span>
                  <span v-if="c.parent_name" class="church-hint">— ratt. à {{ c.parent_name }}</span>
                </span>
                <span v-if="authStore.currentChurchId === c.id" style="margin-left:auto;color:#10B981;font-weight:700">✓</span>
              </div>
              <div class="church-dropdown-footer">
                <RouterLink to="/churches" @click="churchDropdownOpen = false">
                  ➕ Gérer mes églises
                </RouterLink>
              </div>
            </div>
          </div>
          <div class="church-select" v-else>
            <span>⛪</span>
            <span class="church-select-label">{{ authStore.userChurchName || 'Église' }}</span>
            <span class="church-select-caret">▾</span>
          </div>

          <div class="user-menu" @click="logout" title="Déconnexion (cliquer)">
            <div class="user-info">
              <div class="user-name">{{ authStore.userName }}</div>
              <div class="user-role">{{ authStore.userRole }}</div>
            </div>
            <div class="user-avatar">{{ userInitial }}</div>
          </div>
        </div>
      </header>

      <main class="page-content">
        <RouterView />
      </main>

      <footer class="admin-footer">
        <div>© 2026 YAFINTECH Solution. Tous droits réservés.</div>
        <div class="footer-compliance">
          <span>🛡️</span>
          Conforme à la loi togolaise n°2019-014 sur la protection des données à caractère personnel (IPDCP)
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.church-select {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255,255,255,0.09);
  cursor: pointer;
  color: #e5e7eb;
  min-width: 240px;
  max-width: 360px;
  transition: all 0.15s ease;
  user-select: none;
}
.church-select:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(16, 185, 129, 0.35);
}
.church-select-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
}
.church-select-label {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.church-select-caret {
  font-size: 10px;
  opacity: 0.7;
}
.church-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 380px;
  max-width: calc(100vw - 40px);
  background: #ffffff;
  color: #111827;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 4px 10px rgba(0,0,0,0.08);
  border: 1px solid #e5e7eb;
  z-index: 500;
  overflow: hidden;
}
.church-dropdown-title {
  padding: 14px 18px;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: linear-gradient(180deg, #f9fafb, #ffffff);
  border-bottom: 1px solid #f3f4f6;
}
.church-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid #f9fafb;
}
.church-dropdown-item:hover {
  background: linear-gradient(90deg, #ecfdf5, #ffffff);
}
.church-dropdown-item.active {
  background: linear-gradient(90deg, #d1fae5, #ffffff);
  font-weight: 600;
}
.church-code {
  display: inline-block;
  background: #eef2ff;
  color: #4338ca;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  margin-left: 6px;
}
.church-hint {
  display: block;
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  margin-top: 2px;
}
.church-dropdown-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}
.church-dropdown-footer {
  padding: 12px 18px;
  background: linear-gradient(180deg, #ffffff, #f0fdf4);
  border-top: 1px solid #d1fae5;
}
.church-dropdown-footer a {
  display: block;
  padding: 10px 12px;
  background: #10b981;
  color: #fff;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
  transition: transform 0.1s;
}
.church-dropdown-footer a:hover { transform: translateY(-1px); filter: brightness(1.03); }

.nav-unread-badge {
  background: #10b981;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  margin-left: auto;
  margin-right: 6px;
  line-height: 1.2;
}

.search-shell, .notifications-shell { position: relative; }
.search-popover, .notification-popover { position:absolute; z-index:700; top:calc(100% + 10px); right:0; width:min(440px,calc(100vw - 32px)); overflow:hidden; border:1px solid #e2e8f0; border-radius:13px; background:#fff; color:#172033; box-shadow:0 18px 45px #0f172a24; }
.search-loading { color:#64748b; }
.popover-message { margin:0; padding:16px; color:#64748b; font-size:13px; }
.popover-message.error { color:#b42318; }
.search-result, .activity-item { display:flex; width:100%; gap:11px; padding:12px 14px; border:0; border-bottom:1px solid #f1f5f9; background:#fff; color:inherit; text-align:left; cursor:pointer; }
.search-result:hover, .activity-item:hover { background:#f8fafc; }
.result-type { flex:none; align-self:flex-start; padding:4px 7px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:10px; font-weight:800; }
.result-copy { display:grid; min-width:0; gap:3px; }
.result-copy strong, .result-copy small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.result-copy small, .activity-item span, .activity-item small { color:#64748b; font-size:12px; }
.notification-heading { display:grid; gap:4px; padding:14px; border-bottom:1px solid #eef0f4; }
.notification-heading span { color:#64748b; font-size:12px; }
.activity-item { display:grid; gap:4px; }
.notif-count { position:absolute; top:-4px; right:-5px; min-width:17px; padding:2px 4px; border-radius:999px; background:#ef4444; color:white; font-size:9px; font-weight:800; }
.unread-link { width:calc(100% - 24px); margin:10px 12px; padding:9px; border:0; border-radius:8px; background:#ecfdf5; color:#047857; font-weight:700; cursor:pointer; }

.mobile-menu-toggle,
.mobile-nav-backdrop { display: none; }

@media (max-width: 900px) {
  .sidebar {
    width: min(84vw, 300px);
    transform: translateX(-105%);
    z-index: 101;
    box-shadow: 18px 0 40px rgba(15, 23, 42, .25);
  }

  .admin-layout.mobile-menu-open .sidebar { transform: translateX(0); }

  .mobile-nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(15, 23, 42, .48);
    backdrop-filter: blur(2px);
  }

  .mobile-menu-toggle {
    display: inline-flex;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: #172033;
    font-size: 19px;
  }

  .main-wrapper {
    width: 100%;
    min-width: 0;
    margin-left: 0;
  }

  .topbar { gap: 10px; padding: 10px 16px; }
  .search-shell { flex: 1 1 180px; min-width: 0; }
  .topbar-right { gap: 8px; min-width: 0; }
  .page-content { min-width: 0; padding: 18px 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .admin-footer { padding: 14px 16px; }
  .footer-compliance { display: none; }
}

@media (max-width: 600px) {
  .topbar { flex-wrap: wrap; gap: 8px; padding: 10px; }
  .mobile-menu-toggle { order: 0; }
  .topbar-right { order: 1; flex: 1 1 auto; justify-content: flex-end; }
  .search-shell { order: 2; flex: 0 0 100%; width: 100%; }
  .topbar-icon-btn { width: 34px; height: 34px; flex: 0 0 34px; }
  .user-info { display: none; }
  .user-menu { flex: 0 0 auto; padding: 0 2px; }
  .church-select { flex: 0 1 auto; max-width: 112px; padding: 7px 9px; gap: 5px; }
  .church-select-label { max-width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .page-content { padding: 12px 10px; }
  .admin-footer { display: none; }
}
</style>
