<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Room } from '../types';
import { getCurrentUser } from '../utils/nimiq';
import { addRoom, generateRoomId } from '../utils/storage';
import { encodeRoomToUrl } from '../utils/room';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';

const router = useRouter()

function goBack() {
  router.back()
}

function goDone() {
  router.push({ name: 'group' })
}

const reason = ref('');
const amount = ref<number | null>(null);
const maxParticipants = ref(4);
const activeCurrency = ref('NIM');
const isCreating = ref(false);
const error = ref('');
const createdRoom = ref<Room | null>(null);
const shareUrl = ref('');

const currencies = ['NIM', 'ETH', 'USDT', 'EUR'];

const members = [
  { id: 'alex', label: 'Alex', bg: '#5F4B8B', isIdenticon: true, active: true },
  { id: 'marie', label: 'M', bg: '#BEE0FF', color: '#0D3A5C', active: true },
  { id: 'lucas', label: 'L', bg: '#C6F0DC', color: '#0A4028', active: true },
  { id: 'julie', label: 'J', bg: '#EDECEA', color: '#6B6860', active: false },
  { id: 'sam', label: 'S', bg: '#EDECEA', color: '#6B6860', active: false },
];

async function createExpense() {
  error.value = '';
  if (!reason.value.trim()) { error.value = 'Indique la description'; return; }
  if (!amount.value || amount.value <= 0) { error.value = 'Le montant doit être > 0'; return; }

  isCreating.value = true;
  try {
    const user = await getCurrentUser();
    const room: Room = {
      id: generateRoomId(),
      creatorId: user.id,
      creatorName: user.name,
      amount: amount.value,
      currency: activeCurrency.value,
      reason: reason.value.trim(),
      maxParticipants: maxParticipants.value,
      participants: [{ id: user.id, name: user.name, amountPaid: amount.value / maxParticipants.value, joinedAt: new Date(), status: 'paid' }],
      createdAt: new Date(),
      status: 'open',
    };
    addRoom(room);
    createdRoom.value = room;
    shareUrl.value = encodeRoomToUrl(room);
  } catch {
    error.value = 'Erreur lors de la création';
  } finally {
    isCreating.value = false;
  }
}

async function copyUrl() {
  await navigator.clipboard.writeText(shareUrl.value);
}
</script>

