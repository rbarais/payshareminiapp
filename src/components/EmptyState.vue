<template>
  <div class="empty">
    <div class="empty-icon"><slot /></div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="sub" class="empty-sub">{{ sub }}</div>
    <button v-if="cta" class="empty-cta" @click="$emit('cta')">{{ cta }}</button>
  </div>
</template>

<script setup lang="ts">
// État vide centré : icône (slot), titre, sous-titre et CTA optionnels.
defineProps<{ title: string; sub?: string; cta?: string }>();
defineEmits<{ cta: [] }>();
</script>

<style scoped>
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  padding: 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  box-shadow: var(--shadow-sm);
  color: var(--text-faint);
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--dark);
}

.empty-sub {
  font-size: 12px;
  color: var(--text);
  max-width: 220px;
  line-height: 1.4;
}

.empty-cta {
  margin-top: 12px;
  background: var(--accent);
  border: none;
  border-radius: 14px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
}
</style>
