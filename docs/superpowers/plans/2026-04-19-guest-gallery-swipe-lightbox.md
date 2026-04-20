# Guest Gallery Swipe Lightbox + Body Scroll Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guest može swipe-om pregledati sve uploadovane slike u fullscreen lightbox-u; body scroll se zaključava dok su upload-progress i lightbox modal-i otvoreni.

**Architecture:** Novi `components/shared/SwipeLightbox.tsx` koji wrap-uje `embla-carousel-react` (već u deps-u). Novi `hooks/useLockBodyScroll.ts` se poziva iz oba modal-a (lightbox i upload-progress). `components/guest/ImageGallery.tsx` zamijeniti postojeći fullscreen `<div>` sa `<SwipeLightbox>` i migrirati inline delete na `fetchWithCsrfRetry` helper iz `lib/csrf-client.ts` (dodan u PR #3).

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind, embla-carousel-react 8.5.1, framer-motion, Jest + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-04-19-guest-gallery-swipe-lightbox-design.md](docs/superpowers/specs/2026-04-19-guest-gallery-swipe-lightbox-design.md)

---

## File structure

| Fajl | Odgovornost | Task |
|---|---|---|
| **NEW** `hooks/useLockBodyScroll.ts` | `useLockBodyScroll(active: boolean): void` — lock `body.style.overflow` + scrollbar padding comp | 3 |
| **NEW** `__tests__/hooks/useLockBodyScroll.test.ts` | Unit test za hook | 3 |
| **NEW** `components/shared/SwipeLightbox.tsx` | Fullscreen swipe viewer — embla carousel + swipe-down-to-close + delete + body scroll lock | 5-8 |
| **NEW** `__tests__/SwipeLightbox.test.tsx` | Unit smoke za navigation + close + delete | 6, 8 |
| `components/guest/ImageGallery.tsx` | Zamjena fullscreen `<div>` sa `<SwipeLightbox>`; migracija delete-a na helper | 9, 10 |
| `components/guest/Upload-Form.tsx` | Dodati `useLockBodyScroll(showUploadStatus)` | 4 |

---

## Task 1: Branch setup

**Files:** none (git-only)

- [ ] **Step 1: Ensure PR #3 (feat/guest-upload-reliability) context je jasan**

Run:
```bash
git status
git branch --show-current
```

Expected: na grani `feat/guest-upload-reliability` SA commit-om spec dokumenta, working tree clean.

- [ ] **Step 2: Napravi novu granu iz main-a**

Ako PR #3 nije mergovan: koristi postojeću granu `feat/guest-upload-reliability` kao base, napravi `feat/guest-gallery-lightbox` iz nje.
Ako PR #3 jeste mergovan: iz fresh `main` napravi.

Run:
```bash
# Ako PR #3 još nije merged:
git checkout -b feat/guest-gallery-lightbox

# Ako PR #3 jeste merged:
git checkout main && git pull origin main
git checkout -b feat/guest-gallery-lightbox
```

Expected: `git branch --show-current` vraća `feat/guest-gallery-lightbox`.

---

## Task 2: Verify embla-carousel-react instalacija

**Files:** none (dependency check)

- [ ] **Step 1: Potvrdi da je embla u deps-u**

Run:
```bash
node -e "console.log(require('./package.json').dependencies['embla-carousel-react'])"
```

Expected: `8.5.1` (ili noviji). Ako je `undefined`, dodaj: `pnpm add embla-carousel-react`.

- [ ] **Step 2: Smoke import**

Run:
```bash
node -e "const e = require('embla-carousel-react'); console.log(typeof e.default)"
```

Expected: `function`.

---

## Task 3: `useLockBodyScroll` hook + unit test (TDD)

**Files:**
- Create: `hooks/useLockBodyScroll.ts`
- Test: `__tests__/hooks/useLockBodyScroll.test.ts`

- [ ] **Step 1: Napiši failing test**

