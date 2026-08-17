<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi } from '@/api/dashboard'
import SparklineChart from '@/components/dashboard/SparklineChart.vue'
import LineChart from '@/components/dashboard/LineChart.vue'
import DonutChart from '@/components/dashboard/DonutChart.vue'

const authStore = useAuthStore()

const loading = ref(false)
const chartPeriod = ref('Mensuel')
const finPeriod = ref('Mensuel')

const stats = ref({
  members_total: {
    value: 12458, growth: 12.5, new_this_month: 1392,
    sparkline: [3200, 4100, 3900, 5200, 6000, 5800, 7200, 7900, 8800, 10200, 11000, 12458],
  },
  presences_month: {
    value: 8752, growth: 15.3, attendance_rate: 70.2,
    sparkline: [5000, 5200, 5800, 6100, 6400, 6900, 7100, 7600, 7900, 8100, 8300, 8752],
  },
  donations: {
    value: 25680000, currency: 'FCFA', growth: 18.6,
    sparkline: [18000000, 18500000, 19000000, 20000000, 21500000, 22000000, 22400000, 23000000, 23800000, 24500000, 25100000, 25680000],
  },
  events: {
    value: 24, growth: 9.1,
    sparkline: [10, 12, 11, 14, 15, 16, 18, 17, 19, 21, 23, 24],
  },
  pending_requests: {
    value: 58, growth: -5.6,
    sparkline: [40, 45, 52, 60, 55, 62, 68, 70, 64, 60, 59, 58],
  },
})

const chartData = ref({
  labels: [],
  datasets: [],
})

const ministryDistribution = ref({
  total: 12458,
  ministries: [
    { id: 1, name: 'Louange & Adoration', count: 2845, percentage: 22.8, color: '#4F46E5' },
    { id: 2, name: 'Enseignement', count: 2156, percentage: 17.3, color: '#10B981' },
    { id: 3, name: 'Jeunesse', count: 1985, percentage: 15.9, color: '#F59E0B' },
    { id: 4, name: 'Intercession', count: 1624, percentage: 13.0, color: '#EF4444' },
    { id: 5, name: 'Diaconat', count: 1256, percentage: 10.1, color: '#8B5CF6' },
    { id: 6, name: 'Autres', count: 2592, percentage: 20.9, color: '#6B7280' },
  ],
})

const financial = ref({
  period: 'Mensuel',
  receipts: {
    total: 28560000, growth: 18.6, currency: 'FCFA',
    breakdown: [
      { label: 'Dîmes', value: 12450000, percentage: 43.6 },
      { label: 'Offrandes', value: 9869000, percentage: 34.6 },
      { label: 'Dons', value: 4120000, percentage: 14.4 },
      { label: 'Autres', value: 2121000, percentage: 7.4 },
    ],
  },
  expenses: {
    total: 12850000, growth: -8.3, currency: 'FCFA',
    breakdown: [
      { label: 'Salaires', value: 5200000, percentage: 40.5 },
      { label: 'Projets', value: 3200000, percentage: 24.9 },
      { label: 'Fonctionnement', value: 2450000, percentage: 19.1 },
      { label: 'Autres', value: 2000000, percentage: 15.6 },
    ],
  },
  net_balance: {
    total: 15710000, growth: 27.4, currency: 'FCFA',
  },
})

const upcomingEvents = ref([
  { id: 1, day: '25', month: 'MAI', title: 'Culte dominical', meta: 'Temple principal', time: '25 Mai 2026 · 08:00 - 11:00', status: 'À venir' },
  { id: 2, day: '28', month: 'MAI', title: 'Réunion des jeunes', meta: 'Salle des jeunes', time: '28 Mai 2026 · 17:00 - 19:30', status: 'À venir' },
  { id: 3, day: '31', month: 'MAI', title: 'Conférence des couples', meta: 'Auditorium', time: '31 Mai 2026 · 14:00 - 17:30', status: 'À venir' },
])

