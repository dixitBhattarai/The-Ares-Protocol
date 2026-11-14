<script setup lang="ts">
const emit = defineEmits<{ start: [] }>();
</script>

<template>
  <section class="login" aria-label="Login screen">
    <div class="scene">
      <img src="../../assets/astronout.jpeg" alt="Astronaut in spacesuit" class="astronaut" />
    </div>
    <button class="start-btn" @click="emit('start')">Start Mission</button>
  </section>
</template>

<style scoped>
.login {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(to bottom, #1a0a00, #0d0d0d);
  text-align: center;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.scene {
  width: 260px;
  height: 320px;
  overflow: hidden;
  position: relative;
}

.astronaut {
  width: 180px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  animation: walkDown 2.5s ease-out forwards;
}

/* astronaut slides from above down into view */
@keyframes walkDown {
  from { top: -200px; }
  to   { top: 80px; }
}

.start-btn {
  margin-top: 3rem;
  padding: 0.9rem 2rem;
  font-size: 1.1rem;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: 0.05em;
}

.start-btn:hover {
  background: #e68a00;
}

.start-btn:focus-visible {
  outline: 3px solid #ffd54f;
}
</style>
