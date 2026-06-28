<script setup lang="ts">
import type { GroupIcon } from '../types';
import { GROUP_ICON_STYLE } from '../utils/groupUi';
import GroupIconGlyph from './GroupIcon.vue';

// Group icon picker (v-model). Reused for both creation and editing.
defineProps<{ modelValue: GroupIcon }>();
const emit = defineEmits<{ 'update:modelValue': [GroupIcon] }>();

const TYPES: GroupIcon[] = ['person', 'home', 'car', 'list'];
</script>

<template>
  <div class="icon-picker">
    <button
      v-for="type in TYPES"
      :key="type"
      type="button"
      class="icon-option"
      :class="{ selected: modelValue === type }"
      :style="{ background: GROUP_ICON_STYLE[type].bg }"
      @click="emit('update:modelValue', type)"
    >
      <GroupIconGlyph :type="type" :color="GROUP_ICON_STYLE[type].color" />
    </button>
  </div>
</template>

<style scoped>
.icon-picker {
  display: flex;
  gap: 10px;
}

.icon-option {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    border-color 0.15s,
    transform 0.1s;
}

.icon-option.selected {
  border-color: var(--dark);
  transform: scale(1.05);
}
</style>
