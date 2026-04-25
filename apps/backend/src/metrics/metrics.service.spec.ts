import { MetricsService } from './metrics.service';

/**
 * L9-5 — couverture du registre interne et du formatage Prometheus.
 * Pas de DI : MetricsService n'a pas de dépendance constructeur, on
 * l'instancie directement pour rester rapide et déterministe.
 */
describe('MetricsService (L9-5)', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('expose uptime + memory en headers gauges', () => {
    const out = service.render();
    expect(out).toMatch(/# TYPE iox_process_uptime_seconds gauge/);
    expect(out).toMatch(/iox_process_uptime_seconds \d+\.\d+/);
    expect(out).toMatch(/iox_process_memory_rss_bytes \d+/);
    expect(out).toMatch(/iox_process_memory_heap_used_bytes \d+/);
  });

  it('compteur sans labels : incrémente et rend la ligne', () => {
    service.incCounter('iox_auth_logouts_total', {});
    service.incCounter('iox_auth_logouts_total', {});
    const out = service.render();
    expect(out).toMatch(/# TYPE iox_auth_logouts_total counter/);
    expect(out).toMatch(/^iox_auth_logouts_total 2$/m);
  });

  it('compteur labellisé : trie les labels et conserve un compteur par combinaison', () => {
    service.incCounter('iox_auth_logins_total', { result: 'success' });
    service.incCounter('iox_auth_logins_total', { result: 'success' });
    service.incCounter('iox_auth_logins_total', { result: 'bad_password' });
    const out = service.render();
    expect(out).toMatch(/iox_auth_logins_total\{result="success"\} 2/);
    expect(out).toMatch(/iox_auth_logins_total\{result="bad_password"\} 1/);
  });

  it('gauge : setGauge écrase la valeur précédente', () => {
    service.setGauge('iox_test_gauge', 1);
    service.setGauge('iox_test_gauge', 42);
    const out = service.render();
    expect(out).toMatch(/^iox_test_gauge 42$/m);
  });

  it('histogramme : produit buckets, _sum et _count', () => {
    service.observeHistogram('iox_http_duration_seconds', 0.04, { route: '/login' });
    service.observeHistogram('iox_http_duration_seconds', 0.3, { route: '/login' });
    const out = service.render();
    expect(out).toMatch(/# TYPE iox_http_duration_seconds histogram/);
    expect(out).toMatch(/iox_http_duration_seconds_bucket\{[^}]*le="0\.05"[^}]*\} 1/);
    expect(out).toMatch(/iox_http_duration_seconds_bucket\{[^}]*le="\+Inf"[^}]*\} 2/);
    expect(out).toMatch(/iox_http_duration_seconds_count\{route="\/login"\} 2/);
    // sum doit être > 0.3
    const sumLine = out.match(/iox_http_duration_seconds_sum\{route="\/login"\} ([0-9.]+)/);
    expect(sumLine).not.toBeNull();
    expect(parseFloat(sumLine![1])).toBeGreaterThan(0.3);
  });

  it("ne mélange pas les types : incCounter sur un nom déjà gauge est ignoré", () => {
    service.setGauge('iox_test_x', 5);
    service.incCounter('iox_test_x', {});
    const out = service.render();
    expect(out).toMatch(/^iox_test_x 5$/m);
  });

  it('échappe les guillemets et antislashs dans les labels', () => {
    service.incCounter('iox_test_quote', { route: 'a"b\\c' });
    const out = service.render();
    expect(out).toContain('a\\"b\\\\c');
  });
});
