import '@testing-library/jest-dom';

// next-cloudinary's CldImage throws synchronously without this env var.
// Set a dummy cloud name so tests rendering ImageWithSpinner (which uses
// CldImage for http URLs) don't blow up under jsdom.
process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'test-cloud';

global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// jsdom lacks window.matchMedia; embla-carousel-react calls it on mount.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

// jsdom lacks ResizeObserver; embla uses it on the viewport.
if (typeof window !== 'undefined' && !(window as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom lacks IntersectionObserver; embla's SlidesInView uses it.
if (typeof window !== 'undefined' && !(window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver) {
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = '';
    thresholds = [];
  };
}
