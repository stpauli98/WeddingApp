// __tests__/components/MediaGallery.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaGallery } from '@/components/guest/MediaGallery';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'sr', changeLanguage: () => {} } }) }));
jest.mock('@/components/shared/ImageWithSpinner', () => ({ __esModule: true, default: (p: any) => <img alt={p.alt} src={p.src} /> }));
jest.mock('@/lib/csrf-client', () => ({ fetchWithCsrfRetry: jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) }) }));
import { fetchWithCsrfRetry } from '@/lib/csrf-client';

const images = [{ id: 'i1', imageUrl: 'https://res.cloudinary.com/x/a.jpg', createdAt: '2026-06-01T00:00:00Z' }];
const videos = [{ id: 'v1', videoUrl: 'https://res.cloudinary.com/x/v.mp4', posterUrl: 'https://res.cloudinary.com/x/v.jpg', durationSec: 20, createdAt: '2026-06-02T00:00:00Z' }];

it('renders both an image and a video tile — video is static by default (no <video> element)', () => {
  render(<MediaGallery images={images} videos={videos} guestId="g" />);
  // The named image tile is present
  expect(screen.getByRole('img', { name: /slika gosta/i })).toBeInTheDocument();
  // Play button must be visible (confirms video tile is rendered as static)
  expect(screen.getByLabelText(/pusti video|play video/i)).toBeInTheDocument();
  // No <video> until the play button is clicked
  expect(document.querySelector('video')).toBeNull();
  // The video poster img is in the DOM (decorative, alt="")
  expect(document.querySelector('img[src="https://res.cloudinary.com/x/v.jpg"]')).toBeInTheDocument();
});

it('renders a <video> element after clicking the play button', () => {
  render(<MediaGallery images={images} videos={videos} guestId="g" />);
  fireEvent.click(screen.getByLabelText(/pusti video|play video/i));
  expect(document.querySelector('video')).toBeInTheDocument();
});

it('deletes a video via the video endpoint', async () => {
  render(<MediaGallery images={images} videos={videos} guestId="g" />);
  fireEvent.click(screen.getByLabelText(/obriši video|delete video/i));
  await waitFor(() => expect(fetchWithCsrfRetry).toHaveBeenCalledWith(expect.stringContaining('/api/guest/videos/delete?id=v1'), expect.objectContaining({ method: 'DELETE' })));
});

it('hides delete controls when readOnly', () => {
  render(<MediaGallery images={images} videos={videos} guestId="g" readOnly />);
  expect(screen.queryByLabelText(/obriši|delete/i)).toBeNull();
});
