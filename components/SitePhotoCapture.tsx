'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadSitePhoto } from '@/app/actions'
import type { RequestAttachment } from '@/lib/supabase/client'
import exifr from 'exifr'

interface SitePhotoCaptureProps {
  requestId?: string
  onPhotoUploaded?: (attachment: RequestAttachment) => void
  onCoordinatesExtracted?: (coords: { latitude: number; longitude: number } | null) => void
}

type CaptureState = 'idle' | 'capturing' | 'reviewing'

async function extractGpsFromExif(file: File): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const gps = await exifr.gps(file)
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      return { latitude: gps.latitude, longitude: gps.longitude }
    }
    return null
  } catch {
    return null
  }
}

export default function SitePhotoCapture({
  requestId,
  onPhotoUploaded,
  onCoordinatesExtracted,
}: SitePhotoCaptureProps) {
  const isReady = !!requestId
  const [captureState, setCaptureState] = useState<CaptureState>('idle')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [gpsSource, setGpsSource] = useState<'exif' | 'browser' | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const applyCoordinates = useCallback(
    (lat: number | null, lng: number | null, source: 'exif' | 'browser' | null) => {
      setLatitude(lat)
      setLongitude(lng)
      setGpsSource(source)
      onCoordinatesExtracted?.(lat != null && lng != null ? { latitude: lat, longitude: lng } : null)
    },
    [onCoordinatesExtracted]
  )

  const tryBrowserGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.')
      return
    }

    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoordinates(position.coords.latitude, position.coords.longitude, 'browser')
      },
      (gpsErr) => {
        setGpsError(`GPS error: ${gpsErr.message}. Coordinates will not be attached.`)
        applyCoordinates(null, null, null)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [applyCoordinates])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    if (!isReady) return
    setError(null)
    setGpsError(null)
    setCaptureState('capturing')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      tryBrowserGeolocation()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera'
      setError(message)
      setCaptureState('idle')
    }
  }, [isReady, tryBrowserGeolocation])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setPhotoPreview(dataUrl)
    stopCamera()
    setCaptureState('reviewing')
  }, [stopCamera])

  const processPhotoFile = useCallback(
    async (file: File) => {
      if (!isReady) return
      setError(null)
      setGpsError(null)
      setSuccess(null)
      setIsExtracting(true)

      try {
        const exifCoords = await extractGpsFromExif(file)
        if (exifCoords) {
          applyCoordinates(exifCoords.latitude, exifCoords.longitude, 'exif')
        } else {
          applyCoordinates(null, null, null)
          tryBrowserGeolocation()
        }

        const reader = new FileReader()
        reader.onload = () => {
          setPhotoPreview(reader.result as string)
          setCaptureState('reviewing')
          setIsExtracting(false)
        }
        reader.onerror = () => {
          setError('Failed to read photo file')
          setIsExtracting(false)
        }
        reader.readAsDataURL(file)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process photo'
        setError(message)
        setIsExtracting(false)
      }
    },
    [isReady, applyCoordinates, tryBrowserGeolocation]
  )

  const handleFileSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        processPhotoFile(file)
      }
      event.target.value = ''
    },
    [processPhotoFile]
  )

  const retakePhoto = useCallback(() => {
    setPhotoPreview(null)
    setCaptureState('idle')
    setError(null)
    setGpsSource(null)
  }, [])

  const confirmUpload = useCallback(async () => {
    if (!photoPreview || !requestId) return
    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(photoPreview)
      const blob = await response.blob()
      const file = new File([blob], `site_photo_${Date.now()}.jpg`, { type: 'image/jpeg' })

      const result = await uploadSitePhoto({
        requestId,
        file,
        latitude,
        longitude,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.attachment) {
        const sourceLabel = gpsSource === 'exif' ? 'EXIF' : gpsSource === 'browser' ? 'Browser GPS' : 'Manual'
        setSuccess(`Site photo uploaded successfully (${sourceLabel})`)
        setPhotoPreview(null)
        setCaptureState('idle')
        applyCoordinates(null, null, null)
        setGpsSource(null)
        onPhotoUploaded?.(result.attachment)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload photo'
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }, [photoPreview, requestId, latitude, longitude, gpsSource, applyCoordinates, onPhotoUploaded])

  const cancel = useCallback(() => {
    stopCamera()
    setPhotoPreview(null)
    setCaptureState('idle')
    applyCoordinates(null, null, null)
    setGpsSource(null)
    setError(null)
  }, [stopCamera, applyCoordinates])

  return (
    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/10">
      <div className="flex items-center gap-2 mb-3">
        <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.423 1.175l1.823 2.727M6.827 6.175A2.25 2.25 0 015.25 8.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M6.827 6.175l2.327 3.175M6.827 6.175l2.327 3.175M15 13.5a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Site Photo Capture</h4>
        <span className="ml-auto rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Distinct from attachments
        </span>
      </div>
      <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-3">
        Capture a live photo with GPS. Coordinates are extracted from image EXIF first, then browser geolocation as fallback.
      </p>

      {!isReady && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Submit the request first to enable site photo capture.
        </p>
      )}

      {isReady && captureState === 'idle' && !photoPreview && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.423 1.175l1.823 2.727M6.827 6.175A2.25 2.25 0 015.25 8.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M6.827 6.175l2.327 3.175M6.827 6.175l2.327 3.175M15 13.5a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors dark:bg-zinc-900 dark:text-emerald-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 21h12a2.25 2.25 0 002.25-2.25V6.375a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.375v12.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Upload Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      )}

      {isReady && captureState === 'capturing' && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex items-center justify-between">
            <div className="text-xs text-emerald-700 dark:text-emerald-300">
              {isExtracting ? (
                <span>Extracting GPS from camera...</span>
              ) : latitude !== null && longitude !== null ? (
                <span>
                  GPS ({gpsSource === 'exif' ? 'EXIF' : gpsSource === 'browser' ? 'Browser' : 'Live'}):{' '}
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              ) : gpsError ? (
                <span className="text-amber-600 dark:text-amber-400">{gpsError}</span>
              ) : (
                <span>Acquiring GPS signal...</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors dark:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="rounded-lg bg-[#00ab4e] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#008C4A] transition-colors"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {isReady && captureState === 'reviewing' && photoPreview && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-emerald-200 dark:border-emerald-900/60">
            <img src={photoPreview} alt="Site photo preview" className="w-full h-64 object-cover" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-emerald-700 dark:text-emerald-300">
              {latitude !== null && longitude !== null ? (
                <span>
                  GPS ({gpsSource === 'exif' ? 'EXIF' : gpsSource === 'browser' ? 'Browser' : 'Live'}):{' '}
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">No GPS coordinates captured</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={retakePhoto}
                disabled={isUploading}
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 dark:bg-zinc-900"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={confirmUpload}
                disabled={isUploading}
                className="rounded-lg bg-[#00ab4e] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#008C4A] transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
          {success}
        </div>
      )}
    </div>
  )
}
