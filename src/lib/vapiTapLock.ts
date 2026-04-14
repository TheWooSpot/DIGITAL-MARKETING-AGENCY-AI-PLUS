/** Prevents double taps from starting multiple Vapi sessions (3s window, clearable on error). */
let locked = false;
let timer: ReturnType<typeof setTimeout> | null = null;

export function acquireVapiTapLock(ms = 3000): boolean {
  if (locked) return false;
  locked = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    locked = false;
    timer = null;
  }, ms);
  return true;
}

export function releaseVapiTapLockEarly(): void {
  locked = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
