# @mango/miniapp-runtime

MiniApp runtime and sandbox for Mango platform.

## Features

- 🔒 **Secure Sandbox**: Iframe-based isolation with configurable security policies
- 🔑 **Permission System**: Fine-grained permission management with user consent
- 💬 **Message Bridge**: Secure communication between host and MiniApp
- 💾 **Storage API**: Isolated storage with quota management
- 🔔 **Notification API**: System notifications with scheduling support

## Installation

```bash
pnpm add @mango/miniapp-runtime
```

## Usage

### Creating a Sandbox

```typescript
import { createSandbox, MiniAppManifest } from '@mango/miniapp-runtime';

const manifest: MiniAppManifest = {
  id: 'my-miniapp',
  name: 'My MiniApp',
  version: '1.0.0',
  description: 'A sample MiniApp',
  author: 'Your Name',
  permissions: [Permission.STORAGE_LOCAL, Permission.SYSTEM_NOTIFICATION],
  entryPoint: '/miniapp.js',
};

const sandbox = createSandbox({
  appId: manifest.id,
  userId: 'user-123',
  manifest,
  container: document.getElementById('miniapp-container')!,
  onLoad: () => console.log('MiniApp loaded'),
  onError: (error) => console.error('MiniApp error:', error),
});

await sandbox.load();
```

### Permission Management

```typescript
import { PermissionManager, Permission } from '@mango/miniapp-runtime';

const permissionManager = new PermissionManager('app-id', 'user-id');

// Request permission
const status = await permissionManager.request(Permission.SYSTEM_NOTIFICATION);

// Check permission
if (permissionManager.isGranted(Permission.STORAGE_LOCAL)) {
  // Use storage
}

// Grant permission
permissionManager.grant(Permission.USER_READ);

// Revoke permission
permissionManager.revoke(Permission.USER_READ);
```

### Storage API

```typescript
import { createStorage, StorageBackend } from '@mango/miniapp-runtime';

const storage = createStorage({
  appId: 'my-miniapp',
  userId: 'user-123',
  backend: StorageBackend.LOCAL_STORAGE,
  permissionManager,
});

// Set item
await storage.setItem('key', 'value');

// Get item
const value = await storage.getItem('key');

// Remove item
await storage.removeItem('key');

// Get all keys
const keys = await storage.keys();

// Clear all
await storage.clear();
```

### Notification API

```typescript
import { createNotification } from '@mango/miniapp-runtime';

const notification = createNotification({
  appId: 'my-miniapp',
  userId: 'user-123',
  permissionManager,
});

// Request permission
await notification.requestPermission();

// Show notification
await notification.show({
  title: 'Hello',
  body: 'This is a notification',
  icon: '/icon.png',
});

// Schedule notification
const notificationId = await notification.schedule({
  title: 'Reminder',
  body: 'Don\'t forget!',
  scheduledTime: new Date(Date.now() + 60000), // 1 minute from now
  repeat: 'daily',
});

// Cancel scheduled notification
await notification.cancel(notificationId);
```

## Architecture

```
@mango/miniapp-runtime
├── core/
│   ├── sandbox.ts          # Iframe-based sandbox
│   ├── permissions.ts      # Permission management
│   └── message-bridge.ts   # Secure messaging
└── apis/
    ├── types.ts            # Type definitions
    ├── storage.ts          # Storage API
    └── notification.ts     # Notification API
```

## Security

- **Sandbox Isolation**: MiniApps run in isolated iframes with restricted permissions
- **Permission System**: All sensitive operations require explicit user consent
- **Message Validation**: All messages are validated for origin, timestamp, and structure
- **Storage Quota**: Each MiniApp has a storage quota to prevent abuse
- **CSP Headers**: Content Security Policy headers prevent XSS attacks

## License

MIT
