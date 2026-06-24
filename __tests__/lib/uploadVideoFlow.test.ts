jest.mock('@/lib/csrf-client', () => ({ fetchWithCsrfRetry: jest.fn() }));
jest.mock('@/lib/uploadVideoToCloudinary', () => ({
  uploadVideoToCloudinary: jest.fn(),
}));
import { uploadVideoFlow } from '@/lib/uploadVideoFlow';
import { fetchWithCsrfRetry } from '@/lib/csrf-client';
import { uploadVideoToCloudinary } from '@/lib/uploadVideoToCloudinary';

const file = () => new File([new Uint8Array(10)], 'v.mp4', { type: 'video/mp4' });

beforeEach(() => jest.clearAllMocks());

it('signs, uploads, confirms — resolves on success', async () => {
  (fetchWithCsrfRetry as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ signature: 's', timestamp: 1, apiKey: 'k', cloudName: 'c', folder: 'wedding-app/videos' }) }) // sign
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // confirm
  (uploadVideoToCloudinary as jest.Mock).mockResolvedValue({ publicId: 'wedding-app/videos/x', secureUrl: 'https://res.cloudinary.com/c/video/upload/x.mp4' });
  await expect(uploadVideoFlow(file(), () => {})).resolves.toBeUndefined();
  expect(uploadVideoToCloudinary).toHaveBeenCalled();
  expect(fetchWithCsrfRetry).toHaveBeenLastCalledWith('/api/guest/upload/video-confirm', expect.objectContaining({ method: 'POST' }));
});

it('throws the confirm error message', async () => {
  (fetchWithCsrfRetry as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ signature: 's', timestamp: 1, apiKey: 'k', cloudName: 'c', folder: 'f' }) })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Već zabilježen' }) });
  (uploadVideoToCloudinary as jest.Mock).mockResolvedValue({ publicId: 'wedding-app/videos/x', secureUrl: 'u' });
  await expect(uploadVideoFlow(file(), () => {})).rejects.toThrow('Već zabilježen');
});
