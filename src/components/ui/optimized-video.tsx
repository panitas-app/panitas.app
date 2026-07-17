"use client"

import { useRef, useEffect, useState, useCallback } from "react"

interface OptimizedVideoProps {
  src: string
  poster?: string
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  playsInline?: boolean
  preload?: "none" | "metadata" | "auto"
  className?: string
  style?: React.CSSProperties
  onLoadedData?: () => void
  onError?: () => void
  onEnded?: () => void
}

export function OptimizedVideo({
  src,
  poster,
  autoPlay = false,
  muted = true,
  loop = false,
  playsInline = true,
  preload = "metadata",
  className = "",
  style,
  onLoadedData,
  onError,
  onEnded,
}: OptimizedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // IntersectionObserver for lazy loading
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" } // Start loading 200px before visible
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Pause when out of viewport, resume when back
  useEffect(() => {
    const video = videoRef.current
    if (!video || !autoPlay) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [autoPlay, isVisible])

  const handleLoadedData = useCallback(() => {
    setIsLoaded(true)
    onLoadedData?.()
  }, [onLoadedData])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  if (hasError) {
    return null
  }

  return (
    <div ref={containerRef} className={className} style={style}>
      {isVisible && (
        <video
          ref={videoRef}
          muted={muted}
          loop={loop}
          playsInline={playsInline}
          autoPlay={autoPlay}
          preload={preload}
          poster={poster}
          onLoadedData={handleLoadedData}
          onError={handleError}
          onEnded={onEnded}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        >
          <source src={src} />
        </video>
      )}
    </div>
  )
}
