<template>
  <div v-if="group" class="screen">
    <!-- Top bar -->
    <ScreenHeader :title="t('addExpense.title')" close @back="goBack">
      <button class="icon-btn accent" @click="create"><CheckIcon /></button>
    </ScreenHeader>

    <!-- Amount -->
    <div class="amount-section">
      <div class="amount-display">{{ amount ? amount.toFixed(2) : '0.00' }}</div>
      <div class="currency-row">
        <button
          v-for="currencyCode in CURRENCIES"
          :key="currencyCode"
          class="currency-pill"
          :class="{ active: currency === currencyCode }"
          @click="currency = currencyCode"
        >
          {{ currencyCode }}
        </button>
      </div>
    </div>

    <!-- Form -->
    <div class="form-area">
      <!-- Description -->
      <div class="field-card">
        <div class="form-label">{{ t('addExpense.descriptionLabel') }}</div>
        <input
          v-model="description"
          class="field-input"
          type="text"
          :placeholder="t('addExpense.descriptionPlaceholder')"
        />
      </div>

      <!-- Amount input -->
      <div class="field-card">
        <div class="form-label">{{ t('addExpense.amountLabel') }}</div>
        <input
          v-model.number="amount"
          class="field-input"
          type="number"
          placeholder="0"
          min="0.01"
          step="0.01"
          @input="mode !== 'equal' && distributeEvenly()"
        />
      </div>

      <!-- Paid by -->
      <div class="field-card payer-card">
        <div class="payer-head" @click="showPayerMenu = !showPayerMenu">
          <div>
            <div class="form-label">{{ t('addExpense.paidByLabel') }}</div>
            <div class="payer-name">{{ memberName(paidBy) }}</div>
          </div>
          <ChevronDownIcon class="payer-chevron" />
        </div>
        <div v-if="showPayerMenu" class="payer-menu">
          <button
            v-for="member in members"
            :key="member.id"
            class="payer-option"
            :class="{ active: paidBy === member.id }"
            @click="selectPayer(member.id)"
          >
            {{ memberName(member.id) }}
          </button>
        </div>
      </div>

      <!-- Split -->
      <div class="field-card">
        <div class="form-label">{{ t('addExpense.splitBetweenLabel') }}</div>

        <!-- Mode tabs -->
        <div class="mode-tabs">
          <button class="mode-tab" :class="{ active: mode === 'equal' }" @click="setMode('equal')">
            {{ t('addExpense.modeEqual') }}
          </button>
          <button
            class="mode-tab"
            :class="{ active: mode === 'percentage' }"
            @click="setMode('percentage')"
          >
            {{ t('addExpense.modePct') }}
          </button>
          <button class="mode-tab" :class="{ active: mode === 'fixed' }" @click="setMode('fixed')">
            {{ t('addExpense.modeFixed') }}
          </button>
        </div>

        <!-- Equal -->
        <div v-if="mode === 'equal'" class="equal-row">
          <button
            v-for="(member, index) in members"
            :key="member.id"
            class="member-chip"
            :class="{ off: !split[member.id]?.included }"
            @click="split[member.id].included = !split[member.id].included"
          >
            <InitialAvatar :name="member.name" :index="index" :size="40" />
            <span class="chip-name">{{ member.name }}</span>
          </button>
        </div>
        <div v-if="mode === 'equal' && amount" class="share-info">
          {{ t('addExpense.shareInfoPrefix') }}
          <strong>{{ equalShare.toFixed(2) }} {{ currency }}</strong>
        </div>

        <!-- % / Amounts -->
        <div v-else-if="mode !== 'equal'" class="split-list">
          <div v-for="(member, index) in members" :key="member.id" class="split-row">
            <InitialAvatar :name="member.name" :index="index" :size="30" />
            <span class="split-name">{{ member.name }}</span>
            <div class="split-input-wrap">
              <input
                v-if="mode === 'percentage'"
                v-model.number="split[member.id].pct"
                class="split-input"
                type="number"
                min="0"
                max="100"
                step="1"
              />
              <input
                v-else
                v-model.number="split[member.id].amt"
                class="split-input"
                type="number"
                min="0"
                step="0.01"
              />
              <span class="split-unit">{{ mode === 'percentage' ? '%' : currency }}</span>
            </div>
          </div>
          <div class="total-row" :class="{ ok: !splitError }">
            <span>{{ t('addExpense.totalAssigned') }}</span>
            <span>{{
              mode === 'percentage'
                ? pctTotal.toFixed(0) + '%'
                : amtTotal.toFixed(2) + ' ' + currency
            }}</span>
          </div>
        </div>
      </div>

      <p v-if="splitError" class="error-msg">{{ splitError }}</p>
    </div>

    <!-- CTA -->
    <div class="cta-area">
      <button class="btn-primary" :disabled="!!splitError" @click="create">
        {{ t('addExpense.addExpense') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { SplitMode } from '../types';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import InitialAvatar from '../components/InitialAvatar.vue';
import ScreenHeader from '../components/ScreenHeader.vue';
import CheckIcon from '../assets/svg/check.svg';
import ChevronDownIcon from '../assets/svg/chevronDown.svg';
import { captureError } from '../utils/errors';
import { useI18n } from '../stores/i18n';
import { useModalBackWhen } from '../composables/modalBack';

const route = useRoute();
const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();
const { t } = useI18n();

const groupId = computed(() => String(route.query.groupId ?? ''));
const group = computed(() => store.getGroup(groupId.value));
const members = computed(() => group.value?.members ?? []);
const userId = computed(() => session.user.value?.id ?? '');
// Stable UUID of the current member in this group
const myMemberId = computed(() => store.myMemberId(groupId.value, userId.value));

onMounted(() => {
  if (!group.value) router.replace({ name: 'home' });
});

const CURRENCIES = ['NIM', 'ETH', 'USDT', 'EUR'];

const description = ref('');
const amount = ref<number | null>(null);
const currency = ref('NIM');
const paidBy = ref('');
const showPayerMenu = ref(false);
// The back button closes the payer dropdown instead of leaving the screen.
useModalBackWhen(showPayerMenu, () => {
  showPayerMenu.value = false;
});
const mode = ref<SplitMode>('equal');

// Per-member split state: inclusion (equal), percentage (%), amount (fixed).
const split = reactive<Record<string, { included: boolean; pct: number; amt: number }>>({});

// (Re)initialize the split state once the members are known.
watch(
  members,
  (list) => {
    for (const member of list) {
      if (!split[member.id]) split[member.id] = { included: true, pct: 0, amt: 0 };
    }
    paidBy.value = paidBy.value || myMemberId.value || list[0]?.id || '';
    distributeEvenly();
  },
  { immediate: true },
);

const memberName = (id: string) =>
  id === myMemberId.value
    ? `${members.value.find((member) => member.id === id)?.name ?? t('addExpense.youName')} (${t('addExpense.you')})`
    : (members.value.find((member) => member.id === id)?.name ?? '');

// Split percentages and amounts evenly (starting point for the % and fixed modes).
function distributeEvenly() {
  const list = members.value;
  if (!list.length) return;
  const pct = Math.round((100 / list.length) * 10) / 10;
  const amt = amount.value ? Math.round((amount.value / list.length) * 100) / 100 : 0;
  list.forEach((member) => {
    split[member.id].pct = pct;
    split[member.id].amt = amt;
  });
}

// Members included in the equal split.
const includedMembers = computed(() =>
  members.value.filter((member) => split[member.id]?.included),
);
const equalShare = computed(() =>
  amount.value && includedMembers.value.length ? amount.value / includedMembers.value.length : 0,
);

const pctTotal = computed(() =>
  members.value.reduce((sum, member) => sum + (Number(split[member.id]?.pct) || 0), 0),
);
const amtTotal = computed(() =>
  members.value.reduce((sum, member) => sum + (Number(split[member.id]?.amt) || 0), 0),
);

// Validation depending on the mode. Returns an error message or '' if OK.
const splitError = computed(() => {
  if (!amount.value || amount.value <= 0) return t('addExpense.errorNoAmount');
  if (!description.value.trim()) return t('addExpense.errorNoDescription');
  if (mode.value === 'equal') {
    return includedMembers.value.length ? '' : t('addExpense.errorNoMember');
  }
  if (mode.value === 'percentage') {
    return Math.abs(pctTotal.value - 100) < 0.5
      ? ''
      : t('addExpense.errorPctTotal', { current: pctTotal.value.toFixed(0) });
  }
  return Math.abs(amtTotal.value - amount.value) < 0.01
    ? ''
    : t('addExpense.errorAmtTotal', {
        current: amtTotal.value.toFixed(2),
        total: amount.value.toFixed(2),
        currency: currency.value,
      });
});

function setMode(newMode: SplitMode) {
  mode.value = newMode;
  if (newMode !== 'equal') distributeEvenly();
}

function selectPayer(id: string) {
  paidBy.value = id;
  showPayerMenu.value = false;
}

async function create() {
  if (splitError.value || !amount.value) {
    toast.show(splitError.value || t('addExpense.errorFormIncomplete'), 'error');
    return;
  }
  let participants: { memberId: string; weight?: number }[];
  if (mode.value === 'equal') {
    participants = includedMembers.value.map((member) => ({ memberId: member.id }));
  } else if (mode.value === 'percentage') {
    participants = members.value
      .filter((member) => split[member.id].pct > 0)
      .map((member) => ({ memberId: member.id, weight: split[member.id].pct }));
  } else {
    participants = members.value
      .filter((member) => split[member.id].amt > 0)
      .map((member) => ({ memberId: member.id, weight: split[member.id].amt }));
  }

  try {
    await store.addExpense({
      groupId: groupId.value,
      description: description.value.trim(),
      amount: amount.value,
      currency: currency.value,
      paidBy: paidBy.value,
      split: mode.value,
      participants,
    });
  } catch (err) {
    captureError(err, 'AddExpenseView.addExpense');
    toast.show(t('addExpense.addFailed'), 'error');
    return;
  }
  toast.show(t('addExpense.added'), 'success');
  router.replace({ name: 'group', params: { id: groupId.value } });
}

function goBack() {
  router.replace({ name: 'group', params: { id: groupId.value } });
}
</script>

<style scoped>
.icon-btn.accent {
  background: var(--accent);
}

/* Amount */
.amount-section {
  padding: 4px 18px 18px;
  text-align: center;
  flex-shrink: 0;
}

.amount-display {
  font-size: 50px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -2px;
  line-height: 1.05;
}

.currency-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

.currency-pill {
  background: var(--border);
  color: var(--text-mid);
  border: none;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s,
    color 0.15s;
}

.currency-pill.active {
  background: var(--dark);
  color: var(--accent);
}

/* Form */
.form-area {
  flex: 1;
  padding: 0 18px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow-y: auto;
}

.field-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* Labels compacts dans les cartes du formulaire */
.form-label {
  margin-bottom: 5px;
}

.field-input {
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--dark);
  background: transparent;
  width: 100%;
  padding: 0;
  font-family: inherit;
}

.field-input::placeholder {
  color: var(--text-faint);
}

/* Payer */
.payer-card {
  padding-bottom: 0;
}
.payer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding-bottom: 14px;
}
.payer-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--dark);
}
.payer-chevron {
  color: var(--text);
}

