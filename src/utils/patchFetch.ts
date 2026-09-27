/**
 * Polyfill/Patch for environments (e.g. preview iframes or sandboxes)
 * where `window.fetch` is defined with only a getter on Window or Window.prototype.
 * Adding a setter prevents:
 * `TypeError: Cannot set property fetch of #<Window> which has only a getter`
 */
(() => {
  try {
    const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!target) return;

    let _fetch = target.fetch;
    const desc = Object.getOwnPropertyDescriptor(target, 'fetch');

    if (!desc || desc.configurable || (desc.get && !desc.set) || !desc.writable) {
      Object.defineProperty(target, 'fetch', {
        configurable: true,
        enumerable: true,
        get() {
          return _fetch;
        },
        set(fn) {
          _fetch = fn;
        },
      });
    }
  } catch {
    try {
      const proto = Object.getPrototypeOf(window);
      if (proto) {
        let _fetch = proto.fetch || window.fetch;
        Object.defineProperty(proto, 'fetch', {
          configurable: true,
          enumerable: true,
          get() {
            return _fetch;
          },
          set(fn) {
            _fetch = fn;
          },
        });
      }
    } catch {}
  }
})();
