<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import { joinGroup } from '../utils/api';
import { authenticate } from '../utils/auth';
import { getStoredJwt } from '../utils/auth';
import { captureError } from '../utils/errors';

const props = defineProps<{ g: string; t: string }>();

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();

const displayName = ref(session.user.value?.name ?? '');
const joining = ref(false);

function goBack() {
  router.replace({ name: 'home' });
}

async function join() {
  const name = displayName.value.trim();
  if (!name || joining.value) return;
  const user = session.user.value;
  if (!user) {
    toast.show('Connecte-toi pour rejoindre', 'error');
    return;
  }
  joining.value = true;
  try {
    // S'assurer qu'un JWT de session est présent avant l'appel RLS.
    if (!getStoredJwt()) await authenticate(user.id);
    await joinGroup(props.g, props.t, name);
    await store.refreshGroups();
    toast.show('Groupe rejoint', 'success');
    router.replace({ name: 'group', params: { id: props.g } });
  } catch (err) {
    captureError(err, 'JoinGroupView.joinGroup');
    toast.show('Invitation invalide', 'error');
  } finally {
    joining.value = false;
  }
}
</script>

<template>
  <div class="screen">
    <div class="top-bar">
      <button class="icon-btn" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="#3D3B35" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
      <span class="bar-title">Rejoindre un groupe</span>
      <div style="width:36px"/>
    </div>

    <div class="content">
      <div class="field-card">
        <p class="hint">Tu as été invité·e à rejoindre un groupe partagé. Choisis le nom qui sera visible par les autres membres.</p>

        <div class="field-label" style="margin-top:18px;">Ton nom</div>
        <div class="name-input-wrap">
          <input
            class="name-input"
            v-model="displayName"
            type="text"
            placeholder="Ton prénom"
            @keyup.enter="join"
          />
        </div>
      </div>
    </div>

    <div class="cta-area">
      <button class="btn-primary" :disabled="!displayName.trim() || joining" @click="join">
        {{ joining ? 'Connexion…' : 'Rejoindre le groupe' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.top-bar {
  padding: 10px 18px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.bar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dark);
}
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--border);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.content {
  flex: 1;
  padding: 0 18px;
  overflow-y: auto;
}
.field-card {
  background: var(--card, #fff);
  border-radius: 18px;
  padding: 18px;
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted, #8B8880);
  margin-bottom: 8px;
}
.hint {
  font-size: 14px;
  color: var(--muted, #6B6860);
  line-height: 1.45;
  margin: 0;
}
.name-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg);
  border-radius: 12px;
  padding: 12px 14px;
}
.name-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: var(--dark);
  outline: none;
}
.cta-area {
  padding: 16px 18px calc(16px + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
.btn-primary {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: var(--accent, #1F2348);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
.btn-primary:disabled {
  opacity: 0.5;
}
</style>
