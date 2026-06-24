// __tests__/components/MediaUpload.test.tsx
import { render, screen } from '@testing-library/react';
import { MediaUpload, type StagedMedia } from '@/components/guest/MediaUpload';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'sr', changeLanguage: () => {} } }) }));
jest.mock('@/lib/uploadVideoToCloudinary', () => ({ readVideoDuration: jest.fn().mockResolvedValue(10) }));

it('renders the dropzone label', () => {
  render(<MediaUpload value={[]} onChange={() => {}} imageSlotsLeft={25} videoSlotsLeft={3} allowVideo={true} />);
  expect(screen.getByTestId('media-dropzone')).toBeInTheDocument();
});

it('lists staged items with a remove control', () => {
  const items: StagedMedia[] = [
    { id: '1', file: new File([''], 'a.jpg', { type: 'image/jpeg' }), kind: 'image', preview: 'blob:a' },
    { id: '2', file: new File([''], 'v.mp4', { type: 'video/mp4' }), kind: 'video', preview: '' },
  ];
  render(<MediaUpload value={items} onChange={() => {}} imageSlotsLeft={24} videoSlotsLeft={2} allowVideo={true} />);
  expect(screen.getAllByLabelText(/ukloni|remove/i).length).toBe(2);
});
