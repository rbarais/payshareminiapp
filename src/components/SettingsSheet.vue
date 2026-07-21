<template>
  <BaseSheet @close="$emit('close')">
    <!-- Wallet card -->
    <div class="card wallet-card">
      <div class="wallet-head">
        <div class="identicon">
          <NimiqIdenticon :address="session.user.value?.id ?? ''" :size="46" />
        </div>
        <div class="wallet-meta">
          <div class="wallet-label">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="7" fill="#F6B221" />
              <polygon points="4.5,10.5 7,3.5 9.5,10.5" fill="#1A1916" />
            </svg>
            <span>{{ t('settings.walletLabel') }}</span>
          </div>
          <div class="wallet-addr">{{ session.walletShort.value }}</div>
        </div>
      </div>

      <div class="card-label balances-label">{{ t('settings.balances') }}</div>
      <div class="balances">
        <div class="balance-tile">
          <div class="balance-head">
            <svg width="12" height="12" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <polygon points="19,11 15,4.1 7,4.1 3,11 7,17.9 15,17.9" fill="#F6B221" />
            </svg>
            <span>NIM</span>
          </div>
          <div class="balance-amount">{{ nimLabel }}</div>
          <div v-if="nimEurLabel" class="balance-eur">{{ nimEurLabel }}</div>
        </div>
      </div>

      <div class="wallet-net">
        <div class="net-row">
          <div class="net-left">
            <span class="net-dot" :class="{ ok: consensus === true }" />
            <span>{{ t('settings.consensus') }}</span>
          </div>
          <span class="net-value" :class="{ ok: consensus === true }">
            {{
              consensus === true
                ? t('settings.consensusEstablished')
                : t('settings.consensusConnecting')
            }}
          </span>
        </div>
        <div class="net-row">
          <div class="net-left">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect
                x="1"
                y="3"
                width="10"
                height="8"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.1"
              />
              <path
                d="M4 3V2.5C4 1.67 4.67 1 5.5 1H6.5C7.33 1 8 1.67 8 2.5V3"
                stroke="currentColor"
                stroke-width="1.1"
              />
            </svg>
            <span>{{ t('settings.block') }}</span>
          </div>
          <span class="net-value mono">{{ blockLabel }}</span>
        </div>
      </div>
    </div>

    <!-- Name -->
    <div class="card">
      <div class="card-label">{{ t('settings.yourName') }}</div>
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
    </div>

    <!-- Community -->
    <div class="card">
      <div class="card-label">{{ t('settings.community') }}</div>
      <div class="community">
        <button class="community-tile" aria-label="X" @click="openCommunity('x')">
          <svg class="community-icon" width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path
              d="M2 2L8.5 9.5M16 2L9.5 9.5M8.5 9.5L5 16M8.5 9.5L13 16"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span class="community-name">X</span>
        </button>
        <button class="community-tile" aria-label="Telegram" @click="openCommunity('telegram')">
          <svg class="community-icon" width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path
              d="M2 9L16 3L12 15L8.5 10.5L13 6M8.5 10.5L6.5 15.5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="community-name">Telegram</span>
        </button>
        <button class="community-tile" aria-label="Discord" @click="openCommunity('discord')">
          <svg class="community-icon" width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path
              d="M6.5 3C6.5 3 5 4.5 4.5 6.5C3 7 2 8 2 9.5C2 12 4 14 6 14.5L6.5 13.5C5 13 4.5 12 4.5 12C5.5 12.5 7 13 9 13C11 13 12.5 12.5 13.5 12C13.5 12 13 13 11.5 13.5L12 14.5C14 14 16 12 16 9.5C16 8 15 7 13.5 6.5C13 4.5 11.5 3 11.5 3C11 4 10.5 5 10 5.5H8C7.5 5 7 4 6.5 3Z"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
            <circle cx="7" cy="9.5" r="1.2" fill="currentColor" />
            <circle cx="11" cy="9.5" r="1.2" fill="currentColor" />
          </svg>
          <span class="community-name">Discord</span>
        </button>
        <button class="community-tile" aria-label="GitHub" @click="openCommunity('github')">
          <svg class="community-icon" width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 2C5.13 2 2 5.13 2 9C2 12.09 4 14.68 6.74 15.6C7.09 15.67 7.21 15.45 7.21 15.27V13.85C5.27 14.27 4.87 13 4.87 13C4.55 12.19 4.09 11.97 4.09 11.97C3.44 11.54 4.14 11.55 4.14 11.55C4.85 11.6 5.22 12.27 5.22 12.27C5.86 13.39 6.91 13.06 7.24 12.87C7.31 12.41 7.5 12.09 7.7 11.9C6.17 11.71 4.55 11.13 4.55 8.38C4.55 7.59 4.83 6.94 5.24 6.43C5.17 6.23 4.92 5.5 5.31 4.52C5.31 4.52 5.91 4.31 7.21 5.23C7.74 5.07 8.32 4.99 8.9 4.98C9.48 4.99 10.06 5.07 10.59 5.23C11.89 4.31 12.49 4.52 12.49 4.52C12.88 5.5 12.63 6.23 12.56 6.43C12.97 6.94 13.25 7.59 13.25 8.38C13.25 11.14 11.63 11.71 10.09 11.89C10.34 12.12 10.57 12.56 10.57 13.24V15.27C10.57 15.46 10.69 15.68 11.05 15.6C13.78 14.68 15.78 12.09 15.78 9C15.78 5.13 12.65 2 8.78 2H9Z"
              fill="currentColor"
            />
          </svg>
          <span class="community-name">GitHub</span>
        </button>
      </div>
    </div>

    <!-- Language -->
    <div class="card">
      <div class="card-label">{{ t('settings.language') }}</div>
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
    </div>

    <!-- Theme -->
    <div class="card">
      <div class="card-label">{{ t('settings.theme') }}</div>
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
    </div>

    <!-- About + Version -->
    <div class="card card-list">
      <button class="list-row" @click="comingSoon">
        <div class="list-left">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2" />
            <path
              d="M8 7V11M8 5V5.5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ t('settings.about') }}</span>
        </div>
        <ChevronRightIcon width="13" height="13" aria-hidden="true" />
      </button>
      <div class="list-row static">
        <span class="version-label">{{ t('settings.version') }}</span>
        <span class="version-value mono">{{ appVersion }}</span>
      </div>
    </div>

    <button class="disconnect-btn" @click="$emit('disconnect')">
      {{ t('settings.disconnect') }}
    </button>
  </BaseSheet>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import BaseSheet from './BaseSheet.vue';
