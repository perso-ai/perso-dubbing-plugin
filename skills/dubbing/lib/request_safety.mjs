// Network boundaries for requests that carry Perso credentials.
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export function assertApiDestination(value, base) {
  const url = new URL(value);
  const origin = new URL(base).origin;
  if (url.protocol !== 'https:' || url.username || url.password || url.origin !== origin) {
    throw new Error('Refusing to send Perso credentials outside the configured HTTPS API origin.');
  }
  return url.href;
}

// Check every redirect before issuing another credential-bearing request.
export async function fetchApi(url, init, base) {
  let target = assertApiDestination(url, base);
  let options = { ...init, headers: { ...init.headers }, redirect: 'manual' };
  for (let hops = 0; ; hops++) {
    const response = await fetch(target, options);
    if (!REDIRECTS.has(response.status) || !response.headers.get('location')) return response;
    await response.body?.cancel();
    if (hops >= 5) throw new Error('Too many Perso API redirects.');
    target = assertApiDestination(new URL(response.headers.get('location'), target).href, base);
    // Match Fetch method semantics while retaining bodies for 307/308.
    if ((response.status === 303 && !['GET', 'HEAD'].includes(options.method)) ||
        ([301, 302].includes(response.status) && options.method === 'POST')) {
      options = { ...options, method: 'GET', body: undefined, headers: { ...options.headers } };
      for (const name of Object.keys(options.headers)) {
        if (['content-type', 'content-length', 'content-encoding', 'content-language', 'content-location'].includes(name.toLowerCase())) delete options.headers[name];
      }
    }
  }
}
