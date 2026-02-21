import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildShareUrl,
  buildShareMessage,
  parseShareParams,
  clearShareParams,
  copyToClipboard,
} from '../../src/utils/shareUrl.ts';

const originalWindow = globalThis.window;
const originalHistory = globalThis.history;
const originalNavigator = globalThis.navigator;
const originalDocument = globalThis.document;

function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function restoreGlobal(name, original) {
  if (typeof original === 'undefined') {
    delete globalThis[name];
  } else {
    setGlobal(name, original);
  }
}

describe('shareUrl utils', () => {
  beforeEach(() => {
    setGlobal('window', {
      location: {
        origin: 'https://example.com',
        pathname: '/index.html',
        search: '',
      },
    });
    setGlobal('history', { replaceState: vi.fn() });
    setGlobal('navigator', {});
    setGlobal('document', {});
  });

  afterEach(() => {
    restoreGlobal('window', originalWindow);
    restoreGlobal('history', originalHistory);
    restoreGlobal('navigator', originalNavigator);
    restoreGlobal('document', originalDocument);
    vi.restoreAllMocks();
  });

  it('builds an encoded share URL from seed and rank', () => {
    const url = buildShareUrl('AB C/12', 'blue');
    expect(url).toBe('https://example.com/index.html?seed=AB%20C%2F12&rank=blue');
  });

  it('builds a formatted share message', () => {
    const msg = buildShareMessage('ABC123', 'red', 'La Combe Rouge');
    expect(msg).toContain('https://example.com/index.html?seed=ABC123&rank=red');
    expect(msg).toContain('La Combe Rouge');
    expect(msg).toContain('[ABC123]');
  });

  it('parses params and normalizes seed to uppercase', () => {
    globalThis.window.location.search = '?seed=abC123&rank=red';
    expect(parseShareParams()).toEqual({ seedCode: 'ABC123', rank: 'red' });
  });

  it('defaults invalid rank to green', () => {
    globalThis.window.location.search = '?seed=TEST01&rank=purple';
    expect(parseShareParams()).toEqual({ seedCode: 'TEST01', rank: 'green' });
  });

  it('returns null when no seed is present', () => {
    globalThis.window.location.search = '?rank=blue';
    expect(parseShareParams()).toBeNull();
  });

  it('clears query params without reload when search exists', () => {
    globalThis.window.location.search = '?seed=ABC123&rank=blue';
    clearShareParams();
    expect(globalThis.history.replaceState).toHaveBeenCalledWith({}, '', '/index.html');
  });

  it('does nothing when there is no query string', () => {
    globalThis.window.location.search = '';
    clearShareParams();
    expect(globalThis.history.replaceState).not.toHaveBeenCalled();
  });

  it('copies text via navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    globalThis.navigator.clipboard = { writeText };
    const ok = await copyToClipboard('hello');
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to textarea copy when clipboard API fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    globalThis.navigator.clipboard = { writeText };

    const textarea = { value: '', style: {}, select: vi.fn() };
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const execCommand = vi.fn().mockReturnValue(true);
    globalThis.document = {
      createElement: vi.fn().mockReturnValue(textarea),
      body: { appendChild, removeChild },
      execCommand,
    };

    const ok = await copyToClipboard('fallback');
    expect(ok).toBe(true);
    expect(globalThis.document.createElement).toHaveBeenCalledWith('textarea');
    expect(textarea.select).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
  });

  it('returns false when clipboard and fallback both fail', async () => {
    globalThis.navigator.clipboard = { writeText: vi.fn().mockRejectedValue(new Error('nope')) };
    globalThis.document = {
      createElement: vi.fn().mockImplementation(() => { throw new Error('no dom'); }),
    };
    const ok = await copyToClipboard('x');
    expect(ok).toBe(false);
  });
});
