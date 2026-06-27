<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Expense, GroupIcon, ShareableRoom } from '../types';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import { buildInviteUrl, buildInviteDeeplink } from '../utils/room';
import InitialAvatar from '../components/InitialAvatar.vue';
import ExpenseCard from '../components/ExpenseCard.vue';
import { captureError } from '../utils/errors';
import InviteSheet from '../components/InviteSheet.vue';
import BaseSheet from '../components/BaseSheet.vue';
import GroupIconPicker from '../components/GroupIconPicker.vue';
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

// Vrai si l'utilisateur est membre du groupe mais n'a aucune part dans les dépenses existantes.
const hasNoShares = computed(() => {
  const g = group.value;
  if (!g || g.creatorId === userId.value) return false;
  const groupExpenses = store.groupExpenses(props.id);
  if (!groupExpenses.length) return false;
  return !groupExpenses.some((e) => e.shares.some((s) => s.memberId === userId.value));
});

// Redirige si le groupe n'existe pas (id invalide / supprimé).
onMounted(async () => {
  if (!group.value) {
    router.replace({ name: 'home' });
    return;
  }
  // Refresh des dépenses du groupe depuis Supabase à l'ouverture.
  try { await store.refreshGroupExpenses(props.id); } catch (err) { captureError(err, 'GroupView.refreshGroupExpenses'); toast.show('Synchronisation impossible', 'error'); }
});

const monthLabel = computed(() =>
  group.value
    ? group.value.createdAt.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    : '',
);

function memberName(id: string): string {
  if (id === userId.value) return 'toi';
  return group.value?.members.find((m) => m.id === id)?.name ?? 'Inconnu';
}

function userShare(expenseId: string): number {
  const exp = expenses.value.find((e) => e.id === expenseId);
  return exp?.shares.find((s) => s.memberId === userId.value)?.amount ?? 0;
}

// ── Invitation à rejoindre le groupe (QR + lien) ────────────────────────────
const showInviteQR = ref(false);
const inviteHttpsUrl = ref('');
const inviteQrDeeplink = ref('');

async function invite() {
  const g = group.value;
  if (!g?.inviteToken) {
    toast.show('Synchronisation requise avant de partager', 'error');
    return;
  }
  inviteHttpsUrl.value = buildInviteUrl(g.id, g.inviteToken);
  inviteQrDeeplink.value = buildInviteDeeplink(inviteHttpsUrl.value);
  showInviteQR.value = true;
}

async function copyInviteLink() {
  if (!navigator.clipboard?.writeText) {
    toast.show(inviteHttpsUrl.value, 'info');
    return;
  }
  try {
    await navigator.clipboard.writeText(inviteHttpsUrl.value);
    toast.show('Lien d\'invitation copié', 'success');
  } catch {
    toast.show(inviteHttpsUrl.value, 'info');
  }
}

// ── Invitation à payer (feuille dédiée) ─────────────────────────────────────
const inviteExpense = ref<Expense | null>(null);

// ── Édition du groupe (nom + icône) ─────────────────────────────────────────
const editGroupOpen = ref(false);
const editGroupName = ref('');
const editGroupIcon = ref<GroupIcon>('person');

function openEditGroup() {
  if (!group.value) return;
  editGroupName.value = group.value.name;
  editGroupIcon.value = group.value.icon;
  editGroupOpen.value = true;
}

function saveGroup() {
  const name = editGroupName.value.trim();
  if (!name) return;
  store.updateGroup(props.id, { name, icon: editGroupIcon.value });
  editGroupOpen.value = false;
  toast.show('Groupe mis à jour', 'success');
}

// ── Édition d'une dépense (description) ─────────────────────────────────────
const editExpense = ref<Expense | null>(null);
const editExpenseDesc = ref('');

function openEditExpense(exp: Expense) {
  editExpense.value = exp;
  editExpenseDesc.value = exp.description;
}

function closeEditExpense() {
  editExpense.value = null;
  editExpenseDesc.value = '';
}

function saveExpense() {
  const description = editExpenseDesc.value.trim();
  if (!description || !editExpense.value) return;
  store.updateExpense(editExpense.value.id, { description });
  closeEditExpense();
  toast.show('Dépense mise à jour', 'success');
}

function goBack() {
  router.back();
}

function goToAddExpense() {
  router.push({ name: 'addExpense', query: { groupId: props.id } });
}


