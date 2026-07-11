<template>
  <LoginView v-if="!showApp" />
  <NameSetup v-else-if="needsName" />
  <template v-else>
    <router-view
      style="flex: 1; min-height: 0; overflow: hidden"
      @new-group="router.push({ name: 'newGroup' })"
      @open-group="router.push({ name: 'group' })"
      @open-scanner="router.push({ name: 'scan' })"
      @open-settings="showSettings = true"
      @back="router.back()"
      @add-expense="router.push({ name: 'addExpense' })"
      @pay="router.push({ name: 'pay' })"
      @scanned="handleScanned"
      @success="handlePaySuccess"
    />
    <BottomNav v-if="showNav" :active="navActive" @open-settings="showSettings = true" />
    <SettingsSheet v-if="showSettings" @close="showSettings = false" @disconnect="askDisconnect" />
    <ConfirmDialog
      v-if="showDisconnectConfirm"
      :title="t('settings.disconnectConfirmTitle')"
      :body="t('settings.disconnectConfirmBody')"
      :confirm-label="t('settings.disconnect')"
      :cancel-label="t('common.cancel')"
      danger
      @confirm="confirmDisconnect"
      @cancel="showDisconnectConfirm = false"
    />
  </template>
  <ToastHost />
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { onMounted, watch, computed, ref } from 'vue';
import { decodeRoomFromUrl, decodeRoomFromText, decodeInviteFromText } from './utils/room';
import { useSession } from './stores/session';
import { useToast } from './stores/toast';
import { t } from './stores/i18n';
import LoginView from './views/LoginView.vue';
import NameSetup from './components/NameSetup.vue';
import ToastHost from './components/ToastHost.vue';
import BottomNav from './components/BottomNav.vue';
import SettingsSheet from './components/SettingsSheet.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { usePrefs } from './stores/prefs';

const router = useRouter();
const route = useRoute();
const session = useSession();
const toast = useToast();
const { displayName } = usePrefs();

const NAV_ROUTES = new Set(['home', 'groups', 'history']);
const showNav = computed(() => NAV_ROUTES.has(route.name as string));
const navActive = computed(
  () => route.name as unknown as 'home' | 'groups' | 'history' | 'profile',
);

const showSettings = ref(false);
const showDisconnectConfirm = ref(false);

function askDisconnect() {
  showSettings.value = false;
  showDisconnectConfirm.value = true;
}

function confirmDisconnect() {
  showDisconnectConfirm.value = false;
  session.disconnect();
  router.replace({ name: 'home' });
}

// The app is only reachable once the Nimiq provider has initialized (we are
// indeed inside Nimiq Pay) AND the user is connected. If init() fails, we stay
// on the login screen, even with a cached session.
const showApp = computed(() => session.isLoggedIn.value && session.isNimiqApp.value === true);

// Once in the app, force the name-setup screen until a display name is chosen.
const needsName = computed(() => showApp.value && !displayName.value);

// Replay any deeplink (?r=… payment, ?g=&t= invitation) as soon as we enter
// the app.
watch(showApp, (visible) => {
  if (visible) checkUrlForDeeplink();
});

// Handle URL decoding on mount and on route changes.
function checkUrlForDeeplink() {
  // Invitation to join a group: ?g=<id>&t=<token>
  const invite = decodeInviteFromText(window.location.href);
  if (invite && route.name !== 'join') {
    router.push({ name: 'join', query: { g: invite.groupId, t: invite.token } });
    return;
  }
  // Payment link: ?r=<base64>
  const room = decodeRoomFromUrl();
  if (room && route.name !== 'pay') {
    router.push({
      name: 'pay',
      query: { room: encodeURIComponent(JSON.stringify(room)) },
    });
  }
}

onMounted(async () => {
  // Start the Nimiq provider init at startup (see mini-app tutorial).
  // If init() fails, we do not enter the app: a simple toast for now, a
  // dedicated screen will come later.
  const inNimiq = await session.checkEnvironment();
  if (!inNimiq) {
    toast.show(t('error.openInNimiq'), 'error');
  }
  if (showApp.value) checkUrlForDeeplink();
});

// Watch route changes to react to back navigations.
watch(
  () => route.name,
  (newName) => {
    if (newName === 'home' || newName === 'group') {
      checkUrlForDeeplink();
    }
  },
);

function handleScanned(text: string) {
  // A nimiqpay:// deeplink embeds the https URL → extract it first.
  const decoded = text.startsWith('nimiqpay://')
    ? decodeURIComponent(new URL(text).searchParams.get('url') ?? '')
    : text;

  const invite = decodeInviteFromText(decoded);
  if (invite) {
    router.push({ name: 'join', query: { g: invite.groupId, t: invite.token } });
    return;
  }
  const room = decodeRoomFromText(decoded);
  if (room) {
    router.push({ name: 'pay', query: { room: encodeURIComponent(JSON.stringify(room)) } });
    return;
  }
  router.push({ name: 'home' });
}

function handlePaySuccess(amount: number, recipient: string) {
  router.push({
    name: 'success',
    query: { amount: amount.toString(), recipient },
  });
}
</script>
