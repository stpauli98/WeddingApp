jest.mock('@/lib/csrf-client', () => ({
  uploadWithCsrfRetry: jest.fn(),
}));
import { uploadImageFile } from '@/lib/uploadImageToServer';
import { uploadWithCsrfRetry } from '@/lib/csrf-client';

describe('uploadImageFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs a small image (no resize) and reports progress, resolving on 200', async () => {
    (uploadWithCsrfRetry as jest.Mock).mockImplementation(async (_url, _fd, opts) => {
      opts.onProgress?.(100);
      return { ok: true, json: async () => ({ success: true, uploaded: 1 }) };
    });
    const file = new File([new Uint8Array(1000)], 'a.jpg', { type: 'image/jpeg' });
    const progress: number[] = [];
    await expect(uploadImageFile(file, 'free', (p) => progress.push(p))).resolves.toBeUndefined();
    expect(uploadWithCsrfRetry).toHaveBeenCalledWith('/api/guest/upload', expect.any(FormData), expect.objectContaining({ csrfEndpoint: '/api/guest/upload' }));
    expect(progress).toContain(100);
  });

  it('throws the server error message on a non-ok response', async () => {
    (uploadWithCsrfRetry as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Limit' }) });
    const file = new File([new Uint8Array(1000)], 'a.jpg', { type: 'image/jpeg' });
    await expect(uploadImageFile(file, 'free', () => {})).rejects.toThrow('Limit');
  });
});
