<template>
  <div class="onboard">
    <!-- Home screen -->
    <template v-if="phase === 'idle'">
      <div class="hero">
        <div class="logo-badge">
          <PayshareIcon width="78" height="78" />
        </div>
        <div class="brand">PayShare</div>
        <div class="slogan">{{ t('common.slogan') }}</div>

        <!-- Pending invitation: targeted UI -->
        <template v-if="pendingInvite">
          <div class="invite-card">
            <div class="invite-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="10" cy="11" r="4" stroke="#F6B221" stroke-width="1.6" />
                <circle cx="18" cy="11" r="4" stroke="#F6B221" stroke-width="1.6" />
                <path
                  d="M2 24C2 20.5 5.6 17.5 10 17.5C14.4 17.5 18 20.5 18 24"
                  stroke="#F6B221"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
                <path
                  d="M18 17.5C22.4 17.5 26 20.5 26 24"
                  stroke="#F6B221"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <div class="invite-title">{{ inviteTitle }}</div>
            <div class="invite-sub">
              {{ t('login.inviteSub') }}
            </div>
          </div>

          <button v-if="inNimiqApp" class="cta" @click="connect">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="6" fill="#1B1F3B" />
              <polygon points="19,11 15,4.1 7,4.1 3,11 7,17.9 15,17.9" fill="#F6B221" />
            </svg>
            <span>{{ t('login.connectBtn') }}</span>
          </button>
          <DesktopQRHandoff v-else-if="isDesktop" :url="pageUrl" />
          <template v-else>
            <button class="cta" @click="openInNimiqPay">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect width="22" height="22" rx="6" fill="#1B1F3B" />
                <polygon points="19,11 15,4.1 7,4.1 3,11 7,17.9 15,17.9" fill="#F6B221" />
              </svg>
              <span>{{ t('login.openInNimiq') }}</span>
            </button>
            <p class="invite-hint">
              {{ t('login.inviteHint') }}
            </p>
          </template>
          <p v-if="session.error.value" class="err">{{ session.error.value }}</p>
        </template>

        <!-- Standard home screen -->
        <template v-else>
          <p class="hero-sub">{{ t('login.heroSub') }}</p>

          <div class="badges">
            <span v-for="b in badges" :key="b" class="badge">{{ b }}</span>
          </div>

          <div class="why">
            <h2 class="why-title">{{ t('login.whyTitle') }}</h2>
            <p class="why-sub">{{ t('login.whySub') }}</p>
          </div>

          <div class="features">
            <div v-for="f in features" :key="f.title" class="feature">
              <div class="feature-icon" :style="{ background: f.tint }">
                <svg
                  v-if="f.icon === 'people'"
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <circle cx="7" cy="8" r="3" stroke="#F6B221" stroke-width="1.4" />
                  <circle cx="13" cy="8" r="3" stroke="#F6B221" stroke-width="1.4" />
                  <path
                    d="M1 18C1 15.5 3.7 13.5 7 13.5C10.3 13.5 13 15.5 13 18"
                    stroke="#F6B221"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                  <path
                    d="M13 13.5C16.3 13.5 19 15.5 19 18"
                    stroke="#F6B221"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
                <svg
                  v-else-if="f.icon === 'flash'"
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M2 10H18M12 4L18 10L12 16"
                    stroke="#21B87E"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 1.5L3 5V10.5C3 14.5 6 17.9 10 18.7C14 17.9 17 14.5 17 10.5V5L10 1.5Z"
                    stroke="#7080FF"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M7 10L9 12L13 8"
                    stroke="#7080FF"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div class="feature-text">
                <div class="feature-title">{{ f.title }}</div>
                <div class="feature-sub">{{ f.sub }}</div>
              </div>
            </div>
          </div>

          <button v-if="inNimiqApp" class="cta" @click="connect">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="6" fill="#1B1F3B" />
              <polygon points="19,11 15,4.1 7,4.1 3,11 7,17.9 15,17.9" fill="#F6B221" />
            </svg>
            <span>{{ t('login.connectBtn') }}</span>
          </button>
          <DesktopQRHandoff v-else-if="isDesktop" :url="pageUrl" />
          <template v-else>
            <button class="cta" @click="openInNimiqPay">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect width="22" height="22" rx="6" fill="#1B1F3B" />
                <polygon points="19,11 15,4.1 7,4.1 3,11 7,17.9 15,17.9" fill="#F6B221" />
              </svg>
              <span>{{ t('login.openInNimiq') }}</span>
            </button>
            <p class="store-hint">{{ t('login.storeHint') }}</p>
          </template>
          <p v-if="session.error.value" class="err">{{ session.error.value }}</p>
          <p class="privacy">
            {{ t('login.privacy') }}
          </p>
        </template>
      </div>

      <div class="powered">powered by <span>Nimiq Blockchain</span></div>
    </template>

    <!-- Connecting / success -->
    <div v-else class="status">
      <div class="logo-badge pulse">
        <PayshareIcon width="78" height="78" />
      </div>
      <div class="status-text">
        {{ phase === 'connected' ? t('login.connected') : t('login.connecting') }}
      </div>
      <div class="status-sub">
        {{ phase === 'connected' ? session.walletShort.value : t('login.searchingPeers') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSession } from '../stores/session';
import { t } from '../stores/i18n';
import { decodeInviteFromText } from '../utils/room';
import { fetchJoinPreview } from '../utils/api';
import { detectPlatform, openInNimiqPay as handoffToNimiqPay } from '../utils/appLinks';
import PayshareIcon from '../assets/svg/payshareIcon.svg';
import DesktopQRHandoff from '../components/DesktopQRHandoff.vue';

const session = useSession();
const emit = defineEmits<{ connected: [] }>();

// Detect whether the URL contains a group invitation (?g=&t=).
const pendingInvite = computed(() => decodeInviteFromText(window.location.href));

// The link only carries the group id: read the public preview to name the group
// in the invitation. Stays empty on failure, the title falls back to a generic
// wording rather than blocking the connection.
const inviteGroupName = ref('');

const inviteTitle = computed(() =>
  inviteGroupName.value
    ? t('login.inviteTitleNamed', { name: inviteGroupName.value })
    : t('login.inviteTitle'),
);

onMounted(async () => {
  const invite = pendingInvite.value;
  if (!invite) return;
  try {
    const preview = await fetchJoinPreview(invite.groupId, invite.token);
    inviteGroupName.value = preview.name;
  } catch {
    // Invalid or expired token: keep the generic title.
  }
});

// Only `true` unlocks "Se connecter". While detection is undetermined (`null`)
// we offer the deeplink: it is the safe default — a plain browser (or an in-app
// browser like Messenger's) cannot connect a wallet, and offering a CTA that
// fails leaves the user stuck. Inside Nimiq Pay the host marker is readable
// synchronously, so this state is a non-event there.
const inNimiqApp = computed(() => session.isNimiqApp.value === true);

// Desktop cannot run Nimiq Pay: no deeplink there, a QR handoff instead.
const isDesktop = detectPlatform() === 'desktop';
const pageUrl = window.location.href;

// Relay the current URL to Nimiq Pay via deeplink, or to the store if the app
// is not installed. Triggered by a tap (user gesture → required on iOS for
// custom schemes).
function openInNimiqPay() {
  handoffToNimiqPay(pageUrl);
}

// 'idle' → home screen · 'connecting' → peer discovery · 'connected' → success
const phase = ref<'idle' | 'connecting' | 'connected'>('idle');

const badges = computed(() => [
  t('login.badgeFree'),
  t('login.badgeSpeed'),
  t('login.badgeSecure'),
]);

const features = computed(() => [
  {
    title: t('login.feature1Title'),
    sub: t('login.feature1Sub'),
    tint: 'rgba(246,178,33,0.14)',
    icon: 'people',
  },
  {
    title: t('login.feature2Title'),
    sub: t('login.feature2Sub'),
    tint: 'rgba(33,184,126,0.14)',
    icon: 'flash',
  },
  {
    title: t('login.feature3Title'),
    sub: t('login.feature3Sub'),
    tint: 'rgba(100,130,255,0.14)',
    icon: 'shield',
  },
]);

async function connect() {
  phase.value = 'connecting';
  const ok = await session.connect();
  if (!ok) {
    phase.value = 'idle';
    return;
  }
  phase.value = 'connected';
  // Let the success message show briefly before entering the app.
  setTimeout(() => emit('connected'), 700);
}
</script>

<style scoped>
.onboard {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #1a1916;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* flex-shrink: 0 — le contenu dépasse la hauteur d'écran sur les petits
   téléphones, il doit pousser le scroll de .onboard plutôt qu'être compressé. */
.hero {
  flex: 1 0 auto;
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

.slogan {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: -0.2px;
  line-height: 1.5;
  text-align: center;
  text-wrap: pretty;
}

.hero-sub {
  margin-top: 14px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.6;
  text-align: center;
  text-wrap: pretty;
}

.badges {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
  white-space: nowrap;
}

.badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.why {
  margin-top: 32px;
  text-align: center;
}

.why-title {
  font-size: 19px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.4px;
}

.why-sub {
  margin-top: 8px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.55;
  text-wrap: pretty;
}

.powered {
  flex-shrink: 0;
  padding: 0 28px calc(20px + env(safe-area-inset-bottom));
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.07em;
  font-style: italic;
  text-align: center;
}

.powered span {
  color: var(--accent);
  font-weight: 700;
}

.features {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 18px 0 28px;
}

.feature {
  display: flex;
  align-items: flex-start;
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
  margin-bottom: 3px;
}

.feature-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  line-height: 1.5;
  text-wrap: pretty;
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
  color: var(--ink);
  font-family: inherit;
}

.cta:active {
  opacity: 0.85;
}

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

.cta-secondary:active {
  opacity: 0.85;
}

.invite-card {
  width: 100%;
  background: rgba(246, 178, 33, 0.1);
  border: 1px solid rgba(246, 178, 33, 0.25);
  border-radius: 20px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 28px 0 24px;
  text-align: center;
}

.invite-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: rgba(246, 178, 33, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.invite-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.3px;
}

.invite-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.55;
}

.invite-hint {
  margin-top: 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
  text-align: center;
  line-height: 1.6;
}

.store-hint {
  margin-top: 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
  line-height: 1.6;
}

.err {
  margin-top: 12px;
  font-size: 12px;
  color: #ff8a8a;
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

.pulse {
  animation: pulse 1.1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.92);
    opacity: 0.7;
  }
}
</style>
