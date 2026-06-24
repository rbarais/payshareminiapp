<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter()

const groupName = ref('');
const selectedIcon = ref(0);

const icons = [
  { bg: '#FFF1CF', color: '#B07808', type: 'person' },
  { bg: '#E0F5EE', color: '#0D3A5C', type: 'home' },
  { bg: '#EAEEFF', color: '#0A4028', type: 'car' },
  { bg: '#F0EEE9', color: '#3844B0', type: 'list' },
];

function goBack() {
  router.back()
}

function done() {
  if (!groupName.value.trim()) return;
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="screen">
    <div class="top-bar">
      <button class="icon-btn" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="#3D3B35" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
      <span class="bar-title">Nouveau groupe</span>
      <div style="width:36px"/>
    </div>

    <div class="content">
      <!-- Icon + Name card -->
      <div class="field-card">
        <div class="field-label">Icône du groupe</div>
        <div class="icon-picker">
          <button
            v-for="(icon, i) in icons"
            :key="i"
            class="icon-option"
            :class="{ selected: selectedIcon === i }"
            :style="{ background: icon.bg }"
            @click="selectedIcon = i"
          >
            <svg v-if="icon.type === 'person'" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 18C4 15 7.13 12.5 11 12.5C14.87 12.5 18 15 18 18" :stroke="icon.color" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="11" cy="8" r="3.5" :stroke="icon.color" stroke-width="1.5"/>
            </svg>
            <svg v-else-if="icon.type === 'home'" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z" :stroke="icon.color" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="icon.type === 'car'" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="6.5" cy="15.5" r="2.5" :stroke="icon.color" stroke-width="1.5"/>
              <circle cx="15.5" cy="15.5" r="2.5" :stroke="icon.color" stroke-width="1.5"/>
              <path d="M2 15.5H4M9 15.5H13M18 15.5H20M4 15.5V9L7 5H15L18 9V15.5" :stroke="icon.color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 6H18M4 11H18M4 16H12" :stroke="icon.color" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="field-label" style="margin-top:18px;">Nom</div>
        <div class="name-input-wrap">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 13L5 10M9 2L13 6L6.5 12.5L2.5 12.5L2.5 8.5L9 2Z" stroke="#8B8880" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <input
            class="name-input"
            v-model="groupName"
            type="text"
            placeholder="Vacances été 2025"
          />
          <div class="caret"/>
        </div>
      </div>

      <!-- Members card -->
      <div class="field-card">
        <div class="field-label">Membres</div>
        <div class="members-row">
          <div class="member">
            <div class="member-av" style="overflow:hidden;">
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
            <span class="member-name">Alex</span>
            <span class="member-sub">toi</span>
          </div>
          <button class="add-member">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V12M2 7H12" stroke="#6B6860" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            <span>Inviter</span>
          </button>
        </div>
      </div>

      <div class="spacer"/>
    </div>

    <!-- CTA -->
    <div class="cta-area">
      <button class="btn-primary" :disabled="!groupName.trim()" @click="done">
        Créer le groupe
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
  background: var(--border);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.content {
  flex: 1;
  padding: 0 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.field-card {
  background: var(--bg-card);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.field-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  margin-bottom: 12px;
}

/* Icon picker */
.icon-picker {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.icon-option {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.icon-option.selected {
  border-color: var(--dark);
  transform: scale(1.05);
}

/* Name input */
.name-input-wrap {
  border: 1.5px solid var(--border-subtle);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FAFAF8;
}

.name-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  background: transparent;
  font-family: inherit;
}

.name-input::placeholder { color: var(--text); }

.caret {
  width: 1.5px;
  height: 16px;
  background: var(--accent);
  border-radius: 2px;
  animation: blink 1s step-start infinite;
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* Members */
.members-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.member {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.member-av {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--dark);
}

.member-sub {
  font-size: 9px;
  color: var(--text);
}

.add-member {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 1.5px dashed var(--border);
  background: none;
  border-radius: 50%;
  width: 46px;
  height: 46px;
  cursor: pointer;
  margin-top: 0;
  transition: border-color 0.15s;
}

.add-member svg { margin-top: 12px; }
.add-member span { display: none; }
.add-member:hover { border-color: var(--dark); }

.spacer { flex: 1; }

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

.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }
</style>
