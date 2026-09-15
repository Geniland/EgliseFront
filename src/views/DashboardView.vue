<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi } from '@/api/dashboard'
import SparklineChart from '@/components/dashboard/SparklineChart.vue'
import LineChart from '@/components/dashboard/LineChart.vue'
import DonutChart from '@/components/dashboard/DonutChart.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const chartPeriod = ref('Mensuel')
const finPeriod = ref('Mensuel')

// 1. STATS KPI (Initialisées à zéro, 100% connectées à la base de données)
const stats = ref({
  members_total: { value: 0, growth: 0, new_this_month: 0, sparkline: [] },
  presences_month: { value: 0, growth: 0, attendance_rate: 0, sparkline: [] },
  donations: { value: 0, currency: 'FCFA', growth: 0, sparkline: [] },
  events: { value: 0, growth: 0, sparkline: [] },
  pending_requests: { value: 0, growth: 0, sparkline: [] },
})

// 2. GRAPHIQUE PRÉSENCES & DONS
const chartData = ref({
  labels: [],
  datasets: [],
})

// 3. RÉPARTITION PAR MINISTÈRE
const ministryDistribution = ref({
  total: 0,
  ministries: [],
})

// 4. RÉSUMÉ FINANCIER
const financial = ref({
  period: 'Mensuel',
  receipts: { total: 0, growth: 0, currency: 'FCFA', breakdown: [] },
  expenses: { total: 0, growth: 0, currency: 'FCFA', breakdown: [] },
  net_balance: { total: 0, growth: 0, currency: 'FCFA' },
})

// 5. PROCHAINS ÉVÉNEMENTS
const upcomingEvents = ref([])

// 6. ACTIVITÉS RÉCENTES
const recentActivities = ref([])

// 7. SERVICES & OUTILS NUMÉRIQUES
const devices = ref({
  smart_terminals: { label: 'Régie & Diffusions', status: 'Disponible', value: '0 diffusion', color: 'green' },
  rfid_cards: { label: 'Badges & Cartes', status: 'En attente', value: '0 membre badgé', color: 'purple' },
  qr_code: { label: 'Scans QR Présence', status: 'En attente', value: '0 scan ce mois', color: 'purple' },
  telephone: { label: 'Fidèles Joignables', status: 'En attente', value: '0 numéro', color: 'blue' },
  voice_assistant: { label: 'Assistant Vocal (IA)', status: 'Opérationnel', value: '0 échange', color: 'purple' },
})

// Canaux de communication interactifs
const channels = [
  { key: 'sms', name: 'SMS', action: 'Envoyer SMS', icon: '💬', class: 'sms', route: '/communication' },
  { key: 'whatsapp', name: 'WhatsApp', action: 'Envoyer message', icon: '📞', class: 'whatsapp', route: '/communication' },
  { key: 'email', name: 'Email', action: 'Envoyer email', icon: '✉️', class: 'email', route: '/communication' },
  { key: 'push', name: 'Push', action: 'Notification push', icon: '🔔', class: 'push', route: '/communication' },
  { key: 'call', name: 'Annuaire', action: 'Consulter membres', icon: '📞', class: 'call', route: '/members' },
  { key: 'live', name: 'Diffusions Live', action: 'Studio direct', icon: '▶️', class: 'live', route: '/live-streams' },
]

// Formatage monétaire dynamique
const formatCurrency = (val, customCurrency = null) => {
  const curr = customCurrency || stats.value.donations?.currency || 'FCFA'
  return new Intl.NumberFormat('fr-FR').format(val || 0) + ' ' + curr
}

const formatNumber = (val) => {
  return new Intl.NumberFormat('fr-FR').format(val || 0)
}

const userName = computed(() => authStore.userName || 'Bienvenue')

// Nom de l'église courante selon le contexte utilisateur
const activeChurchName = computed(() => {
  if (authStore.userChurchName) return authStore.userChurchName
  if (authStore.currentChurchId) {
    const c = authStore.churches.find(item => item.id === authStore.currentChurchId)
    if (c) return c.name
  }
  return 'Toutes mes églises'
})