import NimiqIdenticon from './NimiqIdenticon.vue';
import ChevronRightIcon from '../assets/svg/chevronRight.svg';
import { useSession } from '../stores/session';
import { usePrefs } from '../stores/prefs';
import { useToast } from '../stores/toast';
import { useI18n } from '../stores/i18n';
import { getConsensusEstablished, getBlockNumber } from '../utils/nimiq';
import { fetchNimBalanceTotal } from '../utils/webclient';
import { eurRate, fetchRate } from '../utils/rate';
import type { Theme, Locale } from '../utils/prefsStorage';

defineEmits<{ close: []; disconnect: [] }>();

const session = useSession();
const toast = useToast();

const { theme, setTheme, displayName, setDisplayName } = usePrefs();
const { locale, setLocale, t } = useI18n();

// Displayed in the "About" card. Bump manually with releases.
const appVersion = 'v0.1.0-proto';

// ── Name editing ──────────────────────────────────────────────────────────
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
  toast.show(t('settings.nameSaved'), 'success');
}

// ── Network status (consensus + block height) ─────────────────────────────
// null = unknown/connecting (outside Nimiq Pay or before the first reply).
const consensus = ref<boolean | null>(null);
const blockNumber = ref<number | null>(null);
const blockLabel = computed(() =>
  blockNumber.value !== null ? '#' + blockNumber.value.toLocaleString('fr-FR') : '—',
);

