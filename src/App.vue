<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { onMounted, watch } from 'vue';
import { decodeRoomFromUrl, decodeRoomFromText } from './utils/room';

const router = useRouter()
const route = useRoute()

// Gérer le décodage de l'URL au montage et lors des changements de route
function checkUrlForRoom() {
  const room = decodeRoomFromUrl()
  if (room && route.name !== 'pay') {
    router.push({
      name: 'pay',
      query: { room: encodeURIComponent(JSON.stringify(room)) }
    })
  }
}

onMounted(() => {
  checkUrlForRoom()
})

// Surveiller les changements de route pour réagir aux retours
watch(() => route.name, (newName) => {
  if (newName === 'home' || newName === 'group') {
    checkUrlForRoom()
  }
})

function handleScanned(text: string) {
  const room = decodeRoomFromText(text)
  if (room) {
    router.push({
      name: 'pay',
      query: { room: encodeURIComponent(JSON.stringify(room)) }
    })
  } else {
    router.push({ name: 'home' })
  }
}

function handlePaySuccess(amount: number, recipient: string) {
  router.push({
    name: 'success',
    query: { amount: amount.toString(), recipient }
  })
}
</script>

<template>
  <router-view
    @new-group="router.push({ name: 'newGroup' })"
    @open-group="router.push({ name: 'group' })"
    @open-scanner="router.push({ name: 'scan' })"
    @back="router.back()"
    @add-expense="router.push({ name: 'addExpense' })"
    @pay="router.push({ name: 'pay' })"
    @scanned="handleScanned"
    @success="handlePaySuccess"
  />
</template>
