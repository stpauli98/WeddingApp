"use client"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { CldImage } from "next-cloudinary"

type CropType = "fill" | "crop" | "fit" | "auto" | "scale" | "fill_pad" | "imagga_crop" | "imagga_scale" | "lfill" | "limit" | "lpad" | "mfit" | "mpad" | "pad" | "thumb"

interface ImageWithSpinnerProps {
  src: string
  alt?: string
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
  crop?: CropType
  rounded?: boolean
  onClick?: () => void
}

export default function ImageWithSpinner({
  src,
  alt = "Slika",
  width = 400,
  height = 400,
  className = "",
  style = {},
  crop = "fill",
  rounded = true,
  onClick,
}: ImageWithSpinnerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Da li je base64 ili cloudinary url
  const isCloudinary = typeof src === 'string' && src.startsWith('http')

  return (
    <div className={`relative w-full h-full ${className}`} style={style} onClick={onClick}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
          <Loader2 className="animate-spin text-[#E2C275] w-8 h-8" />
        </div>
      )}
      {isCloudinary ? (
        <CldImage
          src={src}
          width={width}
          height={height}
          crop={crop}
          alt={alt}
          loading="lazy"
          className={`object-cover w-full h-full ${rounded ? 'rounded-lg' : ''}`}
          style={{ background: 'none', ...style, visibility: loading ? 'hidden' : 'visible' }}
          onLoad={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false) }}
        />
      ) : (
        <img
          src={src}
          width={width}
          height={height}
          alt={alt}
          loading="lazy"
          className={`object-cover w-full h-full ${rounded ? 'rounded-lg' : ''}`}
          style={{ ...style, visibility: loading ? 'hidden' : 'visible' }}
          onLoad={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false) }}
        />
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-500 text-center text-sm p-4 z-20">
          Greška: Slika nije dostupna ili nije validan URL
        </div>
      )}
    </div>
  )
}
