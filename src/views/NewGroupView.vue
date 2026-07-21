<template>
  <div class="screen">
    <ScreenHeader :title="t('newGroup.title')" close @back="goBack" />

    <div class="content">
      <!-- Icon + Name card -->
      <div class="field-card">
        <div class="form-label">{{ t('newGroup.iconLabel') }}</div>
        <GroupIconPicker v-model="selectedIcon" />

        <div class="form-label" style="margin-top: 18px">{{ t('newGroup.nameLabel') }}</div>
        <div class="name-input-wrap">
          <PencilIcon />
          <input
            v-model="groupName"
            class="name-input"
            type="text"
            :placeholder="t('newGroup.namePlaceholder')"
          />
        </div>
      </div>

      <!-- Members card -->
      <div class="field-card">
        <div class="form-label">{{ t('newGroup.membersLabel') }}</div>
        <div class="members-row">
          <!-- Creator -->
          <div class="member">
            <div class="member-av" style="overflow: hidden">
              <NimiqIdenticon :size="36" :address="session.user.value?.id" />
            </div>
            <span class="member-name">{{ creatorName }}</span>
            <span class="member-sub">{{ t('group.you') }}</span>
          </div>

          <!-- Guests -->
          <div v-for="g in guests" :key="g.id" class="member" @click="removeGuest(g.id)">
            <InitialAvatar :name="g.name" :size="46" />
            <span class="member-name">{{ g.name }}</span>
            <span class="member-sub">{{ t('newGroup.remove') }}</span>
          </div>

          <!-- Ajout -->
          <button class="add-member" @click="adding = true">
            <PlusIcon />
          </button>
        </div>

        <div v-if="adding" class="guest-input-wrap">
          <input
            v-model="newGuestName"
            class="guest-input"
            type="text"
            :placeholder="t('newGroup.guestNamePlaceholder')"
            autofocus
            @keyup.enter="confirmGuest"
          />
          <button class="guest-add-btn" @click="confirmGuest">{{ t('common.add') }}</button>
        </div>
      </div>

      <div class="spacer" />
    </div>

    <!-- CTA -->
    <div class="cta-area">
      <button class="btn-primary" :disabled="!groupName.trim()" @click="done">
        {{ t('newGroup.createGroup') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { GroupIcon } from '../types';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import { generateId } from '../utils/storage';
import GroupIconPicker from '../components/GroupIconPicker.vue';
import NimiqIdenticon from '../components/NimiqIdenticon.vue';
import ScreenHeader from '../components/ScreenHeader.vue';
import PencilIcon from '../assets/svg/pencil.svg';
import PlusIcon from '../assets/svg/plus.svg';
import { captureError } from '../utils/errors';
import InitialAvatar from '../components/InitialAvatar.vue';
import { useI18n } from '../stores/i18n';

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();
const { t } = useI18n();

const groupName = ref('');
const selectedIcon = ref<GroupIcon>('person');

// Guest members added manually (no address for now — real QR/contacts joining
// will come later). The creator is added separately.
const guests = ref<{ id: string; name: string }[]>([]);
const adding = ref(false);
const newGuestName = ref('');

const creatorName = computed(() => session.user.value?.name ?? t('newGroup.you'));

function goBack() {
  router.back();
}

function confirmGuest() {
  const name = newGuestName.value.trim();
  if (!name) {
    adding.value = false;
    return;
  }
  guests.value.push({ id: generateId('guest'), name });
  newGuestName.value = '';
  adding.value = false;
}

function removeGuest(id: string) {
  guests.value = guests.value.filter((guest) => guest.id !== id);
}

async function done() {
  const name = groupName.value.trim();
  if (!name) return;
  const user = session.user.value;
  if (!user) return;

  try {
    const group = await store.createGroup({
      name,
      icon: selectedIcon.value,
      creatorId: user.id,
      creatorName: user.name,
    });
    for (const guest of guests.value) {
      await store.addPlaceholderMember(group.id, guest.name);
    }
    router.replace({ name: 'group', params: { id: group.id } });
  } catch (err) {
    captureError(err, 'NewGroupView.createGroup');
    toast.show(t('newGroup.createFailed'), 'error');
  }
}
</script>

<style scoped>
.content {
  flex: 1;
  padding: 0 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.field-card {
  background: var(--bg-card);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

/* Les labels des cartes gardent leur espacement d'origine */
.form-label {
  margin-bottom: 12px;
}

/* Name input */
.name-input-wrap {
  border: 1.5px solid var(--border-subtle);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg);
  color: var(--text);
}

.name-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  background: transparent;
  font-family: inherit;
}

.name-input::placeholder {
  color: var(--text);
}

/* Members */
.members-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.member {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: default;
}

.member-av {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--dark);
}

.member-sub {
  font-size: 9px;
  color: var(--text);
}

.add-member {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed var(--border);
  background: none;
  color: var(--text-mid);
  border-radius: 50%;
  width: 46px;
  height: 46px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.add-member:hover {
  border-color: var(--dark);
}

.guest-input-wrap {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.guest-input {
  flex: 1;
  border: 1.5px solid var(--border-subtle);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  background: var(--bg);
  font-family: inherit;
}

.guest-add-btn {
  border: none;
  border-radius: 12px;
  background: var(--ink);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  padding: 0 16px;
  cursor: pointer;
  font-family: inherit;
}

.spacer {
  flex: 1;
}

/* CTA */
.cta-area {
  padding: 14px 18px 28px;
  flex-shrink: 0;
}
</style>