const recentActivities = ref([
  { id: 1, type: 'new_member', icon: '👤', color: '#8B5CF6', title: 'Nouveau membre inscrit', desc: 'Marie KOUASSI', time: 'Il y a 5 min' },
  { id: 2, type: 'attendance', icon: '✅', color: '#10B981', title: 'Présence enregistrée', desc: 'Culte du dimanche', time: 'Il y a 15 min' },
  { id: 3, type: 'donation', icon: '💰', color: '#F59E0B', title: 'Nouveau don reçu', desc: 'Offrande - 50 000 FCFA', time: 'Il y a 25 min' },
  { id: 4, type: 'prayer_request', icon: '🙏', color: '#EC4899', title: 'Demande de prière', desc: 'Par Jean Paul M.', time: 'Il y a 35 min' },
  { id: 5, type: 'event', icon: '📅', color: '#4F46E5', title: 'Nouvel événement créé', desc: 'Conférence des couples', time: 'Il y a 1 h' },
])

const devices = ref({
  smart_terminals: { label: 'Borne intelligente', status: 'En ligne', value: '3 bornes actives', color: 'green' },
  rfid_cards: { label: 'Cartes RFID', status: 'Actives', value: '2 458 cartes', color: 'purple' },
  qr_code: { label: 'QR Code', status: 'Utilisés ce mois', value: '1 256 scans', color: 'purple' },
  telephone: { label: 'Téléphone / USSD', status: 'Actif', value: '+228 90 XX XX XX', color: 'blue' },
  voice_assistant: { label: 'Assistant Vocal (IA)', status: 'Disponible', value: '24/7', color: 'purple' },
})

const channels = [
  { key: 'sms', name: 'SMS', action: 'Envoyer SMS', icon: '💬', class: 'sms' },
  { key: 'whatsapp', name: 'WhatsApp', action: 'Envoyer message', icon: '📞', class: 'whatsapp' },
  { key: 'email', name: 'Email', action: 'Envoyer email', icon: '✉️', class: 'email' },
  { key: 'push', name: 'Push', action: 'Notification push', icon: '🔔', class: 'push' },
  { key: 'call', name: 'Appels vocaux', action: 'Passer un appel', icon: '📞', class: 'call' },
  { key: 'live', name: 'Diffusions Live', action: 'Démarrer live', icon: '▶️', class: 'live' },
]

const formatCurrency = (val) => {
  return new Intl.NumberFormat('fr-FR').format(val || 0) + ' FCFA'
}
const formatNumber = (val) => {
  return new Intl.NumberFormat('fr-FR').format(val || 0)
}

const userName = computed(() => authStore.userName)

const loadAll = async () => {
  loading.value = true
  try {
    const [
      statsRes,
      chartRes,
      ministryRes,
      finRes,
      eventsRes,
      activitiesRes,
      devicesRes,
    ] = await Promise.allSettled([
      dashboardApi.getStats(),
      dashboardApi.getPresenceDonationChart(),
      dashboardApi.getMinistryDistribution(),
      dashboardApi.getFinancialSummary(),
      dashboardApi.getUpcomingEvents(),
      dashboardApi.getRecentActivities(8),
      dashboardApi.getDevicesStatus(),
    ])

    if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
      stats.value = statsRes.value.data
    }
    if (chartRes.status === 'fulfilled' && chartRes.value?.data) {
      chartData.value = {
        labels: chartRes.value.data.labels || [],
        datasets: chartRes.value.data.datasets || [],
      }
    }
    if (ministryRes.status === 'fulfilled' && ministryRes.value?.data) {
      ministryDistribution.value = ministryRes.value.data
    }
    if (finRes.status === 'fulfilled' && finRes.value?.data) {
      financial.value = finRes.value.data
    }
    if (eventsRes.status === 'fulfilled' && eventsRes.value?.data) {
      upcomingEvents.value = eventsRes.value.data
    }
    if (activitiesRes.status === 'fulfilled' && activitiesRes.value?.data) {
      const raw = activitiesRes.value.data
      recentActivities.value = raw.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        desc: a.description,
        time: a.time_ago,
        icon: a.type === 'new_member' ? '👤' :
              a.type === 'attendance' ? '✅' :
              a.type === 'donation' ? '💰' :
              a.type === 'prayer_request' ? '🙏' :
              a.type === 'event' ? '📅' :
              a.type === 'message' ? '💬' : '📌',
        color: a.color || '#4F46E5',
      }))
    }
    if (devicesRes.status === 'fulfilled' && devicesRes.value?.data) {
      devices.value = devicesRes.value.data
    }
  } catch (e) {
    console.warn('Dashboard API partial error (fallback to demo data):', e)
  } finally {
    loading.value = false
    if (!chartData.value.labels?.length) {
      const labels = []
      const presences = []
      const donations = []
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        labels.push(`${String(d.getDate()).padStart(2,'0')} ${d.toLocaleString('fr-FR', { month: 'short' })}`)
        const dow = d.getDay()
        let p = 350 + Math.floor(Math.random() * 500)
        let dn = 500000 + Math.floor(Math.random() * 1500000)
        if (dow === 0) { p *= 2.5; dn *= 3 }
        presences.push(Math.floor(p))
        donations.push(Math.floor(dn))
      }
      chartData.value = {
        labels,
        datasets: [
          { label: 'Présences', data: presences, borderColor: '#3B82F6' },
          { label: 'Dons (FCFA)', data: donations, borderColor: '#10B981' },
        ],
      }
    }
  }
}