// Libellé de la période courante (ex: Septembre 2026)
const currentPeriodLabel = computed(() => {
  const now = new Date()
  const month = now.toLocaleString('fr-FR', { month: 'long' })
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${now.getFullYear()}`
})

// Chargement global de toutes les données du dashboard depuis l'API
const loadAll = async () => {
  loading.value = true
  try {
    const periodParam = chartPeriod.value === 'Hebdomadaire' ? 'weekly' : 'monthly'
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
      dashboardApi.getPresenceDonationChart(periodParam),
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
      upcomingEvents.value = Array.isArray(eventsRes.value.data) ? eventsRes.value.data : []
    }
    if (activitiesRes.status === 'fulfilled' && activitiesRes.value?.data) {
      const raw = Array.isArray(activitiesRes.value.data) ? activitiesRes.value.data : []
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
              a.type === 'live' ? '▶️' :
              a.type === 'message' ? '💬' : '📌',
        color: a.color || '#4F46E5',
      }))
    }
    if (devicesRes.status === 'fulfilled' && devicesRes.value?.data) {
      devices.value = devicesRes.value.data
    }
  } catch (e) {
    console.error('Erreur de chargement du tableau de bord:', e)
  } finally {
    loading.value = false
  }
}

// Changement de période du graphique
watch(chartPeriod, async (newVal) => {
  try {
    const periodParam = newVal === 'Hebdomadaire' ? 'weekly' : 'monthly'
    const res = await dashboardApi.getPresenceDonationChart(periodParam)
    if (res?.data) {
      chartData.value = {
        labels: res.data.labels || [],
        datasets: res.data.datasets || [],
      }
    }
  } catch (err) {
    console.error('Erreur mise à jour graphique:', err)
  }
})

const navigateTo = (path) => {
  if (path) router.push(path)
}

onMounted(loadAll)
</script>

<template>
  <div class="dashboard-page">
    
    <!-- En-tête du Tableau de Bord -->
    <div class="page-header">
      <div class="page-title">
        <h2>Bonjour, {{ userName }} ! 👋</h2>
        <p>Aperçu en temps réel des données de votre église.</p>
      </div>
      <div class="page-header-actions">
        <!-- Badge Église Active -->
        <div class="church-context-chip" :title="'Église active : ' + activeChurchName">
          <span class="church-icon">⛪</span>
          <span class="church-name text-truncate">{{ activeChurchName }}</span>
        </div>

        <!-- Période en cours -->
        <div class="date-filter">
          <span>📅 {{ currentPeriodLabel }}</span>
        </div>

        <!-- Bouton Rafraîchir -->
        <button class="btn-export" @click="loadAll" :disabled="loading" title="Actualiser les données">
          <span :class="{ 'spin-icon': loading }">🔄</span>
          <span>Actualiser</span>
        </button>
      </div>
    </div>

    <!-- Grille des Cartes KPI Principales -->
    <div class="stats-grid">
      
      <!-- 1. Membres Totaux -->
      <div class="stat-card" @click="navigateTo('/members')">
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
          <span>+{{ formatNumber(stats.members_total.new_this_month) }} inscrit(s) ce mois</span>
        </div>
        <SparklineChart
          :data="stats.members_total.sparkline || []"
          color="#4F46E5"
          :width="240"
          :height="32"
        />
      </div>

      <!-- 2. Présences du Mois -->
      <div class="stat-card" @click="navigateTo('/presences')">
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
          <span>{{ stats.presences_month.attendance_rate }}% taux de présence estimé</span>
        </div>
        <SparklineChart
          :data="stats.presences_month.sparkline || []"
          color="#10B981"
          :width="240"
          :height="32"
        />
      </div>

      <!-- 3. Recettes & Dons du Mois -->
      <div class="stat-card" @click="navigateTo('/finances')">
        <div class="stat-card-header">
          <div style="flex:1">
            <div class="stat-label">Recettes (ce mois)</div>
            <div class="stat-value-row">
              <span class="stat-value">{{ formatCurrency(stats.donations.value, stats.donations.currency) }}</span>
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

      <!-- 4. Événements à venir -->
      <div class="stat-card" @click="navigateTo('/events')">
        <div class="stat-card-header">
          <div style="flex:1">
            <div class="stat-label">Événements à venir</div>
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
          <span>Programmés pour la paroisse</span>
        </div>
        <SparklineChart
          :data="stats.events.sparkline || []"
          color="#3B82F6"
          :width="240"
          :height="32"
        />
      </div>

      <!-- 5. Demandes / Transactions en attente -->
      <div class="stat-card" @click="navigateTo('/finances')">
        <div class="stat-card-header">
          <div style="flex:1">
            <div class="stat-label">Opérations en attente</div>
            <div class="stat-value-row">
              <span class="stat-value">{{ formatNumber(stats.pending_requests.value) }}</span>
              <span v-if="stats.pending_requests.value > 0" class="stat-growth alert-pill">
                À traiter
              </span>
              <span v-else class="stat-growth up">
                À jour ✓
              </span>
            </div>
          </div>
          <div class="stat-icon pink">📋</div>
        </div>
        <div class="stat-meta">
          <span>En attente de validation</span>
        </div>
        <SparklineChart
          :data="stats.pending_requests.sparkline || []"
          color="#EC4899"
          :width="240"
          :height="32"
        />
      </div>

    </div>

    <!-- Rangée 1 : Graphique Évolution + Répartition Ministères + Activités -->
    <div class="dashboard-grid-row">
      
      <!-- Graphique Présences & Dons -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Évolution des présences & dons</h3>
          <div class="card-actions">
            <select class="card-select" v-model="chartPeriod">
              <option>Hebdomadaire</option>
              <option>Mensuel</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div class="chart-container" v-if="chartData.labels && chartData.labels.length > 0">
            <div class="chart-legend">
              <div class="chart-legend-item">
                <span class="legend-dot" style="background:#3B82F6"></span>
                Présences
              </div>
              <div class="chart-legend-item">
                <span class="legend-dot" style="background:#10B981"></span>
                Dons ({{ stats.donations.currency || 'FCFA' }})
              </div>
            </div>
            <LineChart
              :labels="chartData.labels"
              :datasets="chartData.datasets"
              :height="220"
            />
          </div>
          <div v-else class="empty-state-block py-4">
            <span class="empty-icon">📊</span>
            <p>Aucune donnée enregistrée sur cette période.</p>
          </div>
        </div>
      </div>

      <!-- Répartition par Département / Ministère -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Répartition par département</h3>
          <router-link to="/services" class="link-see-all">Gérer</router-link>
        </div>
        <div class="card-body">
          <div v-if="ministryDistribution.total > 0 || (ministryDistribution.ministries && ministryDistribution.ministries.length > 0)">
            <DonutChart
              :items="ministryDistribution.ministries"
              :total="ministryDistribution.total"
              :size="200"
              :thickness="30"
            />
          </div>
          <div v-else class="empty-state-block">
            <span class="empty-icon">🤝</span>
            <p>Aucun membre affecté aux ministères pour le moment.</p>
            <router-link to="/services" class="btn-empty-action">Configurer les ministères</router-link>
          </div>
        </div>
      </div>

      <!-- Activités Récentes -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Activités récentes</h3>
          <router-link to="/members" class="link-see-all">Membres</router-link>
        </div>
        <div class="card-body">
          <div v-if="recentActivities.length > 0" class="activity-list">
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
          <div v-else class="empty-state-block">
            <span class="empty-icon">✨</span>
            <p>Aucune activité récente enregistrée.</p>
          </div>
        </div>
      </div>

    </div>

    <!-- Rangée 2 : Résumé Financier + Prochains Événements + Canaux -->
    <div class="dashboard-grid-row-2">
      
      <!-- Résumé Financier Réel -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Résumé financier (Ce mois)</h3>
          <router-link to="/finances" class="link-see-all">Module Finances</router-link>
        </div>
        <div class="card-body">
          <div class="financial-grid">
            
            <!-- Recettes -->
            <div class="financial-box receipts">
              <div class="financial-box-header">
                <div class="financial-icon">🏛️</div>
                <span class="financial-growth" :class="financial.receipts.growth >= 0 ? 'up' : 'down'">
                  {{ financial.receipts.growth >= 0 ? '↑' : '↓' }} {{ Math.abs(financial.receipts.growth) }}%
                </span>
              </div>
              <div class="financial-label">Recettes</div>
              <div class="financial-value">{{ formatCurrency(financial.receipts.total, financial.receipts.currency) }}</div>
              
              <div class="breakdown-list" v-if="financial.receipts.breakdown && financial.receipts.breakdown.length > 0">
                <div v-for="b in financial.receipts.breakdown" :key="'r-'+b.label" class="breakdown-item">
                  <span class="breakdown-left">
                    <span>{{ b.label }}</span>
                    <span class="breakdown-bar"><span class="breakdown-bar-fill" :style="{ width: b.percentage + '%' }"></span></span>
                  </span>
                  <span class="breakdown-value">{{ formatCurrency(b.value, financial.receipts.currency) }}</span>
                </div>
              </div>
              <div v-else class="empty-breakdown-note">
                Aucune recette approuvée ce mois-ci.
              </div>
            </div>

            <!-- Dépenses -->
            <div class="financial-box expenses">
              <div class="financial-box-header">
                <div class="financial-icon">📤</div>
                <span class="financial-growth" :class="financial.expenses.growth <= 0 ? 'up' : 'down'">
                  {{ financial.expenses.growth >= 0 ? '↑' : '↓' }} {{ Math.abs(financial.expenses.growth) }}%
                </span>
              </div>
              <div class="financial-label">Dépenses</div>
              <div class="financial-value">{{ formatCurrency(financial.expenses.total, financial.expenses.currency) }}</div>
              
              <div class="breakdown-list" v-if="financial.expenses.breakdown && financial.expenses.breakdown.length > 0">
                <div v-for="b in financial.expenses.breakdown" :key="'e-'+b.label" class="breakdown-item">
                  <span class="breakdown-left">
                    <span>{{ b.label }}</span>
                    <span class="breakdown-bar"><span class="breakdown-bar-fill" :style="{ width: b.percentage + '%' }"></span></span>
                  </span>
                  <span class="breakdown-value">{{ formatCurrency(b.value, financial.expenses.currency) }}</span>
                </div>
              </div>
              <div v-else class="empty-breakdown-note">
                Aucune dépense approuvée ce mois-ci.
              </div>
            </div>

          </div>

          <!-- Solde Net Réel -->
          <div class="net-balance">
            <div class="net-balance-label">Solde net du mois</div>
            <div class="net-balance-right">
              <div class="net-balance-value" :style="{ color: financial.net_balance.total >= 0 ? '#10B981' : '#EF4444' }">
                {{ formatCurrency(financial.net_balance.total, financial.net_balance.currency) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Prochains Événements Réels -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Prochains événements</h3>
          <router-link to="/events" class="link-see-all">Voir tout</router-link>
        </div>
        <div class="card-body">
          <div v-if="upcomingEvents.length > 0" class="events-list">
            <div v-for="ev in upcomingEvents" :key="ev.id" class="event-item">
              <div class="event-date-block">
                <div class="event-day">{{ ev.day }}</div>
                <div class="event-month">{{ ev.month }}</div>
              </div>
              <div class="event-content">
                <h4 class="event-title">{{ ev.title }}</h4>
                <p class="event-meta">{{ ev.location }}</p>
                <p class="event-time">{{ ev.time }}</p>
              </div>
              <span class="event-status">{{ ev.status }}</span>
            </div>
          </div>
          <div v-else class="empty-state-block">
            <span class="empty-icon">📅</span>
            <p>Aucun événement planifié à venir.</p>
            <router-link to="/events" class="btn-empty-action">Programmer un événement</router-link>
          </div>
        </div>
      </div>

      <!-- Canaux de Communication Directs -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Canaux de communication</h3>
        </div>
        <div class="card-body">
          <div class="channels-grid">
            <div 
              v-for="ch in channels" 
              :key="ch.key" 
              class="channel-item interactive-channel"
              @click="navigateTo(ch.route)"
              :title="'Ouvrir ' + ch.name"
            >
              <div class="channel-icon" :class="ch.class">{{ ch.icon }}</div>
              <div class="channel-name">{{ ch.name }}</div>
              <div class="channel-action">{{ ch.action }} →</div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Rangée 3 : Indicateurs Numériques & Outils Pastoraux -->
    <div class="dashboard-grid-row-3">
      
      <div class="device-card" @click="navigateTo('/live-streams')" style="cursor:pointer">
        <div class="device-icon" :class="devices.smart_terminals?.color">🎥</div>
        <div>
          <h4 class="device-info-label">{{ devices.smart_terminals?.label || 'Régie & Diffusions' }}</h4>
          <p class="device-info-status">{{ devices.smart_terminals?.status || 'Disponible' }}</p>
          <p class="device-info-value">{{ devices.smart_terminals?.value || '0 diffusion' }}</p>
        </div>
      </div>

      <div class="device-card" @click="navigateTo('/members')" style="cursor:pointer">
        <div class="device-icon" :class="devices.rfid_cards?.color">💳</div>
        <div>
          <h4 class="device-info-label">{{ devices.rfid_cards?.label || 'Badges & Cartes' }}</h4>
          <p class="device-info-status">{{ devices.rfid_cards?.status || 'En attente' }}</p>
          <p class="device-info-value">{{ devices.rfid_cards?.value || '0 membre badgé' }}</p>
        </div>
      </div>

      <div class="device-card" @click="navigateTo('/presences')" style="cursor:pointer">
        <div class="device-icon" :class="devices.qr_code?.color">📱</div>
        <div>
          <h4 class="device-info-label">{{ devices.qr_code?.label || 'Scans QR Présence' }}</h4>
          <p class="device-info-status">{{ devices.qr_code?.status || 'En attente' }}</p>
          <p class="device-info-value">{{ devices.qr_code?.value || '0 scan ce mois' }}</p>
        </div>
      </div>

      <div class="device-card" @click="navigateTo('/members')" style="cursor:pointer">
        <div class="device-icon" :class="devices.telephone?.color">📞</div>
        <div>
          <h4 class="device-info-label">{{ devices.telephone?.label || 'Fidèles Joignables' }}</h4>
          <p class="device-info-status">{{ devices.telephone?.status || 'En attente' }}</p>
          <p class="device-info-value">{{ devices.telephone?.value || '0 numéro' }}</p>
        </div>
      </div>

      <div class="device-card" @click="navigateTo('/assistant')" style="cursor:pointer">
        <div class="device-icon" :class="devices.voice_assistant?.color">🕊️</div>
        <div>
          <h4 class="device-info-label">{{ devices.voice_assistant?.label || 'Assistant Vocal (IA)' }}</h4>
          <p class="device-info-status">{{ devices.voice_assistant?.status || 'Opérationnel' }}</p>
          <p class="device-info-value">{{ devices.voice_assistant?.value || '0 échange' }}</p>
        </div>
      </div>

      <div class="help-card" @click="navigateTo('/assistant')" style="cursor:pointer" title="Ouvrir l'assistant IA pastoral">
        <div class="help-icon">🕊️</div>
        <div>
          <h4 class="help-title">Assistant Spirituel IA</h4>
          <p class="help-desc">Cliquez pour poser une question</p>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
/* Scoped enhancements */
.stat-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.alert-pill {
  background: #fef2f2;
  color: #ef4444;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
}

.church-context-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  max-width: 260px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.church-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spin-icon {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

.interactive-channel {
  cursor: pointer;
  transition: all 0.2s ease;
}
.interactive-channel:hover {
  transform: translateY(-2px);
  background: #f8fafc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.empty-state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem 1.5rem;
  color: #64748b;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.empty-state-block p {
  font-size: 0.88rem;
  margin-bottom: 0.75rem;
}

.btn-empty-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4F46E5;
  background: #EEF2FF;
  padding: 6px 12px;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.2s;
}
.btn-empty-action:hover {
  background: #e0e7ff;
}

.empty-breakdown-note {
  font-size: 0.82rem;
  color: #94a3b8;
  text-align: center;
  padding: 0.75rem 0;
  font-style: italic;
}

.device-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.help-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.help-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.2);
}
</style>
