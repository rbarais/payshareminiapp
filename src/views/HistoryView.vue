<template>
  <div class="screen">
    <div class="header">
      <div class="title">{{ t('history.title') }}</div>
      <div class="filters">
        <button
          v-for="option in filters"
          :key="option"
          class="pill"
          :class="{ active: filter === option }"
          @click="filter = option"
        >
          {{ filterLabel(option) }}
        </button>
      </div>
    </div>

    <div class="content">
      <template v-if="skeleton.active.value">
        <div class="day-group">
          <div v-for="n in 4" :key="n" class="history-row-skeleton">
            <SkeletonBlock width="38px" height="38px" radius="12px" />
            <div class="history-row-skeleton-info">
              <SkeletonBlock width="55%" height="13px" />
              <SkeletonBlock width="35%" height="11px" />
            </div>
            <div class="history-row-skeleton-amount">
              <SkeletonBlock width="46px" height="13px" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="sections.length">
        <div v-for="section in sections" :key="section.key" class="day-group">
          <div class="day-label">{{ section.label }}</div>
          <div v-for="event in section.events" :key="event.kind + event.id" class="row">
            <div class="icon" :class="event.kind">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  v-if="event.kind === 'sent'"
                  d="M9 3V15M9 3L5 7M9 3L13 7"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  v-else-if="event.kind === 'received'"
                  d="M9 15V3M9 15L5 11M9 15L13 11"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  v-else
                  d="M9 3V15M3 9H15"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </div>

            <div class="body">
              <div class="row-title">{{ eventTitle(event) }}</div>
              <div class="row-sub">{{ subtitle(event) }}</div>
              <div v-if="event.txHash" class="row-hash">{{ shortHash(event.txHash) }}</div>
            </div>

            <div class="amounts">
              <div class="amount" :class="event.kind">{{ amountText(event) }}</div>
              <div v-if="fiatText(event)" class="fiat">{{ fiatText(event) }}</div>
              <div class="time">{{ formatTime(event.date) }}</div>
            </div>
          </div>
        </div>
      </template>

      <EmptyState v-else :title="emptyMessage">
        <svg width="30" height="30" viewBox="0 0 22 22" fill="none">
          <rect
            x="3"
            y="5"
            width="16"
            height="14"
            rx="2"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M7 10H15M7 13H12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path d="M7 3V7M15 3V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useI18n } from '../stores/i18n';
import { useToast } from '../stores/toast';
import { fetchRates, fiatApprox } from '../utils/rate';
import { captureError } from '../utils/errors';
import type { ActivityEvent } from '../utils/history';
import EmptyState from '../components/EmptyState.vue';
import SkeletonBlock from '../components/SkeletonBlock.vue';
import { useForegroundRefresh } from '../composables/useForegroundRefresh';
import { useDelayedLoading } from '../composables/useDelayedLoading';

type Filter = 'all' | 'sent' | 'received' | 'other';

const session = useSession();
const store = useGroupsStore();
const { t, locale } = useI18n();
const toast = useToast();

const filters: Filter[] = ['all', 'sent', 'received', 'other'];
const filter = ref<Filter>('all');
const skeleton = useDelayedLoading();

// `sections` is declared further down (it's a computed derived from the
// store), but sync() is only ever invoked from onMounted/useForegroundRefresh
// — both run after this whole setup() body has finished — so referencing it
// here is safe.
async function sync(): Promise<void> {
  skeleton.start(sections.value.length ? 350 : 0);
  try {
    await store.refreshAll();
  } catch (err) {
    captureError(err, 'HistoryView.refreshAll');
    toast.show(t('error.syncFailed'), 'error');
  } finally {
    skeleton.stop();
  }
}

onMounted(async () => {
  void fetchRates();
  await sync();
});
useForegroundRefresh(sync);

const userId = computed(() => session.user.value?.id ?? '');
const feed = computed(() => store.activityFeed(userId.value));

const filtered = computed(() => {
  if (filter.value === 'sent') return feed.value.filter((event) => event.kind === 'sent');
  if (filter.value === 'received') return feed.value.filter((event) => event.kind === 'received');
  if (filter.value === 'other') {
    return feed.value.filter((event) => event.kind !== 'sent' && event.kind !== 'received');
  }
  return feed.value;
});

