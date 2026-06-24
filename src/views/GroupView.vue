<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'add-expense'): void;
  (e: 'pay'): void;
  (e: 'open-scanner'): void;
}>();

const paid = ref(false);

const expenses = [
  { id: 1, title: 'Restaurant El Born', paidBy: 'Marie', date: '12 jan', total: '84 NIM', share: '−21 NIM', shareColor: '#CC3C3C', pct: 25, barColor: '#F6B221' },
  { id: 2, title: 'Airbnb — 3 nuits', paidBy: 'Alex', date: '10 jan', total: '180 NIM', share: 'tu as payé', shareColor: '#198060', pct: 100, barColor: '#198060' },
  { id: 3, title: 'Musée Picasso', paidBy: 'Lucas', date: '11 jan', total: '32 NIM', share: '−8 NIM', shareColor: '#CC3C3C', pct: 25, barColor: '#F6B221' },
];
</script>

<template>
  <div class="screen">
    <!-- Header -->
    <div class="header">
      <button class="icon-btn" @click="emit('back')">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path d="M10.5 4L6 8.5L10.5 13" stroke="#1A1916" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="header-info">
        <div class="header-title">Vacances Barcelone</div>
        <div class="header-sub">4 membres · janv. 2025</div>
      </div>
      <button class="icon-btn">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="3.5" r="1.3" fill="#3D3B35"/>
          <circle cx="8" cy="8" r="1.3" fill="#3D3B35"/>
          <circle cx="8" cy="12.5" r="1.3" fill="#3D3B35"/>
        </svg>
      </button>
    </div>

    <!-- Members + QR -->
    <div class="members-row">
      <div class="avatar" style="background:#5F4B8B; overflow:hidden; border-color: var(--bg);">
        <svg width="36" height="36" viewBox="0 0 38 38">
          <rect width="38" height="38" fill="#5F4B8B"/>
          <polygon points="0,0 19,19 38,0" fill="#7B6BA5"/>
          <polygon points="38,0 19,19 38,38" fill="#4E3D7A"/>
          <polygon points="38,38 19,19 0,38" fill="#6B5A98"/>
          <polygon points="0,38 19,19 0,0" fill="#533F85"/>
          <circle cx="19" cy="19" r="6" fill="#F6B221"/>
          <polygon points="15.5,23.5 19,12.5 22.5,23.5" fill="#5F4B8B"/>
        </svg>
      </div>
      <div class="avatar" style="background:#BEE0FF; color:#0D3A5C;">M</div>
      <div class="avatar" style="background:#C6F0DC; color:#0A4028;">L</div>
      <div class="avatar" style="background:#F0D4E8; color:#4A1040;">J</div>
      <div class="avatar" style="background:var(--border); color:var(--text-mid); font-size:11px;">+2</div>
      <button class="qr-btn" @click="emit('open-scanner')">
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

    <!-- Debt card -->
    <div v-if="!paid" class="debt-card">
      <div>
        <div class="debt-who">Tu dois à Marie</div>
        <div class="debt-amount">42.50 NIM</div>
        <div class="debt-eur">≈ 2.91 EUR</div>
      </div>
      <button class="settle-btn" @click="emit('pay')">Régler →</button>
    </div>
    <div v-else class="settled-card">
      <div class="settled-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 9L7.5 12.5L14 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <div class="settled-title">Groupe soldé ✓</div>
        <div class="settled-sub">42.50 NIM envoyés à Marie</div>
      </div>
    </div>

    <!-- Expenses header -->
    <div class="expenses-header">
      <span class="expenses-title">Dépenses</span>
      <button class="add-btn" @click="emit('add-expense')">+ Ajouter</button>
    </div>

    <!-- Expense list -->
    <div class="expense-list">
      <div v-for="exp in expenses" :key="exp.id" class="expense-card">
        <div class="expense-top">
          <div class="expense-left">
            <div class="expense-title">{{ exp.title }}</div>
            <div class="expense-meta">Payé par {{ exp.paidBy }} · {{ exp.date }}</div>
          </div>
          <div class="expense-right">
            <div class="expense-total">{{ exp.total }}</div>
            <div class="expense-share" :style="{ color: exp.shareColor }">{{ exp.share }}</div>
          </div>
        </div>
        <div class="bar-bg">
          <div class="bar-fill" :style="{ width: exp.pct + '%', background: exp.barColor }"/>
        </div>
      </div>
    </div>

    <div style="height:14px; flex-shrink:0;" />
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

.header-info {
  flex: 1;
  min-width: 0;
}

.header-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.3px;
}

.header-sub {
  font-size: 11px;
  color: var(--text);
  margin-top: 1px;
}

/* Members */
.members-row {
  padding: 0 18px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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

/* Debt card */
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

.debt-who {
  font-size: 11px;
  color: var(--red);
  font-weight: 600;
  margin-bottom: 3px;
}

.debt-amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--red);
  letter-spacing: -0.5px;
}

.debt-eur {
  font-size: 10px;
  color: var(--red);
  opacity: 0.75;
  margin-top: 2px;
}

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

.settled-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--green);
}

.settled-sub {
  font-size: 11px;
  color: var(--green);
  opacity: 0.75;
  margin-top: 2px;
}

/* Expenses */
.expenses-header {
  padding: 0 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.expenses-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dark);
}

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
  padding: 0 18px;
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
}

.expense-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 9px;
}

.expense-left { flex: 1; min-width: 0; }

.expense-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
}

.expense-meta {
  font-size: 11px;
  color: var(--text);
  margin-top: 2px;
}

.expense-right {
  text-align: right;
  flex-shrink: 0;
  margin-left: 8px;
}

.expense-total {
  font-size: 13px;
  font-weight: 600;
  color: var(--dark);
}

.expense-share {
  font-size: 10px;
  margin-top: 1px;
}

.bar-bg {
  height: 3px;
  background: var(--border-subtle);
  border-radius: 2px;
}

.bar-fill {
  height: 100%;
  border-radius: 2px;
}
</style>
