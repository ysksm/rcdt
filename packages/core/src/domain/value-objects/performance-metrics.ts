export interface TimingMetric {
  readonly name: string;
  readonly startTime: number;
  readonly duration: number;
}

export interface ResourceMetric {
  readonly url: string;
  readonly type: string;
  readonly size: number;
  readonly duration: number;
  readonly startTime: number;
}

export class PerformanceMetrics {
  constructor(
    public readonly timestamp: Date,
    public readonly url: string,
    public readonly timings: TimingMetric[],
    public readonly resources: ResourceMetric[],
    public readonly jsHeapUsedSize: number,
    public readonly jsHeapTotalSize: number,
    public readonly domNodes: number,
    public readonly layoutDuration: number,
    public readonly scriptDuration: number,
  ) {}

  get totalResourceSize(): number {
    return this.resources.reduce((sum, r) => sum + r.size, 0);
  }

  get totalResourceDuration(): number {
    return this.resources.reduce((sum, r) => sum + r.duration, 0);
  }

  toJSON(): Record<string, unknown> {
    return {
      timestamp: this.timestamp.toISOString(),
      url: this.url,
      timings: this.timings,
      resources: this.resources,
      memory: {
        jsHeapUsedSize: this.jsHeapUsedSize,
        jsHeapTotalSize: this.jsHeapTotalSize,
      },
      dom: { nodeCount: this.domNodes },
      durations: {
        layout: this.layoutDuration,
        script: this.scriptDuration,
      },
      summary: {
        totalResourceSize: this.totalResourceSize,
        totalResourceDuration: this.totalResourceDuration,
      },
    };
  }
}
