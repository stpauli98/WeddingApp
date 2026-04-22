/** @jest-environment node */
import { assertCloudinaryUrl } from '@/app/api/guest/upload/assertCloudinaryUrl';

describe('assertCloudinaryUrl', () => {
  it('accepts valid res.cloudinary.com URL', () => {
    expect(() =>
      assertCloudinaryUrl('https://res.cloudinary.com/dd6zeo4s9/image/upload/v1/a.jpg')
    ).not.toThrow();
  });

  it('rejects unsplash URL', () => {
    expect(() =>
      assertCloudinaryUrl('https://images.unsplash.com/photo.jpg?w=800')
    ).toThrow(/cloudinary/i);
  });

  it('rejects http (not https) cloudinary URL', () => {
    expect(() =>
      assertCloudinaryUrl('http://res.cloudinary.com/x/y.jpg')
    ).toThrow(/cloudinary/i);
  });

  it('rejects empty string', () => {
    expect(() => assertCloudinaryUrl('')).toThrow();
  });

  it('rejects a res.cloudinary.com-looking host that is actually a subdomain attack', () => {
    expect(() =>
      assertCloudinaryUrl('https://res.cloudinary.com.attacker.com/x.jpg')
    ).toThrow(/cloudinary/i);
  });
});
