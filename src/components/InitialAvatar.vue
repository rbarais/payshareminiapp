<template>
  <div class="avatar" :class="{ ring }" :style="style">{{ initial(name) }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { avatarStyle, initial } from '../utils/avatars';

// Circular initial avatar, colored by index (shared palette).
const props = withDefaults(
  defineProps<{ name: string; index?: number; size?: number; ring?: boolean }>(),
  { index: 0, size: 36, ring: false },
);

const style = computed(() => {
  const palette = avatarStyle(props.index);
  return {
    background: palette.bg,
    color: palette.color,
    width: `${props.size}px`,
    height: `${props.size}px`,
    fontSize: `${Math.round(props.size * 0.4)}px`,
  };
});
</script>

<style scoped>
.avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.avatar.ring {
  border: 2.5px solid var(--bg);
}
</style>
