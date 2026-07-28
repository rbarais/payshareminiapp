<template>
  <div class="screen">
    <ScreenHeader :title="t('join.title')" close @back="goBack" />

    <div class="content">
      <!-- Chargement preview -->
      <div v-if="loadingPreview" class="loading">{{ t('join.loading') }}</div>

      <template v-else>
        <!-- Invitation -->
        <div v-if="groupName" class="invite-card">
          <div class="invite-label">{{ t('join.invitation') }}</div>
          <div class="invite-row">
            <div class="group-icon" :style="{ background: iconStyle.bg }">
              <GroupIcon :type="groupIcon" :color="iconStyle.color" />
            </div>
            <div class="invite-info">
              <div class="invite-name">{{ groupName }}</div>
              <div class="invite-meta">
                {{ t('group.membersCount', { count: memberCount }, memberCount) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Placeholders disponibles -->
        <template v-if="placeholders.length > 0 && choice === null">
          <p class="hint">{{ t('join.whoAreYou') }}</p>

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
          </div>
        </template>

        <!-- Selected placeholder: confirm -->
        <template v-else-if="choice !== null">
          <div class="confirm-card">
            <InitialAvatar
              :name="placeholders.find((p) => p.id === choice)?.name ?? ''"
              :size="56"
            />
            <p class="confirm-name">{{ placeholders.find((p) => p.id === choice)?.name }}</p>
            <p class="hint">{{ t('join.confirmHint') }}</p>
          </div>
          <button class="link-back" @click="choice = null">{{ t('join.chooseOther') }}</button>
        </template>

        <!-- Aucun membre à réclamer : seul le créateur peut débloquer -->
        <template v-else>
          <div class="field-card">
            <p class="hint">
              {{ previewFailed ? t('join.toastInvalidInvite') : t('join.noneAvailable') }}
            </p>
          </div>
        </template>
      </template>
    </div>

    <div v-if="placeholders.length > 0" class="cta-area">
      <button
        class="btn-primary"
        :class="{ 'is-loading': joining }"
        :disabled="!canJoin() || joining"
        @click="join"
      >
        <ButtonSpinner v-if="joining" />
        {{ joining ? t('join.joining') : t('join.joinBtn') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { GroupIcon as GroupIconType } from '../types';
import { useSession } from '../stores/session';
import { useToast } from '../stores/toast';
import { t } from '../stores/i18n';
import { joinGroup, fetchJoinPreview } from '../utils/api';
import { authenticate, getStoredJwt } from '../utils/auth';
import { captureError } from '../utils/errors';
import { GROUP_ICON_STYLE } from '../utils/groupUi';
import GroupIcon from '../components/GroupIcon.vue';
import InitialAvatar from '../components/InitialAvatar.vue';
import ScreenHeader from '../components/ScreenHeader.vue';
import ButtonSpinner from '../components/ButtonSpinner.vue';
import ChevronRightIcon from '../assets/svg/chevronRight.svg';

const props = defineProps<{ groupId: string; token: string }>();

const router = useRouter();
const session = useSession();
const toast = useToast();

// Available placeholders (address IS NULL) in the group
const placeholders = ref<{ id: string; name: string }[]>([]);
const loadingPreview = ref(true);
const previewFailed = ref(false);

// null = not chosen yet · string = selected placeholder UUID
const choice = ref<string | null>(null);
const joining = ref(false);
const groupName = ref('');
const groupIcon = ref<GroupIconType>('person');
const memberCount = ref(0);

const iconStyle = computed(() => GROUP_ICON_STYLE[groupIcon.value]);

onMounted(async () => {
  if (!props.groupId || !props.token) {
    loadingPreview.value = false;
    return;
  }
  try {
    const preview = await fetchJoinPreview(props.groupId, props.token);
    placeholders.value = preview.placeholders;
    groupName.value = preview.name;
    groupIcon.value = preview.icon;
    memberCount.value = preview.memberCount;
  } catch {
    // Invalid token or network error: nothing left to claim, say so explicitly
    previewFailed.value = true;
  } finally {
    loadingPreview.value = false;
  }
});

function goBack() {
  router.replace({ name: 'home' });
}

function selectPlaceholder(id: string) {
  choice.value = id;
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

  joining.value = true;
  try {
    if (!getStoredJwt()) await authenticate(user.id);

    const { name } = await joinGroup(props.groupId, props.token, {
      placeholderId: choice.value,
    });
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

const canJoin = () => choice.value !== null;
</script>

<style scoped>
.screen {
  max-width: var(--pane-max);
  margin-inline: auto;
}

.content {
  flex: 1;
  padding: 0 var(--gutter);
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
.invite-card {
  background: var(--bg-card);
  border-radius: 18px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}
.invite-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}
.invite-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.group-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.invite-info {
  flex: 1;
  min-width: 0;
}
.invite-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--dark);
}
.invite-meta {
  font-size: 11px;
  color: var(--text);
  margin-top: 3px;
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
.placeholder-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--dark);
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
.field-card .hint {
  margin: 0;
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
  padding: 16px var(--gutter) calc(16px + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
</style>
