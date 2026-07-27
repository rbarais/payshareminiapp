<template>
  <div class="screen">
    <!-- Content -->
    <div class="center">
      <!-- Animated icon -->
      <div class="circle-wrap">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="50" fill="var(--green)" />
          <path
            d="M29 51L43 65L71 35"
            stroke="white"
            stroke-width="9"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="61"
            class="check-path"
          />
        </svg>
      </div>

      <div class="title">{{ t('success.title') }}</div>
      <div class="subtitle">
        {{ t('success.subtitle', { amount: amount.toFixed(2), recipient }) }}
      </div>

      <!-- TX card -->
      <div class="tx-card">
        <div class="tx-row">
          <span class="tx-label">{{ t('success.txLabel') }}</span>
          <span class="tx-confirmed">{{ t('success.txConfirmed') }}</span>
        </div>
        <div class="tx-hash">{{ t('success.txHash') }}</div>
        <div class="tx-row" style="margin-top: 6px">
          <span class="tx-label">{{ t('success.txVia') }}</span>
          <span class="tx-label">{{ t('success.txTime') }}</span>
        </div>
      </div>
    </div>

    <!-- Back button -->
    <div class="back-area">
      <button class="btn-back" @click="goBack">
        <ArrowLeftIcon width="17" height="17" />
        <span>{{ backLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '../stores/i18n';
import ArrowLeftIcon from '../assets/svg/arrowLeft.svg';

const props = defineProps<{ amount: number; recipient: string; groupId?: string }>();

const router = useRouter();
const { t } = useI18n();

const backLabel = computed(() =>
  props.groupId ? t('success.backBtnGroup') : t('success.backBtn'),
);

function goBack() {
  if (props.groupId) {
    router.replace({ name: 'group', params: { id: props.groupId } });
    return;
  }
  router.replace({ name: 'home' });
}
</script>

<style scoped>
.center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 28px;
  gap: 0;
}

.circle-wrap {
  animation: psSuccessCircle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes psSuccessCircle {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  65% {
    transform: scale(1.12);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.check-path {
  animation: psCheckDraw 0.45s ease 0.3s both;
}

@keyframes psCheckDraw {
  from {
    stroke-dashoffset: 61;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.title {
  margin-top: 28px;
  font-size: 26px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.7px;
  text-align: center;
  animation: psFadeIn 0.5s ease 0.4s both;
}

.subtitle {
  margin-top: 8px;
  font-size: 16px;
  color: var(--text);
  text-align: center;
  animation: psFadeIn 0.5s ease 0.55s both;
}

@keyframes psFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.tx-card {
  margin-top: 24px;
  background: var(--border-subtle);
  border-radius: 14px;
  padding: 14px 18px;
  width: 100%;
  box-sizing: border-box;
  animation: psFadeIn 0.5s ease 0.7s both;
}

.tx-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.tx-label {
  font-size: 11px;
  color: var(--text);
}

.tx-confirmed {
  font-size: 11px;
  color: var(--green);
  font-weight: 600;
}

.tx-hash {
  font-size: 11px;
  color: var(--text-mid);
  font-family: monospace;
  word-break: break-all;
}

/* Back button */
.back-area {
  padding: 0 18px 36px;
  animation: psFadeIn 0.4s ease 0.9s both;
}

.btn-back {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  background: var(--ink);
  border: none;
  border-radius: 16px;
  padding: 17px;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}

.btn-back:hover {
  opacity: 0.85;
}
</style>
