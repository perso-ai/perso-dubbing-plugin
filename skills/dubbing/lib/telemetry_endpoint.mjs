// Limit analytics overrides to Amplitude, or an explicit loopback test collector.
// Invalid overrides disable analytics instead of failing media processing.
export function telemetryEndpoint(raw, identify = false) {
  try {
    const url = new URL(raw || 'https://api2.amplitude.com/2/httpapi');
    const vendor = url.protocol === 'https:' && ['api2.amplitude.com', 'api.eu.amplitude.com'].includes(url.hostname) && !url.port;
    const local = ['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
    if ((!vendor && !local) || url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== '/2/httpapi') return null;
    if (identify) url.pathname = '/identify';
    return url.href;
  } catch { return null; }
}
