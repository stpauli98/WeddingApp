// __tests__/components/UnifiedUploadForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedUploadForm } from '@/components/guest/UnifiedUploadForm';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => (typeof d === 'string' ? d : _k), i18n: { language: 'sr', changeLanguage: () => {} } }) }));
jest.mock('@/lib/uploadImageToServer', () => ({ uploadImageFile: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/uploadVideoFlow', () => ({ uploadVideoFlow: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/csrf-client', () => ({ fetchWithCsrfRetry: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) }));
// Render the real MediaUpload but stub its file-reading dependency:
jest.mock('@/lib/uploadVideoToCloudinary', () => ({ readVideoDuration: jest.fn().mockResolvedValue(10) }));
// jsdom: next/image uses URL parsing that fails with blob: URLs in jsdom
jest.mock('next/image', () => ({ __esModule: true, default: function NextImage({ src, alt, width, height }: { src: string; alt?: string; width?: number; height?: number }) { return null; } }));

import { uploadImageFile } from '@/lib/uploadImageToServer';
import { uploadVideoFlow } from '@/lib/uploadVideoFlow';

// jsdom: stub navigation
const origLocation = window.location;
beforeAll(() => { Object.defineProperty(window, 'location', { writable: true, value: { ...origLocation, href: '' } }); });
afterAll(() => { Object.defineProperty(window, 'location', { writable: true, value: origLocation }); });
beforeEach(() => {
  (uploadImageFile as jest.Mock).mockClear().mockResolvedValue(undefined);
  (uploadVideoFlow as jest.Mock).mockClear().mockResolvedValue(undefined);
  window.location.href = '';
});

it('renders both counters when video is allowed', () => {
  render(<UnifiedUploadForm guestId="g" language="sr" imageLimit={25} videoLimit={3} tier="premium" existingImageCount={1} existingVideoCount={0} />);
  expect(screen.getByText(/1\s*\/\s*25/)).toBeInTheDocument();
  expect(screen.getByText(/0\s*\/\s*3/)).toBeInTheDocument();
});

it('dispatches each staged item to its pipeline on submit', async () => {
  render(<UnifiedUploadForm guestId="g" language="sr" imageLimit={25} videoLimit={3} tier="premium" existingImageCount={0} existingVideoCount={0} />);
  // Inject a mixed selection through the hidden dropzone input
  const input = screen.getByTestId('media-input') as HTMLInputElement;
  const img = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });
  const vid = new File([new Uint8Array(10)], 'v.mp4', { type: 'video/mp4' });
  fireEvent.change(input, { target: { files: [img, vid] } });
  await waitFor(() => expect(screen.getByRole('button', { name: /potvrdi/i })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: /potvrdi/i }));
  await waitFor(() => {
    expect(uploadImageFile).toHaveBeenCalledTimes(1);
    expect(uploadVideoFlow).toHaveBeenCalledTimes(1);
  });
});

it('partial failure shows error row; retry success redirects without double side-effects', async () => {
  jest.useFakeTimers();

  // video fails on first call then succeeds on second (image already resolves from beforeEach)
  let videoCallCount = 0;
  (uploadVideoFlow as jest.Mock).mockImplementation(() => {
    videoCallCount++;
    if (videoCallCount === 1) return Promise.reject(new Error('network error'));
    return Promise.resolve(undefined);
  });

  render(
    <UnifiedUploadForm
      guestId="g"
      language="sr"
      imageLimit={25}
      videoLimit={3}
      tier="premium"
      existingImageCount={0}
      existingVideoCount={0}
    />
  );

  // Stage one image + one video
  const input = screen.getByTestId('media-input') as HTMLInputElement;
  const img = new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });
  const vid = new File([new Uint8Array(10)], 'v.mp4', { type: 'video/mp4' });
  fireEvent.change(input, { target: { files: [img, vid] } });
  await waitFor(() => expect(screen.getByRole('button', { name: /potvrdi/i })).not.toBeDisabled());

  // Submit — video will fail
  fireEvent.click(screen.getByRole('button', { name: /potvrdi/i }));

  // Wait for the status modal to appear and show an error row
  await waitFor(() => {
    expect(uploadVideoFlow).toHaveBeenCalledTimes(1);
  });
  // No redirect should have happened
  expect(window.location.href).toBe('');

  // Find and click the retry button for the failed row
  await waitFor(() => {
    const retryBtn = screen.queryByRole('button', { name: /poku/i }) ?? screen.queryByRole('button', { name: /retry/i });
    expect(retryBtn).toBeTruthy();
  });
  const retryBtn = screen.queryByRole('button', { name: /poku/i }) ?? screen.queryByRole('button', { name: /retry/i });
  fireEvent.click(retryBtn!);

  // Wait for second uploadVideoFlow call
  await waitFor(() => {
    expect(uploadVideoFlow).toHaveBeenCalledTimes(2);
  });

  // Advance fake timers so the setTimeout(1200ms) fires
  jest.runAllTimers();

  // Redirect should now have happened exactly once
  expect(window.location.href).toBe('/sr/guest/success');

  jest.useRealTimers();
});
