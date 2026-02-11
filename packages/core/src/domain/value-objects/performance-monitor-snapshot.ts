export interface PerformanceSample {
  readonly timestamp: number;
  readonly metrics: Record<string, number>;
}

export class PerformanceMonitorSnapshot {
  constructor(
    public readonly capturedAt: Date,
    public readonly samples: PerformanceSample[],
    public readonly duration: number,
    public readonly interval: number,
  ) {}

  get cpu(): number[] {
    return this.samples.map((s) => (s.metrics["TaskDuration"] ?? 0) * 100);
  }

  get jsHeapUsed(): number[] {
    return this.samples.map((s) => s.metrics["JSHeapUsedSize"] ?? 0);
  }

  get domNodes(): number[] {
    return this.samples.map((s) => s.metrics["Nodes"] ?? 0);
  }

  get jsEventListeners(): number[] {
    return this.samples.map((s) => s.metrics["JSEventListeners"] ?? 0);
  }

  get layoutsPerSec(): number[] {
    return this.samples.map((s) => s.metrics["LayoutCount"] ?? 0);
  }

  get recalcStylesPerSec(): number[] {
    return this.samples.map((s) => s.metrics["RecalcStyleCount"] ?? 0);
  }

  toJSON(): Record<string, unknown> {
    return {
      capturedAt: this.capturedAt.toISOString(),
      duration: this.duration,
      interval: this.interval,
      sampleCount: this.samples.length,
      samples: this.samples,
      summary: {
        avgCpu: avg(this.cpu),
        maxCpu: max(this.cpu),
        avgJsHeap: avg(this.jsHeapUsed),
        maxJsHeap: max(this.jsHeapUsed),
        avgDomNodes: avg(this.domNodes),
        maxDomNodes: max(this.domNodes),
      },
    };
  }
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function max(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.max(...arr);
}
