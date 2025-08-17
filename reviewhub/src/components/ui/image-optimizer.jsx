import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';

const ImageOptimizer = ({
  src,
  alt = '',
  width,
  height,
  className = '',
  placeholder = null,
  lazy = true,
  quality = 85,
  format = 'webp',
  fallbackFormat = 'jpg',
  sizes = '',
  onLoad = () => {},
  onError = () => {},
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [currentSrc, setCurrentSrc] = useState('');
  const imgRef = useRef();
  const observerRef = useRef();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observer.observe(imgRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy]);

  // Generate optimized image URL
  const generateOptimizedUrl = (originalSrc, targetWidth, targetHeight, targetFormat) => {
    if (!originalSrc) return '';

    // If it's already an optimized URL or external URL, return as-is
    if (originalSrc.includes('?') || originalSrc.startsWith('http')) {
      return originalSrc;
    }

    const params = new URLSearchParams();
    if (targetWidth) params.append('w', targetWidth.toString());
    if (targetHeight) params.append('h', targetHeight.toString());
    if (quality !== 85) params.append('q', quality.toString());
    if (targetFormat) params.append('f', targetFormat);

    const queryString = params.toString();
    return queryString ? `${originalSrc}?${queryString}` : originalSrc;
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (originalSrc) => {
    if (!originalSrc || !width) return '';

    const breakpoints = [1, 1.5, 2, 3]; // Device pixel ratios
    return breakpoints
      .map(ratio => {
        const scaledWidth = Math.round(width * ratio);
        const optimizedUrl = generateOptimizedUrl(originalSrc, scaledWidth, height ? Math.round(height * ratio) : null, format);
        return `${optimizedUrl} ${ratio}x`;
      })
      .join(', ');
  };

  // Update current src when in view
  useEffect(() => {
    if (isInView && src) {
      const optimizedSrc = generateOptimizedUrl(src, width, height, format);
      setCurrentSrc(optimizedSrc);
    }
  }, [isInView, src, width, height, format, quality]);

  const handleLoad = (e) => {
    setIsLoading(false);
    setHasError(false);
    onLoad(e);
  };

  const handleError = (e) => {
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback format if available
    if (format !== fallbackFormat && !currentSrc.includes(`f=${fallbackFormat}`)) {
      const fallbackSrc = generateOptimizedUrl(src, width, height, fallbackFormat);
      setCurrentSrc(fallbackSrc);
      return;
    }
    
    onError(e);
  };

  const defaultPlaceholder = (
    <div 
      className={`flex items-center justify-center bg-gray-200 ${className}`}
      style={{ width, height }}
    >
      {isLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      ) : (
        <ImageIcon className="h-8 w-8 text-gray-400" />
      )}
    </div>
  );

  // Show placeholder while not in view or loading
  if (!isInView || (!currentSrc && !hasError)) {
    return (
      <div ref={imgRef} className={className} style={{ width, height }}>
        {placeholder || defaultPlaceholder}
      </div>
    );
  }

  // Show error state
  if (hasError && !currentSrc) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <ImageIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={imgRef} className="relative">
      {/* Loading overlay */}
      {isLoading && (
        <div 
          className={`absolute inset-0 flex items-center justify-center bg-gray-200 ${className}`}
          style={{ width, height }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
      
      {/* Optimized image */}
      <img
        src={currentSrc}
        srcSet={generateSrcSet(src)}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        {...props}
      />
    </div>
  );
};

// Progressive image component that loads low-quality first
export const ProgressiveImage = ({
  src,
  placeholderSrc,
  alt = '',
  className = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || '');

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <div className="relative overflow-hidden">
      <img
        src={currentSrc}
        alt={alt}
        className={`${className} transition-all duration-500 ${
          isLoaded ? 'blur-0' : 'blur-sm scale-105'
        }`}
        {...props}
      />
      {!isLoaded && placeholderSrc && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

// Image with automatic format detection and fallbacks
export const SmartImage = ({ src, alt, className, ...props }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [imageFormat, setImageFormat] = useState('webp');

  useEffect(() => {
    // Check WebP support
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    // Check AVIF support
    const checkAVIFSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    };

    let format = 'jpg'; // Default fallback
    if (checkAVIFSupport()) {
      format = 'avif';
    } else if (checkWebPSupport()) {
      format = 'webp';
    }

    setImageFormat(format);
    
    // Generate optimized URL with best supported format
    if (src) {
      const optimizedSrc = src.includes('?') 
        ? `${src}&f=${format}` 
        : `${src}?f=${format}`;
      setImageSrc(optimizedSrc);
    }
  }, [src]);

  return (
    <ImageOptimizer
      src={imageSrc}
      alt={alt}
      className={className}
      format={imageFormat}
      {...props}
    />
  );
};

export default ImageOptimizer;

