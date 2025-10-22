# Design Document

## Overview

Bu tasarım, mevcut Electron + React uygulamasının build sistemini Webpack'ten Vite'a geçirmeyi ve better-sqlite3 yerine sqlite3 kullanmayı amaçlar. Mevcut UI tasarımı, bileşenler ve tüm işlevsellik korunacaktır.

## Architecture

### Current vs New Architecture

**Mevcut Yapı (Webpack):**
```
src/
├── main/
│   └── simple-main.js (Electron main process)
├── renderer/
│   ├── index.tsx (React entry point)
│   ├── App.tsx (Main React component)
│   └── components/ (UI components)
└── .erb/configs/ (Webpack configurations)
```

**Yeni Yapı (Vite):**
```
src/
├── main/
│   └── main.js (Updated Electron main process)
├── renderer/
│   ├── index.tsx (React entry point - preserved)
│   ├── App.tsx (Main React component - preserved)
│   └── components/ (UI components - preserved)
├── vite.config.js (Vite configuration)
└── index.html (Vite entry HTML)
```

### Technology Stack Migration

| Component | Current | New | Status |
|-----------|---------|-----|--------|
| Build Tool | Webpack | Vite | Replace |
| React Framework | React 19 | React 19 | Keep |
| Database | better-sqlite3 | sqlite3 | Replace |
| UI Framework | Material-UI | Material-UI | Keep |
| Routing | react-router-dom | react-router-dom | Keep |
| Styling | Material-UI + Custom CSS | Material-UI + TailwindCSS | Enhance |

## Components and Interfaces

### 1. Package Configuration (package.json)

**Development Scripts:**
```json
{
  "dev": "concurrently \"npm run dev:react\" \"wait-on http://localhost:3000 && electron .\"",
  "dev:react": "vite",
  "postinstall": "electron-builder install-app-deps"
}
```

**Production Scripts:**
```json
{
  "build": "vite build && electron-builder",
  "build:react": "vite build"
}
```

**Dependencies:**
- Keep: `react`, `react-dom`, `react-router-dom`, `@mui/material`, `@mui/icons-material`
- Replace: `better-sqlite3` → `sqlite3`
- Add: `vite`, `@vitejs/plugin-react`, `tailwindcss`
- Remove: All webpack-related packages

### 2. Vite Configuration (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist-react'
  }
})
```

### 3. Main Process (main.js)

**Environment Detection:**
```javascript
const isDev = process.env.NODE_ENV === 'development'

if (isDev) {
  mainWindow.loadURL('http://localhost:3000')
} else {
  mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'))
}
```

**Database Integration:**
```javascript
// Replace better-sqlite3 with sqlite3
const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database(dbPath)
```

### 4. Renderer Process

**Preserved Components:**
- All existing React components will be kept as-is
- Material-UI theme and styling preserved
- Component structure and functionality maintained
- IPC communication patterns preserved

## Data Models

### Database Migration (better-sqlite3 → sqlite3)

**API Changes:**
```javascript
// Old (better-sqlite3)
const stmt = db.prepare('SELECT * FROM customers')
const rows = stmt.all()

// New (sqlite3)
db.all('SELECT * FROM customers', (err, rows) => {
  // Handle async result
})
```

**Migration Strategy:**
1. Replace synchronous better-sqlite3 calls with asynchronous sqlite3 calls
2. Update IPC handlers to use async/await pattern
3. Maintain same database schema and operations
4. Preserve all existing database functionality

## Error Handling

### Build Process Error Handling

1. **Native Module Compilation:**
   - Use `electron-rebuild` for sqlite3 native binaries
   - Configure `asarUnpack` for sqlite3 in electron-builder

2. **Development Server:**
   - Use `wait-on` to ensure Vite server is ready before launching Electron
   - Handle connection failures gracefully

3. **Database Operations:**
   - Convert synchronous error handling to async error handling
   - Maintain existing error response patterns for IPC

## Testing Strategy

### Migration Testing Approach

1. **Functionality Testing:**
   - Verify all existing features work after migration
   - Test database operations in both development and production
   - Validate IPC communication between main and renderer processes

2. **Build Testing:**
   - Test development server startup and hot-reload
   - Verify production build and packaging
   - Test native module packaging with sqlite3

3. **Performance Testing:**
   - Compare build times (Webpack vs Vite)
   - Verify hot-reload performance improvements
   - Test application startup times

### Test Coverage Areas

- Database CRUD operations
- IPC handlers for all entities (customers, products, employees, etc.)
- React component rendering and navigation
- Material-UI theme application
- Electron window management and lifecycle

## Implementation Notes

### Critical Configuration Points

1. **Electron Builder Configuration:**
```json
{
  "build": {
    "asarUnpack": ["**/node_modules/sqlite3/**/*"],
    "files": ["dist-react/**/*", "src/main/**/*", "package.json"],
    "directories": {
      "output": "dist"
    }
  }
}
```

2. **TailwindCSS Integration:**
- Add TailwindCSS alongside Material-UI (not replacing)
- Configure for utility-first styling where appropriate
- Maintain existing Material-UI component styling

3. **Development Workflow:**
- Preserve existing hot-reload experience
- Maintain DevTools integration
- Keep existing debugging capabilities

### Migration Risks and Mitigations

**Risk:** Database operation failures due to async/sync differences
**Mitigation:** Careful conversion of all database calls with proper error handling

**Risk:** Native module packaging issues with sqlite3
**Mitigation:** Proper electron-builder configuration with asarUnpack rules

**Risk:** Build configuration complexity
**Mitigation:** Simplified Vite configuration compared to complex Webpack setup