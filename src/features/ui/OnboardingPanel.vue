<script setup lang="ts">
import type { GameAction, MissionData } from '../../contracts';
import { emitStart } from './actions';

defineProps<{
  mission: MissionData;
}>();

const emit = defineEmits<{
  action: [action: GameAction];
}>();

function onStart() {
  emitStart(emit);
}
</script>

<template>
  <div class="onboarding" role="region" aria-label="Mission Onboarding">
    <div class="hero">
      <span class="role-badge">Mission Commander Briefing</span>
      <h2>Welcome to Mars Outpost Ares!</h2>
      <p class="tagline">
        Humanity needs you to lead the first research base on the Red Planet.
      </p>
    </div>

    <div class="briefing-grid">
      <div class="card mission-goals">
        <h3>🎯 Mission Goals</h3>
        <ul>
          <li>
            <strong>Survive {{ mission.maxTurns }} Shifts:</strong> Keep every life-support system running.
          </li>
          <li>
            <strong>Reach Science Target:</strong> Collect at least
            <span class="highlight">{{ mission.scienceTarget }} Science Points</span> before your mission ends.
          </li>
          <li>
            <strong>Zero-Reserve Rule:</strong> If <em>Power</em>, <em>Air (Oxygen)</em>, or <em>Supplies</em> hits zero, the mission terminates immediately!
          </li>
        </ul>
      </div>

      <div class="card controls-guide">
        <h3>🕹️ How to Play</h3>
        <ul>
          <li>
            <strong>Walk & Explore:</strong> Use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or
            <kbd>Arrow Keys</kbd> on your keyboard to guide the astronaut around the Martian surface.
          </li>
          <li>
            <strong>Make Choices:</strong> Each shift presents a real engineering dilemma. Choose the option that balances safety and discovery.
          </li>
          <li>
            <strong>Keyboard Accessible:</strong> Use <kbd>Tab</kbd> to move between buttons and press <kbd>Enter</kbd> or <kbd>Space</kbd> to select.
          </li>
        </ul>
      </div>

      <div class="card stations-overview">
        <h3>🏛️ Outpost Modules</h3>
        <div class="station-tags">
          <div class="station-tag">
            <span class="tag-icon">⚡</span>
            <div>
              <strong>Solar Station</strong>
              <p>Generates power for heaters and life support.</p>
            </div>
          </div>
          <div class="station-tag">
            <span class="tag-icon">🏠</span>
            <div>
              <strong>Hab & Shelter</strong>
              <p>Protects your crew against radiation and dust storms.</p>
            </div>
          </div>
          <div class="station-tag">
            <span class="tag-icon">🌱</span>
            <div>
              <strong>Greenhouse</strong>
              <p>Produces oxygen and grows emergency food supplies.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="start-action">
      <button
        class="start-button"
        type="button"
        @click="onStart"
      >
        🚀 Start Mission (Shift 1)
      </button>
    </div>
  </div>
</template>

<style scoped>
.onboarding {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hero {
  text-align: center;
  padding: 0.5rem 0;
}

.role-badge {
  display: inline-block;
  background: #1e3a5f;
  color: #7dd3fc;
  border: 1px solid #38bdf8;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  margin-bottom: 0.5rem;
}

h2 {
  margin: 0.25rem 0;
  font-size: 1.6rem;
  color: #f8fafc;
}

.tagline {
  margin: 0;
  color: #cbd5e1;
  font-size: 1.05rem;
}

.briefing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.card {
  background: #1a2634;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1.1rem;
}

.card h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
  color: #f1f5f9;
}

ul {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  color: #cbd5e1;
  font-size: 0.92rem;
  line-height: 1.45;
}

li strong {
  color: #f8fafc;
}

.highlight {
  color: #fbbf24;
  font-weight: bold;
}

kbd {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  font-family: monospace;
  font-size: 0.8rem;
  background: #0f172a;
  border: 1px solid #475569;
  border-radius: 4px;
  color: #f8fafc;
  margin: 0 0.1rem;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
}

.station-tags {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.station-tag {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  background: #0f172a;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #1e293b;
}

.tag-icon {
  font-size: 1.3rem;
  line-height: 1;
}

.station-tag strong {
  display: block;
  font-size: 0.9rem;
  color: #f8fafc;
}

.station-tag p {
  margin: 0.15rem 0 0 0;
  font-size: 0.8rem;
  color: #94a3b8;
}

.start-action {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.start-button {
  background: #0284c7;
  color: #ffffff;
  border: 2px solid #38bdf8;
  font-size: 1.15rem;
  font-weight: 700;
  padding: 0.9rem 2.2rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.start-button:hover {
  background: #0369a1;
  transform: translateY(-1px);
}

.start-button:active {
  transform: translateY(1px);
}

.start-button:focus-visible {
  outline: 3px solid #f6c768;
  outline-offset: 4px;
}

@media (max-width: 480px) {
  .hero h2 {
    font-size: 1.35rem;
  }
  .start-button {
    width: 100%;
    font-size: 1.05rem;
  }
}
</style>
