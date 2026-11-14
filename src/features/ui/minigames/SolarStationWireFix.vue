<script setup lang="ts">
import { ref } from 'vue';

const message = ref('');
const disabled = ref(false);

function fixWire() {
  disabled.value = true;
  message.value = 'Fixing wire...';
  // simulate 5‑second repair
  setTimeout(() => {
    message.value = 'Wire fixed! Solar station restored.';
    disabled.value = false;
  }, 5000);
}
</script>

<template>
  <div class="solar-wire-fix">
    <h2>Solar Station – Fix Wiring Short</h2>
    <button @click="fixWire" :disabled="disabled">Fix Wire</button>
    <p v-if="message" class="msg">{{ message }}</p>
  </div>
</template>

<style scoped>
.solar-wire-fix {
  padding: 1rem;
  background: rgba(30, 45, 60, 0.8);
  border: 1px solid #5a9bd5;
  border-radius: 8px;
  color: #e0f2ff;
}
button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #5a9bd5;
  border: none;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background: #3b5d84;
  cursor: not-allowed;
}
.msg {
  margin-top: 0.5rem;
  font-weight: 600;
}
</style>
