<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  roomId: string;
  size?: number;
  color?: string;
  bgColor?: string;
}>();

const size = computed(() => props.size || 200);

// Génère l'URL pour le deep link Nimiq
const qrValue = computed(() => {
  // Dans un vrai environnement Nimiq, utiliser le deep link
  // Pour le dev, on peut utiliser un simple ID ou un lien local
  return `payshare://room/${props.roomId}`;
});

// URL du QR code généré (utilisation d'une API externe pour simplifier)
const qrCodeUrl = computed(() => {
  // Utilisation de l'API Google Charts pour générer le QR code
  // En production, on pourrait utiliser une lib locale comme qrcode
  return `https://chart.googleapis.com/chart?chs=${size.value}x${size.value}&cht=qr&chl=${encodeURIComponent(qrValue.value)}&choe=UTF-8`;
});
</script>

<template>
  <div class="qr-code-generator">
    <div class="qr-container">
      <img 
        :src="qrCodeUrl" 
        :alt="`QR Code pour la room ${roomId}`"
        :width="size"
        :height="size"
        class="qr-image"
      />
    </div>
    <slot></slot>
  </div>
</template>

<style scoped>
.qr-code-generator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.qr-image {
  border-radius: 8px;
}

/* Style pour le mode sombre */
@media (prefers-color-scheme: dark) {
  .qr-container {
    background: white;
  }
}
</style>
