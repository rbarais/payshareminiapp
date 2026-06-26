<script setup lang="ts">
import { ref } from 'vue';
import { useSession } from '../stores/session';
import { buildInviteDeeplink } from '../utils/room';

const session = useSession();
const emit = defineEmits<{ connected: [] }>();

// Relaie l'URL courante (avec un éventuel ?r= d'invitation) vers Nimiq Pay via
// le deeplink. Déclenché par un tap (geste utilisateur) → ouverture fiable.
function openInNimiqPay() {
  window.location.href = buildInviteDeeplink(window.location.href);
}

// 'idle' → écran d'accueil · 'connecting' → recherche pairs · 'connected' → succès
const phase = ref<'idle' | 'connecting' | 'connected'>('idle');

const features = [
  { title: 'Groupes de dépenses', sub: 'Voyages, appart, restos — partagez sans friction', tint: 'rgba(246,178,33,0.14)', icon: 'people' },
  { title: 'Règlement en 2 secondes', sub: 'Payez en crypto, sans passer par une banque', tint: 'rgba(33,184,126,0.14)', icon: 'flash' },
  { title: 'Transparent & vérifiable', sub: 'Tout est tracé sur la blockchain Nimiq', tint: 'rgba(100,130,255,0.14)', icon: 'shield' },
];

async function connect() {
  phase.value = 'connecting';
  const ok = await session.connect();
  if (!ok) {
    phase.value = 'idle';
    return;
  }
  phase.value = 'connected';
  // Laisse le message de succès s'afficher brièvement avant d'entrer dans l'app.
  setTimeout(() => emit('connected'), 700);
}
</script>

<template>
  <div class="onboard">
    <!-- Écran d'accueil -->
    <div v-if="phase === 'idle'" class="hero">
      <div class="logo-badge">
        <svg width="40" height="40" viewBox="0 0 26 26" fill="none"><path d="M6 20L13 4L20 20H6Z" fill="#1A1916"/></svg>
      </div>
      <div class="brand">PayShare</div>
      <div class="tagline">powered by <span>Nimiq Blockchain</span></div>

      <div class="features">
        <div v-for="f in features" :key="f.title" class="feature">
          <div class="feature-icon" :style="{ background: f.tint }">
            <svg v-if="f.icon === 'people'" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="8" r="3" stroke="#F6B221" stroke-width="1.4"/><circle cx="13" cy="8" r="3" stroke="#F6B221" stroke-width="1.4"/><path d="M1 18C1 15.5 3.7 13.5 7 13.5C10.3 13.5 13 15.5 13 18" stroke="#F6B221" stroke-width="1.4" stroke-linecap="round"/><path d="M13 13.5C16.3 13.5 19 15.5 19 18" stroke="#F6B221" stroke-width="1.4" stroke-linecap="round"/></svg>
            <svg v-else-if="f.icon === 'flash'" width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2 10H18M12 4L18 10L12 16" stroke="#21B87E" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 1.5L3 5V10.5C3 14.5 6 17.9 10 18.7C14 17.9 17 14.5 17 10.5V5L10 1.5Z" stroke="#7080FF" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 10L9 12L13 8" stroke="#7080FF" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="feature-text">
            <div class="feature-title">{{ f.title }}</div>
            <div class="feature-sub">{{ f.sub }}</div>
          </div>
        </div>
      </div>

      <button class="cta" @click="connect">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect width="22" height="22" rx="6" fill="#1B1F3B"/>
          <polygon points="19,11 15,4.1 7,4.1 3,11 7,17.9 15,17.9" fill="#F6B221"/>
        </svg>
        <span>Me connecter via Nimiq Pay</span>
      </button>
      <button
        v-if="session.isNimiqApp.value === false"
        class="cta-secondary"
        @click="openInNimiqPay"
      >
        Ouvrir dans Nimiq Pay
      </button>
      <p v-if="session.error.value" class="err">{{ session.error.value }}</p>
      <p class="privacy">Aucune donnée personnelle n'est collectée. Tes clés restent dans Nimiq Pay.</p>
    </div>

    <!-- Connexion en cours / succès -->
    <div v-else class="status">
      <div class="logo-badge pulse">
        <svg width="40" height="40" viewBox="0 0 26 26" fill="none"><path d="M6 20L13 4L20 20H6Z" fill="#1A1916"/></svg>
      </div>
      <div class="status-text">
        {{ phase === 'connected' ? 'Wallet connecté !' : 'Connexion au réseau…' }}
      </div>
      <div class="status-sub">
        {{ phase === 'connected' ? session.walletShort.value : 'Recherche des pairs Nimiq…' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboard {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1A1916;
  min-height: 100svh;
}

.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
}

.logo-badge {
  width: 78px;
  height: 78px;
  border-radius: 24px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 12px 40px rgba(246, 178, 33, 0.45);
  flex-shrink: 0;
}

.brand {
  font-size: 33px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -1.2px;
  margin-bottom: 5px;
}

.tagline {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.07em;
  font-style: italic;
  margin-bottom: 28px;
}

.tagline span { color: var(--accent); font-weight: 700; }

.features {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 12px 14px;
}

.feature-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 2px;
}

.feature-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  line-height: 1.4;
}

.cta {
  width: 100%;
  background: var(--accent);
  border: none;
  border-radius: 18px;
  padding: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 8px 28px rgba(246, 178, 33, 0.35);
  transition: opacity 0.15s;
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--dark);
  font-family: inherit;
}

.cta:active { opacity: 0.85; }

.cta-secondary {
  width: 100%;
  margin-top: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 15px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
}

.cta-secondary:active { opacity: 0.85; }

.err {
  margin-top: 12px;
  font-size: 12px;
  color: #FF8A8A;
  text-align: center;
}

.privacy {
  margin-top: 13px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.22);
  text-align: center;
  line-height: 1.6;
}

/* Status / connecting */
.status {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px;
}

.status-text {
  margin-top: 28px;
  font-size: 19px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.4px;
  text-align: center;
}

.status-sub {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
  text-align: center;
  line-height: 1.7;
}

.pulse { animation: pulse 1.1s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.92); opacity: 0.7; }
}
</style>