.payer-menu {
  border-top: 1px solid var(--border-subtle);
  padding: 6px 0 10px;
}
.payer-option {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 9px 8px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-mid);
  cursor: pointer;
  font-family: inherit;
}
.payer-option.active {
  color: var(--dark);
  font-weight: 600;
}
.payer-option:hover {
  background: var(--border-subtle);
}

/* Mode tabs */
.mode-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  background: var(--border-subtle);
  border-radius: 10px;
  padding: 3px;
}

.mode-tab {
  flex: 1;
  border: none;
  background: none;
  padding: 8px 0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-mid);
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.15s,
    color 0.15s;
}

.mode-tab.active {
  background: var(--dark);
  color: var(--accent);
}

/* Equal */
.equal-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.member-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.member-chip.off {
  opacity: 0.3;
}

.chip-name {
  font-size: 9px;
  font-weight: 600;
  color: var(--dark);
}

.share-info {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-mid);
}
.share-info strong {
  color: var(--dark);
}

/* Split list (% / fixed) */
.split-list {
  display: flex;
  flex-direction: column;
}

.split-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.split-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
}

.split-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--border-subtle);
  border-radius: 8px;
  padding: 6px 10px;
}

.split-input {
  width: 56px;
  border: none;
  outline: none;
  background: transparent;
  text-align: right;
  font-size: 13px;
  font-weight: 700;
  color: var(--dark);
  font-family: inherit;
}

.split-unit {
  font-size: 11px;
  color: var(--text);
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--red);
  font-weight: 600;
}

.total-row.ok {
  color: var(--green);
}

/* CTA */
.cta-area {
  padding: 14px 18px 28px;
  flex-shrink: 0;
}
</style>