Kreiraj `__tests__/hooks/useLockBodyScroll.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

describe('useLockBodyScroll', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('sets body.style.overflow to hidden when active=true', () => {
    const { unmount } = renderHook(() => useLockBodyScroll(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('does nothing when active=false', () => {
    renderHook(() => useLockBodyScroll(false));
    expect(document.body.style.overflow).toBe('');
  });

  it('restores previous overflow value on unmount', () => {
    document.body.style.overflow = 'scroll';
    const { unmount } = renderHook(() => useLockBodyScroll(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('toggles when active prop flips', () => {
    const { rerender } = renderHook(({ active }) => useLockBodyScroll(active), {
      initialProps: { active: false },
    });
    expect(document.body.style.overflow).toBe('');
    rerender({ active: true });
    expect(document.body.style.overflow).toBe('hidden');
    rerender({ active: false });
    expect(document.body.style.overflow).toBe('');
  });
});
```

- [ ] **Step 2: Run test da vidiš FAIL**

Run:
```bash
pnpm test:unit -- useLockBodyScroll
```

Expected: FAIL — `Cannot find module '@/hooks/useLockBodyScroll'`.

- [ ] **Step 3: Implementiraj hook**

Kreiraj `hooks/useLockBodyScroll.ts`:

```ts
import { useEffect } from 'react';

/**
 * Locks `document.body` scroll while `active` is true. Compensates for the
 * scrollbar width on desktop so the page underneath doesn't shift when the
 * scrollbar disappears. No-op when `active` is false.
 */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const { body, documentElement } = document;
    const originalOverflow = body.style.overflow;
    const originalPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = originalOverflow;
      body.style.paddingRight = originalPaddingRight;
    };
  }, [active]);
}
```

- [ ] **Step 4: Run test da pass-uje**

Run:
```bash
pnpm test:unit -- useLockBodyScroll
```

Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add hooks/useLockBodyScroll.ts __tests__/hooks/useLockBodyScroll.test.ts
git commit -m "feat(ui): add useLockBodyScroll hook

Locks document.body scroll while active=true, compensates for scrollbar
width on desktop. Used by fullscreen modals to prevent the page from
scrolling behind the overlay.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Integrate `useLockBodyScroll` u Upload-Form

**Files:**
- Modify: `components/guest/Upload-Form.tsx`

- [ ] **Step 1: Dodaj import**

Otvori `components/guest/Upload-Form.tsx` i dodaj import uz postojeće:

```ts
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
```

- [ ] **Step 2: Pozovi hook**

Pronađi liniju gdje se deklarišu `useState`-ovi (oko linije 142-148). Nakon svih `useState` deklaracija i prije prve `React.useEffect` deklaracije, dodaj:

```ts
// Lock body scroll while the upload progress modal is visible.
useLockBodyScroll(showUploadStatus);
```

- [ ] **Step 3: Verify build + tests**

Run:
```bash
npx tsc --noEmit
pnpm test:unit
```

Expected: oba prolaze, 0 novih TS grešaka.

- [ ] **Step 4: Ručna QA**

Pokreni dev server (ako već nije):
```bash
pnpm dev
```

U drugom terminalu ili browser-u:
- Login kao guest
- Pokreni upload 5+ slika
- Dok je upload modal otvoren, probaj scroll-ovati stranicu kroz overlay → ne smije da se pomjera

- [ ] **Step 5: Commit**

