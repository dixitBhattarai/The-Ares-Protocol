<script setup lang="ts">
import { onMounted, ref } from 'vue';

const emit = defineEmits<{ finished: [] }>();
const visible = ref(true);

onMounted(() => {
  // Show the logo for 2.5 seconds, then tell the parent we're done
  setTimeout(() => {
    visible.value = false;
    emit('finished');
  }, 2500);
});
</script>

<template>
  <div v-if="visible" class="splash" role="img" aria-label="Ares By Nnn logo">
    <img src="../../assets/logo.jpeg" alt="Ares By Nnn" class="logo" />
  </div>
</template>

<style scoped>
.splash {
  background: black;
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.logo {
  max-width: 60%;
  height: auto;
}
</style>
