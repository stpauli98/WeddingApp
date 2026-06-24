"use client"

import React, { useEffect, useState } from 'react'
import { UnifiedUploadForm } from '@/components/guest/UnifiedUploadForm'
import { MediaGallery, type GalleryImage, type GalleryVideo } from '@/components/guest/MediaGallery'
import { UploadLimitReachedCelebration } from '@/components/guest/UploadLimitReachedCelebration'
import AddToHomeScreenPrompt from "@/components/AddToHomeScreenPrompt";
import { useTranslation } from 'react-i18next'
import type { PricingTier } from '@/lib/pricing-tiers'

interface DashboardClientProps {
  initialImages: GalleryImage[]
  guestId: string
  message?: string
  language?: string
  imageLimit?: number
  tier?: PricingTier
  initialVideos?: GalleryVideo[]
  videoLimit?: number
}

export function DashboardClient({ initialImages, guestId, message, language = 'sr', imageLimit = 10, tier = 'free', initialVideos = [], videoLimit = 0 }: DashboardClientProps) {
  const { i18n } = useTranslation();
  useEffect(() => { if (language && i18n.language !== language) i18n.changeLanguage(language); }, [language, i18n]);

  const [images, setImages] = useState<GalleryImage[]>(initialImages)
  const [videos, setVideos] = useState<GalleryVideo[]>(initialVideos)

  useEffect(() => { if (guestId) localStorage.setItem("guestId", guestId); }, [guestId]);

  const imagesFull = images.length >= imageLimit;
  const videosFull = videoLimit === 0 || videos.length >= videoLimit;
  const everythingFull = imagesFull && videosFull;

  return (
    <>
      <AddToHomeScreenPrompt />
      <div className="mb-8">
        {everythingFull ? (
          <UploadLimitReachedCelebration imagesCount={images.length} language={language} imageLimit={imageLimit} />
        ) : (
          <UnifiedUploadForm
            guestId={guestId}
            message={message}
            language={language}
            imageLimit={imageLimit}
            videoLimit={videoLimit}
            tier={tier}
            existingImageCount={images.length}
            existingVideoCount={videos.length}
          />
        )}
      </div>

      <MediaGallery
        images={images}
        videos={videos}
        guestId={guestId}
        language={language}
        onImagesChange={setImages}
        onVideosChange={setVideos}
      />
    </>
  )
}
