<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ShareableRoom } from './types';
import { decodeRoomFromUrl, decodeRoomFromText } from './utils/room';
import HomeView from './views/HomeView.vue';
import GroupView from './views/GroupView.vue';
import AddExpenseView from './views/AddExpenseView.vue';
import PayView from './views/PayView.vue';
import SuccessView from './views/SuccessView.vue';
import NewGroupView from './views/NewGroupView.vue';
import QRScanner from './components/QRScanner.vue';

type View = 'home' | 'group' | 'add' | 'pay' | 'success' | 'newGroup' | 'scan';

const view = ref<View>('home');
const incomingRoom = ref<ShareableRoom | null>(null);
const paymentAmount = ref(0);
const paymentRecipient = ref('');

onMounted(() => {
  const room = decodeRoomFromUrl();
  if (room) {
    incomingRoom.value = room;
    view.value = 'pay';
  }
});

function handleScanned(text: string) {
  const room = decodeRoomFromText(text);
  if (room) {
    incomingRoom.value = room;
    view.value = 'pay';
  } else {
    view.value = 'home';
  }
}

function handlePaySuccess(amount: number, recipient: string) {
  paymentAmount.value = amount;
  paymentRecipient.value = recipient;
  view.value = 'success';
}
</script>

<template>
  <QRScanner v-if="view === 'scan'" @scanned="handleScanned" @cancel="view = 'home'" />

  <HomeView
    v-else-if="view === 'home'"
    @new-group="view = 'newGroup'"
    @open-group="view = 'group'"
    @open-scanner="view = 'scan'"
  />

  <GroupView
    v-else-if="view === 'group'"
    @back="view = 'home'"
    @add-expense="view = 'add'"
    @pay="view = 'pay'"
    @open-scanner="view = 'scan'"
  />

  <AddExpenseView
    v-else-if="view === 'add'"
    @back="view = 'group'"
    @done="view = 'group'"
  />

  <PayView
    v-else-if="view === 'pay' && incomingRoom"
    :room="incomingRoom"
    @back="view = 'home'"
    @success="(a, r) => handlePaySuccess(a, r)"
  />
  <PayView
    v-else-if="view === 'pay' && !incomingRoom"
    :room="null"
    @back="view = 'group'"
    @success="(a, r) => handlePaySuccess(a, r)"
  />

  <SuccessView
    v-else-if="view === 'success'"
    :amount="paymentAmount"
    :recipient="paymentRecipient"
    @back="view = 'home'"
  />

  <NewGroupView
    v-else-if="view === 'newGroup'"
    @back="view = 'home'"
    @done="view = 'home'"
  />
</template>
