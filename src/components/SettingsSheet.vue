<template>
  <BaseSheet @close="$emit('close')">
    <div class="settings-title">{{ t('settings.title') }}</div>

    <!-- Bloc wallet -->
    <div class="wallet-block">
      <div class="identicon">
        <NimiqIdenticon :address="session.user.value?.id ?? ''" :size="44" />
      </div>
      <div class="wallet-meta">
        <div class="wallet-name">{{ session.user.value?.name }}</div>
        <div class="wallet-addr">{{ session.walletShort.value }}</div>
        <div class="wallet-conn">
          <span class="status-dot" />
          {{ t('settings.walletConnection') }}
        </div>
      </div>
    </div>

    <!-- Nom -->
    <div class="field-label">{{ t('settings.yourName') }}</div>
    <div class="name-row">
      <input
        v-model="nameDraft"
        class="name-input"
        type="text"
        :maxlength="24"
        @keyup.enter="saveName"
      />
      <button class="save-btn" :disabled="!nameChanged" @click="saveName">
        {{ t('settings.saveName') }}
      </button>
    </div>

    <!-- Thème -->
    <div class="field-label">{{ t('settings.theme') }}</div>
    <div class="segmented">
      <button
        v-for="opt in themes"
        :key="opt.key"
        class="seg"
        :class="{ active: theme === opt.key }"
        @click="setTheme(opt.key)"
      >
        {{ t(opt.label) }}
      </button>
    </div>

    <!-- Langue -->
    <div class="field-label">{{ t('settings.language') }}</div>
    <div class="segmented">
      <button
        v-for="opt in locales"
        :key="opt.key"
        class="seg"
        :class="{ active: locale === opt.key }"
        @click="setLocale(opt.key)"
      >
        {{ opt.label }}
      </button>
    </div>

    <button class="disconnect-btn" @click="$emit('disconnect')">
      {{ t('settings.disconnect') }}
    </button>
  </BaseSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseSheet from './BaseSheet.vue';
import NimiqIdenticon from './NimiqIdenticon.vue';
import { useSession } from '../stores/session';
import { usePrefs } from '../stores/prefs';
import { useI18n } from '../stores/i18n';
import type { Theme, Locale } from '../utils/prefsStorage';

defineEmits<{ close: []; disconnect: [] }>();

const session = useSession();

const { theme, setTheme, displayName, setDisplayName } = usePrefs();
const { locale, setLocale, t } = useI18n();

const currentName = () => displayName.value || session.user.value?.name || '';
const nameDraft = ref(currentName());
const nameChanged = computed(() => {
  const clean = nameDraft.value.trim();
  return clean.length > 0 && clean !== currentName();
});

function saveName() {
  const clean = nameDraft.value.trim();
  if (!clean) return;
  setDisplayName(clean);
  session.setName(clean);
  nameDraft.value = clean;
}

const themes: { key: Theme; label: string }[] = [
  { key: 'light', label: 'settings.themeLight' },
  { key: 'dark', label: 'settings.themeDark' },
  { key: 'auto', label: 'settings.themeAuto' },
];
const locales: { key: Locale; label: string }[] = [
  { key: 'fr', label: 'Français' },
  { key: 'en', label: 'English' },
];
</script>

<style scoped>
.settings-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 16px;
}
.wallet-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--border-subtle);
  border-radius: 16px;
  margin-bottom: 18px;
}
.identicon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
.wallet-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--dark);
}
.wallet-addr {
  font-size: 10px;
  font-family: monospace;
  color: var(--text);
  margin-top: 1px;
}
.wallet-conn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--green);
  font-weight: 600;
  margin-top: 4px;
}
.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--green);
}
.field-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin: 0 0 8px;
}
.name-row {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.name-input {
  flex: 1;
  border: 1.5px solid var(--border-subtle);
  background: var(--bg-card);
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--dark);
  box-sizing: border-box;
}
.name-input:focus {
  outline: none;
  border-color: var(--accent);
}
.save-btn {
  border: none;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  color: #fff;
  background: var(--accent);
  cursor: pointer;
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.segmented {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
}
.seg {
  flex: 1;
  border: 1.5px solid var(--border-subtle);
  background: var(--bg-card);
  border-radius: 12px;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-mid);
  font-family: inherit;
  cursor: pointer;
}
.seg.active {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--dark);
}
.disconnect-btn {
  width: 100%;
  margin-top: 6px;
  background-color: #FFF0F0;
  border: none;
  padding: 16px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  color: var(--red);
  cursor: pointer;
  font-family: inherit;
}
</style>
