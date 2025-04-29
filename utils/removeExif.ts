export async function removeExif(file: File): Promise<File> {
    return new Promise((resolve) => {
      if (file && file.type === 'image/jpeg') {
        const fr = new FileReader();
        fr.onload = function (this: FileReader) {
          const cleanedBuffer = cleanBuffer(this.result as ArrayBuffer);
          const blob = new Blob([cleanedBuffer], { type: file.type });
          const newFile = new File([blob], file.name, { type: file.type });
          resolve(newFile);
        };
        fr.readAsArrayBuffer(file);
      } else {
        resolve(file); // PNG, WEBP, GIF vratiti bez izmene
      }
    });
  };
  
  function cleanBuffer(arrayBuffer: ArrayBuffer) {
    let dataView = new DataView(arrayBuffer);
    const exifMarker = 0xffe1;
    let offset = 2; // Skip the first two bytes (0xFFD8)
  
    while (offset < dataView.byteLength) {
      if (dataView.getUint16(offset) === exifMarker) {
        // Found an EXIF marker
        const segmentLength = dataView.getUint16(offset + 2, false) + 2;
        arrayBuffer = removeSegment(arrayBuffer, offset, segmentLength);
        dataView = new DataView(arrayBuffer);
      } else {
        offset += 2 + dataView.getUint16(offset + 2, false);
      }
    }
    return arrayBuffer;
  }
  
  function removeSegment(buffer: ArrayBuffer, offset: number, length: number) {
    const modifiedBuffer = new Uint8Array(buffer.byteLength - length);
    modifiedBuffer.set(new Uint8Array(buffer.slice(0, offset)), 0);
    modifiedBuffer.set(new Uint8Array(buffer.slice(offset + length)), offset);
    return modifiedBuffer.buffer;
  }