onMounted(loadAll)
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-title">
        <h2>Bonjour, {{ userName }} ! 👋</h2>
        <p>Voici l'aperçu général de votre organisation aujourd'hui.</p>
      </div>
      <div class="page-header-actions">
        <select class="filter-select">
          <option>Toutes les églises</option>
          <option>Église Source de Vie</option>
        </select>
        <div class="date-filter">
          <span>01 Mai - 31 Mai 2026</span>
          <span>📅</span>
        </div>
        <button class="btn-export">
          <span>📤</span>
          Exporter le rapport
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-header">
          <div style="flex:1">
            <div class="stat-label">Membres totaux</div>
            <div class="stat-value-row">
              <span class="stat-value">{{ formatNumber(stats.members_total.value) }}</span>
              <span class="stat-growth" :class="stats.members_total.growth >= 0 ? 'up' : 'down'">
                <span>{{ stats.members_total.growth >= 0 ? '↑' : '↓' }}</span>
                {{ Math.abs(stats.members_total.growth) }}%
              </span>
            </div>
          </div>
          <div class="stat-icon purple">👥</div>
        </div>
        <div class="stat-meta">
          <span>+{{ formatNumber(stats.members_total.new_this_month) }} ce mois</span>
        </div>
        <SparklineChart
          :data="stats.members_total.sparkline || []"
          color="#4F46E5"
          :width="240"
          :height="32"
        />
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <div style="flex:1">
            <div class="stat-label">Présences (ce mois)</div>
            <div class="stat-value-row">
              <span class="stat-value">{{ formatNumber(stats.presences_month.value) }}</span>
              <span class="stat-growth" :class="stats.presences_month.growth >= 0 ? 'up' : 'down'">
                <span>{{ stats.presences_month.growth >= 0 ? '↑' : '↓' }}</span>
                {{ Math.abs(stats.presences_month.growth) }}%
              </span>
            </div>
          </div>
          <div class="stat-icon green">✅</div>
        </div>
        <div class="stat-meta">
          <span>{{ stats.presences_month.attendance_rate }}% taux de présence</span>
        </div>
        <SparklineChart
          :data="stats.presences_month.sparkline || []"
          color="#10B981"
          :width="240"
          :height="32"
        />
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <div style="flex:1">
            <div class="stat-label">Dons & Offrandes</div>
            <div class="stat-value-row">
              <span class="stat-value">{{ formatCurrency(stats.donations.value) }}</span>
              <span class="stat-growth" :class="stats.donations.growth >= 0 ? 'up' : 'down'">
                <span>{{ stats.donations.growth >= 0 ? '↑' : '↓' }}</span>
                {{ Math.abs(stats.donations.growth) }}%
              </span>
            </div>
          </div>
          <div class="stat-icon orange">💰</div>
        </div>
        <div class="stat-meta">
          <span>vs mois dernier</span>
        </div>
        <SparklineChart
          :data="stats.donations.sparkline || []"
          color="#F59E0B"
          :width="240"
          :height="32"
        />
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <div style="flex:1">
            <div class="stat-label">Événements</div>
            <div class="stat-value-row">
              <span class="stat-value">{{ formatNumber(stats.events.value) }}</span>
              <span class="stat-growth" :class="stats.events.growth >= 0 ? 'up' : 'down'">
                <span>{{ stats.events.growth >= 0 ? '↑' : '↓' }}</span>
                {{ Math.abs(stats.events.growth) }}%
              </span>
            </div>
          </div>
          <div class="stat-icon blue">📅</div>
        </div>
        <div class="stat-meta">
          <span>À venir ce mois</span>
        </div>
        <SparklineChart
          :data="stats.events.sparkline || []"
          color="#3B82F6"
          :width="240"
          :height="32"
        />
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <div style="flex:1">
            <div class="stat-label">Demandes en cours</div>
            <div class="stat-value-row">
              <span class="stat-value">{{ formatNumber(stats.pending_requests.value) }}</span>
              <span class="stat-growth" :class="stats.pending_requests.growth >= 0 ? 'up' : 'down'">
                <span>{{ stats.pending_requests.growth >= 0 ? '↑' : '↓' }}</span>
                {{ Math.abs(stats.pending_requests.growth) }}%
              </span>
            </div>
          </div>
          <div class="stat-icon pink">📋</div>
        </div>
        <div class="stat-meta">
          <span>À traiter</span>
        </div>
        <SparklineChart
          :data="stats.pending_requests.sparkline || []"
          color="#EC4899"
          :width="240"
          :height="32"
        />
      </div>
    </div>

    <div class="dashboard-grid-row">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Évolution des présences & dons</h3>
          <div class="card-actions">
            <select class="card-select" v-model="chartPeriod">
              <option>Hebdomadaire</option>
              <option>Mensuel</option>
              <option>Annuel</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <div class="chart-legend">
              <div class="chart-legend-item">
                <span class="legend-dot" style="background:#3B82F6"></span>
                Présences
              </div>
              <div class="chart-legend-item">
                <span class="legend-dot" style="background:#10B981"></span>
                Dons (FCFA)
              </div>
            </div>
            <LineChart
              :labels="chartData.labels"
              :datasets="chartData.datasets"
              :height="220"
            />
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Répartition des membres par département</h3>
        </div>
        <div class="card-body">
          <DonutChart
            :items="ministryDistribution.ministries"
            :total="ministryDistribution.total"
            :size="200"
            :thickness="30"
          />
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Activités récentes</h3>
          <a href="#" class="link-see-all">Voir tout</a>
        </div>
        <div class="card-body">
          <div class="activity-list">
            <div v-for="act in recentActivities" :key="act.id" class="activity-item">
              <div class="activity-icon" :style="{ background: act.color }">
                {{ act.icon }}
              </div>
              <div class="activity-content">
                <h4 class="activity-title">{{ act.title }}</h4>
                <p class="activity-desc">{{ act.desc }}</p>
              </div>
              <div class="activity-time">{{ act.time }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid-row-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Résumé financier</h3>
          <div class="card-actions">
            <select class="card-select" v-model="finPeriod">
              <option>Mensuel</option>
              <option>Trimestriel</option>
              <option>Annuel</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="financial-grid">
            <div class="financial-box receipts">
              <div class="financial-box-header">
                <div class="financial-icon">🏛️</div>
                <span class="financial-growth" :class="financial.receipts.growth >= 0 ? 'up' : 'down'">
                  {{ financial.receipts.growth >= 0 ? '↑' : '↓' }} {{ Math.abs(financial.receipts.growth) }}%
                </span>
              </div>
              <div class="financial-label">Recettes</div>
              <div class="financial-value">{{ formatCurrency(financial.receipts.total) }}</div>
              <div class="breakdown-list">
                <div v-for="b in financial.receipts.breakdown" :key="'r-'+b.label" class="breakdown-item">
                  <span class="breakdown-left">
                    <span>{{ b.label }}</span>
                    <span class="breakdown-bar"><span class="breakdown-bar-fill" :style="{ width: b.percentage + '%' }"></span></span>
                  </span>
                  <span class="breakdown-value">{{ formatCurrency(b.value) }}</span>
                </div>
              </div>
            </div>

            <div class="financial-box expenses">
              <div class="financial-box-header">
                <div class="financial-icon">📤</div>
                <span class="financial-growth" :class="financial.expenses.growth >= 0 ? 'up' : 'down'">
                  {{ financial.expenses.growth >= 0 ? '↑' : '↓' }} {{ Math.abs(financial.expenses.growth) }}%
                </span>
              </div>
              <div class="financial-label">Dépenses</div>
              <div class="financial-value">{{ formatCurrency(financial.expenses.total) }}</div>
              <div class="breakdown-list">
                <div v-for="b in financial.expenses.breakdown" :key="'e-'+b.label" class="breakdown-item">
                  <span class="breakdown-left">
                    <span>{{ b.label }}</span>
                    <span class="breakdown-bar"><span class="breakdown-bar-fill" :style="{ width: b.percentage + '%' }"></span></span>
                  </span>
                  <span class="breakdown-value">{{ formatCurrency(b.value) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="net-balance">
            <div class="net-balance-label">Solde net</div>
            <div class="net-balance-right">
              <div class="net-balance-value">{{ formatCurrency(financial.net_balance.total) }}</div>
              <span class="financial-growth" :class="financial.net_balance.growth >= 0 ? 'up' : 'down'">
                {{ financial.net_balance.growth >= 0 ? '↑' : '↓' }} {{ Math.abs(financial.net_balance.growth) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Prochains événements</h3>
          <a href="#" class="link-see-all">Voir tout</a>
        </div>
        <div class="card-body">
          <div class="events-list">
            <div v-for="ev in upcomingEvents" :key="ev.id" class="event-item">
              <div class="event-date-block">
                <div class="event-day">{{ ev.day }}</div>
                <div class="event-month">{{ ev.month }}</div>
              </div>
              <div class="event-content">
                <h4 class="event-title">{{ ev.title }}</h4>
                <p class="event-meta">{{ ev.meta }}</p>
                <p class="event-time">{{ ev.time }}</p>
              </div>
              <span class="event-status">{{ ev.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Canaux de communication</h3>
        </div>
        <div class="card-body">
          <div class="channels-grid">
            <div v-for="ch in channels" :key="ch.key" class="channel-item">
              <div class="channel-icon" :class="ch.class">{{ ch.icon }}</div>
              <div class="channel-name">{{ ch.name }}</div>
              <div class="channel-action">{{ ch.action }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid-row-3">
      <div class="device-card">
        <div class="device-icon" :class="devices.smart_terminals.color">💻</div>
        <div>
          <h4 class="device-info-label">{{ devices.smart_terminals.label }}</h4>
          <p class="device-info-status">{{ devices.smart_terminals.status }}</p>
          <p class="device-info-value">{{ devices.smart_terminals.value }}</p>
        </div>
      </div>
      <div class="device-card">
        <div class="device-icon" :class="devices.rfid_cards.color">💳</div>
        <div>
          <h4 class="device-info-label">{{ devices.rfid_cards.label }}</h4>
          <p class="device-info-status">{{ devices.rfid_cards.status }}</p>
          <p class="device-info-value">{{ devices.rfid_cards.value }}</p>
        </div>
      </div>
      <div class="device-card">
        <div class="device-icon" :class="devices.qr_code.color">📱</div>
        <div>
          <h4 class="device-info-label">{{ devices.qr_code.label }}</h4>
          <p class="device-info-status">{{ devices.qr_code.status }}</p>
          <p class="device-info-value">{{ devices.qr_code.value }}</p>
        </div>
      </div>
      <div class="device-card">
        <div class="device-icon" :class="devices.telephone.color">📱</div>
        <div>
          <h4 class="device-info-label">{{ devices.telephone.label }}</h4>
          <p class="device-info-status">{{ devices.telephone.status }}</p>
          <p class="device-info-value">{{ devices.telephone.value }}</p>
        </div>
      </div>
      <div class="device-card">
        <div class="device-icon" :class="devices.voice_assistant.color">🎙️</div>
        <div>
          <h4 class="device-info-label">{{ devices.voice_assistant.label }}</h4>
          <p class="device-info-status">{{ devices.voice_assistant.status }}</p>
          <p class="device-info-value">{{ devices.voice_assistant.value }}</p>
        </div>
      </div>
      <div class="help-card">
        <div class="help-icon">🤖</div>
        <div>
          <h4 class="help-title">Besoin d'aide ?</h4>
          <p class="help-desc">Discutez avec l'assistant IA</p>
        </div>
      </div>
    </div>
  </div>
</template>
