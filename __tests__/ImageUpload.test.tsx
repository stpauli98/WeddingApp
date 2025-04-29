import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Polyfill for File.prototype.arrayBuffer for JSDOM
if (!File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function () {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };

}

import userEvent from '@testing-library/user-event';
import { ImageUpload } from '@/components/guest/ImageUpload';
import '@testing-library/jest-dom';

function createFile(name: string, type: string, size: number) {
  const file = new File(['dummy'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('ImageUpload', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('prikazuje osnovni UI i poruku za upload', () => {
    render(<ImageUpload value={[]} onChange={onChange} maxFiles={3} />);
    expect(screen.getByText(/Prevucite slike ovde/i)).toBeInTheDocument();
    // Ne proveravaj button ovde, jer ga nema dok nema slike
  });

  it('prikazuje osnovni UI i poruku za upload', () => {
    render(<ImageUpload value={[]} onChange={onChange} maxFiles={3} />);
    expect(screen.getByText(/Prevucite slike ovde/i)).toBeInTheDocument();
    // Ne proveravaj button ovde, jer ga nema dok nema slike
  });
  
  it('dozvoljava upload validnih slika', async () => {
    const file = createFile('test.png', 'image/png', 1024);
    render(<ImageUpload value={[]} onChange={onChange} maxFiles={3} />);
    const input = screen.getByTestId('file-input');
    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(onChange).toHaveBeenCalledWith([file]);
  });

  it('odbacuje HEIC/HEIF slike i prikazuje alert', async () => {
    window.alert = jest.fn();
    const file = createFile('test.heic', 'image/heic', 1024);
    render(<ImageUpload value={[]} onChange={onChange} maxFiles={3} />);
    const input = screen.getByTestId('file-input');
    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/HEIC\/HEIF slike nisu podržane/));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('odbacuje prevelike slike', async () => {
    window.alert = jest.fn();
    const file = createFile('big.jpg', 'image/jpeg', 20 * 1024 * 1024); // 20MB
    render(<ImageUpload value={[]} onChange={onChange} maxFiles={3} />);
    const input = screen.getByTestId('file-input');
    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/veća od/));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('ne dozvoljava više od maxFiles slika', async () => {
    const file1 = createFile('1.png', 'image/png', 1024);
    const file2 = createFile('2.png', 'image/png', 1024);
    const file3 = createFile('3.png', 'image/png', 1024);
    const file4 = createFile('4.png', 'image/png', 1024);
    render(<ImageUpload value={[file1, file2, file3]} onChange={onChange} maxFiles={3} />);
    const input = screen.getByTestId('file-input');
    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file4] } });
    });
    // onChange ne bi trebalo da bude pozvan jer je već maksimalan broj fajlova
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Dostigli ste maksimalan broj slika/i)).toBeInTheDocument();
  });

  it('prikazuje preview i omogućava brisanje slike', async () => {
    const file = createFile('1.png', 'image/png', 1024);
    render(<ImageUpload value={[file]} onChange={onChange} maxFiles={3} />);
    expect(screen.getByText('1.png')).toBeInTheDocument();
    const deleteButton = screen.getByRole('button'); // Ikonica X nema tekst, ali je button
    await userEvent.click(deleteButton);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]));
  });

  it('uklanja EXIF podatke iz JPEG slike pre onChange', async () => {
    // Kreiraj veći "dummy" JPEG fajl sa EXIF markerom (0xFFE1)
    const arr = new Uint8Array(1024); // 1KB
    arr[0] = 0xFF; arr[1] = 0xD8; // SOI
    arr[2] = 0xFF; arr[3] = 0xE1; // EXIF marker
    arr[4] = 0x00; arr[5] = 0x10;
    arr[6] = 0x45; arr[7] = 0x78; arr[8] = 0x69; arr[9] = 0x66; arr[10] = 0x00; arr[11] = 0x00;
    arr[1022] = 0xFF; arr[1023] = 0xD9; // EOI
    const file = new File([arr], 'exif-test.jpg', { type: 'image/jpeg' });
    render(<ImageUpload value={[]} onChange={onChange} maxFiles={3} />);
    const input = screen.getByTestId('file-input');
    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(onChange).toHaveBeenCalled();
    const call = onChange.mock.calls[0];
    expect(call).toBeDefined();
    const calledFile = call[0][0];
    const arrayBuffer = await calledFile.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    // Ne sme da postoji EXIF marker (0xFFE1) posle SOI
    expect(
      Array.from(data.slice(2, 4)).join(',')
    ).not.toBe('255,225'); // 0xFF, 0xE1
  });

  it('poziva onChange sa više fajlova', async () => {
    const file1 = createFile('1.png', 'image/png', 1024);
    const file2 = createFile('2.png', 'image/png', 1024);
    render(<ImageUpload value={[]} onChange={onChange} maxFiles={3} />);
    const input = screen.getByTestId('file-input');
    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file1, file2] } });
    });
    expect(onChange).toHaveBeenCalledWith([file1, file2]);
  });
});