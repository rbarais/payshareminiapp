<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import jsQR from 'jsqr';

const emit = defineEmits<{
  (e: 'scanned', text: string): void;
  (e: 'cancel'): void;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const error = ref('');
const scanning = ref(false);
const manualLink = ref('');

function submitManual() {
  if (manualLink.value.trim()) {
    emit('scanned', manualLink.value.trim());
  }
}

let stream: MediaStream | null = null;
let rafId: number | null = null;

async function start() {
  error.value = '';

  // getUserMedia n'existe qu'en contexte sécurisé (HTTPS ou localhost)
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = !window.isSecureContext
      ? `La caméra nécessite une connexion sécurisée (HTTPS). Ouvre l'app en https:// ou colle le lien manuellement.`
      : 'Caméra non disponible sur cet appareil.';
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    if (!videoEl.value) return;
    videoEl.value.srcObject = stream;
    await videoEl.value.play();
    scanning.value = true;
    tick();
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'NotAllowedError') {
      error.value = "Accès caméra refusé. Autorise la caméra dans les réglages du navigateur.";
    } else if (name === 'NotFoundError') {
      error.value = "Aucune caméra détectée sur cet appareil.";
    } else {
      error.value = "Impossible d'accéder à la caméra.";
    }
  }
}

function tick() {
  const video = videoEl.value;
  const canvas = canvasEl.value;
  if (!video || !canvas || !scanning.value) return;

  if (video.readyState < video.HAVE_ENOUGH_DATA) {
    rafId = requestAnimationFrame(tick);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(video, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);

  if (result?.data) {
    stop();
    emit('scanned', result.data);
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function stop() {
  scanning.value = false;
  if (rafId !== null) cancelAnimationFrame(rafId);
  stream?.getTracks().forEach(t => t.stop());
}

onMounted(start);
onUnmounted(stop);
</script>

<template>
  <div class="scanner">
    <div v-if="error" class="error-state">
      <p class="error-icon">📷</p>
      <p class="error-text">{{ error }}</p>

      <!-- Fallback : coller le lien manuellement -->
      <div class="manual">
        <input
          v-model="manualLink"
          type="text"
          inputmode="url"
          placeholder="Colle le lien PayShare ici"
          @keyup.enter="submitManual"
        />
        <button class="btn-submit" :disabled="!manualLink.trim()" @click="submitManual">
          Ouvrir
        </button>
      </div>

      <button class="btn-cancel" @click="emit('cancel')">Retour</button>
    </div>

    <div v-else class="camera-view">
      <video ref="videoEl" class="video" playsinline muted />
      <canvas ref="canvasEl" class="canvas" />

      <!-- Viseur -->
      <div class="viewfinder">
        <div class="corner tl" />
        <div class="corner tr" />
        <div class="corner bl" />
        <div class="corner br" />
      </div>

      <p class="hint">Pointe la caméra vers le QR code</p>

      <button class="btn-cancel" @click="() => { stop(); emit('cancel'); }">
        Annuler
      </button>
    </div>
  </div>
</template>

<style scoped>
.scanner {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-view {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 48px;
}

.video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.canvas {
  display: none;
}

/* Viseur centré */
.viewfinder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  width: 240px;
  height: 240px;
}

.corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: white;
  border-style: solid;
}

.tl { top: 0; left: 0;  border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.bl { bottom: 0; left: 0;  border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

.hint {
  position: relative;
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.btn-cancel {
  position: relative;
  padding: 14px 40px;
  border: 1.5px solid rgba(255,255,255,0.4);
  border-radius: 50px;
  background: rgba(0,0,0,0.4);
  color: white;
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

/* État erreur */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: white;
  text-align: center;
  padding: 40px;
}

.error-icon {
  font-size: 48px;
}

.error-text {
  font-size: 15px;
  opacity: 0.85;
  line-height: 1.5;
}

.manual {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 320px;
}

.manual input {
  padding: 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 15px;
}

.manual input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.manual input:focus {
  outline: none;
  border-color: var(--accent);
}

.btn-submit {
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
