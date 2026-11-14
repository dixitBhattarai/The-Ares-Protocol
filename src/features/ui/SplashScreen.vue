<script setup lang="ts">
import { onMounted, ref } from 'vue';

const emit = defineEmits<{ finished: [] }>();
const isFading = ref(false);

onMounted(() => {
  // Stay completely visible with solid black background
  setTimeout(() => {
    isFading.value = true;
  }, 2000);

  // Once the 0.8s smooth crossfade finishes, remove splash from DOM
  setTimeout(() => {
    emit('finished');
  }, 2850);
});
</script>

<template>
  <div class="splash-screen" :class="{ 'fade-out': isFading }" role="img" aria-label="Ares By Nnn splash logo">
    <img src="../../assets/logo.jpeg" alt="Ares By Nnn" class="splash-logo" />
  </div>
</template>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background-color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  overflow: hidden;
  transition: opacity 0.85s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity;
}

.splash-screen.fade-out {
  opacity: 0;
  pointer-events: none;
}

.splash-logo {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  display: block;
  animation: logoAppear 1.6s ease-out forwards;
}

@keyframes logoAppear {
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
