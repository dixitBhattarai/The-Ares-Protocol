<script setup lang="ts">
import { computed } from 'vue';
import type { MissionData } from '../../contracts';

const props = defineProps<{
  mission: MissionData;
}>();

const modeDescription = computed(() => {
  switch (props.mission.dataMode) {
    case 'authored-demo':
      return 'Starter Demo: All resource values, events, and station parameters are authored game mechanics. No live NASA dataset is loaded yet.';
    case 'archived':
      return 'Archived NASA Evidence: Bundled DONKI space-weather and InSight weather records, plus linked science references. Game hazards, reserves and timers are authored; this is not a live Mars feed.';
    case 'live':
      return 'Live NASA Data Feed: Near-real-time sensor telemetry adapted into educational simulation rules.';
    default:
      return `Data mode: ${props.mission.dataMode}`;
  }
});
</script>

<template>
  <details class="sources-drawer">
    <summary class="sources-summary">
      <span class="summary-icon">🔬</span>
      <span class="summary-title">Science &amp; sources</span>
      <span class="summary-badge">{{ mission.dataMode }}</span>
    </summary>

    <div class="sources-content">
      <!-- Data Mode Banner -->
      <div class="mode-card">
        <strong>Data Pipeline:</strong>
        <p>{{ modeDescription }}</p>
      </div>

      <!-- Sources List / Empty State -->
      <section class="sources-list-section" aria-label="Reference Datasets">
        <h4>Referenced Scientific Records</h4>

        <div v-if="mission.sources.length === 0" class="empty-sources">
          <span class="empty-icon">ℹ️</span>
          <p>
            <strong>Honest Attribution Note:</strong> No external NASA telemetry datasets are currently loaded for this scenario.
            All scenarios and engineering numbers are authored teaching approximations.
          </p>
        </div>

        <ul v-else class="source-items">
          <li v-for="source in mission.sources" :key="source.id" class="source-item">
            <div class="source-title-row">
              <a
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-link"
              >
                {{ source.title }}
                <span class="external-icon" aria-hidden="true">↗</span>
              </a>
              <span class="source-mode-tag">{{ source.mode }}</span>
            </div>

            <div class="source-meta">
              <span><strong>Retrieved:</strong> {{ source.retrievedAt }}</span>
              <span v-if="source.observedAt"><strong>Observed:</strong> {{ source.observedAt }}</span>
              <span v-if="source.units"><strong>Units:</strong> {{ source.units }}</span>
            </div>

            <div class="source-mapping">
              <strong>Game Adaptation:</strong> {{ source.mapping }}
            </div>

            <div v-if="source.licenseNotes" class="source-license">
              <strong>Provenance / License:</strong> {{ source.licenseNotes }}
            </div>
          </li>
        </ul>
      </section>

      <details class="further-science">
        <summary>Explore more science</summary>
        <p>Further reading; these services are not live inputs to the game.</p>
        <ul>
          <li><a href="https://api.nasa.gov/" target="_blank" rel="noopener noreferrer">NASA Open APIs</a> · data portal</li>
          <li><a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener noreferrer">DONKI</a> · space weather</li>
          <li><a href="https://osdr.nasa.gov/bio/repo/" target="_blank" rel="noopener noreferrer">OSDR</a> · space biology research</li>
          <li><a href="https://visualization.osdr.nasa.gov/radlab/gui/data-api/" target="_blank" rel="noopener noreferrer">RadLab</a> · ISS dosimetry, not Mars crew dose</li>
          <li><a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer">Mars Trek</a> · real terrain; this outpost map is invented</li>
          <li><a href="https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp" target="_blank" rel="noopener noreferrer">CSA youth resources</a></li>
          <li><a href="https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/" target="_blank" rel="noopener noreferrer">CSA space food toolkit</a></li>
        </ul>
        <p>The dome is a habitat concept, not a proven Mars structure. Pressure checks, plant targets, rewards, hazards and travel times are simplified game rules. Solid shelter helps with radiation; a clear bubble is not a radiation shield.</p>
      </details>

      <!-- Educational Caveat & Physical Simplification Notes -->
      <div class="disclaimers">
        <div class="disclaimer-item">
          <strong>⚠️ Space Physics Clarification:</strong>
          <p>
            Solar flare and coronal mass ejection telemetry describe space weather events, not direct human biological radiation dosage on Mars.
            Martian surface shielding and life-support operations involve complex multidisciplinary engineering beyond this classroom model.
          </p>
        </div>

        <div class="disclaimer-item">
          <strong>🎓 Educational Prototype:</strong>
          <p>
            This software is an educational prototype created for children ages 7–12; it is not professional astronaut training or medical advice.
          </p>
        </div>

        <div class="disclaimer-item nasa-disclaimer">
          <strong>🏛️ NASA Non-Endorsement Notice:</strong>
          <p>
            NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website.
          </p>
        </div>
      </div>
    </div>
  </details>
</template>

<style scoped>
.sources-drawer {
  background: #0d1520;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 0.5rem 0.85rem;
  font-size: 0.88rem;
  color: #cbd5e1;
}

.sources-summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.2rem;
  font-weight: 600;
  color: #f1f5f9;
  user-select: none;
}

.sources-summary:focus-visible {
  outline: 2px solid #f6c768;
  outline-offset: 3px;
  border-radius: 4px;
}

.summary-icon {
  font-size: 1.15rem;
}

.summary-title {
  flex-grow: 1;
}

.summary-badge {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.sources-content {
  padding-top: 0.85rem;
  border-top: 1px solid #1e293b;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mode-card {
  background: #16202c;
  border: 1px solid #283749;
  border-radius: 6px;
  padding: 0.65rem 0.85rem;
}

.mode-card strong {
  color: #f8fafc;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mode-card p {
  margin: 0.25rem 0 0 0;
  color: #cbd5e1;
  font-size: 0.85rem;
  line-height: 1.4;
}

.sources-list-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  color: #f1f5f9;
}

.empty-sources {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  background: #111a26;
  border: 1px solid #233346;
  border-radius: 6px;
  padding: 0.65rem 0.85rem;
}

.empty-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.empty-sources p {
  margin: 0;
  font-size: 0.84rem;
  color: #94a3b8;
  line-height: 1.4;
}

.source-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.source-item {
  background: #111a26;
  border: 1px solid #233346;
  border-radius: 6px;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.source-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.source-link {
  color: #38bdf8;
  font-weight: 600;
  text-decoration: none;
}

.source-link:hover {
  text-decoration: underline;
}

.source-link:focus-visible {
  outline: 2px solid #f6c768;
  outline-offset: 2px;
}

.external-icon {
  font-size: 0.8rem;
  margin-left: 0.2rem;
}

.source-mode-tag {
  background: #1e3a5f;
  color: #7dd3fc;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.source-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.78rem;
  color: #94a3b8;
}

.source-mapping {
  font-size: 0.82rem;
  color: #cbd5e1;
  background: #0a0f18;
  padding: 0.35rem 0.55rem;
  border-radius: 4px;
  border-left: 3px solid #38bdf8;
}

.source-license {
  font-size: 0.78rem;
  color: #94a3b8;
}

.disclaimers {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border-top: 1px solid #1e293b;
  padding-top: 0.75rem;
}

.disclaimer-item {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.4;
}

.disclaimer-item strong {
  display: block;
  color: #cbd5e1;
  margin-bottom: 0.15rem;
}

.disclaimer-item p {
  margin: 0;
}

.nasa-disclaimer {
  color: #cbd5e1;
}

@media (max-width: 480px) {
  .sources-summary {
    font-size: 0.82rem;
  }
  .source-meta {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
