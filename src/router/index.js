import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'members',
          name: 'members',
          component: () => import('@/views/MembersView.vue'),
          meta: { permissions: ['members.view'] },
        },
        {
          path: 'presences',
          name: 'presences',
          component: () => import('@/views/AttendanceView.vue'),
          meta: { permissions: ['attendance.view'] },
        },
        {
          path: 'communication',
          name: 'communication',
          component: () => import('@/views/CommunicationView.vue'),
        },
        {
          path: 'mon-qr-code',
          name: 'my-qr',
          component: () => import('@/views/MyQrCodeView.vue'),
        },
        {
          path: 'assistant',
          name: 'assistant',
          component: () => import('@/views/AssistantView.vue'),
        },
        {
          path: 'requests',
          name: 'requests',
          component: () => import('@/views/RequestsView.vue'),
          meta: { permissions: ['finance.view'] },
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('@/views/ServicesMinistriesView.vue'),
          meta: { permissions: ['ministries.view'] },
        },
        {
          path: 'events',
          name: 'events',
          component: () => import('@/views/EventsView.vue'),
          meta: { permissions: ['events.view'] },
        },
        {
          path: 'churches',
          name: 'churches',
          component: () => import('@/views/ChurchesView.vue'),
          meta: { requiresChurchManager: true },
        },
        {
          path: 'finances',
          name: 'finances',
          component: () => import('@/views/FinanceView.vue'),
          meta: { permissions: ['finance.view'] },
        },
        {
          path: 'resources',
          name: 'resources',
          component: () => import('@/views/ResourcesView.vue'),
          meta: { anyPermissions: ['resources.view', 'formations.view'] },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/ReportsView.vue'),
          meta: { anyPermissions: ['reports.view', 'finance.reports', 'finance.view'] },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SecuritySettingsView.vue'),
        },
        {
          path: 'super-admin',
          name: 'super-admin',
          component: () => import('@/views/SuperAdminView.vue'),
          meta: { requiresSuperAdmin: true },
        },
        {
          path: 'live-streams',
          name: 'live-streams',
          component: () => import('@/views/LiveStreamsView.vue'),
          meta: { permissions: ['live_streams.view'] },
        },
        {
          path: 'live-streams/create',
          name: 'live-create',
          component: () => import('@/views/LiveStreamCreateView.vue'),
          meta: { permissions: ['live_streams.create'] },
        },
        {
          path: 'live-streams/:id/manage',
          name: 'live-manage',
          component: () => import('@/views/LiveStreamManageView.vue'),
          meta: { permissions: ['live_streams.view'], anyPermissions: ['live_streams.update', 'live_streams.publish', 'live_streams.end', 'live_streams.configure', 'live_streams.delete', 'live_streams.replay'] },
        },
        {
          path: 'live-streams/watch/:id?',
          name: 'live-watch',
          component: () => import('@/views/LiveStreamWatchView.vue'),
          meta: { permissions: ['live_streams.view'] },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const isAuth = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuth) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAuth && !(await authStore.ensurePermissions())) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && isAuth) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresSuperAdmin) {
    if (!isAuth) return { name: 'login' }
    if (!authStore.isSuperAdmin) return { name: 'dashboard' }
  }

  if (to.meta.requiresChurchManager && !authStore.canManageChurches) {
    return { name: 'dashboard' }
  }

  if (Array.isArray(to.meta.permissions) && !to.meta.permissions.every(permission => authStore.hasPermission(permission))) {
    return { name: 'dashboard' }
  }

  if (Array.isArray(to.meta.anyPermissions) && !authStore.hasAnyPermission(to.meta.anyPermissions)) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
