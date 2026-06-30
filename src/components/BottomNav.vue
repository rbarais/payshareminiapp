<template>
  <nav class="bottom-nav">
    <div class="nav-item" :class="{ active: active === 'home' }" @click="go('home')">
      <svg :width="sizeIconBtn" :height="sizeIconBtn" viewBox="0 0 22 22" fill="none">
        <path
          d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z"
          :fill="active === 'home' ? '#F6B221' : 'none'"
          :stroke="iconColor('home')"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
      <span>{{ t('nav.home') }}</span>
    </div>
    <div class="nav-item" :class="{ active: active === 'groups' }" @click="go('groups')">
      <svg :width="sizeIconBtn" :height="sizeIconBtn" viewBox="0 0 22 22" fill="none">
        <circle cx="8" cy="8.5" r="3" :stroke="iconColor('groups')" stroke-width="1.5" />
        <circle cx="15" cy="8.5" r="3" :stroke="iconColor('groups')" stroke-width="1.5" />
        <path
          d="M2 19C2 16.24 4.69 14 8 14C11.31 14 14 16.24 14 19"
          :stroke="iconColor('groups')"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M15 14C18.31 14 21 16.24 21 19"
          :stroke="iconColor('groups')"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <span>{{ t('nav.groups') }}</span>
    </div>
    <div class="nav-item" :class="{ active: active === 'history' }" @click="go('history')">
      <svg :width="sizeIconBtn" :height="sizeIconBtn" viewBox="0 0 22 22" fill="none">
        <rect
          x="3"
          y="5"
          width="16"
          height="14"
          rx="2"
          :stroke="iconColor('history')"
          stroke-width="1.5"
        />
        <path
          d="M7 10H15M7 13H12"
          :stroke="iconColor('history')"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M7 3V7M15 3V7"
          :stroke="iconColor('history')"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <span>{{ t('nav.history') }}</span>
    </div>
    <div class="nav-item" :class="{ active: active === 'scan' }" @click="go('scan')">
      <svg :width="sizeIconBtn" :height="sizeIconBtn" viewBox="0 0 22 22" fill="none">
        <rect
          x="2"
          y="2"
          width="6"
          height="6"
          rx="1"
          :stroke="iconColor('scan')"
          stroke-width="1.5"
        />
        <rect
          x="2"
          y="14"
          width="6"
          height="6"
          rx="1"
          :stroke="iconColor('scan')"
          stroke-width="1.5"
        />
        <rect
          x="14"
          y="2"
          width="6"
          height="6"
          rx="1"
          :stroke="iconColor('scan')"
          stroke-width="1.5"
        />
        <path
          d="M14 14H16M20 14V16M14 18H16M20 18V16M20 16H14"
          :stroke="iconColor('scan')"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <span>{{ t('nav.scan') }}</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useToast } from '../stores/toast';
import { useI18n } from '../stores/i18n';

const props = defineProps<{ active: 'home' | 'groups' | 'history' | 'scan' }>();

const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const sizeIconBtn = 24;

// Icon color depending on the active tab.
function iconColor(key: string): string {
  return props.active === key ? '#F6B221' : 'currentColor';
}

function go(key: 'home' | 'groups' | 'history' | 'scan') {
  if (key === 'home') router.push({ name: 'home' });
  else if (key === 'groups') router.push({ name: 'groups' });
  else if (key === 'scan') router.push({ name: 'scan' });
  else toast.show(t('toast.historyComingSoon'), 'info'); // Phase 5
}
</script>

<style scoped>
.bottom-nav {
  border-top: 1px solid var(--border);
  background: var(--bg-card);
  padding: 10px 4px 26px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 52px;
  cursor: pointer;
  color: var(--text);
}

.nav-item span {
  font-size: 10px;
  color: var(--text);
  font-weight: 500;
}

.nav-item.active span {
  color: var(--accent);
  font-weight: 700;
}
</style>
