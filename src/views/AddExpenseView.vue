<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { SplitMode } from '../types';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';

const route = useRoute();
const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();

const groupId = computed(() => String(route.query.groupId ?? ''));
const group = computed(() => store.getGroup(groupId.value));
const members = computed(() => group.value?.members ?? []);
const userId = computed(() => session.user.value?.id ?? '');

onMounted(() => {
  if (!group.value) router.replace({ name: 'home' });
});

const CURRENCIES = ['NIM', 'ETH', 'USDT', 'EUR'];

const description = ref('');
const amount = ref<number | null>(null);
const currency = ref('NIM');
const paidBy = ref('');
const showPayerMenu = ref(false);
const mode = ref<SplitMode>('equal');

// État de répartition par membre : inclusion (équitable), pourcentage (%), montant (fixe).
const split = reactive<Record<string, { included: boolean; pct: number; amt: number }>>({});

// (Ré)initialise l'état de répartition quand les membres sont connus.
watch(
  members,
  (list) => {
    for (const m of list) {
      if (!split[m.id]) split[m.id] = { included: true, pct: 0, amt: 0 };
    }
    paidBy.value = paidBy.value || userId.value || list[0]?.id || '';
    distributeEvenly();
  },
  { immediate: true },
);

const AVATAR_COLORS = [
  { bg: '#BEE0FF', color: '#0D3A5C' },
  { bg: '#C6F0DC', color: '#0A4028' },
  { bg: '#F0D4E8', color: '#4A1040' },
  { bg: '#FFE3C2', color: '#7A3E00' },
  { bg: '#E0DCF5', color: '#3A2A6B' },
];
const avatarStyle = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

const memberName = (id: string) =>
  id === userId.value ? `${members.value.find((m) => m.id === id)?.name ?? 'Toi'} (toi)`
                      : members.value.find((m) => m.id === id)?.name ?? '';

// Répartit pourcentages et montants à parts égales (base de départ des modes % et fixe).
function distributeEvenly() {
  const list = members.value;
  if (!list.length) return;
  const pct = Math.round((100 / list.length) * 10) / 10;
  const amt = amount.value ? Math.round((amount.value / list.length) * 100) / 100 : 0;
  list.forEach((m) => {
    split[m.id].pct = pct;
    split[m.id].amt = amt;
  });
}

// Membres inclus dans le partage équitable.
const includedMembers = computed(() => members.value.filter((m) => split[m.id]?.included));
const equalShare = computed(() =>
  amount.value && includedMembers.value.length
    ? amount.value / includedMembers.value.length
    : 0,
);

const pctTotal = computed(() => members.value.reduce((s, m) => s + (split[m.id]?.pct ?? 0), 0));
const amtTotal = computed(() => members.value.reduce((s, m) => s + (split[m.id]?.amt ?? 0), 0));

// Validation selon le mode. Renvoie un message d'erreur ou '' si OK.
const splitError = computed(() => {
  if (!amount.value || amount.value <= 0) return 'Indique un montant';
  if (!description.value.trim()) return 'Indique une description';
  if (mode.value === 'equal') {
    return includedMembers.value.length ? '' : 'Sélectionne au moins un membre';
  }
  if (mode.value === 'percentage') {
    return Math.abs(pctTotal.value - 100) < 0.5 ? '' : `Total ${pctTotal.value.toFixed(0)}% (doit faire 100%)`;
  }
  return Math.abs(amtTotal.value - amount.value) < 0.01
    ? ''
    : `Total ${amtTotal.value.toFixed(2)} / ${amount.value.toFixed(2)} ${currency.value}`;
});

function setMode(m: SplitMode) {
  mode.value = m;
  if (m !== 'equal') distributeEvenly();
}

function selectPayer(id: string) {
  paidBy.value = id;
  showPayerMenu.value = false;
}

function create() {
  if (splitError.value || !amount.value) {
    toast.show(splitError.value || 'Formulaire incomplet', 'error');
    return;
  }
  let participants: { memberId: string; weight?: number }[];
  if (mode.value === 'equal') {
    participants = includedMembers.value.map((m) => ({ memberId: m.id }));
  } else if (mode.value === 'percentage') {
    participants = members.value
      .filter((m) => split[m.id].pct > 0)
      .map((m) => ({ memberId: m.id, weight: split[m.id].pct }));
  } else {
    participants = members.value
      .filter((m) => split[m.id].amt > 0)
      .map((m) => ({ memberId: m.id, weight: split[m.id].amt }));
  }

  store.addExpense({
    groupId: groupId.value,
    description: description.value.trim(),
    amount: amount.value,
    currency: currency.value,
    paidBy: paidBy.value,
    split: mode.value,
    participants,
  });
  toast.show('Dépense ajoutée', 'success');
  router.replace({ name: 'group', params: { id: groupId.value } });
}

function goBack() {
  router.replace({ name: 'group', params: { id: groupId.value } });
}
</script>

