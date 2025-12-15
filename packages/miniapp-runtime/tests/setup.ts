import { vi } from 'vitest';

// Mock Notification API
class MockNotification {
  title: string;
  options: any;
  onclick: (() => void) | null = null;

  constructor(title: string, options?: any) {
    this.title = title;
    this.options = options;
  }

  close() {}

  addEventListener(event: string, handler: Function) {
    if (event === 'click' && this.onclick === null) {
      this.onclick = handler as any;
    }
  }
}

global.Notification = MockNotification as any;
(global.Notification as any).permission = 'granted';
(global.Notification as any).requestPermission = vi.fn().mockResolvedValue('granted');

global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
} as any;

// Mock IndexedDB
const indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  databases: vi.fn(),
};

global.indexedDB = indexedDB as any;

// Mock postMessage
global.postMessage = vi.fn();

// Mock document.createElement for iframe
const originalCreateElement = document.createElement.bind(document);
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'iframe') {
    const mockIframe = originalCreateElement('div') as any;

    // Create a mock contentWindow that shares the same event system as the main window
    const mockContentWindow = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((event: string, handler: any) => {
        // Forward to main window for testing
        window.addEventListener(event, handler);
      }),
      removeEventListener: vi.fn((event: string, handler: any) => {
        window.removeEventListener(event, handler);
      }),
      location: {
        origin: window.location.origin,
      },
    };

    mockIframe.contentWindow = mockContentWindow;

    mockIframe.contentDocument = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(() => {
        // Simulate lifecycle:ready message after document.close()
        setTimeout(() => {
          const readyEvent = new MessageEvent('message', {
            data: {
              id: 'ready',
              type: 'EVENT',
              action: 'lifecycle:ready',
              version: '1.0',
              nonce: 'test-nonce',
              timestamp: Date.now(),
              payload: {}
            },
            origin: window.location.origin,
          });
          window.dispatchEvent(readyEvent);
        }, 10);
      }),
    };

    mockIframe.setAttribute = vi.fn();
    mockIframe.getAttribute = vi.fn((attr: string) => {
      if (attr === 'sandbox') return 'allow-scripts allow-same-origin';
      if (attr === 'referrerpolicy') return 'no-referrer';
      return null;
    });
    mockIframe.remove = vi.fn();
    mockIframe.appendChild = vi.fn();

    // Mock style property
    mockIframe.style = {};

    return mockIframe;
  }
  return originalCreateElement(tagName);
}) as any;
