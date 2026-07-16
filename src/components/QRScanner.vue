<template>
  <div class="scanner">
    <div v-if="error" class="error-state">
      <p class="error-icon">📷</p>
      <p class="error-text">{{ error }}</p>

      <!-- Fallback: paste the link manually -->
      <div class="manual">
        <input
          v-model="manualLink"
          type="text"
          inputmode="url"
          :placeholder="t('scan.pastePlaceholder')"
          @keyup.enter="submitManual"
        />
        <button class="btn-submit" :disabled="!manualLink.trim()" @click="submitManual">
          {{ t('scan.openBtn') }}
        </button>
      </div>

      <button class="btn-cancel" @click="cancel">{{ t('common.back') }}</button>
    </div>

    <div v-else class="camera-view">
      <video ref="videoEl" class="video" playsinline muted autoplay />
      <canvas ref="canvasEl" class="canvas" />

      <!-- Viewfinder -->
      <div class="viewfinder">
        <div class="corner tl" />
        <div class="corner tr" />
        <div class="corner bl" />
        <div class="corner br" />
      </div>

      <p class="hint">{{ t('scan.hint') }}</p>

      <button
        class="btn-cancel"
        @click="
          () => {
            stop();
            cancel();
          }
        "
      >
        {{ t('common.cancel') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import jsQR from 'jsqr';
import { decodeRoomFromText, decodeInviteFromText } from '../utils/room';
import { useI18n } from '../stores/i18n';

declare const BarcodeDetector: {
  new (options: { formats: string[] }): {
    detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
  };
};

const router = useRouter();
const { t } = useI18n();

const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const error = ref('');
const scanning = ref(false);
const manualLink = ref('');

function submitManual() {
  if (manualLink.value.trim()) {
    handleScanned(manualLink.value.trim());
  }
}

function handleScanned(text: string) {
  // Unwrap nimiqpay:// deeplinks to access the embedded https URL
  let inner = text;
  try {
    const parsed = new URL(text);
    if (parsed.protocol === 'nimiqpay:') {
      inner = parsed.searchParams.get('url') ?? text;
    }
  } catch {
    /* not a URL */
  }

  const room = decodeRoomFromText(inner);
  if (room) {
    router.push({ name: 'pay', query: { room: encodeURIComponent(JSON.stringify(room)) } });
    return;
  }

  const invite = decodeInviteFromText(inner);
  if (invite) {
    router.push({ name: 'join', query: { g: invite.groupId, t: invite.token } });
    return;
  }

  router.push({ name: 'home' });
}

function cancel() {
  router.back();
}

let stream: MediaStream | null = null;
let rafId: number | null = null;
let pollId: ReturnType<typeof setInterval> | null = null;

const useNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

async function start() {
  error.value = '';

  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = !window.isSecureContext ? t('scan.errHttps') : t('scan.errUnavailable');
    return;
  }

  try {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }
    if (!videoEl.value) return;
    videoEl.value.srcObject = stream;
    try {
      await videoEl.value.play();
    } catch {
      // autoplay attribute handles policy on Android
    }
    scanning.value = true;

    if (useNativeDetector) {
      startNativeDetector();
    } else {
      tick();
    }
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'NotAllowedError') {
      error.value = t('scan.errDenied');
    } else if (name === 'NotFoundError') {
      error.value = t('scan.errNotFound');
    } else {
      error.value = t('scan.errGeneric');
    }
  }
}

// Native BarcodeDetector (Android Chrome 83+): fast, offloaded to the OS
function startNativeDetector() {
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  pollId = setInterval(async () => {
    const video = videoEl.value;
    if (!video || !scanning.value || video.readyState < video.HAVE_ENOUGH_DATA) return;
    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        stop();
        handleScanned(barcodes[0].rawValue);
      }
    } catch {
      // ignore per-frame errors
    }
  }, 200);
}

// jsQR fallback: downsample to 640px max to keep it fast on mobile
function tick() {
  const video = videoEl.value;
  const canvas = canvasEl.value;
  if (!video || !canvas || !scanning.value) return;

  if (video.readyState < video.HAVE_ENOUGH_DATA) {
    rafId = requestAnimationFrame(tick);
    return;
  }

  const MAX = 640;
  const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);

  if (result?.data) {
    stop();
    handleScanned(result.data);
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function stop() {
  scanning.value = false;
  if (rafId !== null) cancelAnimationFrame(rafId);
  if (pollId !== null) clearInterval(pollId);
  stream?.getTracks().forEach((track) => track.stop());
}

onMounted(start);
onUnmounted(stop);
</script>

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

/* Centered viewfinder */
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

.tl {
  top: 0;
  left: 0;
  border-width: 3px 0 0 3px;
  border-radius: 4px 0 0 0;
}
.tr {
  top: 0;
  right: 0;
  border-width: 3px 3px 0 0;
  border-radius: 0 4px 0 0;
}
.bl {
  bottom: 0;
  left: 0;
  border-width: 0 0 3px 3px;
  border-radius: 0 0 0 4px;
}
.br {
  bottom: 0;
  right: 0;
  border-width: 0 3px 3px 0;
  border-radius: 0 0 4px 0;
}

.hint {
  position: relative;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.btn-cancel {
  position: relative;
  padding: 14px 40px;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 50px;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

/* Error state */
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
