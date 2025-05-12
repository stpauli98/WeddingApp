/**
 * Funkcija koja čuva orijentaciju slike, ali uklanja ostale EXIF podatke
 * koji mogu sadržavati osjetljive informacije (lokacija, uređaj, itd.)
 */
export async function removeExif(file: File): Promise<File> {
  // Za slike koje nisu JPEG, vraćamo original bez izmjena
  if (!file || !file.type.includes('jpeg')) {
    return file;
  }

  // Koristimo canvas za očuvanje orijentacije slike
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = function() {
      img.src = reader.result as string;
    };

    img.onload = function() {
      // Kreiramo canvas sa originalnim dimenzijama slike
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Crtamo sliku na canvas - ovo automatski ispravlja orijentaciju
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Ako canvas nije podržan, vraćamo originalnu sliku
        resolve(file);
        return;
      }
      
      // Crtamo sliku na canvas
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // Konvertujemo canvas u blob
      canvas.toBlob((blob) => {
        if (!blob) {
          // Ako konverzija ne uspije, vraćamo originalnu sliku
          resolve(file);
          return;
        }
        
        // Kreiramo novu sliku bez EXIF podataka, ali sa očuvanom orijentacijom
        const cleanFile = new File([blob], file.name, { type: file.type });
        resolve(cleanFile);
      }, file.type, 0.95); // Koristimo visoku kvalitetu (0.95)
    };

    img.onerror = function() {
      // U slučaju greške, vraćamo originalnu sliku
      console.error('Greška pri učitavanju slike za uklanjanje EXIF podataka');
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}