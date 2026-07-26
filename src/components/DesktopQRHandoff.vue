<template>
  <div class="handoff">
    <QRCodeGenerator :url="url" :size="164" />
    <p class="handoff-note">{{ t('login.desktopQr') }}</p>
  </div>
</template>

<script setup lang="ts">
import { t } from '../stores/i18n';
import QRCodeGenerator from './QRCodeGenerator.vue';

// Desktop has no Nimiq Pay app, so the deeplink is a dead end: hand the visitor
// over to their phone instead. The QR carries the https URL (not the
// nimiqpay:// deeplink) so the phone lands on this same screen, where the
// deeplink and its store fallback take over.
defineProps<{ url: string }>();
</script>

<style scoped>
.handoff {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.handoff-note {
  max-width: 260px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  line-height: 1.6;
}
</style>
