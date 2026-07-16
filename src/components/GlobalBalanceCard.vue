<template>
  <div class="balance-card">
    <div class="balance-top">
      <div class="balance-title">{{ t('home.globalBalance') }}</div>
      <button class="toggle-btn" @click="showEur = !showEur">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M1 3.5H9M1 6.5H9M3 1L1 3.5L3 6M7 9L9 6.5L7 4"
            stroke="rgba(0,0,0,0.5)"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ showEur ? 'NIM' : 'EUR' }}</span>
      </button>
    </div>
    <div class="balance-main">
      <div class="balance-net">
        <div class="balance-net-label">{{ t('home.net') }}</div>
        <div class="balance-net-amount">{{ netStr }}</div>
      </div>
      <div class="balance-detail">
        <div class="balance-detail-col">
          <div class="balance-detail-label">{{ t('home.credited') }}</div>
          <div class="balance-detail-amount">{{ creditedStr }}</div>
        </div>
        <div class="balance-detail-col">
          <div class="balance-detail-label">{{ t('home.owed') }}</div>
          <div class="balance-detail-amount">{{ owedStr }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchRate, eurApprox } from '../utils/rate';
import { useI18n } from '../stores/i18n';

// "Global balance" card: what others owe you vs what you owe, aggregated.
const props = defineProps<{ credited: number; owed: number }>();

const { t } = useI18n();

const showEur = ref(false);
onMounted(() => {
  fetchRate();
});

function eur(nim: number): string {
  return eurApprox(nim) || '—';
}

const creditedStr = computed(() =>
  showEur.value ? eur(props.credited) : '+' + props.credited.toFixed(1) + ' NIM',
);
const owedStr = computed(() =>
  showEur.value ? eur(props.owed) : '−' + props.owed.toFixed(1) + ' NIM',
);

// Net balance = what you're owed minus what you owe.
const net = computed(() => props.credited - props.owed);
const netStr = computed(() => {
  if (showEur.value) return eur(net.value);
  const sign = net.value < 0 ? '−' : '+';
  return sign + Math.abs(net.value).toFixed(1) + ' NIM';
});
</script>

<style scoped>
.balance-card {
  background: var(--accent);
  border-radius: 20px;
  padding: 18px 20px;
  flex-shrink: 0;
}

.balance-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.balance-title {
  font-size: 10px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.toggle-btn {
  background: rgba(0, 0, 0, 0.12);
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 10px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
}

.toggle-btn:hover {
  background: rgba(0, 0, 0, 0.18);
}

.balance-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.balance-net {
  flex-shrink: 0;
}

.balance-net-label {
  font-size: 9px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 3px;
}

.balance-net-amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.8px;
  line-height: 1;
  white-space: nowrap;
}

.balance-detail {
  display: flex;
  gap: 14px;
  padding-left: 12px;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.balance-detail-col {
  text-align: right;
}

.balance-detail-label {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.4);
  margin-bottom: 2px;
  white-space: nowrap;
}

.balance-detail-amount {
  font-size: 13px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}
</style>
