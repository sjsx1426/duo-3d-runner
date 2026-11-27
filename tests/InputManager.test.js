import { describe, expect, it } from 'vitest';
import { InputManager, DEFAULT_BINDINGS } from '../src/systems/InputManager.js';

function createMemoryStorage() {
  const store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
  };
}

describe('InputManager', () => {
  it('rebinds actions exclusively, persists to storage, and restores on init', () => {
    const storage = createMemoryStorage();
    const im1 = new InputManager({ target: null, storage });

    im1.rebindAction('jump', ['KeyK']);
    expect(im1.getBindings().jump).toEqual(['KeyK']);

    im1.rebindAction('dash', ['KeyK']);
    expect(im1.getBindings().dash).toEqual(['KeyK']);
    expect(im1.getBindings().jump).toEqual([]);

    const im2 = new InputManager({ target: null, storage });
    let dashed = false;
    im2.on('dash', () => {
      dashed = true;
    });
    im2.handleKeyDown({ code: 'KeyK' });
    expect(dashed).toBe(true);

    im2.resetBindings();
    expect(im2.getBindings()).toEqual(DEFAULT_BINDINGS);
  });

  it('guards repeated keydown events and buffers actions within window', () => {
    const im = new InputManager({ target: null, bufferWindow: 0.15 });
    let jumps = 0;
    im.on('jump', () => {
      jumps += 1;
    });

    im.handleKeyDown({ code: 'Space', repeat: false });
    im.handleKeyDown({ code: 'Space', repeat: true });
    expect(jumps).toBe(1);
    expect(im.hasBufferedAction('jump')).toBe(true);

    im.update(0.1);
    expect(im.consumeBufferedAction('jump')).toBe(true);
    expect(im.consumeBufferedAction('jump')).toBe(false);
  });

  it('detects touch swipes and edge-triggered gamepad actions', () => {
    const fakePad = { connected: true, axes: [-0.9, 0], buttons: [{ pressed: true }] };
    const im = new InputManager({
      target: null,
      getGamepads: () => [fakePad],
    });
    const events = [];
    ['left', 'right', 'jump', 'slide', 'dash'].forEach((a) => im.on(a, (act) => events.push(act)));

    im.handleTouchStart({ touches: [{ clientX: 100, clientY: 100 }] });
    im.handleTouchMove({ touches: [{ clientX: 160, clientY: 100 }] });
    im.handleTouchEnd({});

    im.update(0.016);
    im.update(0.016);

    expect(events).toEqual(['right', 'left', 'jump']);
  });
});