// Group the flat, already-sorted feed into per-day sections.
const sections = computed(() => {
  const order: string[] = [];
  const buckets = new Map<string, ActivityEvent[]>();
  for (const event of filtered.value) {
    const key = event.date.toDateString();
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(event);
  }
  return order.map((key) => {
    const events = buckets.get(key)!;
    return { key, label: daySectionLabel(events[0].date), events };
  });
});

const emptyMessage = computed(() => {
  if (filter.value === 'sent') return t('history.emptySent');
  if (filter.value === 'received') return t('history.emptyReceived');
  if (filter.value === 'other') return t('history.emptyOther');
  return t('history.empty');
});

function filterLabel(option: Filter): string {
  if (option === 'sent') return t('history.filterSent');
  if (option === 'received') return t('history.filterReceived');
  if (option === 'other') return t('history.filterOther');
  return t('history.filterAll');
}

function eventTitle(event: ActivityEvent): string {
  if (event.kind === 'sent') return t('history.paidTo', { name: event.counterpartyName });
  if (event.kind === 'received') return t('history.receivedFrom', { name: event.counterpartyName });
  return t('history.expenseAdded');
}

function subtitle(event: ActivityEvent): string {
  if (event.kind === 'expense') {
    return event.description ? `${event.groupName} · ${event.description}` : event.groupName;
  }
  const settled = event.settledExpenses ?? [];
  if (settled.length === 1) return `${event.groupName} · ${settled[0]}`;
  if (settled.length > 1) {
    return `${event.groupName} · ${t('history.nExpenses', { n: settled.length })}`;
  }
  return `${event.groupName} · ${t('history.viaNimiqPay')}`;
}

function amountText(event: ActivityEvent): string {
  const sign = event.kind === 'sent' ? '−' : event.kind === 'received' ? '+' : '';
  return `${sign}${event.amount.toFixed(2)} ${event.currency}`;
}

function fiatText(event: ActivityEvent): string {
  if (event.currency !== 'NIM') return '';
  return fiatApprox(event.amount);
}

function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 4)}…${hash.slice(-4)}` : hash;
}

function formatTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return t('history.justNow');
  if (diffMin < 60) return t('history.minutesAgo', { n: diffMin });
  return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(date);
}

function daySectionLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return t('history.today');
  if (date.toDateString() === yesterday.toDateString()) return t('history.yesterday');
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === today.getFullYear()
      ? { day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(locale.value, options).format(date);
}
</script>

<style scoped>
.header {
  padding: 14px var(--gutter) 10px;
  flex-shrink: 0;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.5px;
  margin-bottom: 12px;
}

.filters {
  display: flex;
  gap: 8px;
}

.content {
  flex: 1;
  padding: 4px var(--gutter) calc(16px + var(--nav-h));
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.day-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 12px 0 2px;
}

@media (min-width: 600px) {
  .day-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    align-content: start;
  }

  .day-label {
    grid-column: 1 / -1;
  }
}

.history-row-skeleton {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 13px 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-sm);
}

.history-row-skeleton-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-row-skeleton-amount {
  flex-shrink: 0;
}

.row {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 13px 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-sm);
}

.icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon.sent {
  background: var(--red-bg);
  color: var(--red);
}

.icon.received {
  background: var(--green-bg);
  color: var(--green);
}

.icon.expense {
  background: var(--accent-dim);
  color: var(--accent);
}

.body {
  flex: 1;
  min-width: 0;
}

.row-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
  margin-bottom: 2px;
}

.row-sub {
  font-size: 11px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-hash {
  font-size: 10px;
  color: var(--text);
  opacity: 0.7;
  margin-top: 3px;
  font-family: monospace;
}

.amounts {
  text-align: right;
  flex-shrink: 0;
}

.amount {
  font-size: 13px;
  font-weight: 700;
  color: var(--dark);
}

.amount.sent {
  color: var(--red);
}

.amount.received {
  color: var(--green);
}

.amount.expense {
  font-weight: 600;
}

.fiat {
  font-size: 10px;
  color: var(--text);
  margin-top: 2px;
}

.time {
  font-size: 10px;
  color: var(--text);
  opacity: 0.7;
  margin-top: 1px;
}
</style>
