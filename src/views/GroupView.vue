<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Expense, ShareableRoom } from '../types';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import { encodeShareUrl, buildInviteDeeplink } from '../utils/room';
import QRCodeGenerator from '../components/QRCodeGenerator.vue';

const props = defineProps<{ id: string }>();

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();

const userId = computed(() => session.user.value?.id ?? '');
const group = computed(() => store.getGroup(props.id));
const expenses = computed(() => store.groupExpenses(props.id));
const balance = computed(() => store.groupBalanceForUser(props.id, userId.value));

// Redirige si le groupe n'existe pas (id invalide / supprimé).
onMounted(() => {
  if (!group.value) router.replace({ name: 'home' });
});

const monthLabel = computed(() =>
  group.value
    ? group.value.createdAt.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    : '',
);

// Palette d'avatars (par initiale).
const AVATAR_COLORS = [
  { bg: '#BEE0FF', color: '#0D3A5C' },
  { bg: '#C6F0DC', color: '#0A4028' },
  { bg: '#F0D4E8', color: '#4A1040' },
  { bg: '#FFE3C2', color: '#7A3E00' },
  { bg: '#E0DCF5', color: '#3A2A6B' },
];

function avatarStyle(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function memberName(id: string): string {
  if (id === userId.value) return 'toi';
  return group.value?.members.find((m) => m.id === id)?.name ?? 'Inconnu';
}

function userShare(expenseId: string): number {
  const exp = expenses.value.find((e) => e.id === expenseId);
  return exp?.shares.find((s) => s.memberId === userId.value)?.amount ?? 0;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ── Invitation à payer (version A — sans backend) ──────────────────────────
// Deux canaux : le QR encode le deeplink nimiqpay:// (la caméra résout le
// schéma → ouvre Nimiq Pay, fiable en présentiel) ; le bouton partage l'URL
// https cliquable (à envoyer à distance → ouvre l'app, pont depuis le
// navigateur système). Les navigateurs intégrés (Messenger) bloquent le
// schéma custom : c'est une limite plateforme assumée.
const inviteExpense = ref<Expense | null>(null);
const inviteHttps = ref('');     // URL https cliquable (à partager)
const inviteDeeplink = ref('');  // deeplink nimiqpay:// (encodé dans le QR)
const inviteLabel = ref('');

// Membres qui doivent leur part pour cette dépense (hors payeur).
function debtorsOf(exp: Expense) {
  return exp.shares.filter((s) => s.memberId !== exp.paidBy && s.amount > 0.005);
}

function openInvite(exp: Expense) {
  inviteExpense.value = exp;
  inviteHttps.value = '';
  inviteDeeplink.value = '';
  inviteLabel.value = '';
}

function closeInvite() {
  inviteExpense.value = null;
  inviteHttps.value = '';
  inviteDeeplink.value = '';
  inviteLabel.value = '';
}

function backToDebtors() {
  inviteHttps.value = '';
  inviteDeeplink.value = '';
  inviteLabel.value = '';
}

// Génère l'URL https (partage) + le deeplink (QR) pour régler la part.
function selectDebtor(exp: Expense, memberId: string, shareAmount: number) {
  const payee = group.value?.members.find((m) => m.id === exp.paidBy);
  if (!payee || !payee.id.startsWith('NQ')) {
    toast.show('Le payeur doit avoir une adresse Nimiq pour être remboursé', 'error');
    return;
  }
  if (exp.currency !== 'NIM') {
    toast.show("Lien de paiement disponible en NIM pour l'instant", 'error');
    return;
  }
  const payload: ShareableRoom = {
    id: exp.id,
    creatorId: payee.id,
    creatorName: payee.name,
    amount: shareAmount,
    currency: exp.currency,
    reason: exp.description,
    maxParticipants: 1,
  };
  inviteHttps.value = encodeShareUrl(payload);
  inviteDeeplink.value = buildInviteDeeplink(inviteHttps.value);
  inviteLabel.value = `${memberName(memberId)} · ${shareAmount.toFixed(2)} NIM`;
}

// Partage le lien d'invitation. Le WebView de Nimiq Pay n'expose PAS la Web
// Share API (pas de liste WhatsApp/Messenger/…), donc on copie le lien (le
// presse-papier marche en contexte sécurisé) ; l'utilisateur le colle où il
// veut. Si jamais navigator.share existe (navigateur mobile), on l'utilise.
async function shareInvite() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'PayShare',
        text: `Règle ta part « ${inviteExpense.value?.description ?? ''} » sur PayShare`,
        url: inviteHttps.value,
      });
    } catch {
      /* partage annulé */
    }
    return;
  }
  if (!navigator.clipboard?.writeText) {
    toast.show('Copie indisponible (contexte non sécurisé)', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(inviteHttps.value);
    toast.show('Lien copié — colle-le dans ta messagerie', 'success');
  } catch {
    toast.show('Impossible de copier le lien', 'error');
  }
}

