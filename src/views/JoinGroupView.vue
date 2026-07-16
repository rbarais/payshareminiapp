<template>
  <div class="screen">
    <ScreenHeader :title="t('join.title')" close @back="goBack" />

    <div class="content">
      <!-- Chargement preview -->
      <div v-if="loadingPreview" class="loading">{{ t('join.loading') }}</div>

      <!-- Placeholders disponibles -->
      <template v-else-if="placeholders.length > 0 && choice === null">
        <p class="hint">{{ $t('join.hint', { name: groupName }) }}</p>

        <div class="placeholder-list">
          <button
            v-for="p in placeholders"
            :key="p.id"
            class="placeholder-btn"
            @click="selectPlaceholder(p.id)"
          >
            <InitialAvatar :name="p.name" :size="40" />
            <span class="placeholder-name">{{ p.name }}</span>
            <ChevronRightIcon class="chevron" />
          </button>

          <button class="placeholder-btn new" @click="selectNew">
            <div class="new-avatar">+</div>
            <span class="placeholder-name">{{ t('join.notInList') }}</span>
            <ChevronRightIcon class="chevron" />
          </button>
        </div>
      </template>

      <!-- Selected placeholder: confirm -->
      <template v-else-if="choice !== null && choice !== 'new'">
        <div class="confirm-card">
          <InitialAvatar :name="placeholders.find((p) => p.id === choice)?.name ?? ''" :size="56" />
          <p class="confirm-name">{{ placeholders.find((p) => p.id === choice)?.name }}</p>
          <p class="hint">{{ t('join.confirmHint') }}</p>
        </div>
        <button class="link-back" @click="choice = null">{{ t('join.chooseOther') }}</button>
      </template>

      <!-- Nouveau membre : entrer son nom -->
      <template v-else>
        <div class="field-card">
          <p class="hint">
            {{ placeholders.length > 0 ? t('join.newMemberHint') : t('join.chooseNameHint') }}
          </p>
          <div class="name-label">{{ t('join.nameLabel') }}</div>
          <div class="name-input-wrap">
            <input
              v-model="displayName"
              class="name-input"
              type="text"
              :placeholder="t('join.namePlaceholder')"
              @keyup.enter="join"
            />
          </div>
        </div>
        <button v-if="placeholders.length > 0" class="link-back" @click="choice = null">
          {{ t('join.backToList') }}
        </button>
      </template>
    </div>

    <div class="cta-area">
      <button class="btn-primary" :disabled="!canJoin() || joining" @click="join">
        {{ joining ? t('join.joining') : t('join.joinBtn') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '../stores/session';
import { useToast } from '../stores/toast';
import { t } from '../stores/i18n';
import { joinGroup, fetchJoinPreview } from '../utils/api';
import { authenticate, getStoredJwt } from '../utils/auth';
import { captureError } from '../utils/errors';
import InitialAvatar from '../components/InitialAvatar.vue';
import ScreenHeader from '../components/ScreenHeader.vue';
import ChevronRightIcon from '../assets/svg/chevronRight.svg';

const props = defineProps<{ groupId: string; token: string }>();

const router = useRouter();
const session = useSession();
const toast = useToast();

// Available placeholders (address IS NULL) in the group
const placeholders = ref<{ id: string; name: string }[]>([]);
const loadingPreview = ref(true);

// null = not chosen yet · string = selected placeholder UUID · 'new' = new member
const choice = ref<string | 'new' | null>(null);
const displayName = ref(session.user.value?.name ?? '');
const joining = ref(false);
const groupName = ref('');

onMounted(async () => {
  if (!props.groupId || !props.token) {
    loadingPreview.value = false;
    return;
  }
  try {
    const preview = await fetchJoinPreview(props.groupId, props.token);
    placeholders.value = preview.placeholders;
  } catch {
    // Invalid token or network error — we'll find out at join time
  } finally {
    loadingPreview.value = false;
  }
  // Pre-fill the name if already connected
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
    toast.show(t('join.toastNotConnected'), 'error');
    return;
  }
  if (choice.value === null) {
    toast.show(t('join.toastChooseWho'), 'error');
    return;
  }
  if (choice.value === 'new' && !displayName.value.trim()) {
    toast.show(t('join.toastEnterName'), 'error');
    return;
  }

  joining.value = true;
  try {
    if (!getStoredJwt()) await authenticate(user.id);

    const options =
      choice.value === 'new' ? { name: displayName.value.trim() } : { placeholderId: choice.value };
    const { name } = await joinGroup(props.groupId, props.token, options);
    groupName.value = name;
    toast.show(t('join.toastJoined', { name }), 'success');
  } catch (err) {
    if (err instanceof Error && err.message === 'API 409') {
      toast.show(t('join.toastAlreadyMember'), 'success');
      router.replace({ name: 'home' });
      joining.value = false;
      return;
    }
    captureError(err, 'JoinGroupView.joinGroup');
    toast.show(t('join.toastInvalidInvite'), 'error');
    joining.value = false;
    return;
  }

  router.replace({ name: 'home' });
  joining.value = false;
}

const canJoin = () => {
  if (choice.value === null) return false;
  if (choice.value === 'new') return !!displayName.value.trim();
  return true;
};
</script>

<style scoped>
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
  color: var(--text-mid);
  line-height: 1.45;
  margin: 0 0 4px;
}
.chevron {
  color: var(--text);
  flex-shrink: 0;
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
  background: var(--bg-card);
  border: none;
  border-radius: 16px;
  padding: 12px 14px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.placeholder-btn:active {
  opacity: 0.75;
}
.placeholder-btn.new {
  background: var(--border);
}
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
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--text);
  flex-shrink: 0;
}
.confirm-card {
  background: var(--bg-card);
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
  background: var(--bg-card);
  border-radius: 18px;
  padding: 18px;
}
.name-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 18px 0 8px;
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
  color: var(--text-mid);
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
  align-self: flex-start;
}
.cta-area {
  padding: 16px 18px calc(16px + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
</style>
