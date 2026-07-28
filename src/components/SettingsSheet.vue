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
          <div v-if="nimFiatLabel" class="balance-fiat">{{ nimFiatLabel }}</div>
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
        <button class="community-tile" aria-label="X" @click="openCommunity('https://x.com/nimiq')">
          <svg
            class="community-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
            />
          </svg>
          <span class="community-name">X</span>
        </button>
        <button
          class="community-tile"
          aria-label="Telegram"
          @click="openCommunity('https://t.me/nimiq')"
        >
          <svg
            class="community-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212-.07-.062-.174-.041-.249-.024-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
            />
          </svg>
          <span class="community-name">Telegram</span>
        </button>
        <button
          class="community-tile"
          aria-label="YouTube"
          @click="openCommunity('https://www.youtube.com/@payshareapp')"
        >
          <svg
            class="community-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.376.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.376-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
            />
          </svg>
          <span class="community-name">YouTube</span>
        </button>
        <button
          class="community-tile"
          aria-label="GitHub"
          @click="openCommunity('https://github.com/nimiq')"
        >
          <svg
            class="community-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
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

    <!-- Currency -->
    <div class="card">
      <div class="card-label">{{ t('settings.currency') }}</div>
      <div class="segmented">
        <button
          v-for="opt in currencies"
          :key="opt.key"
          class="seg"
          :class="{ active: currency === opt.key }"
          @click="setCurrency(opt.key)"
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

    <!-- Tour + About + Version -->
    <div class="card card-list">
      <button class="list-row" @click="$emit('replay-tour')">
        <div class="list-left">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 8C2 4.7 4.7 2 8 2C10.4 2 12.5 3.4 13.4 5.5M14 8C14 11.3 11.3 14 8 14C5.6 14 3.5 12.6 2.6 10.5"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
            />
            <path
              d="M13.4 2.5V5.5H10.4M2.6 13.5V10.5H5.6"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>{{ t('tour.replay') }}</span>
        </div>
        <ChevronRightIcon width="13" height="13" aria-hidden="true" />
      </button>
      <button class="list-row" @click="goToAbout">
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
import { fiatApprox, fetchRates } from '../utils/rate';
import type { Theme, Locale, Currency } from '../utils/prefsStorage';

defineEmits<{ close: []; disconnect: []; 'replay-tour': [] }>();

const session = useSession();
const toast = useToast();

const { theme, setTheme, displayName, setDisplayName, currency, setCurrency } = usePrefs();
const { locale, setLocale, t } = useI18n();

// Displayed in the "About" card. Bump manually with releases.
const appVersion = 'v1.0.0';

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

// ── NIM balance (public JSON-RPC) + ≈ fiat (CoinGecko rate) ────────────────
const nimBalance = ref<number | null>(null);
const nimLabel = computed(() =>
  nimBalance.value !== null
    ? nimBalance.value.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '—',
);
const nimFiatLabel = computed(() =>
  nimBalance.value !== null ? fiatApprox(nimBalance.value) : '',
);

// Chaque valeur s'affiche dès qu'elle arrive : un appel lent ou muet (pont natif
// après une mise en veille) ne doit pas retenir l'affichage des autres.
onMounted(() => {
  const addresses = session.user.value?.addresses ?? [];
  void getConsensusEstablished().then((established) => {
    consensus.value = established;
  });
  void getBlockNumber().then((height) => {
    blockNumber.value = height;
  });
  void fetchNimBalanceTotal(addresses).then((balance) => {
    nimBalance.value = balance;
  });
  void fetchRates();
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
const currencies: { key: Currency; label: string }[] = [
  { key: 'usd', label: 'USD' },
  { key: 'eur', label: 'EUR' },
  { key: 'crc', label: 'CRC' },
  { key: 'gmd', label: 'GMD' },
];

function openCommunity(url: string) {
  if (url) {
    window.open(url, '_blank', 'noopener');
  } else {
    comingSoon();
  }
}

function goToAbout() {
  window.open('https://payshareapp.com/welcome', '_blank', 'noopener');
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
.balance-fiat {
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
.list-row + .list-row {
  border-top: 1px solid var(--border);
}
.list-row.static {
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
