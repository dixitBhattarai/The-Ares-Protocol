<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface AccountCredentials {
  username: string;
  password: string;
}

const props = defineProps<{ busy: boolean; message: string }>();
const emit = defineEmits<{
  submit: [mode: 'register' | 'login', credentials: AccountCredentials];
  cancel: [];
}>();

const mode = ref<'register' | 'login'>('register');
const username = ref('');
const password = ref('');
const localMessage = ref(props.message);
const heading = computed(() => mode.value === 'register' ? 'Create a pilot name' : 'Welcome back, pilot');

watch(() => props.message, message => { localMessage.value = message; }, { immediate: true });

function submit() {
  localMessage.value = '';
  emit('submit', mode.value, { username: username.value, password: password.value });
  password.value = '';
}
</script>

<template>
  <div class="account-backdrop">
    <section class="account-card" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <p class="eyebrow">ARES OUTPOST · PILOT SAVE</p>
      <h1 id="account-title">{{ heading }}</h1>
      <p class="intro">Use a nickname and password to save your expedition. We only need these two things.</p>

      <div class="mode-switch" aria-label="Account action">
        <button type="button" :aria-pressed="mode === 'register'" :disabled="busy" @click="mode = 'register'; localMessage = ''">New pilot</button>
        <button type="button" :aria-pressed="mode === 'login'" :disabled="busy" @click="mode = 'login'; localMessage = ''">I have a pilot name</button>
      </div>

      <form @submit.prevent="submit">
        <label for="pilot-name">Pilot nickname</label>
        <input
          id="pilot-name"
          v-model="username"
          name="pilot-name"
          type="text"
          minlength="3"
          maxlength="20"
          pattern="[A-Za-z0-9_]{3,20}"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          required
          :disabled="busy"
          aria-describedby="name-hint"
        />
        <small id="name-hint">3–20 letters, numbers, or _ . Pick a nickname, not your real name.</small>

        <label for="pilot-password">Password</label>
        <input
          id="pilot-password"
          v-model="password"
          name="pilot-password"
          type="password"
          minlength="8"
          maxlength="128"
          autocomplete="off"
          required
          :disabled="busy"
          aria-describedby="password-hint"
        />
        <small id="password-hint">8–128 characters. A forgotten password cannot be reset.</small>

        <p v-if="localMessage" class="message" role="alert">{{ localMessage }}</p>
        <button class="primary" type="submit" :disabled="busy || !username || !password">
          {{ busy ? 'Connecting…' : mode === 'register' ? 'Create account & save' : 'Sign in & continue' }}
        </button>
      </form>

      <p class="privacy-note">No email, real name, or other personal details are needed.</p>
      <button class="back" type="button" :disabled="busy" @click="emit('cancel')">Back to the mission menu</button>
    </section>
  </div>
</template>

<style scoped>
.account-backdrop{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:20px;overflow:auto;background:radial-gradient(circle at 50% 0,#385267dd,#06111bef 65%);color:#f5fafc;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.account-card{width:min(100%,440px);padding:clamp(22px,5vw,34px);border:1px solid #89b8c377;border-radius:22px;background:linear-gradient(145deg,#162d3cef,#101c2bf5);box-shadow:0 24px 70px #0009}
.eyebrow{margin:0 0 8px;color:#a9d7e5;font-size:11px;font-weight:800;letter-spacing:.14em}
h1{margin:0;color:#fff0bf;font-size:clamp(25px,7vw,34px);line-height:1.1}
.intro{margin:12px 0 18px;color:#d1e2e7;font-size:14px;line-height:1.55}
.mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
button,input{font:inherit}
.mode-switch button,.back{min-height:44px;border:1px solid #6d8998;border-radius:10px;background:#1a3040;color:#deedf1;font-size:12px;font-weight:700;cursor:pointer}
.mode-switch button[aria-pressed="true"]{border-color:#f6d78e;background:#35414a;color:#fff1c6;box-shadow:inset 0 -2px #f4d485}
form{display:grid;gap:8px}
label{margin-top:7px;color:#f3f7f8;font-size:13px;font-weight:750}
input{width:100%;min-height:46px;box-sizing:border-box;padding:10px 12px;border:1px solid #7d99a7;border-radius:10px;background:#071621;color:#fff;font-size:16px}
input:focus-visible,button:focus-visible{outline:3px solid #ffdc89;outline-offset:3px}
small{color:#afc4ce;font-size:11px;line-height:1.45}
.primary{min-height:50px;margin-top:10px;border:0;border-radius:12px;background:linear-gradient(90deg,#ffe3a1,#f8bc70);color:#29291f;font-size:14px;font-weight:850;cursor:pointer}
button:disabled{opacity:.55;cursor:wait}
.message{margin:6px 0 0;color:#ffd0bd;font-size:13px;line-height:1.4}
.privacy-note{margin:16px 0 7px;color:#afc4ce;font-size:11px;text-align:center}
.back{width:100%;margin-top:8px;background:transparent}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style>
