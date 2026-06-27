<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import { joinGroup, fetchJoinPreview } from '../utils/api';
import { authenticate, getStoredJwt } from '../utils/auth';
import { captureError } from '../utils/errors';
import InitialAvatar from '../components/InitialAvatar.vue';

const props = defineProps<{ g: string; t: string }>();

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();

// Placeholders disponibles (address IS NULL) dans le groupe
const placeholders = ref<{ id: string; name: string }[]>([]);
const loadingPreview = ref(true);

// null = pas encore choisi · string = UUID du placeholder sélectionné · 'new' = nouveau membre
const choice = ref<string | 'new' | null>(null);
const displayName = ref(session.user.value?.name ?? '');
const joining = ref(false);

onMounted(async () => {
  if (!props.g || !props.t) { loadingPreview.value = false; return; }
  try {
    const preview = await fetchJoinPreview(props.g, props.t);
    placeholders.value = preview.placeholders;
  } catch {
    // Token invalide ou réseau — on le saura au moment du join
  } finally {
    loadingPreview.value = false;
  }
  // Pré-remplir le nom si déjà connecté
  if (session.user.value?.name) displayName.value = session.user.value.name;
});

function goBack() {
  router.replace({ name: 'home' });
}

function selectPlaceholder(id: string) {
  choice.value = id;
}

function selectNew() {
  choice.value = 'new';
}

async function join() {
  if (joining.value) return;
  const user = session.user.value;
  if (!user) {
    toast.show('Connecte-toi pour rejoindre', 'error');
    return;
  }
  if (choice.value === null) {
    toast.show('Choisis qui tu es', 'error');
    return;
  }
  if (choice.value === 'new' && !displayName.value.trim()) {
    toast.show('Entre ton prénom', 'error');
    return;
  }

  joining.value = true;
  try {
    if (!getStoredJwt()) await authenticate(user.id);

    const options =
      choice.value === 'new'
        ? { name: displayName.value.trim() }
        : { placeholderId: choice.value };

    await joinGroup(props.g, props.t, options);
  } catch (err) {
    captureError(err, 'JoinGroupView.joinGroup');
    toast.show('Invitation invalide ou déjà utilisée', 'error');
    joining.value = false;
    return;
  }

  try {
    await store.refreshAll();
  } catch (err) {
    captureError(err, 'JoinGroupView.refreshAll');
  }

  const groupName = store.getGroup(props.g)?.name ?? 'le groupe';
  toast.show(`Tu as rejoint « ${groupName} »`, 'success');
  router.replace({ name: 'home' });
  joining.value = false;
}

const canJoin = () => {
  if (choice.value === null) return false;
  if (choice.value === 'new') return !!displayName.value.trim();
  return true;
};
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
      <!-- Chargement preview -->
      <div v-if="loadingPreview" class="loading">Chargement…</div>

      <!-- Placeholders disponibles -->
      <template v-else-if="placeholders.length > 0 && choice === null">
        <p class="hint">Tu as été invité à rejoindre un groupe. Qui es-tu parmi ces membres ?</p>

        <div class="placeholder-list">
          <button
            v-for="p in placeholders"
            :key="p.id"
            class="placeholder-btn"
            @click="selectPlaceholder(p.id)"
          >
            <InitialAvatar :name="p.name" :size="40" />
            <span class="placeholder-name">{{ p.name }}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="#8B8880" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button class="placeholder-btn new" @click="selectNew">
            <div class="new-avatar">+</div>
            <span class="placeholder-name">Je ne suis pas dans la liste</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="#8B8880" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </template>

      <!-- Placeholder sélectionné : confirmer -->
      <template v-else-if="choice !== null && choice !== 'new'">
        <div class="confirm-card">
          <InitialAvatar :name="placeholders.find(p => p.id === choice)?.name ?? ''" :size="56" />
          <p class="confirm-name">{{ placeholders.find(p => p.id === choice)?.name }}</p>
          <p class="hint">Tu vas lier ton wallet Nimiq à ce membre du groupe.</p>
        </div>
        <button class="link-back" @click="choice = null">← Choisir un autre</button>
      </template>

      <!-- Nouveau membre : entrer son nom -->
      <template v-else>
        <div class="field-card">
          <p class="hint">
            {{ placeholders.length > 0
              ? 'Tu rejoins le groupe en tant que nouveau membre.'
              : 'Tu as été invité à rejoindre un groupe. Choisis le nom visible par les autres.' }}
          </p>
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
        <button v-if="placeholders.length > 0" class="link-back" @click="choice = null">← Choisir dans la liste</button>
      </template>
    </div>

    <div class="cta-area">
      <button
        class="btn-primary"
        :disabled="!canJoin() || joining"
        @click="join"
      >
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
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.loading {
  font-size: 13px;
  color: var(--text);
  text-align: center;
  margin-top: 40px;
}
.hint {
  font-size: 14px;
  color: var(--muted, #6B6860);
  line-height: 1.45;
  margin: 0 0 4px;
}
.placeholder-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.placeholder-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card, #fff);
  border: none;
  border-radius: 16px;
  padding: 12px 14px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.placeholder-btn:active { opacity: 0.75; }
.placeholder-btn.new { background: var(--border, #f0ede8); }
.placeholder-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--dark);
}
.new-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg, #f5f3ef);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--text);
  flex-shrink: 0;
}
.confirm-card {
  background: var(--card, #fff);
  border-radius: 18px;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.confirm-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--dark);
  margin: 0;
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
.link-back {
  background: none;
  border: none;
  font-size: 13px;
  color: var(--text-mid, #8B8880);
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
  align-self: flex-start;
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
.btn-primary:disabled { opacity: 0.5; }
</style>
