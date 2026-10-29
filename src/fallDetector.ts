export type Thresholds = {
  freeFall: number; // g, below this = free fall
  impact: number; // g, above this = impact
  stillSeconds: number; // seconds of stillness required after the impact
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  freeFall: 0.5,
  impact: 2.5,
  stillSeconds: 2,
};

export type Sensitivity = "LOW" | "NORMAL" | "HIGH";

/** Simple presets so users pick a level instead of typing g values */
export const PRESETS: Record<Sensitivity, Thresholds> = {
  LOW: { freeFall: 0.4, impact: 3.0, stillSeconds: 3 }, // fewer false alarms
  NORMAL: DEFAULT_THRESHOLDS,
  HIGH: { freeFall: 0.6, impact: 2.0, stillSeconds: 2 }, // catches softer falls
};

export function sensitivityOf(th: Thresholds): Sensitivity {
  const match = (Object.keys(PRESETS) as Sensitivity[]).find(
    (k) =>
      PRESETS[k].freeFall === th.freeFall &&
      PRESETS[k].impact === th.impact &&
      PRESETS[k].stillSeconds === th.stillSeconds
  );
  return match ?? "NORMAL";
}

type Phase ="IDLE" | "FREE_FALL" | "IMPACT";

/**
 * State machine: IDLE -> FREE_FALL -> IMPACT -> (still) -> FALL
 * Feed it the total acceleration magnitude (in g) for each sample.
 */
export class FallDetector {
  private phase: Phase = "IDLE";
  private phaseStart = 0;
  private stillStart: number | null = null;

  constructor(private th: Thresholds) {}

  setThresholds(th: Thresholds) {
    this.th = th;
  }

  reset() {
    this.phase = "IDLE";
    this.stillStart = null;
  }

  /** Returns true when a fall is detected. */
  feed(mag: number, now: number): boolean {
    switch (this.phase) {
      case "IDLE":
        if (mag < this.th.freeFall) {
          this.phase = "FREE_FALL";
          this.phaseStart = now;
        }
        break;

      case "FREE_FALL":
        if (mag > this.th.impact) {
          this.phase = "IMPACT";
          this.phaseStart = now;
          this.stillStart = null;
        } else if (now - this.phaseStart > 1000) {
          this.reset(); // free fall lasted too long, not a fall
        }
        break;

      case "IMPACT": {
        const sinceImpact = now - this.phaseStart;
        if (sinceImpact < 500) break; // let the bounce settle first

        const still = Math.abs(mag - 1) < 0.15; // still = magnitude close to 1 g
        if (still) {
          if (this.stillStart === null) this.stillStart = now;
          if (now - this.stillStart >= this.th.stillSeconds * 1000) {
            this.reset();
            return true;
          }
        } else {
          this.stillStart = null;
        }
        if (sinceImpact > 8000) this.reset(); // never became still, not a fall
        break;
      }
    }
    return false;
  }
}
