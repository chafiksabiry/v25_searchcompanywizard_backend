import axios from 'axios';

const MIN_LOGO_BYTES = 600;
const MAX_LOGO_BYTES = 3 * 1024 * 1024;

const decode = (v: string) => v.replace(/&amp;/g, '&').replace(/&#38;/g, '&').trim();

const attr = (tag: string, name: string): string | undefined => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  const v = m ? m[1] ?? m[2] : undefined;
  return v ? decode(v) : undefined;
};

const absolute = (href: string | undefined, base: string): string | undefined => {
  if (!href || href.startsWith('data:')) return undefined;
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
};

const iconSize = (sizes?: string): number => {
  const m = sizes?.match(/(\d+)x(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
};

/**
 * Candidate logo URLs, best first: JSON-LD Organization logo, <img> tagged as a logo in
 * the page, apple-touch icons, regular icons, then og:image (often a banner, so last).
 */
export function collectLogoCandidates(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const push = (u?: string) => {
    if (u && !out.includes(u)) out.push(u);
  };

  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        const logo = node.logo;
        if (typeof logo === 'string') push(absolute(logo, baseUrl));
        else if (logo && typeof logo.url === 'string') push(absolute(logo.url, baseUrl));
        Object.values(node).forEach(walk);
      };
      walk(JSON.parse(m[1]));
    } catch {
      // ignore malformed JSON-LD
    }
  }

  const header = html.match(/<(header|nav)[\s\S]*?<\/\1>/i)?.[0] ?? '';
  for (const scope of [header, html]) {
    for (const m of scope.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const src = attr(tag, 'src') || attr(tag, 'data-src');
      if (!src || /\.(gif)(\?|$)/i.test(src)) continue;
      const hint = `${attr(tag, 'class') ?? ''} ${attr(tag, 'id') ?? ''} ${attr(tag, 'alt') ?? ''} ${src}`;
      if (/logo/i.test(hint) && !/partner|client|customer|sponsor|testimonial/i.test(hint)) {
        push(absolute(src, baseUrl));
      }
    }
  }

  const icons: { href: string; size: number; apple: boolean }[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(m[0], 'rel') ?? '').toLowerCase();
    if (!/icon/.test(rel)) continue;
    const href = absolute(attr(m[0], 'href'), baseUrl);
    if (href) icons.push({ href, size: iconSize(attr(m[0], 'sizes')), apple: rel.includes('apple') });
  }
  icons.sort((a, b) => Number(b.apple) - Number(a.apple) || b.size - a.size);
  icons.forEach((i) => push(i.href));

  const og = html.match(/<meta\b[^>]+property=["']og:image["'][^>]*>/i)?.[0];
  push(absolute(og ? attr(og, 'content') : undefined, baseUrl));
  push(absolute('/favicon.ico', baseUrl));
  return out;
}

async function isUsableImage(url: string): Promise<boolean> {
  try {
    const r = await axios.get<ArrayBuffer>(url, {
      timeout: 6000,
      responseType: 'arraybuffer',
      maxContentLength: MAX_LOGO_BYTES,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HARXProfileBot/1.0; +https://harx.ai)' },
      validateStatus: (s) => s >= 200 && s < 300,
    });
    const type = String(r.headers['content-type'] || '').toLowerCase();
    const size = (r.data as ArrayBuffer).byteLength;
    return (type.startsWith('image/') || /\.(svg|png|jpe?g|webp|ico)(\?|$)/i.test(url)) && size >= MIN_LOGO_BYTES;
  } catch {
    return false;
  }
}

/** First candidate that really is a downloadable image; Google's favicon service as last resort. */
export async function resolveCompanyLogo(html: string, baseUrl: string, hostname: string): Promise<string> {
  for (const candidate of collectLogoCandidates(html, baseUrl).slice(0, 8)) {
    if (await isUsableImage(candidate)) return candidate;
  }
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
}
