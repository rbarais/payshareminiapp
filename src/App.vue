<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { onMounted, watch, computed } from 'vue';
import { decodeRoomFromUrl, decodeRoomFromText, decodeInviteFromText } from './utils/room';
import { useSession } from './stores/session';
import { useToast } from './stores/toast';
import LoginView from './views/LoginView.vue';
import ToastHost from './components/ToastHost.vue';

const router = useRouter()
const route = useRoute()
const session = useSession()
const toast = useToast()

// L'app n'est accessible que si le provider Nimiq s'est initialisé (on est
// bien dans Nimiq Pay) ET que l'utilisateur est connecté. Si init() échoue,
// on reste sur l'écran de login, même avec une session en cache.
const showApp = computed(
  () => session.isLoggedIn.value && session.isNimiqApp.value === true,
)

// Rejoue un éventuel lien profond (?r=… paiement, ?g=&t= invitation) dès qu'on
// entre dans l'app.
watch(showApp, (visible) => {
  if (visible) checkUrlForDeeplink()
})

// Gérer le décodage de l'URL au montage et lors des changements de route
function checkUrlForDeeplink() {
  // Invitation à rejoindre un groupe : ?g=<id>&t=<token>
  const invite = decodeInviteFromText(window.location.href)
  if (invite && route.name !== 'join') {
    router.push({ name: 'join', query: { g: invite.groupId, t: invite.token } })
    return
  }
  // Lien de paiement : ?r=<base64>
  const room = decodeRoomFromUrl()
  if (room && route.name !== 'pay') {
    router.push({
      name: 'pay',
      query: { room: encodeURIComponent(JSON.stringify(room)) }
    })
  }
}

onMounted(async () => {
  // Lance l'init du provider Nimiq au démarrage (cf. tutoriel mini-app).
  // Si init() échoue, on n'entre pas dans l'app : simple toast pour l'instant,
  // un écran dédié viendra plus tard.
  const inNimiq = await session.checkEnvironment()
  if (!inNimiq) {
    toast.show('Ouvre PayShare depuis Nimiq Pay pour les paiements réels.', 'error')
  }
  if (showApp.value) checkUrlForDeeplink()
})

// Surveiller les changements de route pour réagir aux retours
watch(() => route.name, (newName) => {
  if (newName === 'home' || newName === 'group') {
    checkUrlForDeeplink()
  }
})

function handleScanned(text: string) {
  // Un deeplink nimiqpay:// embarque l'URL https → on l'extrait d'abord.
  const decoded = text.startsWith('nimiqpay://') ? decodeURIComponent(new URL(text).searchParams.get('url') ?? '') : text;

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
    query: { amount: amount.toString(), recipient }
  })
}
</script>

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
