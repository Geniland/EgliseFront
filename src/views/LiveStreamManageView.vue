<template>
  <div class="live-manage-studio">
    <!-- Toast Notification -->
    <transition name="toast-fade">
      <div v-if="toast.visible" class="studio-toast" :class="toast.type">
        <span class="toast-icon">{{ toast.icon }}</span>
        <span>{{ toast.message }}</span>
      </div>
    </transition>

    <!-- État de Chargement -->
    <div v-if="loading" class="manage-loading-state">
      <div class="spinner-pulse"></div>
      <p>Connexion à la régie de diffusion...</p>
    </div>

    <!-- Message d'erreur -->
    <div v-else-if="error" class="manage-error-state">
      <div class="error-card">
        <span class="error-icon">⚠️</span>
        <h3>Impossible de charger la régie</h3>
        <p>{{ error }}</p>
        <router-link :to="{ name: 'live-streams' }" class="btn-secondary-action">
          ← Retour au studio des diffusions
        </router-link>
      </div>
    </div>

    <!-- Contenu Principal de la Régie -->
    <div v-else-if="stream" class="manage-content">
      
      <!-- ======================================================== -->
      <!-- BARRE DE NAVIGATION & RETOUR RAPIDE                     -->
      <!-- ======================================================== -->
      <div class="manage-nav-bar mb-3">
        <router-link :to="{ name: 'live-streams' }" class="btn-back-prominent">
          <svg class="back-arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Retour aux diffusions</span>
        </router-link>
      </div>

      <!-- ======================================================== -->
      <!-- EN-TÊTE DE RÉGIE & ACTIONS RAPIDES                      -->
      <!-- ======================================================== -->
      <header class="manage-header">
        <div class="header-left">
          <div class="title-row">
            <router-link :to="{ name: 'live-streams' }" class="btn-circle-back" title="Retour aux diffusions">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </router-link>
            <h1 class="stream-title">{{ stream.title }}</h1>
            <button 
              class="btn-icon-edit" 
              @click="openEditModal" 
              title="Modifier les informations"
            >
              <i class="bi bi-pencil-square"></i>
            </button>
            <LiveStatus :status="stream.status" />
          </div>
          <p v-if="stream.event?.title" class="event-badge-sub">
            <i class="bi bi-calendar2-event"></i> Événement rattaché : <strong>{{ stream.event.title }}</strong>
          </p>
        </div>

        <div class="header-right">
          <router-link :to="{ name: 'live-streams' }" class="btn-header-action btn-header-back" title="Retour à la liste des diffusions">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Retour</span>
          </router-link>

          <button 
            class="btn-header-action" 
            @click="copyShareLink"
            title="Copier le lien public"
          >
            <i class="bi bi-share"></i>
            <span>Partager</span>
          </button>

          <router-link 
            :to="{ name: 'live-watch', params: { id: stream.id } }" 
            target="_blank"
            class="btn-header-action outline"
            title="Ouvrir la vue spectateur dans un nouvel onglet"
          >
            <i class="bi bi-eye"></i>
            <span>Vue Fidèle</span>
          </router-link>

          <button 
            v-if="stream.provider_live_input_id" 
            @click="openYouTubeStudio" 
            class="btn-header-action yt"
            title="Ouvrir sur YouTube Studio"
          >
            <i class="bi bi-youtube"></i>
            <span>YouTube Studio</span>
          </button>
        </div>
      </header>

      <!-- ======================================================== -->
      <!-- BANNIÈRE D'ÉTAT ON-AIR DYNAMIQUE                        -->
      <!-- ======================================================== -->
      <div 
        class="on-air-status-banner"
        :class="{
          'is-live': stream.status === 'live',
          'is-scheduled': stream.status === 'scheduled' || stream.status === 'ready' || stream.status === 'draft',
          'is-ended': stream.status === 'ended' || stream.status === 'processing'
        }"
      >
        <div class="banner-badge-group">
          <!-- Si Live -->
          <template v-if="stream.status === 'live'">
            <div class="live-beacon-wrap">
              <span class="live-radar"></span>
              <span class="live-dot"></span>
            </div>
            <div class="banner-text">
              <span class="status-headline">EN DIRECT — FLUX ACTIF</span>
              <span class="status-sub">Les fidèles visionnent actuellement le direct sur la plateforme.</span>
            </div>
          </template>

          <!-- Si Programmé / Prêt -->
          <template v-else-if="stream.status === 'scheduled' || stream.status === 'ready' || stream.status === 'draft'">
            <div class="scheduled-icon-wrap">
              <i class="bi bi-clock-history"></i>
            </div>
            <div class="banner-text">
              <span class="status-headline">EN ATTENTE DE DIFFUSION</span>
              <span class="status-sub">
                Programmé pour le {{ formatDateTime(stream.scheduled_at) }}. Vérifiez le moniteur vidéo avant le direct.
              </span>
            </div>
          </template>

          <!-- Si Terminé -->
          <template v-else>
            <div class="ended-icon-wrap">
              <i class="bi bi-check-circle-fill"></i>
            </div>
            <div class="banner-text">
              <span class="status-headline">DIFFUSION TERMINÉE</span>
              <span class="status-sub">
                Le direct a pris fin. Le replay reste consultable ou peut être archivé dans la Médiathèque.
              </span>
            </div>
          </template>
        </div>

        <div class="banner-metrics">
          <div v-if="stream.status === 'live'" class="metric-pill live-timer">
            <span class="metric-label">DURÉE EN ONDE</span>
            <span class="metric-val mono">{{ liveElapsedTime }}</span>
          </div>

          <div v-else-if="stream.started_at && stream.ended_at" class="metric-pill">
            <span class="metric-label">DURÉE TOTALE</span>
            <span class="metric-val mono">{{ calculateTotalDuration(stream.started_at, stream.ended_at) }}</span>
          </div>

          <div v-if="stream.status === 'ended'" class="metric-pill action">
            <button class="btn-publish-quick" @click="openPublishModal">
              <i class="bi bi-folder-plus"></i> Archiver en VOD
            </button>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- GRILLE RÉGIE TECHNIQUE                                   -->
      <!-- ======================================================== -->
      <div class="manage-grid">
        
        <!-- COLONNE GAUCHE : MONITEUR VIDÉO & INFORMATIONS -->
        <div class="grid-col-left">
          
          <!-- Moniteur de Contrôle Vidéo (Return Monitor) -->
          <div class="studio-card monitor-card">
            <div class="card-header-studio">
              <div class="header-label">
                <i class="bi bi-display"></i>
                <span>Moniteur Régie (Retour Vidéo)</span>
              </div>
              <div class="header-tags">
                <span class="quality-tag">
                  <i class="bi bi-badge-hd"></i> 1080p
                </span>
                <button class="btn-mini-refresh" @click="refreshMonitor" title="Recharger l'affichage">
                  <i class="bi bi-arrow-clockwise" :class="{ 'spin-anim': isRefreshingMonitor }"></i>
                </button>
              </div>
            </div>

            <div class="monitor-screen-container">
              <!-- Player Embed YouTube si ID disponible -->
              <div v-if="stream.provider_live_input_id" class="iframe-wrapper">
                <iframe
                  :key="monitorKey"
                  :src="monitorEmbedUrl"
                  title="Moniteur de direct"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              </div>

              <!-- Pas de flux / Placeholder de mire de régie -->
              <div v-else class="empty-monitor-screen">
                <div class="test-pattern-backdrop"></div>
                <div class="empty-screen-overlay">
                  <i class="bi bi-camera-video-off display-icon"></i>
                  <h4>Aucun identifiant vidéo YouTube détecté</h4>
                  <p>Renseignez le lien YouTube dans les paramètres pour afficher le retour en direct.</p>
                  <button class="btn-primary-sm" @click="openEditModal">
                    <i class="bi bi-link-45deg"></i> Ajouter le lien YouTube
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Carte Fiche Détails & Description -->
          <div class="studio-card details-card mt-4">
            <div class="card-header-studio">
              <div class="header-label">
                <i class="bi bi-info-circle"></i>
                <span>Fiche d'Informations du Culte</span>
              </div>
              <button class="btn-text-edit" @click="openEditModal">
                <i class="bi bi-pencil"></i> Modifier
              </button>
            </div>

            <div class="details-body">
              <div class="details-meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Date prévue :</span>
                  <span class="meta-val">{{ formatDateTime(stream.scheduled_at) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Début effectif :</span>
                  <span class="meta-val">{{ stream.started_at ? formatDateTime(stream.started_at) : 'Pas encore démarré' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Fin effective :</span>
                  <span class="meta-val">{{ stream.ended_at ? formatDateTime(stream.ended_at) : (stream.status === 'live' ? 'En cours' : '—') }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Événement lié :</span>
                  <span class="meta-val highlight">{{ stream.event?.title || 'Aucun événement associé' }}</span>
                </div>
              </div>

              <div class="description-block mt-3">
                <span class="meta-label">Description / Thème :</span>
                <p class="description-text">
                  {{ stream.description || 'Aucune description fournie pour ce direct.' }}
                </p>
              </div>
            </div>
          </div>

        </div>

        <!-- COLONNE DROITE : COMMANDES MAÎTRESSES & CONFIG OBS -->
        <div class="grid-col-right">
          
          <!-- Carte 1 : Commandes Maîtresses de la Régie -->
          <div class="studio-card master-controls-card">
            <div class="card-header-studio">
              <div class="header-label">
                <i class="bi bi-sliders"></i>
                <span>Commandes Maîtresses (On Air)</span>
              </div>
            </div>

            <div class="master-body">
              <p class="master-hint">
                Contrôlez l'ouverture et la fermeture du direct pour l'ensemble des fidèles connectés.
              </p>

              <!-- État : Non Démarré (Bouton Passer en direct) -->
              <div v-if="stream.status !== 'live' && stream.status !== 'ended'" class="action-wrap">
                <button 
                  @click="confirmStartLive" 
                  class="btn-master-action btn-start-broadcast"
                  :disabled="isStarting"
                >
                  <span v-if="isStarting" class="spinner-border spinner-border-sm"></span>
                  <i v-else class="bi bi-broadcast"></i>
                  <div class="btn-text-stack">
                    <span class="main-action">PASSER EN DIRECT (ON AIR)</span>
                    <span class="sub-action">Rendre le flux visible aux fidèles</span>
                  </div>
                </button>
                <div class="checklist-box">
                  <span class="checklist-title"><i class="bi bi-shield-check"></i> Checklist de sécurité :</span>
                  <ul>
                    <li>Le stream OBS est lancé vers YouTube</li>
                    <li>Le retour audio et vidéo est validé sur le moniteur</li>
                    <li>La connexion réseau est stable</li>
                  </ul>
                </div>
              </div>

              <!-- État : En Direct (Bouton Couper / Terminer) -->
              <div v-else-if="stream.status === 'live'" class="action-wrap">
                <div class="live-active-box">
                  <div class="pulsing-circle"></div>
                  <div>
                    <strong>DIFFUSION EN DIRECT ACTIVE</strong>
                    <p>Pour clôturer la session et basculer en mode Replay, terminez la diffusion.</p>
                  </div>
                </div>

                <button 
                  @click="confirmEndLive" 
                  class="btn-master-action btn-end-broadcast mt-3"
                  :disabled="isEnding"
                >
                  <span v-if="isEnding" class="spinner-border spinner-border-sm"></span>
                  <i v-else class="bi bi-stop-circle"></i>
                  <div class="btn-text-stack">
                    <span class="main-action">TERMINER LA DIFFUSION</span>
                    <span class="sub-action">Clôturer le culte et générer le Replay</span>
                  </div>
                </button>
              </div>

              <!-- État : Terminé -->
              <div v-else class="action-wrap">
                <div class="ended-status-box">
                  <i class="bi bi-archive-fill text-muted"></i>
                  <p>Ce direct est archivé. Le flux reste disponible en VOD pour les fidèles.</p>
                </div>

                <button 
                  @click="openPublishModal" 
                  class="btn-master-action btn-archive-resource"
                >
                  <i class="bi bi-folder-check"></i>
                  <div class="btn-text-stack">
                    <span class="main-action">PUBLIER DANS LA MÉDIATHÈQUE</span>
                    <span class="sub-action">Ajouter aux ressources de formation & prédications</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Carte 2 : Paramètres Encodeur OBS Studio -->
          <div class="studio-card encoder-card mt-4">
            <div class="card-header-studio">
              <div class="header-label">
                <i class="bi bi-gear-wide-connected"></i>
                <span>Paramètres Encodeur OBS Studio</span>
              </div>
              <button class="btn-obs-guide" @click="showObsGuide = true">
                <i class="bi bi-question-circle"></i> Guide
              </button>
            </div>

            <div class="encoder-body">
              <!-- URL Serveur RTMP -->
              <div class="param-row mb-3">
                <label class="param-label">Serveur RTMP YouTube</label>
                <div class="input-with-copy">
                  <input 
                    type="text" 
                    class="form-control-custom mono" 
                    value="rtmp://a.rtmp.youtube.com/live2" 
                    readonly 
                  />
                  <button 
                    class="btn-copy-field" 
                    @click="copyToClipboard('rtmp://a.rtmp.youtube.com/live2', 'Serveur RTMP')"
                    title="Copier l'URL serveur"
                  >
                    <i class="bi bi-copy"></i>
                  </button>
                </div>
              </div>

              <!-- ID de flux / Clé -->
              <div class="param-row mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="param-label mb-0">Identifiant de diffusion</label>
                  <button 
                    class="btn-toggle-mask" 
                    @click="showStreamKey = !showStreamKey"
                  >
                    <i class="bi" :class="showStreamKey ? 'bi-eye-slash' : 'bi-eye'"></i>
                    {{ showStreamKey ? 'Masquer' : 'Afficher' }}
                  </button>
                </div>
                <div class="input-with-copy">
                  <input 
                    :type="showStreamKey ? 'text' : 'password'" 
                    class="form-control-custom mono" 
                    :value="stream.provider_live_input_id || 'Non configuré'" 
                    readonly 
                  />
                  <button 
                    v-if="stream.provider_live_input_id" 
                    class="btn-copy-field" 
                    @click="copyToClipboard(stream.provider_live_input_id, 'Identifiant de flux')"
                    title="Copier l'identifiant"
                  >
                    <i class="bi bi-copy"></i>
                  </button>
                </div>
              </div>

              <!-- Recommandations rapides d'encodage -->
              <div class="quick-bitrate-specs">
                <div class="spec-row">
                  <span class="spec-name">Résolution recommandée :</span>
                  <span class="spec-val">1080p (1920×1080) @ 60 FPS</span>
                </div>
                <div class="spec-row">
                  <span class="spec-name">Débit vidéo (Bitrate) :</span>
                  <span class="spec-val">4 500 – 6 000 Kbps</span>
                </div>
                <div class="spec-row">
                  <span class="spec-name">Encodeur :</span>
                  <span class="spec-val">Hardware (NVENC / QuickSync)</span>
                </div>
                <div class="spec-row">
                  <span class="spec-name">Audio :</span>
                  <span class="spec-val">AAC 160 Kbps, 48 kHz</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bouton de suppression sécurisé -->
          <div class="danger-zone-box mt-4">
            <button class="btn-delete-stream" @click="handleDeleteStream">
              <i class="bi bi-trash"></i> Supprimer cette diffusion
            </button>
          </div>

        </div>

      </div>

    </div>

    <!-- ======================================================== -->
    <!-- MODAL 1 : MODIFICATION RAPIDE DES INFOS DU DIRECT       -->
    <!-- ======================================================== -->
    <div v-if="showEditModal" class="modal-backdrop" @click.self="showEditModal = false">
      <div class="modal-dialog-custom">
        <div class="modal-header-custom">
          <div class="modal-title-wrap">
            <span class="modal-icon">✏️</span>
            <div>
              <h3>Modifier la Diffusion</h3>
              <p>Mettez à jour les paramètres et le lien YouTube du flux.</p>
            </div>
          </div>
          <button class="btn-close-modal" @click="showEditModal = false">✕</button>
        </div>

        <form @submit.prevent="submitEditStream" class="modal-body-custom">
          <div v-if="editError" class="modal-alert-danger">
            {{ editError }}
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Titre du direct *</label>
            <input 
              v-model="editForm.title" 
              type="text" 
              class="form-control-custom" 
              required 
            />
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Lien YouTube ou ID du flux</label>
            <input 
              v-model="editForm.youtube_url" 
              type="text" 
              class="form-control-custom" 
              placeholder="https://youtube.com/watch?v=... ou ID"
            />
            <small class="form-hint">Vous pouvez coller l'URL complète YouTube ou l'ID direct à 11 caractères.</small>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Événement associé</label>
            <select v-model="editForm.event_id" class="form-control-custom">
              <option :value="null">-- Aucun événement rattaché --</option>
              <option v-for="evt in churchEvents" :key="evt.id" :value="evt.id">
                {{ evt.title }} ({{ formatDateShort(evt.start_date || evt.date) }})
              </option>
            </select>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-7">
              <label class="form-label">Date prévue</label>
              <input 
                v-model="editForm.date" 
                type="date" 
                class="form-control-custom" 
              />
            </div>
            <div class="col-md-5">
              <label class="form-label">Heure</label>
              <input 
                v-model="editForm.time" 
                type="time" 
                class="form-control-custom" 
              />
            </div>
          </div>

          <div class="form-group mb-4">
            <label class="form-label">Description / Thème</label>
            <textarea 
              v-model="editForm.description" 
              class="form-control-custom textarea-custom" 
              rows="3"
            ></textarea>
          </div>

          <div class="modal-footer-custom">
            <button 
              type="button" 
              class="btn-modal-cancel" 
              @click="showEditModal = false"
              :disabled="savingEdit"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              class="btn-primary-action" 
              :disabled="savingEdit"
            >
              <span v-if="!savingEdit">Enregistrer les modifications</span>
              <span v-else class="spinner-sm"></span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 2 : PUBLICATION EN VOD / MÉDIATHÈQUE              -->
    <!-- ======================================================== -->
    <div v-if="showPublishModal" class="modal-backdrop" @click.self="showPublishModal = false">
      <div class="modal-dialog-custom">
        <div class="modal-header-custom">
          <div class="modal-title-wrap">
            <span class="modal-icon">📚</span>
            <div>
              <h3>Archiver en Ressource Paroissiale</h3>
              <p>Mettez ce replay à disposition dans la bibliothèque de ressources et formations.</p>
            </div>
          </div>
          <button class="btn-close-modal" @click="showPublishModal = false">✕</button>
        </div>

        <form @submit.prevent="submitPublishResource" class="modal-body-custom">
          <div v-if="publishError" class="modal-alert-danger">
            {{ publishError }}
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Titre de la ressource *</label>
            <input 
              v-model="publishForm.title" 
              type="text" 
              class="form-control-custom" 
              required 
            />
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Catégorie de ressource</label>
            <select v-model="publishForm.category_id" class="form-control-custom">
              <option :value="null">-- Choisir une catégorie --</option>
              <option v-for="cat in resourceCategories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Description</label>
            <textarea 
              v-model="publishForm.description" 
              class="form-control-custom textarea-custom" 
              rows="3"
            ></textarea>
          </div>

          <div class="form-check-custom mb-4">
            <label class="check-container">
              <input type="checkbox" v-model="publishForm.is_free" />
              <span class="checkmark"></span>
              <span class="check-label">Accès libre et gratuit pour tous les fidèles</span>
            </label>
          </div>

          <div class="modal-footer-custom">
            <button 
              type="button" 
              class="btn-modal-cancel" 
              @click="showPublishModal = false"
              :disabled="publishing"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              class="btn-primary-action" 
              :disabled="publishing"
            >
              <span v-if="!publishing">Confirmer la publication</span>
              <span v-else class="spinner-sm"></span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 3 : GUIDE DE CONFIGURATION OBS STUDIO              -->
    <!-- ======================================================== -->
    <div v-if="showObsGuide" class="modal-backdrop" @click.self="showObsGuide = false">
      <div class="modal-dialog-custom modal-lg">
        <div class="modal-header-custom">
          <div class="modal-title-wrap">
            <span class="modal-icon">⚙️</span>
            <div>
              <h3>Guide de Connexion OBS Studio</h3>
              <p>Procédure pour synchroniser OBS avec cette régie.</p>
            </div>
          </div>
          <button class="btn-close-modal" @click="showObsGuide = false">✕</button>
        </div>

        <div class="modal-body-custom">
          <div class="obs-guide-steps">
            <div class="step-card">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Paramètres de flux OBS</h4>
                <p>Dans OBS Studio, rendez-vous dans <em>Fichier &gt; Paramètres &gt; Flux</em>.</p>
                <p>Sélectionnez le service <strong>YouTube - RTMPS</strong> ou Personnalisé avec l'URL <code>rtmp://a.rtmp.youtube.com/live2</code>.</p>
              </div>
            </div>

            <div class="step-card">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Coller la clé de diffusion</h4>
                <p>Collez la clé YouTube fournie dans le panneau de droite ou obtenue sur YouTube Studio.</p>
              </div>
            </div>

            <div class="step-card">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Démarrer dans OBS puis ici</h4>
                <p>
                  1. Cliquez sur <strong>Commencer le streaming</strong> dans OBS.<br/>
                  2. Dès que le flux apparaît sur le moniteur de retour à gauche, cliquez sur le grand bouton vert <strong>PASSER EN DIRECT (ON AIR)</strong>.
                </p>
              </div>
            </div>
          </div>

          <div class="modal-footer-custom mt-4">
            <button class="btn-primary-action" @click="showObsGuide = false">
              J'ai compris, fermer
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLiveStreamStore } from '@/stores/liveStream'
import LiveStatus from '@/components/live/LiveStatus.vue'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const store = useLiveStreamStore()

// State
const stream = ref(null)
const loading = ref(true)
const error = ref(null)

const isStarting = ref(false)
const isEnding = ref(false)
const isRefreshingMonitor = ref(false)
const monitorKey = ref(1)
const showStreamKey = ref(false)

const showEditModal = ref(false)
const showPublishModal = ref(false)
const showObsGuide = ref(false)

const churchEvents = ref([])
const resourceCategories = ref([])

const savingEdit = ref(false)
const editError = ref('')
const publishing = ref(false)
const publishError = ref('')

// Chronometer & Polling
const now = ref(Date.now())
let timerInterval = null
let statusPollingInterval = null

// Toast
const toast = ref({
  visible: false,
  message: '',
  icon: '✓',
  type: 'success',
})

const showToast = (message, icon = '✓', type = 'success') => {
  toast.value = { visible: true, message, icon, type }
  setTimeout(() => {
    toast.value.visible = false
  }, 3200)
}

// Formulaires
const editForm = ref({
  title: '',
  description: '',
  youtube_url: '',
  event_id: null,
  date: '',
  time: '',
})

const publishForm = ref({
  title: '',
  description: '',
  category_id: null,
  is_free: true,
})

// Embed URL
const monitorEmbedUrl = computed(() => {
  if (!stream.value?.provider_live_input_id) return ''
  return `https://www.youtube.com/embed/${stream.value.provider_live_input_id}?autoplay=0&modestbranding=1&rel=0`
})

// Elapsed time chronometer
const liveElapsedTime = computed(() => {
  if (!stream.value || stream.value.status !== 'live') return '00:00:00'
  const startTime = stream.value.started_at ? new Date(stream.value.started_at).getTime() : now.value
  const diffSec = Math.max(0, Math.floor((now.value - startTime) / 1000))

  const hours = Math.floor(diffSec / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  const seconds = diffSec % 60

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
})

const calculateTotalDuration = (start, end) => {
  if (!start || !end) return '—'
  const diffSec = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000))
  const hours = Math.floor(diffSec / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  const seconds = diffSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

// Formatting helpers
const formatDateTime = (dateStr) => {
  if (!dateStr) return 'Non définie'
  try {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    return dateStr
  }
}

const formatDateShort = (dateStr) => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
  } catch (e) {
    return dateStr
  }
}

// Load Stream
const loadStream = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await store.fetchLiveStream(route.params.id)
    stream.value = res
  } catch (err) {
    error.value = "Impossible de charger les données de cette diffusion."
  } finally {
    loading.value = false
  }
}

// Background sync
const pollStatus = async () => {
  if (!stream.value?.id) return
  try {
    const res = await api.get(`/live-streams/${stream.value.id}/status`)
    if (res.data?.status && res.data.status !== stream.value.status) {
      stream.value.status = res.data.status
    }
  } catch (e) {
    // Silencieux
  }
}

// Refresh monitor iframe
const refreshMonitor = () => {
  isRefreshingMonitor.value = true
  monitorKey.value++
  setTimeout(() => {
    isRefreshingMonitor.value = false
  }, 600)
}

// Open YouTube Studio
const openYouTubeStudio = () => {
  if (stream.value?.provider_live_input_id) {
    window.open(`https://studio.youtube.com/video/${stream.value.provider_live_input_id}/livestreaming`, '_blank')
  }
}

// Clipboard
const copyToClipboard = async (text, label = 'Texte') => {
  try {
    await navigator.clipboard.writeText(text)
    showToast(`${label} copié dans le presse-papier !`, '📋')
  } catch (err) {
    showToast(`Erreur lors de la copie`, '❌', 'error')
  }
}

const copyShareLink = () => {
  const watchUrl = `${window.location.origin}/live-streams/watch/${stream.value.id}`
  copyToClipboard(watchUrl, 'Lien de diffusion public')
}

// Master Actions
const confirmStartLive = async () => {
  if (!confirm("Voulez-vous PASSER EN DIRECT maintenant ? Les fidèles pourront voir la transmission.")) {
    return
  }
  isStarting.value = true
  try {
    const updated = await store.startLiveStream(stream.value.id)
    stream.value = updated
    showToast("La diffusion est désormais EN DIRECT !", '🔴', 'live')
  } catch (err) {
    showToast(err?.data?.message || err?.message || "Erreur lors du démarrage du direct.", '❌', 'error')
  } finally {
    isStarting.value = false
  }
}

const confirmEndLive = async () => {
  if (!confirm("Voulez-vous vraiment TERMINER la diffusion ? Cette action coupera la transmission pour les spectateurs.")) {
    return
  }
  isEnding.value = true
  try {
    const updated = await store.endLiveStream(stream.value.id)
    stream.value = updated
    showToast("La diffusion a été clôturée avec succès.", '🏁')
  } catch (err) {
    showToast(err?.data?.message || err?.message || "Erreur lors de la clôture.", '❌', 'error')
  } finally {
    isEnding.value = false
  }
}

// Edit Stream
const openEditModal = () => {
  editError.value = ''
  let d = ''
  let t = ''
  if (stream.value?.scheduled_at) {
    const dt = new Date(stream.value.scheduled_at)
    d = dt.toISOString().split('T')[0]
    t = dt.toTimeString().slice(0, 5)
  }

  editForm.value = {
    title: stream.value.title || '',
    description: stream.value.description || '',
    youtube_url: stream.value.provider_live_input_id ? `https://youtube.com/watch?v=${stream.value.provider_live_input_id}` : '',
    event_id: stream.value.event_id || null,
    date: d,
    time: t,
  }
  showEditModal.value = true
}

const submitEditStream = async () => {
  savingEdit.value = true
  editError.value = ''
  try {
    let scheduled_at = null
    if (editForm.value.date && editForm.value.time) {
      scheduled_at = `${editForm.value.date}T${editForm.value.time}:00`
    }

    const payload = {
      title: editForm.value.title.trim(),
      description: editForm.value.description?.trim() || null,
      event_id: editForm.value.event_id || null,
      scheduled_at,
    }

    if (editForm.value.youtube_url?.trim()) {
      payload.youtube_url = editForm.value.youtube_url.trim()
    }

    const updated = await store.updateLiveStream(stream.value.id, payload)
    stream.value = updated
    showEditModal.value = false
    showToast("Diffusion mise à jour avec succès !", '✨')
    refreshMonitor()
  } catch (err) {
    editError.value = err?.data?.message || err?.message || "Erreur lors de la modification."
  } finally {
    savingEdit.value = false
  }
}

// Publish VOD
const openPublishModal = () => {
  publishError.value = ''
  publishForm.value = {
    title: stream.value.title || '',
    description: stream.value.description || '',
    category_id: null,
    is_free: true,
  }
  showPublishModal.value = true
}

const submitPublishResource = async () => {
  publishing.value = true
  publishError.value = ''
  try {
    const payload = {
      title: publishForm.value.title.trim(),
      description: publishForm.value.description?.trim() || null,
      category_id: publishForm.value.category_id || null,
      is_free: publishForm.value.is_free,
      status: 'published',
    }
    await store.publishAsResource(stream.value.id, payload)
    showPublishModal.value = false
    showToast("Replay publié dans vos Ressources d'église !", '📚')
  } catch (err) {
    publishError.value = err?.data?.message || err?.message || "Erreur lors de la publication."
  } finally {
    publishing.value = false
  }
}

// Delete
const handleDeleteStream = async () => {
  if (confirm(`Voulez-vous vraiment supprimer définitivement la diffusion « ${stream.value.title} » ?`)) {
    try {
      await store.deleteLiveStream(stream.value.id)
      router.push({ name: 'live-streams' })
    } catch (err) {
      alert(err?.data?.message || err?.message || "Erreur lors de la suppression")
    }
  }
}

// Load Events and Resource Categories
const loadAuxiliaryData = async () => {
  try {
    const [eventsRes, catRes] = await Promise.allSettled([
      api.get('/events'),
      api.get('/resource-categories'),
    ])
    if (eventsRes.status === 'fulfilled') {
      const d = eventsRes.value?.data || eventsRes.value
      churchEvents.value = Array.isArray(d) ? d : (d?.data || [])
    }
    if (catRes.status === 'fulfilled') {
      const d = catRes.value?.data || catRes.value
      resourceCategories.value = Array.isArray(d) ? d : (d?.data || [])
    }
  } catch (e) {
    // Ignore non-critical fetch errors
  }
}

onMounted(async () => {
  await loadStream()
  loadAuxiliaryData()

  // Chronometer ticker
  timerInterval = setInterval(() => {
    now.value = Date.now()
  }, 1000)

  // Polling stream status every 20s
  statusPollingInterval = setInterval(pollStatus, 20000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (statusPollingInterval) clearInterval(statusPollingInterval)
})
</script>

<style scoped>
/* Page Layout */
.live-manage-studio {
  padding: 1.5rem 2rem 3.5rem 2rem;
  background: #f8fafc;
  min-height: calc(100vh - 70px);
}

/* Toast */
.studio-toast {
  position: fixed;
  top: 85px;
  right: 25px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #0f172a;
  color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  font-size: 0.9rem;
  font-weight: 600;
}
.studio-toast.success { border-left: 4px solid #10b981; }
.studio-toast.error { border-left: 4px solid #ef4444; }
.studio-toast.live { border-left: 4px solid #ef4444; background: #1e1115; }

.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(-10px); }

/* Loading & Error States */
.manage-loading-state, .manage-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.spinner-pulse {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #6366f1;
  animation: pulse-ring 1.2s infinite ease-in-out;
  margin-bottom: 1.25rem;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 0.4; }
  100% { transform: scale(0.8); opacity: 0.8; }
}

.error-card {
  background: #ffffff;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  max-width: 480px;
}
.error-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }

/* Header */
.manage-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

/* Bouton et Barre de Navigation Retour */
.manage-nav-bar {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-back-prominent {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  color: #1e293b;
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.btn-back-prominent:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
  transform: translateX(-3px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

.btn-back-prominent .back-arrow-icon {
  color: #6366f1;
  transition: transform 0.2s ease;
}

.btn-back-prominent:hover .back-arrow-icon {
  transform: translateX(-2px);
}

.btn-circle-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  color: #334155;
  text-decoration: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-circle-back:hover {
  background: #f1f5f9;
  border-color: #6366f1;
  color: #6366f1;
  transform: translateX(-3px);
}

.btn-header-back {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
  color: #334155 !important;
}

.btn-header-back:hover {
  background: #f1f5f9 !important;
  color: #0f172a !important;
  transform: translateX(-2px);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.stream-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.btn-icon-edit {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-icon-edit:hover { background: #e2e8f0; color: #0f172a; }

.event-badge-sub {
  margin: 0.4rem 0 0 0;
  font-size: 0.88rem;
  color: #6366f1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-header-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #334155;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.btn-header-action:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}
.btn-header-action.outline {
  border-color: #93c5fd;
  color: #2563eb;
  background: #eff6ff;
}
.btn-header-action.outline:hover { background: #dbeafe; }
.btn-header-action.yt {
  border-color: #fecaca;
  color: #dc2626;
  background: #fef2f2;
}
.btn-header-action.yt:hover { background: #fee2e2; }

/* Status Banner */
.on-air-status-banner {
  border-radius: 16px;
  padding: 1.25rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.75rem;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: all 0.3s;
  flex-wrap: wrap;
  gap: 1rem;
}

.on-air-status-banner.is-live {
  background: linear-gradient(135deg, #18090c 0%, #2b0b12 100%);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #ffffff;
  box-shadow: 0 8px 30px rgba(220, 38, 38, 0.15);
}

.on-air-status-banner.is-scheduled {
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #ffffff;
}

.on-air-status-banner.is-ended {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 1px solid #334155;
  color: #ffffff;
}

.banner-badge-group {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* Radar Animation for Live */
.live-beacon-wrap {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.live-dot {
  width: 12px;
  height: 12px;
  background: #ef4444;
  border-radius: 50%;
  position: relative;
  z-index: 2;
}
.live-radar {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.6);
  animation: radar-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes radar-ping {
  0% { transform: scale(0.7); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}

.scheduled-icon-wrap, .ended-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}
.scheduled-icon-wrap { color: #818cf8; }
.ended-icon-wrap { color: #10b981; }

.banner-text {
  display: flex;
  flex-direction: column;
}
.status-headline {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.on-air-status-banner.is-live .status-headline { color: #f87171; }
.on-air-status-banner.is-scheduled .status-headline { color: #a5b4fc; }
.on-air-status-banner.is-ended .status-headline { color: #94a3b8; }

.status-sub {
  font-size: 0.85rem;
  color: #cbd5e1;
  margin-top: 2px;
}

.banner-metrics {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.metric-pill.live-timer {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
}
.metric-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #94a3b8;
}
.metric-pill.live-timer .metric-label { color: #fca5a5; }
.metric-val {
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
}

.btn-publish-quick {
  background: #6366f1;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}
.btn-publish-quick:hover { background: #4f46e5; }

/* Grid Layout */
.manage-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.75rem;
}

@media (max-width: 1024px) {
  .manage-grid {
    grid-template-columns: 1fr;
  }
}

/* Studio Cards */
.studio-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.card-header-studio {
  padding: 1.1rem 1.4rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
}

.header-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}
.header-label i { color: #6366f1; font-size: 1.1rem; }

.header-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quality-tag {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-mini-refresh {
  background: transparent;
  border: none;
  color: #64748b;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-mini-refresh:hover { background: #f1f5f9; color: #0f172a; }
.spin-anim { animation: spin 0.6s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Monitor Screen */
.monitor-screen-container {
  background: #000000;
  position: relative;
  aspect-ratio: 16/9;
  width: 100%;
}

.iframe-wrapper {
  width: 100%;
  height: 100%;
}
.iframe-wrapper iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.empty-monitor-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #0b0f19;
}

.test-pattern-backdrop {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  opacity: 0.06;
  background-image: repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 50px);
}

.empty-screen-overlay {
  position: relative;
  z-index: 2;
  text-align: center;
  color: #94a3b8;
  padding: 2rem;
}
.display-icon { font-size: 2.75rem; color: #475569; margin-bottom: 0.75rem; display: block; }
.empty-screen-overlay h4 { color: #f8fafc; font-size: 1.1rem; margin-bottom: 0.4rem; }
.empty-screen-overlay p { font-size: 0.85rem; max-width: 320px; margin: 0 auto 1.25rem auto; }

.btn-primary-sm {
  background: #6366f1;
  color: #ffffff;
  border: none;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}
.btn-primary-sm:hover { background: #4f46e5; }

.monitor-footer-bar {
  padding: 10px 16px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.footer-stream-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  overflow: hidden;
}
.link-label { color: #64748b; font-weight: 600; }
.link-value { color: #334155; }

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-copy-sm, .btn-link-external {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}
.btn-copy-sm:hover, .btn-link-external:hover { background: #f1f5f9; color: #0f172a; }

/* Details Card */
.details-body {
  padding: 1.25rem 1.5rem;
}

.details-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
}
.meta-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 2px;
}
.meta-val {
  font-size: 0.92rem;
  font-weight: 600;
  color: #1e293b;
}
.meta-val.highlight {
  color: #6366f1;
}

.description-text {
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
  background: #f8fafc;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
  margin-top: 6px;
}

.btn-text-edit {
  background: transparent;
  border: none;
  color: #6366f1;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-text-edit:hover { text-decoration: underline; }

/* Master Controls */
.master-body {
  padding: 1.4rem;
}

.master-hint {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 1.25rem;
  line-height: 1.4;
}

.btn-master-action {
  width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
}

.btn-master-action i {
  font-size: 2rem;
}

.btn-text-stack {
  display: flex;
  flex-direction: column;
}
.main-action {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.sub-action {
  font-size: 0.8rem;
  opacity: 0.9;
  margin-top: 2px;
}

.btn-start-broadcast {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
}
.btn-start-broadcast:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.35);
}

.btn-end-broadcast {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
}
.btn-end-broadcast:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.35);
}

.btn-archive-resource {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
}
.btn-archive-resource:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
}

.checklist-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 1.25rem;
}
.checklist-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
  display: block;
  margin-bottom: 6px;
}
.checklist-box ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: #64748b;
}
.checklist-box li {
  margin-bottom: 3px;
}

.live-active-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pulsing-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse-ring 1.2s infinite;
  flex-shrink: 0;
}
.live-active-box strong {
  font-size: 0.85rem;
  color: #991b1b;
  display: block;
}
.live-active-box p {
  font-size: 0.8rem;
  color: #b91c1c;
  margin: 2px 0 0 0;
}

.ended-status-box {
  text-align: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 1rem;
}
.ended-status-box i { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
.ended-status-box p { font-size: 0.85rem; color: #64748b; margin: 0; }

/* Encoder / OBS Card */
.encoder-body {
  padding: 1.25rem 1.4rem;
}

.btn-obs-guide {
  background: #eef2ff;
  border: none;
  color: #4f46e5;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}
.btn-obs-guide:hover { background: #e0e7ff; }

.param-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 4px;
  display: block;
}

.input-with-copy {
  display: flex;
  gap: 6px;
}

.btn-copy-field {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #475569;
  padding: 0 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-copy-field:hover { background: #e2e8f0; color: #0f172a; }

.btn-toggle-mask {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  color: #6366f1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-toggle-mask:hover { text-decoration: underline; }

.quick-bitrate-specs {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.8rem;
}
.spec-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed #e2e8f0;
}
.spec-row:last-child { border-bottom: none; }
.spec-name { color: #64748b; }
.spec-val { font-weight: 600; color: #1e293b; }

/* Danger Zone */
.danger-zone-box {
  text-align: center;
}
.btn-delete-stream {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}
.btn-delete-stream:hover {
  background: #fef2f2;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.modal-dialog-custom {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 540px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: modal-enter 0.25s ease-out;
}
.modal-dialog-custom.modal-lg {
  max-width: 680px;
}

@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header-custom {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.modal-icon { font-size: 1.6rem; }
.modal-title-wrap h3 {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}
.modal-title-wrap p {
  font-size: 0.82rem;
  color: #64748b;
  margin: 2px 0 0 0;
}

.btn-close-modal {
  background: #f1f5f9;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-close-modal:hover { background: #e2e8f0; color: #0f172a; }

.modal-body-custom {
  padding: 1.5rem;
}

.form-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 4px;
  display: block;
}

.form-hint {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 3px;
  display: block;
}

.form-control-custom {
  width: 100%;
  padding: 9px 13px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  font-size: 0.88rem;
  color: #0f172a;
  background: #ffffff;
  outline: none;
  transition: border-color 0.2s;
}
.form-control-custom:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.textarea-custom { resize: vertical; }

.check-container {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #334155;
  cursor: pointer;
}

.modal-alert-danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.modal-footer-custom {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 1.25rem;
}

.btn-modal-cancel {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 9px 18px;
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}
.btn-modal-cancel:hover { background: #e2e8f0; }

.btn-primary-action {
  background: #6366f1;
  border: none;
  padding: 9px 20px;
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;
}
.btn-primary-action:hover { background: #4f46e5; }

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* OBS Guide Steps */
.obs-guide-steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.step-card {
  display: flex;
  gap: 14px;
  background: #f8fafc;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #6366f1;
  color: #ffffff;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-content h4 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}
.step-content p {
  font-size: 0.85rem;
  color: #475569;
  margin: 0 0 4px 0;
  line-height: 1.4;
}
.step-content code {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #0f172a;
}

/* Common */
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
