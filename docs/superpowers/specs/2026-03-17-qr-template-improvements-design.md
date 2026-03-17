# QR Template Selector Improvements - Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Component:** `components/admin/QrTemplateSelector.tsx`

---

## Goal

Improve the QR Template Selector with couple name rendering, URL text below QR code, and technical optimizations. Refactor into a multi-layer canvas architecture for maintainability and future extensibility.

## Scope

### In Scope
- Couple name text rendered on template (Playfair Display, above QR)
- Full URL text rendered below QR code (Inter font)
- Multi-layer canvas rendering engine
- Component decomposition (split 314-line monolith)
- Error states for template loading, generation, and download failures
- Remove priority from template thumbnails (lazy loading)

### Out of Scope
- Drag and drop QR positioning
- Custom template upload
- PDF download format
- QR with logo in center
- URL shortening/redirect logic
- Mobile zoom/preview

---

## Architecture

### File Structure

```
components/admin/qr-template/
├── QrTemplateSelector.tsx      # Main container (state management, UI layout)
├── CanvasRenderer.tsx          # Multi-layer canvas engine
├── ColorPicker.tsx             # Color palette (extracted from main component)
├── TemplateGrid.tsx            # Thumbnail grid for template selection
├── templates.ts                # Template configuration (positions, dimensions)
└── types.ts                    # Shared TypeScript types
```

### Component Responsibilities

**QrTemplateSelector.tsx** (main container)
- Manages all state: selectedTemplate, generatedImage, isGenerating, error, coupleName
- Renders UI layout: couple name input, color picker, template grid, preview/download
- Receives props from AdminDashboardTabs

**CanvasRenderer.tsx** (rendering engine)
- Receives configuration and renders all layers onto a hidden canvas
- Sequential pipeline: background, text, QR, URL
- Handles font loading with fallbacks
- Error handling with onError callback

**ColorPicker.tsx** (extracted)
- 10 predefined colors + custom color input
- Same functionality as current, just extracted

**Language sync:** The usePathname/i18n language sync from the current component is preserved in the refactored QrTemplateSelector.tsx.

**TemplateGrid.tsx** (extracted)
- Horizontal scrollable thumbnail grid
- Lazy loaded images (no priority)
- Selection state with ring indicator

**templates.ts** (configuration)
- Template definitions with positions for QR, name, and URL

**types.ts** (shared types)
- TemplateOption, QrPosition, TextPosition interfaces

---

## Canvas Rendering Pipeline

### CanvasRenderer Props

```typescript
interface CanvasRendererProps {
  templateImage: HTMLImageElement;
  template: TemplateOption;
  qrDataUrl: string;
  coupleName: string;
  guestUrl: string;
  qrColor: string;
  onRendered: (dataUrl: string) => void;
  onError: (error: string) => void;
}
```

### Rendering Sequence

1. Set canvas dimensions from template image naturalWidth/naturalHeight
2. Draw template image (background layer)
3. Load fonts via document.fonts.load() - fallback to system serif/sans-serif
4. Draw couple name - Playfair Display, white with subtle drop shadow, per namePosition
5. Draw QR code - positioned per qrPosition
6. Draw URL text - Inter font, smaller than name, per urlPosition
7. Call onRendered with final canvas data URL

Each step in try/catch. Any failure calls onError with descriptive message.

If coupleName is empty or whitespace-only, skip the name text layer entirely (no shadow artifacts).

### Font Loading Strategy

Next.js loads fonts via next/font/google with hashed names, so document.fonts.load() will not work. Instead, use the FontFace API to load fonts directly from Google Fonts CDN for canvas rendering:

```typescript
async function loadCanvasFonts(): Promise<{ nameFont: string; urlFont: string }> {
  try {
    const playfair = new FontFace(
      'Playfair Canvas',
      'url(https://fonts.gstatic.com/s/playfairdisplay/v37/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTbtbK-F2rA0s.woff2)'
    );
    const inter = new FontFace(
      'Inter Canvas',
      'url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2)'
    );
    const results = await Promise.race([
      Promise.all([playfair.load(), inter.load()]),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
    ]);
    document.fonts.add(playfair);
    document.fonts.add(inter);
    return { nameFont: 'Playfair Canvas', urlFont: 'Inter Canvas' };
  } catch {
    return { nameFont: 'serif', urlFont: 'sans-serif' };
  }
}
```

