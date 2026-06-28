<template>
  <img :src="identicon" ref="identicon" :width="size" :height="size" viewBox="0 0 38 38">
  </img>
</template>

<script setup lang="ts">
import Identicons from '@nimiq/identicons'
import { onMounted, ref } from 'vue';
// Nimiq identity mosaic (visual placeholder for the connected wallet).
// Identical everywhere: extracted to avoid duplicating the SVG.
const props = withDefaults(defineProps<{ size?: number, address?: string | null }>(), { size: 38, address: null });
const identicon = ref('')
onMounted(async () => {
  if (props.address) {
    identicon.value = await Identicons.toDataUrl(props.address)
  }
  else {
    identicon.value = Identicons.placeholderToDataUrl('#bbb', 1)
  }
})
</script>