// ── NIM balance (public JSON-RPC) + ≈ EUR (CoinGecko rate) ─────────────────
const nimBalance = ref<number | null>(null);
const nimLabel = computed(() =>
  nimBalance.value !== null
    ? nimBalance.value.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '—',
);
const nimEurLabel = computed(() => {
  if (nimBalance.value === null || eurRate.value === null) return '';
  const eur = nimBalance.value * eurRate.value;
  return `≈ ${eur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
});

onMounted(async () => {
  const addresses = session.user.value?.addresses ?? [];
  const [established, height, balance] = await Promise.all([
    getConsensusEstablished(),
    getBlockNumber(),
    fetchNimBalanceTotal(addresses),
    fetchRate(),
  ]);
  consensus.value = established;
  blockNumber.value = height;
  nimBalance.value = balance;
});

// ── Options ────────────────────────────────────────────────────────────────
const themes: { key: Theme; label: string }[] = [
  { key: 'auto', label: 'settings.themeAuto' },
  { key: 'light', label: 'settings.themeLight' },
  { key: 'dark', label: 'settings.themeDark' },
];
const locales: { key: Locale; label: string }[] = [
  { key: 'fr', label: '🇫🇷 FR' },
  { key: 'de', label: '🇩🇪 DE' },
  { key: 'en', label: '🇬🇧 EN' },
  { key: 'es', label: '🇪🇸 ES' },
];

// ── Community links (URLs to be filled in later) ───────────────────────────
const communityUrls: Record<string, string> = {
  x: '',
  telegram: '',
  discord: '',
  github: '',
};

function openCommunity(key: string) {
  const url = communityUrls[key];
  if (url) {
    window.open(url, '_blank', 'noopener');
  } else {
    comingSoon();
  }
}

function comingSoon() {
  toast.show(t('common.soon'));
}
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 10px;
}
.card-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin: 0 0 10px;
}

/* Wallet card */
.wallet-card {
  padding: 18px 16px;
}
.wallet-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.identicon {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(246, 178, 33, 0.3);
}
.wallet-meta {
  flex: 1;
  min-width: 0;
}
.wallet-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}
.wallet-addr {
  font-size: 11px;
  font-family: monospace;
  color: var(--text-mid);
  word-break: break-all;
  line-height: 1.4;
}
.balances-label {
  margin: 16px 0 8px;
}
.balances {
  display: flex;
  gap: 8px;
}
.balance-tile {
  flex: 1;
  background: var(--bg);
  border-radius: 14px;
  padding: 11px 13px;
}
.balance-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.04em;
}
.balance-amount {
  font-size: 15px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.3px;
}
.balance-eur {
  font-size: 10px;
  color: var(--text);
  margin-top: 2px;
}
.wallet-net {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--border);
  margin-top: 14px;
  padding-top: 12px;
}
.net-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.net-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-mid);
}
.net-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text);
}
.net-dot.ok {
  background: var(--green);
}
.net-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-mid);
}
.net-value.ok {
  color: var(--green);
}
.mono {
  font-family: monospace;
}

/* Name */
.name-row {
  display: flex;
  gap: 8px;
}
.name-input {
  flex: 1;
  border: 1.5px solid var(--border-subtle);
  background: var(--bg);
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
  color: var(--ink);
  background: var(--accent);
  cursor: pointer;
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Community */
.community {
  display: flex;
  gap: 8px;
}
.community-tile {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 11px 0;
  background: var(--bg);
  border: none;
  border-radius: 14px;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
}
.community-icon {
  display: flex;
  line-height: 0;
}
.community-name {
  font-size: 9px;
  font-weight: 600;
  color: var(--dark);
}

/* Segmented (language + theme) */
.segmented {
  display: flex;
  gap: 6px;
}
.seg {
  flex: 1;
  border: 1.5px solid var(--border-subtle);
  background: var(--bg);
  border-radius: 12px;
  padding: 10px 4px;
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

/* About + Version list */
.card-list {
  padding: 0;
  overflow: hidden;
}
.list-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  background: none;
  border: none;
  font-family: inherit;
  cursor: pointer;
  color: var(--text);
}
.list-row.static {
  border-top: 1px solid var(--border);
  cursor: default;
}
.list-left {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dark);
}
.version-label {
  font-size: 11px;
  color: var(--text);
}
.version-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-mid);
}

/* Disconnect */
.disconnect-btn {
  width: 100%;
  margin-top: 6px;
  background-color: var(--red-bg);
  border: 1px solid var(--red-border);
  padding: 16px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--red);
  cursor: pointer;
  font-family: inherit;
}
</style>