function settle() {
  const g = group.value;
  if (!g) return;

  const creator = g.members.find((m) => m.id === g.creatorId);
  if (!creator) {
    toast.show('Créateur du groupe introuvable', 'error');
    return;
  }
  if (!creator.id.startsWith('NQ')) {
    toast.show('Le créateur doit se connecter avec Nimiq Pay pour recevoir le paiement', 'error');
    return;
  }

  const room: ShareableRoom = {
    id: `settle_${g.id}_${userId.value.slice(-8)}`,
    creatorId: creator.id,
    creatorName: creator.name,
    amount: Math.abs(balance.value),
    currency: 'NIM',
    reason: `Règlement · ${g.name}`,
    maxParticipants: 1,
  };

  router.push({
    name: 'pay',
    query: { room: encodeURIComponent(JSON.stringify(room)), groupId: g.id },
  });
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
      <button class="icon-btn" @click="openEditGroup">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="3.5" r="1.3" fill="#3D3B35"/>
          <circle cx="8" cy="8" r="1.3" fill="#3D3B35"/>
          <circle cx="8" cy="12.5" r="1.3" fill="#3D3B35"/>
        </svg>
      </button>
    </div>

    <!-- Members + invite -->
    <div class="members-row">
      <InitialAvatar
        v-for="(m, i) in group.members"
        :key="m.id"
        :name="m.name"
        :index="i"
        :size="36"
        ring
      />
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
    <div v-else-if="hasNoShares" class="pending-card">
      <div class="pending-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" stroke="white" stroke-width="1.8"/>
          <path d="M9 6V9.5L11 11.5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>
      <div>
        <div class="pending-title">Parts en attente</div>
        <div class="pending-sub">Demande au créateur de te générer un lien de paiement depuis chaque dépense</div>
      </div>
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
      <ExpenseCard
        v-for="exp in expenses"
        :key="exp.id"
        :expense="exp"
        :user-share="userShare(exp.id)"
        :paid-by-name="memberName(exp.paidBy)"
        :is-mine="exp.paidBy === userId"
        @select="inviteExpense = exp"
        @edit="openEditExpense(exp)"
      />
    </div>

    <!-- Empty expenses -->
    <div v-else class="expense-empty">
      <div class="expense-empty-text">Aucune dépense pour l'instant</div>
      <button class="expense-empty-cta" @click="goToAddExpense">+ Ajouter une dépense</button>
    </div>

    <!-- Feuille : QR d'invitation au groupe -->
    <BaseSheet v-if="showInviteQR" @close="showInviteQR = false">
      <div class="sheet-title">Inviter dans le groupe</div>
      <div class="sheet-sub">Fais scanner ce QR ou partage le lien</div>
      <div class="invite-qr-box">
        <QRCodeGenerator :url="inviteQrDeeplink" :size="200" />
      </div>
      <p class="invite-qr-hint">En présentiel : caméra native → Nimiq Pay s'ouvre directement</p>
      <button class="sheet-copy" @click="copyInviteLink">Copier le lien d'invitation</button>
      <p class="invite-qr-note">Le lien fonctionne aussi via messagerie (Messenger, etc.)</p>
    </BaseSheet>

    <!-- Feuille : inviter à payer une part -->
    <InviteSheet
      v-if="inviteExpense"
      :expense="inviteExpense"
      :group="group"
      :user-id="userId"
      @close="inviteExpense = null"
    />

    <!-- Feuille : modifier le groupe (nom + icône) -->
    <BaseSheet v-if="editGroupOpen" @close="editGroupOpen = false">
      <div class="sheet-title">Modifier le groupe</div>
      <div class="sheet-sub">Nom et icône du groupe</div>

      <div class="edit-label">Icône</div>
      <GroupIconPicker v-model="editGroupIcon" />

      <div class="edit-label">Nom</div>
      <input
        class="edit-input"
        v-model="editGroupName"
        type="text"
        placeholder="Nom du groupe"
        @keyup.enter="saveGroup"
      />

      <button class="sheet-copy" :disabled="!editGroupName.trim()" @click="saveGroup">Enregistrer</button>
      <button class="sheet-back" @click="editGroupOpen = false">Annuler</button>
    </BaseSheet>

    <!-- Feuille : modifier la description d'une dépense -->
    <BaseSheet v-if="editExpense" @close="closeEditExpense">
      <div class="sheet-title">Modifier la dépense</div>
      <div class="sheet-sub">{{ editExpense.amount.toFixed(2) }} {{ editExpense.currency }} · payé par {{ memberName(editExpense.paidBy) }}</div>

      <div class="edit-label">Description</div>
      <input
        class="edit-input"
        v-model="editExpenseDesc"
        type="text"
        placeholder="Description de la dépense"
        @keyup.enter="saveExpense"
      />

      <button class="sheet-copy" :disabled="!editExpenseDesc.trim()" @click="saveExpense">Enregistrer</button>
      <button class="sheet-back" @click="closeEditExpense">Annuler</button>
    </BaseSheet>
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

.pending-card {
  margin: 0 18px 14px;
  background: #FFF8E6;
  border: 1px solid #F6B221;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-shrink: 0;
}

.pending-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #E6900A;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pending-title { font-size: 13px; font-weight: 700; color: #7A4C00; }
.pending-sub { font-size: 11px; color: #7A4C00; opacity: 0.8; margin-top: 3px; line-height: 1.4; }

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

.invite-qr-box {
  display: flex;
  justify-content: center;
  margin: 16px 0 8px;
}

.invite-qr-hint {
  font-size: 11px;
  color: var(--text);
  text-align: center;
  line-height: 1.5;
  margin: 0 0 4px;
}

.invite-qr-note {
  font-size: 11px;
  color: var(--text);
  text-align: center;
  margin: 6px 0 0;
  opacity: 0.7;
}

/* Edit sheets (contenu dans BaseSheet) */
.sheet-title { font-size: 17px; font-weight: 700; color: var(--dark); }
.sheet-sub { font-size: 12px; color: var(--text); margin-top: 2px; margin-bottom: 14px; }

.edit-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin: 14px 0 10px;
}

.edit-input {
  width: 100%;
  border: 1.5px solid var(--border-subtle);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  background: #FAFAF8;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}

.edit-input::placeholder { color: var(--text); }

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

.sheet-copy:disabled { opacity: 0.4; cursor: not-allowed; }

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
