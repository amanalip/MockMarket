export interface ShareableStatePayload {
  version: number;
  mode?: string;
  ticker?: string;
  date?: string;
  cash?: number;
  etf?: {
    name: string;
    tickers: { ticker: string; targetWeight: number }[];
    rebalanceFrequency: string;
  };
  backtest?: {
    ticker: string;
    entryRule: string;
    exitRule: string;
  };
}

export function encodeShareState(payload: ShareableStatePayload): string {
  try {
    const jsonStr = JSON.stringify(payload);
    const globalObj = globalThis as unknown as {
      btoa?: (str: string) => string;
      Buffer?: { from: (s: string, encoding?: string) => { toString: (enc: string) => string } };
      TextEncoder?: typeof TextEncoder;
    };

    // Prefer Buffer (Node) for full UTF-8 support
    if (globalObj.Buffer) {
      return encodeURIComponent(globalObj.Buffer.from(jsonStr, 'utf8').toString('base64'));
    }
    if (typeof globalObj.btoa === 'function') {
      // Use TextEncoder to handle emoji / non-Latin1 safely
      if (globalObj.TextEncoder) {
        const bytes = new TextEncoder().encode(jsonStr);
        let binary = '';
        bytes.forEach(b => { binary += String.fromCharCode(b); });
        return encodeURIComponent(globalObj.btoa(binary));
      }
      return encodeURIComponent(globalObj.btoa(unescape(encodeURIComponent(jsonStr))));
    }
    return encodeURIComponent(jsonStr);
  } catch (err) {
    console.error('Failed to encode share state:', err);
    return '';
  }
}

export function decodeShareState(encodedStr: string): ShareableStatePayload | null {
  try {
    const cleanStr = decodeURIComponent(encodedStr);
    let jsonStr = cleanStr;
    const globalObj = globalThis as unknown as {
      atob?: (str: string) => string;
      Buffer?: { from: (s: string, enc: string) => { toString: (enc: string) => string } };
      TextDecoder?: typeof TextDecoder;
    };

    if (globalObj.Buffer) {
      jsonStr = globalObj.Buffer.from(cleanStr, 'base64').toString('utf8');
    } else if (typeof globalObj.atob === 'function') {
      const binary = globalObj.atob(cleanStr);
      if (globalObj.TextDecoder) {
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        jsonStr = new TextDecoder().decode(bytes);
      } else {
        jsonStr = decodeURIComponent(escape(binary));
      }
    }

    const payload: ShareableStatePayload = JSON.parse(jsonStr);
    // Validate payload for prototype pollution and non-finite cash
    if (!payload || typeof payload !== 'object') return null;
    if (JSON.stringify(payload).includes('__proto__')) return null;
    if (!Number.isFinite(payload.version)) return null;
    if (payload.cash !== undefined && !Number.isFinite(payload.cash)) return null;
    if (payload.ticker !== undefined && typeof payload.ticker !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

export function generateShareableLink(payload: ShareableStatePayload): string {
  const hash = encodeShareState(payload);
  if (typeof window !== 'undefined' && window.location) {
    const loc = window.location as unknown as { origin?: string; pathname?: string };
    const origin = loc.origin || '';
    const pathname = loc.pathname || '';
    // pathname never includes hash, so this automatically strips existing #share
    return `${origin}${pathname}#share=${hash}`;
  }
  return `https://mockmarket.app/#share=${hash}`;
}
