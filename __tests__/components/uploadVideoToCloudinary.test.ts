import { buildCloudinaryFormData } from '@/lib/uploadVideoToCloudinary';

it('builds signed multipart fields in the order Cloudinary expects', () => {
  const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
  const fd = buildCloudinaryFormData(file, {
    signature: 'sig', timestamp: 123, apiKey: 'key', cloudName: 'cloud', folder: 'wedding-app/videos',
  });
  expect(fd.get('api_key')).toBe('key');
  expect(fd.get('timestamp')).toBe('123');
  expect(fd.get('signature')).toBe('sig');
  expect(fd.get('folder')).toBe('wedding-app/videos');
  expect(fd.get('file')).toBeInstanceOf(File);
});
