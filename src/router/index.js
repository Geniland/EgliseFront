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
        },
        {
          path: 'presences',
          name: 'presences',
          component: () => import('@/views/AttendanceView.vue'),
        },
        {
          path: 'communication',
          name: 'communication',
          component: () => import('@/views/CommunicationView.vue'),
        },
        {
          path: 'assistant',
          name: 'assistant',
          component: () => import('@/views/AssistantView.vue'),
        },
        {
          path: 'requests',
          name: 'requests',
          component: () => import('@/views/AboutView.vue'),
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('@/views/ServicesMinistriesView.vue'),
        },
        {
          path: 'events',
          name: 'events',
          component: () => import('@/views/EventsView.vue'),
        },
        {
          path: 'churches',
          name: 'churches',
          component: () => import('@/views/ChurchesView.vue'),
        },
        {
          path: 'finances',
          name: 'finances',
          component: () => import('@/views/FinanceView.vue'),
        },
        {
          path: 'resources',
          name: 'resources',
          component: () => import('@/views/ResourcesView.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/AboutView.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/AboutView.vue'),
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
        },
        {
          path: 'live-streams/create',
          name: 'live-create',
          component: () => import('@/views/LiveStreamCreateView.vue'),
        },
        {
          path: 'live-streams/:id/manage',
          name: 'live-manage',
          component: () => import('@/views/LiveStreamManageView.vue'),
        },
        {
          path: 'live-streams/watch/:id?',
          name: 'live-watch',
          component: () => import('@/views/LiveStreamWatchView.vue'),
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

  if (to.meta.guestOnly && isAuth) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresSuperAdmin) {
    if (!isAuth) return { name: 'login' }
    if (!authStore.isSuperAdmin) return { name: 'dashboard' }
  }

  return true
})

export default router
