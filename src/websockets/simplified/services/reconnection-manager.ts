export type BackoffOptions = {
  initialDelayMs?: number; // default 500ms
  maxDelayMs?: number; // default 15000ms
  factor?: number; // default 2
  jitterRatio?: number; // 0..1, default 0.25
  maxRetries?: number; // default Infinity
};

export class ReconnectionManager {
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(private readonly opts: BackoffOptions = {}) {}

  reset() {
    this.attempts = 0;
    this.clear();
    this.stopped = false;
  }

  stop() {
    this.stopped = true;
    this.clear();
  }

  private clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  schedule(next: () => void): { scheduled: boolean; delay: number } {
    if (this.stopped) return { scheduled: false, delay: 0 };

    const initial = this.opts.initialDelayMs ?? 500;
    const max = this.opts.maxDelayMs ?? 15000;
    const factor = this.opts.factor ?? 2;
    const jitterRatio = this.opts.jitterRatio ?? 0.25;
    const maxRetries = this.opts.maxRetries ?? Number.POSITIVE_INFINITY;

    if (this.attempts >= maxRetries) {
      return { scheduled: false, delay: 0 };
    }

    const raw = Math.min(max, initial * Math.pow(factor, this.attempts));
    const jitter = raw * jitterRatio * (Math.random() * 2 - 1); // +/- jitter
    const delay = Math.max(0, Math.floor(raw + jitter));

    this.attempts += 1;
    this.clear();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.stopped) next();
    }, delay);

    return { scheduled: true, delay };
  }
}
