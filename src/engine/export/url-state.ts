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
      Buffer?: { from: (s: string) => { toString: (enc: string) => string } };
    };

    if (typeof globalObj.btoa === 'function') {
      return encodeURIComponent(globalObj.btoa(unescape(encodeURIComponent(jsonStr))));
    } else if (globalObj.Buffer) {
      return encodeURIComponent(globalObj.Buffer.from(jsonStr).toString('base64'));
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
    };

    if (typeof globalObj.atob === 'function') {
      jsonStr = decodeURIComponent(escape(globalObj.atob(cleanStr)));
    } else if (globalObj.Buffer) {
      jsonStr = globalObj.Buffer.from(cleanStr, 'base64').toString('utf8');
    }

    const payload: ShareableStatePayload = JSON.parse(jsonStr);
    return payload;
  } catch {
    return null;
  }
}

export function generateShareableLink(payload: ShareableStatePayload): string {
  const hash = encodeShareState(payload);
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin || '';
    const pathname = window.location.pathname || '';
    return `${origin}${pathname}#share=${hash}`;
  }
  return `https://mockmarket.app/#share=${hash}`;
}
