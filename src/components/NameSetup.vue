<template>
  <div class="name-setup">
    <div class="card">
      <div class="identicon">
        <NimiqIdenticon :address="session.user.value?.id ?? ''" :size="56" />
      </div>
      <h1 class="title">{{ t('nameSetup.title') }}</h1>
      <p class="subtitle">{{ t('nameSetup.subtitle') }}</p>
      <input
        v-model="name"
        class="input"
        type="text"
        :maxlength="24"
        :placeholder="t('nameSetup.placeholder')"
        @keyup.enter="submit"
      />
      <button class="continue-btn" :disabled="!canSubmit" @click="submit">
        {{ t('nameSetup.continue') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import NimiqIdenticon from './NimiqIdenticon.vue';
import { useSession } from '../stores/session';
import { usePrefs } from '../stores/prefs';
import { useI18n } from '../stores/i18n';

const session = useSession();
const { setDisplayName } = usePrefs();
const { t } = useI18n();

const name = ref('');
const canSubmit = computed(() => name.value.trim().length > 0);

function submit() {
  const clean = name.value.trim();
  if (!clean) return;
  setDisplayName(clean);
  session.setName(clean);
}
</script>

<style scoped>
.name-setup {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.identicon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 16px;
}
.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--dark);
  margin: 0 0 8px;
}
.subtitle {
  font-size: 13px;
  color: var(--text);
  margin: 0 0 24px;
}
.input {
  width: 100%;
  border: 1.5px solid var(--border-subtle);
  background: var(--bg-card);
  border-radius: 14px;
  padding: 14px;
  font-size: 15px;
  font-family: inherit;
  color: var(--dark);
  margin-bottom: 16px;
  box-sizing: border-box;
}
.input:focus {
  outline: none;
  border-color: var(--accent);
}
.continue-btn {
  width: 100%;
  border: none;
  border-radius: 16px;
  padding: 16px;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  color: #fff;
  background: var(--accent);
  cursor: pointer;
}
.continue-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
