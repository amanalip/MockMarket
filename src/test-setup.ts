import '@testing-library/jest-dom';

class TestResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    const contentRect = DOMRect.fromRect({ width: 800, height: 400 });
    this.callback([{ target, contentRect } as ResizeObserverEntry], this);
  }

  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = TestResizeObserver;
