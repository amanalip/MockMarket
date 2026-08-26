import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../store';
import { getTheme, darkTheme, lightTheme } from '../theme';

describe('Theming & Accessibility Configuration', () => {
  beforeEach(() => {
    useUIStore.getState().setTheme('dark');
  });

  it('provides dark and light theme tokens with verified contrast colors', () => {
    const dark = getTheme('dark');
    expect(dark.bgPrimary).toBe('#0b0f19');
    expect(dark.textPrimary).toBe('#f8fafc');

    const light = getTheme('light');
    expect(light.bgPrimary).toBe('#f8fafc');
    expect(light.textPrimary).toBe('#0f172a');

    expect(darkTheme).toBeDefined();
    expect(lightTheme).toBeDefined();
  });

  it('toggles theme state seamlessly', () => {
    expect(useUIStore.getState().theme).toBe('dark');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
  });
});
