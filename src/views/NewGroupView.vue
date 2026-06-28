<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { GroupIcon } from '../types';
import { useSession } from '../stores/session';
import { useGroupsStore } from '../stores/groups';
import { useToast } from '../stores/toast';
import { generateId } from '../utils/storage';
import GroupIconPicker from '../components/GroupIconPicker.vue';
import NimiqIdenticon from '../components/NimiqIdenticon.vue';
import { captureError } from '../utils/errors';
import InitialAvatar from '../components/InitialAvatar.vue';

const router = useRouter();
const session = useSession();
const store = useGroupsStore();
const toast = useToast();

const groupName = ref('');
const selectedIcon = ref<GroupIcon>('person');

// Guest members added manually (no address for now — real QR/contacts joining
// will come later). The creator is added separately.
const guests = ref<{ id: string; name: string }[]>([]);
const adding = ref(false);
const newGuestName = ref('');

const creatorName = session.user.value?.name ?? 'Toi';

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
      store.addMember(group.id, { id: guest.id, name: guest.name });
    }
    router.replace({ name: 'group', params: { id: group.id } });
  } catch (err) {
    captureError(err, 'NewGroupView.createGroup');
    toast.show('Création du groupe impossible', 'error');
  }
}
</script>

<template>
  <div class="screen">
    <div class="top-bar">
      <button class="icon-btn" @click="goBack">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 2L12 12M12 2L2 12"
            stroke="#3D3B35"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <span class="bar-title">Nouveau groupe</span>
      <div style="width: 36px" />
    </div>

    <div class="content">
      <!-- Icon + Name card -->
      <div class="field-card">
        <div class="field-label">Icône du groupe</div>
        <GroupIconPicker v-model="selectedIcon" />

        <div class="field-label" style="margin-top: 18px">Nom</div>
        <div class="name-input-wrap">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M2 13L5 10M9 2L13 6L6.5 12.5L2.5 12.5L2.5 8.5L9 2Z"
              stroke="#8B8880"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <input
            v-model="groupName"
            class="name-input"
            type="text"
            placeholder="Vacances été 2025"
          />
        </div>
      </div>

      <!-- Members card -->
      <div class="field-card">
        <div class="field-label">Membres</div>
        <div class="members-row">
          <!-- Creator -->
          <div class="member">
            <div class="member-av" style="overflow: hidden">
              <NimiqIdenticon :size="36" />
            </div>
            <span class="member-name">{{ creatorName }}</span>
            <span class="member-sub">toi</span>
          </div>

          <!-- Guests -->
          <div v-for="g in guests" :key="g.id" class="member" @click="removeGuest(g.id)">
            <InitialAvatar :name="g.name" :size="46" />
            <span class="member-name">{{ g.name }}</span>
            <span class="member-sub">retirer</span>
          </div>

          <!-- Ajout -->
          <button class="add-member" @click="adding = true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V12M2 7H12" stroke="#6B6860" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div v-if="adding" class="guest-input-wrap">
          <input
            v-model="newGuestName"
            class="guest-input"
            type="text"
            placeholder="Nom de l'invité"
            autofocus
            @keyup.enter="confirmGuest"
          />
          <button class="guest-add-btn" @click="confirmGuest">Ajouter</button>
        </div>
      </div>

      <div class="spacer" />
    </div>

    <!-- CTA -->
    <div class="cta-area">
      <button class="btn-primary" :disabled="!groupName.trim()" @click="done">
        Créer le groupe
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
  cursor: pointer;
}

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

.field-label {
  font-size: 10px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
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
  background: #fafaf8;
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
  background: #fafaf8;
  font-family: inherit;
}

.guest-add-btn {
  border: none;
  border-radius: 12px;
  background: var(--dark);
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

.btn-primary {
  display: block;
  width: 100%;
  background: var(--accent);
  border: none;
  border-radius: 16px;
  padding: 17px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--dark);
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
</style>
