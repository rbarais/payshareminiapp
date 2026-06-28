<script setup lang="ts">
// Nimiq identity mosaic (visual placeholder for the connected wallet).
// Identical everywhere: extracted to avoid duplicating the SVG.
withDefaults(defineProps<{ size?: number }>(), { size: 38 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 38 38">
    <rect width="38" height="38" fill="#5F4B8B" />
    <polygon points="0,0 19,19 38,0" fill="#7B6BA5" />
    <polygon points="38,0 19,19 38,38" fill="#4E3D7A" />
    <polygon points="38,38 19,19 0,38" fill="#6B5A98" />
    <polygon points="0,38 19,19 0,0" fill="#533F85" />
    <circle cx="19" cy="19" r="6" fill="#F6B221" />
    <polygon points="15.5,23.5 19,12.5 22.5,23.5" fill="#5F4B8B" />
  </svg>
</template>
