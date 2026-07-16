<template>
  <div class="icon-row">
    <!-- 4 primary icons, inline -->
    <button
      v-for="type in PRIMARY"
      :key="type"
      type="button"
      class="icon-tile"
      :class="{ selected: modelValue === type }"
      :style="{ background: GROUP_ICON_STYLE[type].bg }"
      @click="emit('update:modelValue', type)"
    >
      <GroupIconGlyph :type="type" :color="GROUP_ICON_STYLE[type].color" />
    </button>

    <!-- "More" tile: opens the full sheet. Shows the current extended pick, or a +. -->
    <button
      type="button"
      class="icon-tile"
      :class="{ selected: isExtended }"
      :style="isExtended ? { background: GROUP_ICON_STYLE[modelValue].bg } : undefined"
      @click="sheetOpen = true"
    >
      <GroupIconGlyph
        v-if="isExtended"
        :type="modelValue"
        :color="GROUP_ICON_STYLE[modelValue].color"
      />
      <PlusIcon v-else width="18" height="18" class="more-icon" />
    </button>
  </div>

  <BaseSheet v-if="sheetOpen" :title="t('groupIcons.pickerTitle')" @close="sheetOpen = false">
    <div class="icon-grid">
      <button
        v-for="type in TYPES"
        :key="type"
        type="button"
        class="grid-option"
        :class="{ selected: modelValue === type }"
        @click="select(type)"
      >
        <span class="icon-tile" :style="{ background: GROUP_ICON_STYLE[type].bg }">
          <GroupIconGlyph :type="type" :color="GROUP_ICON_STYLE[type].color" />
        </span>
        <span class="icon-label">{{ t(`groupIcons.${type}`) }}</span>
      </button>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GroupIcon } from '../types';
import { GROUP_ICON_STYLE } from '../utils/groupUi';
import { useI18n } from '../stores/i18n';
import GroupIconGlyph from './GroupIcon.vue';
import BaseSheet from './BaseSheet.vue';
import PlusIcon from '../assets/svg/plus.svg';

// Group icon picker (v-model). Reused for both creation and editing.
// Repris du proto : 4 icônes inline + un « + » qui ouvre une modale avec les 12.
const props = defineProps<{ modelValue: GroupIcon }>();
const emit = defineEmits<{ 'update:modelValue': [GroupIcon] }>();

const { t } = useI18n();

const PRIMARY: GroupIcon[] = ['person', 'home', 'car', 'list'];
const TYPES: GroupIcon[] = [
  'person',
  'home',
  'car',
  'list',
  'food',
  'sport',
  'shopping',
  'travel',
  'beach',
  'birthday',
  'work',
  'cafe',
];

const sheetOpen = ref(false);
const isExtended = computed(() => !PRIMARY.includes(props.modelValue));

function select(type: GroupIcon) {
  emit('update:modelValue', type);
  sheetOpen.value = false;
}
</script>

<style scoped>
.icon-row {
  display: flex;
  gap: 10px;
}

.icon-tile {
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

.icon-tile.selected,
.grid-option.selected .icon-tile {
  border-color: var(--dark);
  transform: scale(1.05);
}

.more-icon {
  color: var(--text-mid);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 8px;
}

.grid-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.icon-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text);
  text-align: center;
}

.grid-option.selected .icon-label {
  color: var(--dark);
}
</style>
