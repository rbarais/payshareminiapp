<template>
  <LoginView v-if="!showApp" />
  <router-view
    v-else
    @new-group="router.push({ name: 'newGroup' })"
    @open-group="router.push({ name: 'group' })"
    @open-scanner="router.push({ name: 'scan' })"
    @back="router.back()"
    @add-expense="router.push({ name: 'addExpense' })"
    @pay="router.push({ name: 'pay' })"
    @scanned="handleScanned"
    @success="handlePaySuccess"
  />
  <ToastHost />
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { onMounted, watch, computed } from 'vue';
import { decodeRoomFromUrl, decodeRoomFromText, decodeInviteFromText } from './utils/room';
import { useSession } from './stores/session';
import { useToast } from './stores/toast';
import LoginView from './views/LoginView.vue';
import ToastHost from './components/ToastHost.vue';

const router = useRouter();
const route = useRoute();
const session = useSession();
const toast = useToast();

// The app is only reachable once the Nimiq provider has initialized (we are
// indeed inside Nimiq Pay) AND the user is connected. If init() fails, we stay
// on the login screen, even with a cached session.
const showApp = computed(() => session.isLoggedIn.value && session.isNimiqApp.value === true);

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
    toast.show('Ouvre PayShare depuis Nimiq Pay pour les paiements réels.', 'error');
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