function goBack() {
  router.back();
}

function goToAddExpense() {
  router.push({ name: 'addExpense', query: { groupId: props.id } });
}

function invite() {
  toast.show('Invitation par QR — bientôt disponible', 'info'); // Phase 4
}

function settle() {
  toast.show('Règlement — bientôt disponible', 'info'); // Phase 4
}
</script>

<template>
  <div v-if="group" class="screen">
    <!-- Header -->
    <div class="header">
      <button class="icon-btn" @click="goBack">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path d="M10.5 4L6 8.5L10.5 13" stroke="#1A1916" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="header-info">
        <div class="header-title">{{ group.name }}</div>
        <div class="header-sub">{{ group.members.length }} membres · {{ monthLabel }}</div>
      </div>
      <button class="icon-btn">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="3.5" r="1.3" fill="#3D3B35"/>
          <circle cx="8" cy="8" r="1.3" fill="#3D3B35"/>
          <circle cx="8" cy="12.5" r="1.3" fill="#3D3B35"/>
        </svg>
      </button>
    </div>

    <!-- Members + invite -->
    <div class="members-row">
      <div
        v-for="(m, i) in group.members"
        :key="m.id"
        class="avatar"
        :style="{ background: avatarStyle(i).bg, color: avatarStyle(i).color }"
      >
        {{ m.name.charAt(0).toUpperCase() }}
      </div>
      <button class="qr-btn" @click="invite">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" stroke="#F6B221" stroke-width="1.4"/>
          <rect x="2" y="11" width="5" height="5" rx="1" stroke="#F6B221" stroke-width="1.4"/>
          <rect x="11" y="2" width="5" height="5" rx="1" stroke="#F6B221" stroke-width="1.4"/>
          <rect x="3.5" y="3.5" width="2" height="2" fill="#F6B221"/>
          <rect x="3.5" y="12.5" width="2" height="2" fill="#F6B221"/>
          <rect x="12.5" y="3.5" width="2" height="2" fill="#F6B221"/>
          <path d="M11 11H13M15 11V13M11 15H13M15 15V13M15 13H11" stroke="#F6B221" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Balance card -->
    <div v-if="balance < -0.005" class="debt-card">
      <div>
        <div class="debt-who">Tu dois</div>
        <div class="debt-amount">{{ Math.abs(balance).toFixed(2) }} NIM</div>
      </div>
      <button class="settle-btn" @click="settle">Régler →</button>
    </div>
    <div v-else-if="balance > 0.005" class="credit-card">
      <div class="credit-title">On te doit</div>
      <div class="credit-amount">{{ balance.toFixed(2) }} NIM</div>
    </div>
    <div v-else class="settled-card">
      <div class="settled-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 9L7.5 12.5L14 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <div class="settled-title">Groupe soldé ✓</div>
        <div class="settled-sub">Aucune dette en cours</div>
      </div>
    </div>

    <!-- Expenses header -->
    <div class="expenses-header">
      <span class="expenses-title">Dépenses</span>
      <button class="add-btn" @click="goToAddExpense">+ Ajouter</button>
    </div>

    <!-- Expense list -->
    <div v-if="expenses.length" class="expense-list">
      <div v-for="exp in expenses" :key="exp.id" class="expense-card" @click="openInvite(exp)">
        <div class="expense-top">
          <div class="expense-left">
            <div class="expense-title">{{ exp.description }}</div>
            <div class="expense-meta">Payé par {{ memberName(exp.paidBy) }} · {{ shortDate(exp.createdAt) }}</div>
          </div>
          <div class="expense-right">
            <div class="expense-total">{{ exp.amount.toFixed(2) }} {{ exp.currency }}</div>
            <div
              class="expense-share"
              :style="{ color: exp.paidBy === userId ? '#198060' : '#CC3C3C' }"
            >
              {{ exp.paidBy === userId ? 'tu as payé' : `−${userShare(exp.id).toFixed(2)} ${exp.currency}` }}
            </div>
          </div>
        </div>
        <div class="bar-bg">
          <div
            class="bar-fill"
            :style="{
              width: Math.min(100, (userShare(exp.id) / exp.amount) * 100) + '%',
              background: exp.paidBy === userId ? '#198060' : '#F6B221',
            }"
          />
        </div>
      </div>
    </div>

    <!-- Empty expenses -->
    <div v-else class="expense-empty">
      <div class="expense-empty-text">Aucune dépense pour l'instant</div>
      <button class="expense-empty-cta" @click="goToAddExpense">+ Ajouter une dépense</button>
    </div>

    <!-- Feuille : inviter à payer une part (QR deeplink) -->
    <div v-if="inviteExpense" class="sheet-overlay" @click="closeInvite">
      <div class="sheet" @click.stop>
        <div class="sheet-handle" />

        <!-- Étape 1 : choisir le débiteur -->
        <template v-if="!inviteDeeplink">
          <div class="sheet-title">Inviter à payer</div>
          <div class="sheet-sub">{{ inviteExpense.description }} · payé par {{ memberName(inviteExpense.paidBy) }}</div>

          <div v-if="debtorsOf(inviteExpense).length" class="debtor-list">
            <button
              v-for="s in debtorsOf(inviteExpense)"
              :key="s.memberId"
              class="debtor-row"
              @click="selectDebtor(inviteExpense, s.memberId, s.amount)"
            >
              <div class="debtor-info">
                <div class="debtor-name">{{ memberName(s.memberId) }}</div>
                <div class="debtor-amount">{{ s.amount.toFixed(2) }} {{ inviteExpense.currency }}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="#8B8880" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div v-else class="sheet-empty">Personne ne doit de part sur cette dépense.</div>
        </template>

        <!-- Étape 2 : QR (présentiel) + partage du lien https (à distance) -->
        <template v-else>
          <div class="sheet-title">Régler la part</div>
          <div class="sheet-sub">{{ inviteLabel }}</div>
          <div class="qr-box">
            <QRCodeGenerator :url="inviteDeeplink" :size="200" />
          </div>
          <div class="sheet-note">
            En présentiel : fais scanner ce QR avec l'appareil photo → Nimiq Pay s'ouvre sur la part à régler.
          </div>
          <button class="sheet-copy" @click="shareInvite">Copier le lien</button>
          <button class="sheet-back" @click="backToDebtors">← Choisir un autre membre</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

