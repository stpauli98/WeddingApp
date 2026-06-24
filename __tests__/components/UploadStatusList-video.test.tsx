import { render, screen } from '@testing-library/react';
import { UploadStatusList, type ImageUploadStatus } from '@/components/guest/UploadStatusList';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k, i18n: { language: 'sr', changeLanguage: () => {} } }) }));

it('renders a video row without a next/image thumbnail and shows its progress bar', () => {
  const statuses: ImageUploadStatus[] = [
    { id: 'v1', file: new File([''], 'clip.mp4', { type: 'video/mp4' }), kind: 'video', status: 'uploading', progress: 42 },
  ];
  render(<UploadStatusList uploadStatuses={statuses} isLoading onRetryUpload={() => {}} onRetryAllFailed={() => {}} />);
  expect(screen.getByText('clip.mp4')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
});
