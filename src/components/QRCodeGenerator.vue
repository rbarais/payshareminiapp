<script setup lang="ts">
import { computed } from 'vue';
import QrcodeVue from 'qrcode.vue';

const props = defineProps<{
  url: string;
  size?: number;
}>();

const size = computed(() => props.size || 220);
</script>

<template>
  <div class="qr-wrapper">
    <QrcodeVue
      :value="url"
      :size="size"
      foreground="#000000"
      background="#ffffff"
      level="H"
    />
  </div>
</template>

<style scoped>
.qr-wrapper {
  display: inline-flex;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
