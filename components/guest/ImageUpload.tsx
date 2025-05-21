"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { X, Upload, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { removeExif } from "@/utils/removeExif"

interface ImageUploadProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validateImage(file: File, allowedTypes: string[], maxSize: number): string | null {
  if (
    file.type === "image/heic" || file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")
  ) {
    return "HEIC/HEIF slike nisu podržane. Molimo vas da konvertujete sliku u JPG ili PNG format.";
  }
  if (!allowedTypes.includes(file.type)) {
    return `Nepodržan format slike: ${file.type || file.name}`;
  }
  if (file.size > maxSize) {
    return `Slika ${file.name} je veća od ${maxSize / 1024 / 1024}MB. Molimo vas da smanjite rezoluciju ili veličinu slike.`;
  }
  return null;
}

export function ImageUpload({ value = [], onChange, maxFiles = 10, inputProps, allowedTypes = DEFAULT_ALLOWED_TYPES, maxSizeMB = DEFAULT_MAX_SIZE_MB }: ImageUploadProps & { allowedTypes?: string[], maxSizeMB?: number }) {
  const [previews, setPreviews] = useState<string[]>([])

  // Funkcija za kreiranje pregleda slika
  function createPreviews(files: File[]) {
    // Kreiranje novih URL-ova za pregled
    const newPreviews = files.map((file) => {
      try {
        return URL.createObjectURL(file)
      } catch (error) {
        console.error("Error creating object URL:", error)
        return ""
      }
    })
    setPreviews(newPreviews)
  }

  // Kreiraj preview-e kad se value promijeni
  useEffect(() => {
    createPreviews(value)
    // Cleanup: revoke sve previews
    return () => {
      previews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview)
        }
      })
    }
  }, [value])

  // Funkcija koja se poziva kada se dodaju nove slikee
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const types = allowedTypes || DEFAULT_ALLOWED_TYPES;
      const maxSize = (maxSizeMB || DEFAULT_MAX_SIZE_MB) * 1024 * 1024;
      const errors: string[] = [];
      const filteredFiles: File[] = [];
      for (const file of acceptedFiles) {
        const error = validateImage(file, types, maxSize);
        if (error) {
          errors.push(error);
          continue;
        }
        // Ukloni EXIF podatke pre dodavanja
        const cleanFile = await removeExif(file);
        filteredFiles.push(cleanFile);
      }
      if (errors.length > 0) {
        alert(errors.join('\n'));
      }
      const newFiles = [...value, ...filteredFiles].slice(0, maxFiles);
      onChange(newFiles);
      createPreviews(newFiles);
    },
    [allowedTypes, maxFiles, maxSizeMB, onChange, value, createPreviews]
  );


  // Funkcija za uklanjanje slike
  const removeImage = (index: number) => {
    const newFiles = [...value]
    newFiles.splice(index, 1)
    onChange(newFiles)

    // Oslobađanje URL-a za pregled
    if (previews[index] && previews[index].startsWith("blob:")) {
      URL.revokeObjectURL(previews[index])
    }

    const newPreviews = [...previews]
    newPreviews.splice(index, 1)
    setPreviews(newPreviews)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: maxFiles - value.length,
    disabled: value.length >= maxFiles,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-[hsl(var(--lp-primary))] bg-[hsl(var(--lp-primary))]/10" : "border-[hsl(var(--lp-muted-foreground))]/20 hover:border-[hsl(var(--lp-primary))]/50"}`}
      >
        <input {...getInputProps()} data-testid="file-input" {...inputProps} />
        <Upload className="mx-auto h-10 w-10 text-[hsl(var(--lp-muted-foreground))]" />
        <p className="mt-2 text-sm text-[hsl(var(--lp-muted-foreground))]">
          {isDragActive
            ? "Pustite slike ovde..."
            : value.length >= maxFiles
              ? "Dostigli ste maksimalan broj slika"
              : "Prevucite slike ovde ili kliknite za odabir"}
        </p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {value.map((file, index) => (
            <Card key={index} className="relative aspect-square overflow-hidden group border border-[hsl(var(--lp-accent))]/30 shadow-sm">
              {previews[index] ? (
                <div className="w-full h-full relative">
                  {/* Koristimo div sa background-image umesto Image komponente */}
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${previews[index] || ""})` }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[hsl(var(--lp-muted))]/30">
                  <ImageIcon className="h-12 w-12 text-[hsl(var(--lp-muted-foreground))]" />
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-[hsl(var(--lp-card))]/90 px-2 py-1 text-xs truncate text-[hsl(var(--lp-muted-foreground))]">
                {file.name}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