.header {
  padding: 8px 18px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-card);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  cursor: pointer;
}

.header-info { flex: 1; min-width: 0; }

.header-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.3px;
}

.header-sub { font-size: 11px; color: var(--text); margin-top: 1px; }

/* Members */
.members-row {
  padding: 0 18px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  border: 2.5px solid var(--bg);
  flex-shrink: 0;
}

.qr-btn {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--dark);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
}

.qr-btn:hover { opacity: 0.75; }

/* Balance cards */
.debt-card {
  margin: 0 18px 14px;
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.debt-who { font-size: 11px; color: var(--red); font-weight: 600; margin-bottom: 3px; }
.debt-amount { font-size: 22px; font-weight: 700; color: var(--red); letter-spacing: -0.5px; }

.settle-btn {
  background: var(--red);
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s;
}

.settle-btn:hover { opacity: 0.85; }

.credit-card {
  margin: 0 18px 14px;
  background: var(--green-bg);
  border: 1px solid #C6EFE0;
  border-radius: 16px;
  padding: 14px 16px;
  flex-shrink: 0;
}

.credit-title { font-size: 11px; color: var(--green); font-weight: 600; margin-bottom: 3px; }
.credit-amount { font-size: 22px; font-weight: 700; color: var(--green); letter-spacing: -0.5px; }

.settled-card {
  margin: 0 18px 14px;
  background: #E8F8F2;
  border: 1px solid #C6EFE0;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.settled-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--green);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.settled-title { font-size: 13px; font-weight: 700; color: var(--green); }
.settled-sub { font-size: 11px; color: var(--green); opacity: 0.75; margin-top: 2px; }

/* Expenses */
.expenses-header {
  padding: 0 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.expenses-title { font-size: 15px; font-weight: 600; color: var(--dark); }

.add-btn {
  background: var(--accent);
  border: none;
  border-radius: 20px;
  padding: 5px 13px;
  font-size: 12px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  transition: opacity 0.15s;
}

.add-btn:hover { opacity: 0.85; }

.expense-list {
  flex: 1;
  padding: 0 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.expense-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 13px 15px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.12s;
}

.expense-card:active { transform: scale(0.99); }

.expense-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 9px;
}

.expense-left { flex: 1; min-width: 0; }
.expense-title { font-size: 13px; font-weight: 600; color: var(--dark); }
.expense-meta { font-size: 11px; color: var(--text); margin-top: 2px; }
.expense-right { text-align: right; flex-shrink: 0; margin-left: 8px; }
.expense-total { font-size: 13px; font-weight: 600; color: var(--dark); }
.expense-share { font-size: 10px; margin-top: 1px; }

.bar-bg { height: 3px; background: var(--border-subtle); border-radius: 2px; }
.bar-fill { height: 100%; border-radius: 2px; }

/* Empty expenses */
.expense-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 30px 18px;
}

.expense-empty-text { font-size: 13px; color: var(--text); }

.expense-empty-cta {
  background: var(--accent);
  border: none;
  border-radius: 14px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
}

/* Invite sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  background: var(--bg-card);
  border-radius: 24px 24px 0 0;
  padding: 10px 20px 30px;
  animation: sheet-up 0.22s ease;
}

@keyframes sheet-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  margin: 0 auto 14px;
}

.sheet-title { font-size: 17px; font-weight: 700; color: var(--dark); }
.sheet-sub { font-size: 12px; color: var(--text); margin-top: 2px; margin-bottom: 14px; }

.debtor-list { display: flex; flex-direction: column; gap: 8px; }

.debtor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg);
  border: none;
  border-radius: 14px;
  padding: 12px 14px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.debtor-row:active { opacity: 0.7; }

.debtor-name { font-size: 14px; font-weight: 600; color: var(--dark); }
.debtor-amount { font-size: 12px; color: var(--text); margin-top: 1px; }

.sheet-empty { font-size: 13px; color: var(--text); padding: 12px 0; text-align: center; }

.sheet-note {
  font-size: 11px;
  color: var(--text);
  text-align: center;
  margin-top: 14px;
  line-height: 1.5;
}

.qr-box {
  display: flex;
  justify-content: center;
  margin: 16px 0 4px;
}

.sheet-copy {
  width: 100%;
  margin-top: 14px;
  background: var(--accent);
  border: none;
  border-radius: 14px;
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
}

.sheet-back {
  width: 100%;
  margin-top: 8px;
  background: none;
  border: none;
  padding: 10px;
  font-size: 13px;
  color: var(--text-mid);
  cursor: pointer;
  font-family: inherit;
}
</style>
