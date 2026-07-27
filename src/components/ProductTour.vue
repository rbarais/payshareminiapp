<template>
  <div class="tour">
    <div v-if="rect" class="spotlight" :style="spotlightStyle" />
    <div v-else class="dim" />

    <div class="tour-card" :class="{ centered: placement === 'center' }" :style="cardStyle">
      <div class="card-head">
        <span class="step-label">{{ t('tour.step', { i: index + 1, n: STEPS.length }) }}</span>
        <button class="skip" :aria-label="t('tour.skip')" @click="$emit('close')">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M2 2L12 12M12 2L2 12"
              stroke="rgba(255,255,255,0.5)"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="tour-title">{{ t(`tour.${step.key}.title`) }}</div>
      <div class="tour-desc">{{ t(`tour.${step.key}.desc`) }}</div>

      <div class="card-foot">
        <div class="dots">
          <span
            v-for="(item, position) in STEPS"
            :key="item.key"
            class="dot"
            :class="{ active: position === index }"
          />
        </div>
        <button class="next-btn" @click="next">
          {{ isLast ? t('tour.finish') : t('tour.next') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from '../stores/i18n';
import { useModalBack } from '../composables/modalBack';

// Guided tour shown on first launch (and replayable from the settings sheet).
// Every step points at an element of the home screen carrying a `data-tour`
// attribute; the first step has no target and dims the whole screen.

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// `key` names the translation block (`tour.<key>.title` / `.desc`) so inserting
// a step never renumbers the locale files. A step covering several targets is
// spotlit through their bounding box, which only reads well for neighbours. A
// step whose targets are all missing from the DOM falls back to the dimmed,
// centred presentation of the intro step.
const STEPS = [
  { key: 'intro', targets: [], pad: 0 },
  { key: 'notifications', targets: ['bell'], pad: 6 },
  { key: 'balance', targets: ['balance'], pad: 6 },
  { key: 'groupActions', targets: ['scan', 'newgroup'], pad: 8 },
  { key: 'group', targets: ['grouplist'], pad: 8 },
  { key: 'tabs', targets: ['nav-history', 'nav-profile'], pad: 8 },
  { key: 'outro', targets: [], pad: 0 },
] as const;

const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

// Hardware / browser back ends the tour instead of navigating.
useModalBack(() => emit('close'));

const index = ref(0);
const rect = ref<Rect | null>(null);
const step = computed(() => STEPS[index.value]);
const isLast = computed(() => index.value === STEPS.length - 1);

function next() {
  if (isLast.value) {
    emit('close');
    return;
  }
  index.value += 1;
  rect.value = null;
}

// The home screen scrolls, transitions and reflows under the overlay, so the
// target is re-measured every frame rather than on a set of listeners.
let frame = 0;

function measure() {
  frame = requestAnimationFrame(measure);
  const current = step.value;
  if (!current.targets.length) {
    rect.value = null;
    return;
  }

  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const target of current.targets) {
    const el = document.querySelector(`[data-tour="${target}"]`);
    if (!el) continue;
    const box = el.getBoundingClientRect();
    top = Math.min(top, box.top);
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  if (top === Infinity) return;

  const measured: Rect = {
    top: top - current.pad,
    left: left - current.pad,
    width: right - left + current.pad * 2,
    height: bottom - top + current.pad * 2,
  };
  const prev = rect.value;
  if (
    !prev ||
    prev.top !== measured.top ||
    prev.left !== measured.left ||
    prev.width !== measured.width ||
    prev.height !== measured.height
  ) {
    rect.value = measured;
  }
}

onMounted(measure);
onBeforeUnmount(() => cancelAnimationFrame(frame));

const spotlightStyle = computed(() => {
  const box = rect.value;
  if (!box) return {};
  return {
    top: `${box.top}px`,
    left: `${box.left}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  };
});

// Placed under the highlighted element when there is room below it, above it
// otherwise, and centred when the element is too tall for either side (a long
// group list). Anchoring on `bottom` for the "above" case avoids having to
// measure the card itself.
const CARD_SPACE = 210;
const GAP = 12;

const placement = computed<'below' | 'above' | 'center'>(() => {
  const box = rect.value;
  if (!box) return 'center';
  if (window.innerHeight - (box.top + box.height) >= CARD_SPACE) return 'below';
  if (box.top >= CARD_SPACE) return 'above';
  return 'center';
});

const cardStyle = computed(() => {
  const box = rect.value;
  if (!box || placement.value === 'center') return {};
  if (placement.value === 'below') return { top: `${box.top + box.height + GAP}px` };
  return { bottom: `${window.innerHeight - box.top + GAP}px` };
});
</script>

<style scoped>
.tour {
  position: fixed;
  inset: 0;
  z-index: 80;
  overflow: hidden;
}

.dim,
.spotlight {
  position: absolute;
}

.dim {
  inset: 0;
  background: rgba(10, 9, 7, 0.72);
}

.spotlight {
  border-radius: 16px;
  box-shadow: 0 0 0 9999px rgba(10, 9, 7, 0.72);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tour-card {
  position: absolute;
  left: 20px;
  right: 20px;
  max-width: 330px;
  margin: 0 auto;
  background: #1f1d18;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  animation: tour-card-in 0.24s ease;
}

.tour-card.centered {
  top: 50%;
  transform: translateY(-50%);
}

@keyframes tour-card-in {
  from {
    opacity: 0;
  }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.step-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.skip {
  display: flex;
  padding: 0;
  border: 0;
  background: none;
}

.tour-title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
  letter-spacing: -0.2px;
}

.tour-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.5;
  margin-bottom: 16px;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dots {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  transition: all 0.2s ease;
}

.dot.active {
  width: 16px;
  border-radius: 3px;
  background: var(--accent);
}

.next-btn {
  border: 0;
  background: var(--accent);
  border-radius: 12px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 700;
  color: #1a1916;
}

.next-btn:active {
  opacity: 0.8;
}
</style>
