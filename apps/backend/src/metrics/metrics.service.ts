import { Injectable } from '@nestjs/common';

/**
 * MetricsService — implémentation Prometheus minimale, zéro dépendance.
 *
 * Expose un registre de compteurs et d'histogrammes simples, suffisants pour
 * un baseline observabilité en préprod. Évite d'embarquer `prom-client`
 * (15+ Mo de transitive deps) tant que le besoin reste basique.
 *
 * Usage typique :
 *   metrics.incCounter('iox_http_requests_total', { method, status });
 *   metrics.observeHistogram('iox_http_duration_seconds', durationSec, { route });
 *
 * Export au format text/plain exposition Prometheus v0.0.4.
 */

type Labels = Record<string, string | number>;

interface CounterMetric {
  type: 'counter';
  help: string;
  values: Map<string, number>; // labelKey → value
}

interface HistogramMetric {
  type: 'histogram';
  help: string;
  buckets: number[];
  values: Map<string, { bucketCounts: number[]; sum: number; count: number }>;
}

interface GaugeMetric {
  type: 'gauge';
  help: string;
  values: Map<string, number>;
}

type Metric = CounterMetric | HistogramMetric | GaugeMetric;

const DEFAULT_BUCKETS_SECONDS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

@Injectable()
export class MetricsService {
  private readonly registry = new Map<string, Metric>();
  private readonly startedAt = Date.now();

  // ── Compteur ────────────────────────────────────────────────
  incCounter(name: string, labels: Labels = {}, delta = 1): void {
    let m = this.registry.get(name);
    if (!m) {
      m = { type: 'counter', help: `Counter ${name}`, values: new Map() };
      this.registry.set(name, m);
    }
    if (m.type !== 'counter') return;
    const key = this.labelKey(labels);
    m.values.set(key, (m.values.get(key) ?? 0) + delta);
  }

  // ── Gauge ──────────────────────────────────────────────────
  /**
   * Fixe la valeur d'une gauge. Utilisé pour les métriques observées
   * périodiquement (stock, file d'attente, nombre d'items en attente de
   * revue, etc.). Les gauges `iox_marketplace_*` sont alimentées par
   * `OpsMetricsService` toutes les 60 s.
   */
  setGauge(name: string, value: number, labels: Labels = {}, help?: string): void {
    let m = this.registry.get(name);
    if (!m) {
      m = { type: 'gauge', help: help ?? `Gauge ${name}`, values: new Map() };
      this.registry.set(name, m);
    }
    if (m.type !== 'gauge') return;
    const key = this.labelKey(labels);
    m.values.set(key, value);
  }

  // ── Histogramme ─────────────────────────────────────────────
  observeHistogram(
    name: string,
    value: number,
    labels: Labels = {},
    buckets: number[] = DEFAULT_BUCKETS_SECONDS,
  ): void {
    let m = this.registry.get(name);
    if (!m) {
      m = { type: 'histogram', help: `Histogram ${name}`, buckets, values: new Map() };
      this.registry.set(name, m);
    }
    if (m.type !== 'histogram') return;
    const key = this.labelKey(labels);
    let bucket = m.values.get(key);
    if (!bucket) {
      bucket = { bucketCounts: new Array(m.buckets.length).fill(0), sum: 0, count: 0 };
      m.values.set(key, bucket);
    }
    bucket.count += 1;
    bucket.sum += value;
    for (let i = 0; i < m.buckets.length; i++) {
      if (value <= m.buckets[i]) bucket.bucketCounts[i] += 1;
    }
  }

  // ── Dump format Prometheus ──────────────────────────────────
  render(): string {
    const lines: string[] = [];
    lines.push('# HELP iox_process_uptime_seconds Uptime du process backend.');
    lines.push('# TYPE iox_process_uptime_seconds gauge');
    lines.push(`iox_process_uptime_seconds ${((Date.now() - this.startedAt) / 1000).toFixed(3)}`);

    const mem = process.memoryUsage();
    lines.push('# HELP iox_process_memory_rss_bytes RSS mémoire du process backend.');
    lines.push('# TYPE iox_process_memory_rss_bytes gauge');
    lines.push(`iox_process_memory_rss_bytes ${mem.rss}`);
    lines.push('# HELP iox_process_memory_heap_used_bytes Heap utilisé V8.');
    lines.push('# TYPE iox_process_memory_heap_used_bytes gauge');
    lines.push(`iox_process_memory_heap_used_bytes ${mem.heapUsed}`);

    for (const [name, metric] of this.registry.entries()) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);
      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const [labelKey, v] of metric.values.entries()) {
          lines.push(`${name}${labelKey} ${v}`);
        }
      } else {
        for (const [labelKey, v] of metric.values.entries()) {
          const labelsObj = this.parseLabelKey(labelKey);
          for (let i = 0; i < metric.buckets.length; i++) {
            const bucketLabels = this.labelKey({ ...labelsObj, le: metric.buckets[i] });
            lines.push(`${name}_bucket${bucketLabels} ${v.bucketCounts[i]}`);
          }
          const infLabels = this.labelKey({ ...labelsObj, le: '+Inf' });
          lines.push(`${name}_bucket${infLabels} ${v.count}`);
          lines.push(`${name}_sum${labelKey} ${v.sum}`);
          lines.push(`${name}_count${labelKey} ${v.count}`);
        }
      }
    }
    return lines.join('\n') + '\n';
  }

  // ── Helpers ────────────────────────────────────────────────
  private labelKey(labels: Labels): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    const formatted = entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${this.escapeLabel(String(v))}"`)
      .join(',');
    return `{${formatted}}`;
  }

  private parseLabelKey(key: string): Labels {
    if (!key) return {};
    const inner = key.slice(1, -1); // retire { }
    const out: Labels = {};
    for (const part of inner.split(',')) {
      const eq = part.indexOf('=');
      if (eq > 0) out[part.slice(0, eq)] = part.slice(eq + 2, -1);
    }
    return out;
  }

  private escapeLabel(v: string): string {
    return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}
