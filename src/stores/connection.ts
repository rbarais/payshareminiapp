import { ref, computed, type ComputedRef } from 'vue';
import { isJwtExpired } from '../utils/auth';

const tokenValid = ref(!isJwtExpired());
const networkUp = ref(navigator.onLine);
const apiReachable = ref(true);

const isConnected = computed(() => tokenValid.value && networkUp.value && apiReachable.value);

export function refreshConnection(): void {
  tokenValid.value = !isJwtExpired();
  networkUp.value = navigator.onLine;
}

// A 401 clears the stored JWT before reporting, so re-reading the token here is
// what turns the indicator red on an expired session.
export function reportApiOutcome(reachable: boolean): void {
  apiReachable.value = reachable;
  tokenValid.value = !isJwtExpired();
}

window.addEventListener('online', refreshConnection);
window.addEventListener('offline', refreshConnection);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshConnection();
});

export function useConnection(): { isConnected: ComputedRef<boolean> } {
  return { isConnected };
}
