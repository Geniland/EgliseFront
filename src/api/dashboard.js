import api from '@/utils/api'

export const dashboardApi = {
  getStats() {
    return api.get('/dashboard/stats')
  },
  getMinistryDistribution() {
    return api.get('/dashboard/ministry-distribution')
  },
  getPresenceDonationChart(period = 'monthly') {
    return api.get('/dashboard/presence-donation-chart', { params: { period } })
  },
  getFinancialSummary() {
    return api.get('/dashboard/financial-summary')
  },
  getUpcomingEvents() {
    return api.get('/dashboard/upcoming-events')
  },
  getRecentActivities(limit = 10) {
    return api.get('/dashboard/recent-activities', { params: { limit } })
  },
  getDevicesStatus() {
    return api.get('/dashboard/devices-status')
  },
}
