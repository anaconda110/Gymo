// 极简 hash 路由
import { writable } from 'svelte/store';

export interface Route {
  path: string; // e.g. 'home', 'workout', 'exercises', 'templates', 'history', 'settings'
  params: Record<string, string>;
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    // 非法 URI 序列：原样返回，避免整个路由解析崩溃
    return v;
  }
}

function parse(): Route {
  let hash = '';
  try {
    hash = location.hash.replace(/^#\/?/, '');
  } catch {
    hash = '';
  }
  const [path, query] = hash.split('?');
  const params: Record<string, string> = {};
  if (query) {
    for (const pair of query.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const k = eq >= 0 ? pair.slice(0, eq) : pair;
      const v = eq >= 0 ? pair.slice(eq + 1) : '';
      params[k] = safeDecode(v);
    }
  }
  let p = path || 'home';
  // 未知空段容错
  if (!p) p = 'home';
  return { path: p, params };
}

export const route = writable<Route>(parse());

export function go(path: string, params: Record<string, string | number> = {}): void {
  const q = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  location.hash = `/${path}${q ? `?${q}` : ''}`;
}

try {
  window.addEventListener('hashchange', () => route.set(parse()));
} catch {
  /* noop */
}