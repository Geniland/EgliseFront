<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterView, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChurchesStore } from '@/stores/churches'
import { useChatStore } from '@/stores/chat'

const authStore = useAuthStore()
const churchesStore = useChurchesStore()
const chatStore = useChatStore()
const router = useRouter()

const navItems = [
  { key: 'dashboard', icon: '📊', label: 'Tableau de bord', path: '/dashboard', active: true },
  { key: 'churches', icon: '⛪', label: 'Mes Églises', path: '/churches' },
  { key: 'members', icon: '👥', label: 'Membres', path: '/members' },
  { key: 'presences', icon: '📅', label: 'Présences', path: '/presences' },
  { key: 'communication', icon: '💬', label: 'Messagerie Pastorale', path: '/communication' },
  { key: 'assistant', icon: '🕊️', label: 'Assistant IA Spirituel', path: '/assistant' },
  // { key: 'requests', icon: '📋', label: 'Demandes', path: '/requests' },
  { key: 'services', icon: '🤝', label: 'Services & Ministères', path: '/services' },
  { key: 'events', icon: '🎉', label: 'Événements', path: '/events' },
  { key: 'finances', icon: '💰', label: 'Finances', path: '/finances' },
  { key: 'resources', icon: '📚', label: 'Ressources & Formation', path: '/resources' },
  { key: 'media', icon: '🎥', label: 'Médias & Diffusion', path: '/live-streams' },
  // { key: 'reports', icon: '📈', label: 'Tableaux de bord', path: '/reports' },
  { key: 'settings', icon: '⚙️', label: 'Paramètres & Sécurité', path: '/settings' },
]

const superAdminNav = {
  key: 'super-admin',
  icon: '👑',
  label: 'Super Admin',
  path: '/super-admin',
  badge: 'SA',
}

const shortcuts = [
  { icon: '👥', label: 'Ajouter un membre', color: '#10B981', path: '/members' },
  { icon: '📅', label: 'Enregistrer une présence', color: '#3B82F6', path: '/presences' },
  { icon: '💬', label: 'Envoyer un message', color: '#F59E0B', path: '/communication' },
  { icon: '🕊️', label: 'Assistant Spirituel', color: '#8B5CF6', path: '/assistant' },
  { icon: '💰', label: 'Nouveau don', color: '#10B981', path: '/finances' },
]

const activeRoute = computed(() => router.currentRoute.value.path)

const isSuperAdmin = computed(() => authStore.isSuperAdmin)
const canManageChurches = computed(() => authStore.canManageChurches)
const visibleNav = computed(() => navItems.filter(n => {
  if (n.key !== 'churches') return true
  return canManageChurches.value || isSuperAdmin.value
}))

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

onMounted(async () => {
  try {
    if (authStore.isAuthenticated) {
      if (authStore.churches.length === 0) {
        await authStore.fetchChurches({ silent: true })
      }
      await chatStore.fetchUnreadCount()
    }
  } catch (e) {}
  document.addEventListener('click', (e) => {
    const el = e.target
    if (churchDropdownOpen.value && el && !el.closest('.church-select')) {
      churchDropdownOpen.value = false
    }
  })
})

const goTo = (path) => {
  if (path && path.startsWith('/')) {
    router.push(path)
  }
}

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

const userInitial = computed(() => {
  const name = authStore.user?.name || 'U'
  return name.charAt(0).toUpperCase()
})
</script>

<template>
  <div class="admin-layout">
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

    <div class="main-wrapper">
      <header class="topbar">
        <div class="search-bar">
          <span class="search-bar-icon">🔍</span>
          <input type="text" placeholder="Rechercher un membre, demande, événement..." />
        </div>
        <div class="topbar-right">
          <button class="topbar-icon-btn" title="Notifications">
            🔔
            <span class="notif-dot"></span>
          </button>
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
</style>