```bash
git add components/guest/Upload-Form.tsx
git commit -m "fix(guest-upload): lock body scroll while upload modal is open

The upload progress modal's overlay didn't prevent the document body
from scrolling underneath. Users reported the body visibly moving
behind the modal on both desktop and mobile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `SwipeLightbox` skeleton (render + close + body lock)

**Files:**
- Create: `components/shared/SwipeLightbox.tsx`

- [ ] **Step 1: Kreiraj komponentu sa osnovnim render-om**

Kreiraj `components/shared/SwipeLightbox.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { X, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageWithSpinner from "@/components/shared/ImageWithSpinner";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

export type SwipeLightboxImage = {
  id: string;
  imageUrl: string;
};

export type SwipeLightboxProps = {
  images: SwipeLightboxImage[];
  startIndex: number;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
};

export function SwipeLightbox({ images, startIndex, onClose, onDelete }: SwipeLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  useLockBodyScroll(true);

  // Keep index within bounds if the underlying array shrinks (e.g. after delete).
  useEffect(() => {
    if (index >= images.length && images.length > 0) {
      setIndex(images.length - 1);
    }
  }, [images.length, index]);

  if (images.length === 0) {
    onClose();
    return null;
  }

  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Tap on the black backdrop closes; taps on the image must not.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Image viewport */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <ImageWithSpinner
          src={current.imageUrl}
          width={1600}
          height={1200}
          alt=""
          className="max-w-full max-h-full object-contain"
          unoptimized
        />
      </div>

      {/* Close button */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Delete button (optional) */}
      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white"
          onClick={() => onDelete(current.id)}
          aria-label="Delete"
        >
          <Trash className="h-5 w-5" />
        </Button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

Run:
```bash
npx tsc --noEmit
```

Expected: 0 grešaka.

- [ ] **Step 3: Commit**

```bash
git add components/shared/SwipeLightbox.tsx
git commit -m "feat(ui): add SwipeLightbox skeleton (render + close + body lock)

Fullscreen modal that renders a single image with close and optional
delete buttons plus a counter. Navigation logic (embla carousel, swipe-
down-to-close, keyboard) added in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Embla carousel + keyboard navigation + unit smoke test

**Files:**
- Modify: `components/shared/SwipeLightbox.tsx`
- Create: `__tests__/SwipeLightbox.test.tsx`

- [ ] **Step 1: Napiši failing smoke test**

Kreiraj `__tests__/SwipeLightbox.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { SwipeLightbox } from "@/components/shared/SwipeLightbox";

const IMAGES = [
  { id: "a", imageUrl: "https://cdn.example/a.jpg" },
  { id: "b", imageUrl: "https://cdn.example/b.jpg" },
  { id: "c", imageUrl: "https://cdn.example/c.jpg" },
];

describe("SwipeLightbox", () => {
  it("renders counter at start index", () => {
    render(<SwipeLightbox images={IMAGES} startIndex={1} onClose={() => {}} />);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("invokes onClose when Close button is clicked", () => {
    const onClose = jest.fn();
    render(<SwipeLightbox images={IMAGES} startIndex={0} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose when Escape is pressed", () => {
    const onClose = jest.fn();
    render(<SwipeLightbox images={IMAGES} startIndex={0} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("advances index on ArrowRight", () => {
    render(<SwipeLightbox images={IMAGES} startIndex={0} onClose={() => {}} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("does not advance past the last image", () => {
    render(<SwipeLightbox images={IMAGES} startIndex={2} onClose={() => {}} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("omits Delete button when onDelete is not provided", () => {
    render(<SwipeLightbox images={IMAGES} startIndex={0} onClose={() => {}} />);
    expect(screen.queryByLabelText("Delete")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test da vidiš FAIL**

Run:
```bash
pnpm test:unit -- SwipeLightbox
```

Expected: FAIL — keyboard tests fail (nema keydown listener-a), ostali možda prolaze.

- [ ] **Step 3: Refactor na embla + keyboard listener**

Zamijeni `components/shared/SwipeLightbox.tsx` cijelu implementaciju:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { X, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageWithSpinner from "@/components/shared/ImageWithSpinner";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

export type SwipeLightboxImage = {
  id: string;
  imageUrl: string;
};

export type SwipeLightboxProps = {
  images: SwipeLightboxImage[];
  startIndex: number;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
};

export function SwipeLightbox({ images, startIndex, onClose, onDelete }: SwipeLightboxProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex,
    loop: false,
    containScroll: "trimSnaps",
  });
  const [index, setIndex] = useState(startIndex);
  useLockBodyScroll(true);

  // Sync index from embla scroll events.
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Collapse if underlying array empties (e.g. after delete of last image).
  useEffect(() => {
    if (images.length === 0) onClose();
  }, [images.length, onClose]);

  // Keyboard: arrows navigate, Escape closes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") emblaApi?.scrollNext();
      else if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [emblaApi, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (images.length === 0) return null;
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      {/* Embla viewport */}
      <div className="overflow-hidden w-full h-full" ref={emblaRef}>
        <div className="flex w-full h-full">
          {images.map((img) => (
            <div key={img.id} className="relative shrink-0 grow-0 basis-full flex items-center justify-center p-4">
              <ImageWithSpinner
                src={img.imageUrl}
                width={1600}
                height={1200}
                alt=""
                className="max-w-full max-h-full object-contain pointer-events-none"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="destructive"
        size="icon"
        className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-black"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </Button>

      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white text-black"
          onClick={() => onDelete(current.id)}
          aria-label="Delete"
        >
          <Trash className="h-5 w-5" />
        </Button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test da pass-uje**

Run:
```bash
pnpm test:unit -- SwipeLightbox
```

Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add components/shared/SwipeLightbox.tsx __tests__/SwipeLightbox.test.tsx
git commit -m "feat(ui): SwipeLightbox carousel + keyboard + unit smoke

Embla carousel handles swipe gestures natively. ArrowLeft/ArrowRight
navigate, Escape closes, backdrop tap closes. Tests cover index state,
close handlers, and conditional delete button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Swipe-down-to-close gesture

**Files:**
- Modify: `components/shared/SwipeLightbox.tsx`

- [ ] **Step 1: Dodaj vertical swipe detekciju**

U `components/shared/SwipeLightbox.tsx`, unutar komponente, dodaj touch handler state i logiku. Pronađi `const handleBackdropClick = useCallback(...)` i iznad njega dodaj:

```tsx
const [touchStartY, setTouchStartY] = useState<number | null>(null);
const SWIPE_DOWN_THRESHOLD = 80;

const handleTouchStart = useCallback((e: React.TouchEvent) => {
  setTouchStartY(e.touches[0].clientY);
}, []);

const handleTouchEnd = useCallback(
  (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY;
    setTouchStartY(null);
    if (delta > SWIPE_DOWN_THRESHOLD) onClose();
  },
  [touchStartY, onClose]
);
```

- [ ] **Step 2: Pričvrsti na outer div**

Na root `<div className="fixed inset-0 ...">`, dodaj `onTouchStart={handleTouchStart}` i `onTouchEnd={handleTouchEnd}`:

```tsx
<div
  className="fixed inset-0 z-50 bg-black/95"
  role="dialog"
  aria-modal="true"
  onClick={handleBackdropClick}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
```

- [ ] **Step 3: Run tests da ništa nije slomljeno**

Run:
```bash
pnpm test:unit -- SwipeLightbox
```

Expected: PASS (6/6) — touch gesture nije unit-testiran (težak u jsdom-u, ostaje za manual QA).

- [ ] **Step 4: Commit**

```bash
git add components/shared/SwipeLightbox.tsx
git commit -m "feat(ui): swipe-down-to-close gesture in SwipeLightbox

iOS Photos-style gesture: touch starts on the modal, if the user drags
down more than 80px before releasing, the modal closes. Horizontal
swipes are still handled by embla for navigation between images.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Delete button sa potvrdom + unit test

**Files:**
- Modify: `components/shared/SwipeLightbox.tsx`
- Modify: `__tests__/SwipeLightbox.test.tsx`

- [ ] **Step 1: Dodaj delete handler sa potvrdom**

U `components/shared/SwipeLightbox.tsx`, pronađi postojeći Delete button i dodaj wrapper handler. Iznad `return` dodaj:

```tsx
const handleDeleteClick = useCallback(async () => {
  if (!onDelete) return;
  if (!window.confirm("Obrisati ovu sliku?")) return;
  try {
    await onDelete(current.id);
  } catch (err) {
    // Parent controls error UX; we just swallow here so the lightbox stays usable.
    console.error("[SwipeLightbox] delete failed", err);
  }
}, [onDelete, current.id]);
```

Zamijeni postojeći Delete button `onClick`:

```tsx
{onDelete && (
  <Button
    variant="destructive"
    size="icon"
    className="absolute top-4 left-4 z-10 bg-white/90 hover:bg-white text-black"
    onClick={handleDeleteClick}
    aria-label="Delete"
  >
    <Trash className="h-5 w-5" />
  </Button>
)}
```

- [ ] **Step 2: Napiši test za delete flow**

Dodaj u `__tests__/SwipeLightbox.test.tsx` (pre `});` kraj describe bloka):

```tsx
it("calls onDelete with current image id after confirm", async () => {
  const onDelete = jest.fn().mockResolvedValue(undefined);
  window.confirm = jest.fn(() => true);
  render(
    <SwipeLightbox images={IMAGES} startIndex={1} onClose={() => {}} onDelete={onDelete} />
  );
  fireEvent.click(screen.getByLabelText("Delete"));
  expect(window.confirm).toHaveBeenCalled();
  // Wait a tick for the async handler.
  await Promise.resolve();
  expect(onDelete).toHaveBeenCalledWith("b");
});

it("skips onDelete when confirm is dismissed", () => {
  const onDelete = jest.fn().mockResolvedValue(undefined);
  window.confirm = jest.fn(() => false);
  render(
    <SwipeLightbox images={IMAGES} startIndex={0} onClose={() => {}} onDelete={onDelete} />
  );
  fireEvent.click(screen.getByLabelText("Delete"));
  expect(onDelete).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run tests**

Run:
```bash
pnpm test:unit -- SwipeLightbox
```

Expected: PASS (8/8).

- [ ] **Step 4: Commit**

```bash
git add components/shared/SwipeLightbox.tsx __tests__/SwipeLightbox.test.tsx
git commit -m "feat(ui): delete-from-lightbox with browser confirm

The delete button triggers a window.confirm dialog; on yes, it invokes
the consumer's onDelete callback with the current image id. Error
handling is the parent's responsibility — lightbox just logs and stays
open so the user isn't stranded.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Wire SwipeLightbox u ImageGallery

**Files:**
- Modify: `components/guest/ImageGallery.tsx`

- [ ] **Step 1: Ukloni postojeći fullscreen div + dodaj state za lightbox index**

Otvori `components/guest/ImageGallery.tsx` i zamijeni sekcije:

U top import-ima, dodaj:
```ts
import { SwipeLightbox } from "@/components/shared/SwipeLightbox";
```

Zamijeni liniju `const [selectedImage, setSelectedImage] = useState<string | null>(null);` sa:
```ts
const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
```

Zamijeni `openFullView` i `closeFullView`:
```ts
const openFullView = (index: number) => setLightboxIndex(index);
const closeFullView = () => setLightboxIndex(null);
```

**Važno:** postojeći `handleDelete` (oko linije 89-91) referiše `selectedImage` u bloku:
```ts
if (selectedImage && images.find(img => img.id === imageId)?.imageUrl === selectedImage) {
  setSelectedImage(null);
}
```
Ukloni cijeli taj `if` blok — Task 9 Step 3 lightbox wrapper već handluje zatvaranje kad se lista isprazni.

- [ ] **Step 2: Update thumbnail onClick da prosljeđuje index**

Pronađi:
```tsx
<div 
  className="w-full h-full cursor-pointer"
  onClick={() => openFullView(image.imageUrl)}
>
```

Zamijeni sa:
```tsx
<div 
  className="w-full h-full cursor-pointer"
  onClick={() => openFullView(images.findIndex((img) => img.id === image.id))}
>
```

- [ ] **Step 3: Zamijeni cijeli fullscreen modal blok sa SwipeLightbox**

Pronađi postojeći blok koji počinje sa `{selectedImage && (` i završava sa zatvarajućim `)}` (oko linija 171-208). Zamijeni SVE sa:

```tsx
{lightboxIndex !== null && (
  <SwipeLightbox
    images={images}
    startIndex={lightboxIndex}
    onClose={closeFullView}
    onDelete={readOnly ? undefined : async (id) => {
      await handleDelete(id);
      // If the deleted image was the last, close. Otherwise keep lightbox open
      // on the same index (now showing the next image, or previous if at end).
      if (images.length <= 1) {
        closeFullView();
      }
    }}
  />
)}
```

- [ ] **Step 4: Ukloni neiskorištene import-e**

Na vrhu fajla, u import block-u, ukloni `X` iz `lucide-react` import-a ako je neiskorišten nakon prethodnih izmjena (provjeri — Trash može i dalje da se koristi za grid delete).

Pokreni build da vidiš da li ima nepromijenjenih import-a:
```bash
npx tsc --noEmit
```

Očekivano: 0 grešaka. Ako TS prijavi `'X' is declared but its value is never read.`, ukloni ga iz import-a.

- [ ] **Step 5: Run tests + build**

Run:
```bash
pnpm test:unit
rm -rf .next && pnpm build
```

Expected: svi testovi prolaze, build uspješan.

- [ ] **Step 6: Manual QA**

Otvori guest dashboard sa barem 2 uploadovane slike. Klik na thumbnail → lightbox se otvara na klikovitoj slici → swipe lijevo/desno mijenja sliku → swipe dolje zatvara → counter se ažurira.

- [ ] **Step 7: Commit**

```bash
git add components/guest/ImageGallery.tsx
git commit -m "feat(guest-gallery): replace single-image view with SwipeLightbox

Clicking a thumbnail now opens a fullscreen lightbox with swipe
navigation between all uploaded images. Tap backdrop, swipe down,
Escape, or X all close. Body scroll is locked by the lightbox itself.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Migracija ImageGallery delete-a na csrf-client helper

**Files:**
- Modify: `components/guest/ImageGallery.tsx`

- [ ] **Step 1: Import helper**

Na vrh fajla, pored postojećih import-a, dodaj:

```ts
import { fetchWithCsrfRetry } from "@/lib/csrf-client";
```

- [ ] **Step 2: Zamijeni inline fetch sa helper-om**

Pronađi `handleDelete` funkciju (počinje sa `const handleDelete = async (imageId: string) => {`). Zamijeni unutrašnji try blok:

```ts
try {
  const res = await fetchWithCsrfRetry(
    `/api/guest/images/delete?id=${imageId}`,
    {
      method: "DELETE",
      csrfEndpoint: "/api/guest/images/delete",
    }
  );

  let data: { success?: boolean; error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    // empty body is fine
  }

  if (!res.ok || !data?.success) {
    setError(data?.error || "Greška pri brisanju slike.");
  } else {
    const updatedImages = images.filter((img) => img.id !== imageId);
    setImages(updatedImages);
    if (onImagesChange) onImagesChange(updatedImages);
  }
} catch (e) {
  setError("Greška pri komunikaciji sa serverom.");
} finally {
  setDeletingId(null);
}
```

(Ukloni stari blok sa inline `fetch("/api/guest/images/delete")` da dobiješ token pa drugi `fetch` za DELETE — helper to radi interno.)

- [ ] **Step 3: Run tests + tsc**

Run:
```bash
npx tsc --noEmit
pnpm test:unit
```

Expected: 0 grešaka, svi testovi prolaze.

- [ ] **Step 4: Manual QA**

U browser-u: login kao guest, upload 3 slike, klik na jednu, delete iz lightbox-a → slika nestaje iz grid-a i lightbox pokazuje sljedeću (ili se zatvara ako je zadnja).

- [ ] **Step 5: Commit**

```bash
git add components/guest/ImageGallery.tsx
git commit -m "refactor(guest-gallery): use fetchWithCsrfRetry for delete

Inline CSRF fetch + fetch DELETE pair is replaced by the shared helper
introduced in PR #3. Race-safe token dedup, 403 retry, and consistent
error handling now apply to gallery delete.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Final verify + push + PR

**Files:** none (release operations)

- [ ] **Step 1: Clean build**

Run:
```bash
rm -rf .next
pnpm build
```

Expected: uspješan build bez grešaka (pre-existing warning-i o `CanvasRenderer.tsx` useCallback dependency su OK).

- [ ] **Step 2: Lint + tests + audit**

Run:
```bash
pnpm lint
pnpm test:unit
pnpm audit --prod --audit-level=high
```

Expected:
- Lint: samo postojeći warning-i (ništa novo)
- Tests: svi prolaze (41 iz prethodnih + 4 iz `useLockBodyScroll` + 8 iz `SwipeLightbox` = **53 ukupno**)
- Audit: exit 0 (whitelistovane 2 highs)

- [ ] **Step 3: Push**

Run:
```bash
git push -u origin feat/guest-gallery-lightbox
```

Expected: remote ga prihvata, URL za PR se ispiše u output-u.

- [ ] **Step 4: Otvori PR**

Run:
```bash
gh pr create --base main --head feat/guest-gallery-lightbox \
  --title "feat(guest-gallery): swipe lightbox + body scroll lock" \
  --body "$(cat <<'EOF'
## Summary

Phone-first swipe lightbox za guest galeriju + popravka scroll leak-a na fullscreen i upload-progress modalima.

## What changed

- **`hooks/useLockBodyScroll.ts`** (new) — locks document.body scroll while active=true, compensates for desktop scrollbar width
- **`components/shared/SwipeLightbox.tsx`** (new) — fullscreen swipe viewer wrapping embla-carousel-react (already in deps)
  - Swipe left/right navigacija
  - Swipe down to close (iOS Photos gesture)
  - Tap backdrop / X / Escape close
  - Optional delete button sa window.confirm
  - Counter \`N / total\`
- **\`components/guest/ImageGallery.tsx\`** — zamijenjen stari fullscreen \`<div>\` sa \`<SwipeLightbox>\`; delete migriran na \`fetchWithCsrfRetry\` iz PR #3
- **\`components/guest/Upload-Form.tsx\`** — dodan \`useLockBodyScroll(showUploadStatus)\`

## Spec

[2026-04-19-guest-gallery-swipe-lightbox-design.md](docs/superpowers/specs/2026-04-19-guest-gallery-swipe-lightbox-design.md)

## Test plan

- [ ] CI zelena
- [ ] Manual phone QA: swipe kroz 5+ slika, swipe down zatvara
- [ ] Manual desktop QA: Arrow ← → navigira, ESC/X zatvaraju
- [ ] Body scroll zaključan dok su modali otvoreni
- [ ] Delete iz lightbox-a radi (CSRF refresh helper)

## Followups (out of scope)

- Pinch-to-zoom
- Thumbnails strip
- Admin gallery migracija
- Share/download buttons

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: GitHub vraća URL za PR.

---

## Verifikacija (end-to-end, nakon merge-a)

```bash
# 1. Lokalno
git checkout main && git pull
pnpm install
pnpm build && pnpm lint && pnpm test:unit
# sve zeleno, 53+ tests

# 2. Manual na mobile (192.168.x.x:3001)
# - Login kao guest sa već uploadovanim slikama
# - Tap na sliku u gridu → lightbox se otvara
# - Swipe lijevo → sljedeća slika, counter update
# - Swipe desno → prethodna
# - Swipe dolje → zatvara
# - X → zatvara
# - Tap van slike → zatvara
# - Tijelo stranice ispod lightbox-a se NE pomjera
# - Upload status modal dok šalješ slike — body isto zaključan

# 3. Manual desktop
# - Click thumbnail → lightbox
# - Arrow ← → navigira
# - ESC zatvara
# - Scrollbar padding kompenzacija = nema layout shift-a kad se modal otvori

# 4. Delete flow
# - Lightbox → delete dugme → window.confirm → yes → slika nestaje iz grida
# - Lightbox ide na sljedeću ili zatvara ako je bila zadnja
```
