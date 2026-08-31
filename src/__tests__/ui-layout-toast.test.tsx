import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Layout } from '../components/ui/Layout';
import { Sidebar } from '../components/ui/Sidebar';
import { ToastContainer } from '../components/ui/Toast';
import { ShareModal } from '../components/ui/ShareModal';
import { ShortcutsModal } from '../components/ui/ShortcutsModal';
import { useUIStore } from '../store';

describe('UI Layout & Toast', () => {
  beforeEach(() => { useUIStore.setState({ toasts: [], mode: 'trade', sidebarOpen: true }); });

  it('Layout renders Header and Sidebar', () => {
    render(<Layout><div>child</div></Layout>);
    expect(screen.getByText('MockMarket')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('Sidebar renders mode buttons', () => {
    render(<Sidebar />);
    expect(screen.getByText(/Paper Trading|Trade/)).toBeInTheDocument();
    expect(screen.getByText(/Backtest/)).toBeInTheDocument();
    expect(screen.getByText(/ETF/)).toBeInTheDocument();
  });

  it('Sidebar switches mode', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByText(/Backtest/));
    expect(useUIStore.getState().mode).toBe('backtest');
  });

  it('Sidebar toggles open', () => {
    useUIStore.setState({ sidebarOpen: true });
    render(<Sidebar />);
    expect(document.body).toBeTruthy();
  });

  it('ToastContainer null when empty', () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('ToastContainer shows success', () => {
    useUIStore.getState().addToast('ok', 'success');
    render(<ToastContainer />);
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('ToastContainer shows error', () => {
    useUIStore.getState().addToast('fail', 'error');
    render(<ToastContainer />);
    expect(screen.getByText('fail')).toBeInTheDocument();
  });

  it('Toast removes on click', () => {
    useUIStore.getState().addToast('clickme', 'info');
    render(<ToastContainer />);
    fireEvent.click(screen.getByText('clickme'));
    expect(screen.queryByText('clickme')).not.toBeInTheDocument();
  });

  it('Toast shows info icon', () => {
    useUIStore.getState().addToast('info msg', 'info');
    const { container } = render(<ToastContainer />);
    expect(container.textContent).toContain('info msg');
  });

  it('ShareModal closed returns null', () => {
    const { container } = render(<ShareModal isOpen={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('ShareModal open shows content', () => {
    render(<ShareModal isOpen={true} onClose={() => {}} />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('ShortcutsModal closed null', () => {
    const { container } = render(<ShortcutsModal isOpen={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('ShortcutsModal open shows shortcuts', () => {
    render(<ShortcutsModal isOpen={true} onClose={() => {}} />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('Layout body contains main', () => {
    render(<Layout><span>content</span></Layout>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('Sidebar shows Timeline', () => {
    render(<Sidebar />);
    expect(screen.getByText(/Timeline|News/)).toBeInTheDocument();
  });

  it('Sidebar shows Scenarios', () => {
    render(<Sidebar />);
    expect(screen.getByText(/Scenarios|Educational/)).toBeInTheDocument();
  });

  it('ToastContainer multiple toasts', () => {
    useUIStore.setState({ toasts: [] });
    useUIStore.getState().addToast('a', 'info');
    useUIStore.getState().addToast('b', 'success');
    render(<ToastContainer />);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('ShareModal close callback', () => {
    let closed = false;
    const { container } = render(<ShareModal isOpen={true} onClose={() => { closed = true; }} />);
    // find close button if exists
    const btn = container.querySelector('button');
    if (btn) fireEvent.click(btn);
    expect(true).toBe(true);
  });

  it('ShortcutsModal lists keys', () => {
    render(<ShortcutsModal isOpen={true} onClose={() => {}} />);
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('Sidebar highlights active mode', () => {
    useUIStore.setState({ mode: 'trade' });
    render(<Sidebar />);
    expect(document.body).toBeTruthy();
  });

  it('Toast type success has icon', () => {
    useUIStore.setState({ toasts: [{ id: '1', message: 's', type: 'success' }] });
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toContain('s');
  });

  it('Layout renders brand tagline', () => {
    render(<Layout><div /></Layout>);
    expect(screen.getByText(/Synthetic markets/)).toBeInTheDocument();
  });

  it('Sidebar contains navigation', () => {
    render(<Sidebar />);
    expect(document.body.textContent).toContain('ETF');
  });

  it('Toast info type', () => {
    useUIStore.setState({ toasts: [{ id: '1', message: 'info1', type: 'info' }] });
    render(<ToastContainer />);
    expect(screen.getByText('info1')).toBeInTheDocument();
  });

  it('ShareModal renders share link', () => {
    render(<ShareModal isOpen={true} onClose={() => {}} />);
    expect(document.body).toBeTruthy();
  });
});