Fonts are registered under separate names (Playfair Canvas, Inter Canvas) to avoid conflicts with Next.js font optimization. Falls back to system serif/sans-serif after 3s timeout via Promise.race.

---

## Template Configuration

### Extended Template Type

```typescript
interface TextPosition {
  x: number;       // percentage of width (center point)
  y: number;       // percentage of height (center point)
  fontSize: number; // percentage of canvas width (auto-scaled)
}

interface TemplateOption {
  id: string;
  name: string;
  imageSrc: string;
  qrPosition: { x: number; y: number; width: number; height: number };
  namePosition: TextPosition;  // NEW
  urlPosition: TextPosition;   // NEW
}
```

Positions calibrated visually per template during implementation.

---

## UI Changes

### New Input: Couple Name
- Text input above color picker
- Label: i18n key admin.dashboard.qr.coupleName
- Auto-populated from event.coupleName prop
- User can edit to customize (session-only override, resets on next modal open)

### URL Text
- Display URL derived from the actual guest URL
- The real guest URL is: https://www.dodajuspomenu.com/{lang}/guest/login?event={slug}
- For display on template, shortened to: dodajuspomenu.com/guest/{slug} (visual only, not a functional URL)
- No user input, display only on template
- Inter font, smaller than couple name
- Note: The QR code itself encodes the full functional URL. The display text is for visual reference only.

### Error States

| Scenario | UI Feedback |
|----------|-------------|
| Template image fails to load | Placeholder + retry button |
| Canvas/QR generation fails | Last successful result + toast error |
| Download fails | Toast error notification |

### Technical Optimizations
- Remove priority from template thumbnail Images
- Keep priority only on generated preview image

---

## Data Flow

```
AdminDashboardTabs (event.coupleName, event.slug)
  -> QrTemplateSelector (coupleName, qrValue, qrColor, eventSlug, onQrColorChange)
       -> ColorPicker (qrColor, onColorChange)
       -> TemplateGrid (templates, selectedId, onSelect)
       -> CanvasRenderer (templateImage, template, qrDataUrl, coupleName, guestUrl, qrColor)
            -> onRendered(dataUrl) / onError(message)
```

### State in QrTemplateSelector

| State | Type | Source |
|-------|------|--------|
| selectedTemplate | TemplateOption | Local, default first template |
| generatedImage | string or null | From CanvasRenderer callback |
| isGenerating | boolean | Local |
| error | string or null | NEW - from CanvasRenderer or download |
| coupleName | string | NEW - initialized from props, editable |
| downloadSuccess | boolean | Local |

---

## Integration Points

### AdminDashboardTabs Changes

Pass event.coupleName as new prop to QrTemplateSelector:

```typescript
<QrTemplateSelector
  qrValue={guestUrl}
  qrColor={qrColor}
  eventSlug={event.slug}
  onQrColorChange={setQrColor}
  coupleName={event.coupleName}  // NEW
/>
```

### Hidden QRCodeCanvas
The hidden QRCodeCanvas stays in QrTemplateSelector (not moved to CanvasRenderer). QrTemplateSelector extracts the data URL and passes it to CanvasRenderer as qrDataUrl prop.

### What Does NOT Change
- AdminDashboardTabs.tsx - only adds coupleName prop
- QR code generation library (qrcode.react) - same approach
- Download mechanism - same, with added error handling
- Color palette - same functionality, extracted to component

---

## New i18n Keys Required

Serbian (locales/sr/translation.json):
- admin.dashboard.qr.coupleName: "Ime para na predlosku"
- admin.dashboard.qr.coupleNamePlaceholder: "npr. Marko & Ana"
- admin.dashboard.qr.templateLoadError: "Predlozak nije dostupan"
- admin.dashboard.qr.retryLoad: "Pokusaj ponovo"
- admin.dashboard.qr.generationError: "Greska pri generisanju predloska"
- admin.dashboard.qr.downloadError: "Greska pri preuzimanju"

English equivalents added to locales/en/translation.json.