<template>
  <!-- QR Result -->
  <div v-if="createdRoom" class="screen">
    <div class="top-bar">
      <button class="icon-btn gray" @click="goDone">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path d="M10.5 4L6 8.5L10.5 13" stroke="#1A1916" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="bar-title">Dépense ajoutée !</span>
      <div style="width:36px"/>
    </div>

    <div class="result-area">
      <div class="result-name">{{ createdRoom.reason }}</div>
      <div class="result-per">
        {{ (createdRoom.amount / createdRoom.maxParticipants).toFixed(2) }} {{ activeCurrency }}
        <span class="result-per-label"> / personne</span>
      </div>
      <div class="result-total">{{ createdRoom.amount.toFixed(2) }} {{ activeCurrency }} total · {{ createdRoom.maxParticipants }} personnes</div>

      <div class="qr-wrap">
        <QRCodeGenerator :url="shareUrl" :size="220" />
      </div>
      <p class="qr-hint">Fais scanner ce QR à tes amis</p>

      <button class="btn-primary" @click="copyUrl">Copier le lien</button>
      <button class="btn-ghost" @click="goDone">Retour au groupe</button>
    </div>
  </div>

  <!-- Form -->
  <div v-else class="screen">
    <div class="top-bar">
      <button class="icon-btn gray" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="#3D3B35" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
      <span class="bar-title">Nouvelle dépense</span>
      <button class="icon-btn accent" @click="createExpense" :disabled="isCreating">
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
          v-for="c in currencies"
          :key="c"
          class="currency-pill"
          :class="{ active: activeCurrency === c }"
          @click="activeCurrency = c"
        >{{ c }}</button>
      </div>
    </div>

    <!-- Form fields -->
    <div class="form-area">
      <!-- Description -->
      <div class="field-card">
        <div class="field-label">Description</div>
        <input class="field-input" v-model="reason" type="text" placeholder="Tapas + bières"/>
      </div>

      <!-- Amount input -->
      <div class="field-card row-card">
        <div>
          <div class="field-label">Montant total</div>
          <input class="field-input" v-model.number="amount" type="number" placeholder="0" min="0.01" step="0.01"/>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M5 7L8 10L11 7" stroke="#8B8880" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- Paid by -->
      <div class="field-card row-card">
        <div>
          <div class="field-label">Payé par</div>
          <div class="paid-by-row">
            <div class="paid-identicon">
              <svg width="24" height="24" viewBox="0 0 38 38">
                <rect width="38" height="38" fill="#5F4B8B"/>
                <polygon points="0,0 19,19 38,0" fill="#7B6BA5"/>
                <polygon points="38,0 19,19 38,38" fill="#4E3D7A"/>
                <polygon points="38,38 19,19 0,38" fill="#6B5A98"/>
                <polygon points="0,38 19,19 0,0" fill="#533F85"/>
                <circle cx="19" cy="19" r="6" fill="#F6B221"/>
                <polygon points="15.5,23.5 19,12.5 22.5,23.5" fill="#5F4B8B"/>
              </svg>
            </div>
            <span class="paid-name">Alex (toi)</span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M5 7L8 10L11 7" stroke="#8B8880" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- Split -->
      <div class="field-card">
        <div class="field-label">Répartir entre · Équitable</div>
        <div class="members-row">
          <div
            v-for="m in members"
            :key="m.id"
            class="member-item"
            :class="{ inactive: !m.active }"
          >
            <div class="member-avatar" :style="{ background: m.bg }">
              <template v-if="m.isIdenticon">
                <svg width="36" height="36" viewBox="0 0 38 38">
                  <rect width="38" height="38" fill="#5F4B8B"/>
                  <polygon points="0,0 19,19 38,0" fill="#7B6BA5"/>
                  <polygon points="38,0 19,19 38,38" fill="#4E3D7A"/>
                  <polygon points="38,38 19,19 0,38" fill="#6B5A98"/>
                  <polygon points="0,38 19,19 0,0" fill="#533F85"/>
                  <circle cx="19" cy="19" r="6" fill="#F6B221"/>
                  <polygon points="15.5,23.5 19,12.5 22.5,23.5" fill="#5F4B8B"/>
                </svg>
              </template>
              <template v-else>
                <span :style="{ color: m.color, fontSize: '13px', fontWeight: '700' }">{{ m.label }}</span>
              </template>
            </div>
            <span class="member-name">{{ m.isIdenticon ? 'Alex' : m.label }}</span>
          </div>
        </div>
        <div v-if="amount && amount > 0" class="share-info">
          Part de chacun · <strong>{{ (amount / members.filter(m => m.active).length).toFixed(2) }} {{ activeCurrency }}</strong>
        </div>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>

    <!-- CTA -->
    <div class="cta-area">
      <button class="btn-primary" @click="createExpense" :disabled="isCreating">
        {{ isCreating ? 'Création…' : 'Ajouter la dépense' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.top-bar {
  padding: 10px 18px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.bar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dark);
}

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
.icon-btn:disabled { opacity: 0.5; }

/* Amount */
.amount-section {
  padding: 4px 18px 18px;
  text-align: center;
  flex-shrink: 0;
}

.amount-display {
  font-size: 56px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -3px;
  line-height: 1.05;
}

.currency-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 14px;
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
  transition: background 0.15s, color 0.15s;
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
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.field-card.row-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.paid-by-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.paid-identicon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.paid-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--dark);
}

/* Members */
.members-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
}

.member-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: opacity 0.2s;
}

.member-item.inactive { opacity: 0.35; }

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-name {
  font-size: 9px;
  color: var(--dark);
  font-weight: 600;
}

.member-item.inactive .member-name { color: var(--text); font-weight: 500; }

.share-info {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-mid);
}

.share-info strong { color: var(--dark); }

.error-msg {
  font-size: 13px;
  color: var(--red);
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 12px;
  padding: 10px 14px;
}

/* CTA */
.cta-area {
  padding: 14px 18px 28px;
  flex-shrink: 0;
}

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

.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }

.btn-ghost {
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 13px;
  font-size: 14px;
  color: var(--text-mid);
  margin-top: 8px;
  cursor: pointer;
  font-family: inherit;
}

/* Result */
.result-area {
  flex: 1;
  padding: 8px 18px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.result-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.3px;
  text-align: center;
}

.result-per {
  font-size: 28px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -1px;
}

.result-per-label {
  font-size: 16px;
  font-weight: 400;
  color: var(--text);
}

.result-total {
  font-size: 12px;
  color: var(--text);
}

.qr-wrap {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-md);
  margin: 12px 0 4px;
}

.qr-hint {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 16px;
}
</style>
