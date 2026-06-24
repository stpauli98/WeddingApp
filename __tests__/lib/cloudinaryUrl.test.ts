/**
 * @jest-environment node
 */
import { withCloudinaryTransform } from '@/lib/cloudinaryUrl';

describe('withCloudinaryTransform', () => {
  it('inserts transform into image upload URL', () => {
    const url = 'https://res.cloudinary.com/x/image/upload/v1/wedding-app/a.jpg';
    const result = withCloudinaryTransform(url, 'c_limit,w_1600,q_auto,f_auto');
    expect(result).toBe(
      'https://res.cloudinary.com/x/image/upload/c_limit,w_1600,q_auto,f_auto/v1/wedding-app/a.jpg'
    );
  });

  it('inserts transform into video poster URL', () => {
    const url = 'https://res.cloudinary.com/x/video/upload/v1/wedding-app/videos/a.jpg';
    const result = withCloudinaryTransform(url, 'c_fill,w_400,h_400,q_auto,f_auto');
    expect(result).toBe(
      'https://res.cloudinary.com/x/video/upload/c_fill,w_400,h_400,q_auto,f_auto/v1/wedding-app/videos/a.jpg'
    );
  });

  it('returns data: URIs unchanged', () => {
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD';
    expect(withCloudinaryTransform(dataUri, 'c_limit,w_1600,q_auto,f_auto')).toBe(dataUri);
  });
});
