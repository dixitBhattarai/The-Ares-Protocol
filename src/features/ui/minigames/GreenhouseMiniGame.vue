<script setup lang="ts">
import { ref } from 'vue';

const message = ref('');
const disabled = ref(false);

function growFood() {
  disabled.value = true;
  message.value = 'Come back after 30 seconds – 1 batch of food grown.';
  // timer for 30s
  setTimeout(() => {
    message.value = 'Food batch ready!';
    disabled.value = false;
  }, 30_000);
}
</script>

<template>
  <div class="greenhouse-mini">
    <h2>Greenhouse – Grow Food</h2>
    <button @click="growFood" :disabled="disabled">Grow Food</button>
    <p v-if="message" class="msg">{{ message }}</p>
  </div>
</template>

<style scoped>
.greenhouse-mini {
  padding: 1rem;
  background: rgba(14, 35, 27, 0.8);
  border: 1px solid #3a7f5c;
  border-radius: 8px;
  color: #c8f5d7;
}
button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #48cf7a;
  border: none;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background: #2a5a3d;
  cursor: not-allowed;
}
.msg {
  margin-top: 0.5rem;
  font-weight: 600;
}
</style>