<template>
  <div v-if="group" class="screen">
    <!-- Top bar -->
    <div class="top-bar">
      <button class="icon-btn gray" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="#3D3B35" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
      <span class="bar-title">Nouvelle dépense</span>
      <button class="icon-btn accent" @click="create">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7L5.5 10.5L12 3" stroke="#1A1916" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- Amount -->
    <div class="amount-section">
      <div class="amount-display">{{ amount ? amount.toFixed(2) : '0.00' }}</div>
      <div class="currency-row">
        <button
          v-for="c in CURRENCIES"
          :key="c"
          class="currency-pill"
          :class="{ active: currency === c }"
          @click="currency = c"
        >{{ c }}</button>
      </div>
    </div>

    <!-- Form -->
    <div class="form-area">
      <!-- Description -->
      <div class="field-card">
        <div class="field-label">Description</div>
        <input class="field-input" v-model="description" type="text" placeholder="Tapas + bières"/>
      </div>

      <!-- Amount input -->
      <div class="field-card">
        <div class="field-label">Montant total</div>
        <input
          class="field-input"
          v-model.number="amount"
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
            <div class="field-label">Payé par</div>
            <div class="payer-name">{{ memberName(paidBy) }}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 7L8 10L11 7" stroke="#8B8880" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div v-if="showPayerMenu" class="payer-menu">
          <button
            v-for="m in members"
            :key="m.id"
            class="payer-option"
            :class="{ active: paidBy === m.id }"
            @click="selectPayer(m.id)"
          >{{ memberName(m.id) }}</button>
        </div>
      </div>

      <!-- Split -->
      <div class="field-card">
        <div class="field-label">Répartir entre</div>

        <!-- Mode tabs -->
        <div class="mode-tabs">
          <button class="mode-tab" :class="{ active: mode === 'equal' }" @click="setMode('equal')">Équitable</button>
          <button class="mode-tab" :class="{ active: mode === 'percentage' }" @click="setMode('percentage')">%</button>
          <button class="mode-tab" :class="{ active: mode === 'fixed' }" @click="setMode('fixed')">Montants</button>
        </div>

        <!-- Équitable -->
        <div v-if="mode === 'equal'" class="equal-row">
          <button
            v-for="(m, i) in members"
            :key="m.id"
            class="member-chip"
            :class="{ off: !split[m.id]?.included }"
            @click="split[m.id].included = !split[m.id].included"
          >
            <div class="chip-av" :style="{ background: avatarStyle(i).bg, color: avatarStyle(i).color }">
              {{ m.name.charAt(0).toUpperCase() }}
            </div>
            <span class="chip-name">{{ m.name }}</span>
          </button>
        </div>
        <div v-if="mode === 'equal' && amount" class="share-info">
          Part de chacun · <strong>{{ equalShare.toFixed(2) }} {{ currency }}</strong>
        </div>

        <!-- % / Montants -->
        <div v-else-if="mode !== 'equal'" class="split-list">
          <div v-for="(m, i) in members" :key="m.id" class="split-row">
            <div class="chip-av sm" :style="{ background: avatarStyle(i).bg, color: avatarStyle(i).color }">
              {{ m.name.charAt(0).toUpperCase() }}
            </div>
            <span class="split-name">{{ m.name }}</span>
            <div class="split-input-wrap">
              <input
                v-if="mode === 'percentage'"
                class="split-input"
                v-model.number="split[m.id].pct"
                type="number" min="0" max="100" step="1"
              />
              <input
                v-else
                class="split-input"
                v-model.number="split[m.id].amt"
                type="number" min="0" step="0.01"
              />
              <span class="split-unit">{{ mode === 'percentage' ? '%' : currency }}</span>
            </div>
          </div>
          <div class="total-row" :class="{ ok: !splitError }">
            <span>Total attribué</span>
            <span>{{ mode === 'percentage' ? pctTotal.toFixed(0) + '%' : amtTotal.toFixed(2) + ' ' + currency }}</span>
          </div>
        </div>
      </div>

      <p v-if="splitError" class="error-msg">{{ splitError }}</p>
    </div>

    <!-- CTA -->
    <div class="cta-area">
      <button class="btn-primary" :disabled="!!splitError" @click="create">
        Ajouter la dépense
      </button>
    </div>
  </div>
</template>

<style scoped>
.screen { flex: 1; display: flex; flex-direction: column; background: var(--bg); }

.top-bar {
  padding: 10px 18px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.bar-title { font-size: 16px; font-weight: 600; color: var(--dark); }

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.icon-btn.gray { background: var(--border); }
.icon-btn.accent { background: var(--accent); }

/* Amount */
.amount-section { padding: 4px 18px 18px; text-align: center; flex-shrink: 0; }

.amount-display {
  font-size: 50px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -2px;
  line-height: 1.05;
}

.currency-row { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }

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
  transition: background 0.15s, color 0.15s;
}

.currency-pill.active { background: var(--dark); color: var(--accent); }

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
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.field-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
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

.field-input::placeholder { color: #C8C5BF; }

/* Payer */
.payer-card { padding-bottom: 0; }
.payer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding-bottom: 14px;
}
.payer-name { font-size: 14px; font-weight: 500; color: var(--dark); }

.payer-menu { border-top: 1px solid var(--border-subtle); padding: 6px 0 10px; }
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
.payer-option.active { color: var(--dark); font-weight: 600; }
.payer-option:hover { background: var(--border-subtle); }

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
  transition: background 0.15s, color 0.15s;
}

.mode-tab.active { background: var(--dark); color: var(--accent); }

/* Equal */
.equal-row { display: flex; gap: 10px; flex-wrap: wrap; }

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

.member-chip.off { opacity: 0.3; }

.chip-av {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
}

.chip-av.sm { width: 30px; height: 30px; font-size: 12px; }

.chip-name { font-size: 9px; font-weight: 600; color: var(--dark); }

.share-info {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-mid);
}
.share-info strong { color: var(--dark); }

/* Split list (% / fixed) */
.split-list { display: flex; flex-direction: column; }

.split-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.split-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--dark); }

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

.split-unit { font-size: 11px; color: var(--text); }

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

.total-row.ok { color: var(--green); }

.error-msg {
  font-size: 13px;
  color: var(--red);
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 12px;
  padding: 10px 14px;
}

/* CTA */
.cta-area { padding: 14px 18px 28px; flex-shrink: 0; }

.btn-primary {
  display: block;
  width: 100%;
  background: var(--accent);
  border: none;
  border-radius: 16px;
  padding: 17px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}

.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
</style>
