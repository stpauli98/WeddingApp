"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { X, Upload, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ImageUploadProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export function ImageUpload({ value = [], onChange, maxFiles = 10, inputProps }: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([])

  // Funkcija za kreiranje pregleda slika
  const createPreviews = useCallback(
    (files: File[]) => {
      // Oslobađanje prethodnih URL-ova za pregled
      previews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview)
        }
      })

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
    },
    [previews],
  )

  // Inicijalno kreiranje pregleda
  useEffect(() => {
    if (value.length > 0) {
      createPreviews(value)
    }

    // Čišćenje URL-ova prilikom unmount-a komponente
    return () => {
      previews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview)
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Funkcija koja se poziva kada se dodaju nove slike
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const filteredFiles: File[] = [];
      for (const file of acceptedFiles) {
        if (
          file.type === "image/heic" || file.type === "image/heif" ||
          file.name.endsWith(".heic") || file.name.endsWith(".HEIC") ||
          file.name.endsWith(".heif") || file.name.endsWith(".HEIF")
        ) {
          alert("HEIC/HEIF slike nisu podržane. Molimo vas da konvertujete sliku u JPG ili PNG format.");
          continue;
        }
        if (!allowedTypes.includes(file.type)) {
          alert(`Nepodržan format slike: ${file.type || file.name}`);
          continue;
        }
        if (file.size > maxSize) {
          alert(`Slika ${file.name} je veća od 5MB. Molimo vas da smanjite rezoluciju ili veličinu slike.`);
          continue;
        }
        filteredFiles.push(file);
      }
      // Ograničenje broja fajlova
      const newFiles = [...value, ...filteredFiles].slice(0, maxFiles);
      onChange(newFiles);
      // Kreiranje URL-ova za pregled slika
      createPreviews(newFiles);
    },
    [value, onChange, maxFiles, createPreviews],
  )

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
          ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/20 hover:border-primary/50"}`}
      >
        <input {...getInputProps()} {...inputProps} />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
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
            <Card key={index} className="relative aspect-square overflow-hidden group">
              {previews[index] ? (
                <div className="w-full h-full relative">
                  {/* Koristimo div sa background-image umesto Image komponente */}
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${previews[index] || ""})` }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
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
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-2 py-1 text-xs truncate">
                {file.name}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
