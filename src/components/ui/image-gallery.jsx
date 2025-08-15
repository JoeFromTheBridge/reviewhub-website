import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Download, ExternalLink } from 'lucide-react';
import { Button } from './button';

export function ImageGallery({ 
  images = [], 
  className = "",
  showThumbnails = true,
  allowFullscreen = true,
  allowDownload = false,
  maxHeight = "400px"
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openFullscreen = () => {
    if (allowFullscreen) {
      setIsFullscreen(true);
    }
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  const downloadImage = async (imageUrl, filename) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  // Single image display
  if (images.length === 1) {
    return (
      <div className={`relative ${className}`}>
        <div 
          className="relative overflow-hidden rounded-lg bg-gray-100 cursor-pointer group"
          style={{ maxHeight }}
          onClick={openFullscreen}
        >
          <img
            src={currentImage.main_url || currentImage.url}
            alt={currentImage.alt_text || 'Review image'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          
          {allowFullscreen && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
        
        {currentImage.caption && (
          <p className="mt-2 text-sm text-gray-600">{currentImage.caption}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Main Image Display */}
        <div className="relative overflow-hidden rounded-lg bg-gray-100">
          <div 
            className="relative cursor-pointer group"
            style={{ maxHeight }}
            onClick={openFullscreen}
          >
            <img
              src={currentImage.main_url || currentImage.url}
              alt={currentImage.alt_text || `Review image ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            
            {allowFullscreen && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          
          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex space-x-2">
            {allowDownload && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(
                    currentImage.main_url || currentImage.url, 
                    currentImage.original_filename || `image-${currentIndex + 1}.jpg`
                  );
                }}
                className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                title="Download image"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Image Caption */}
        {currentImage.caption && (
          <p className="mt-2 text-sm text-gray-600">{currentImage.caption}</p>
        )}
        
        {/* Thumbnail Strip */}
        {showThumbnails && images.length > 1 && (
          <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex 
                    ? 'border-blue-500 ring-2 ring-blue-200' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={image.thumbnail_url || image.main_url || image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-full max-h-full p-4">
            {/* Close Button */}
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            >
              <X className="h-6 w-6" />
            </button>
            
            {/* Navigation in Fullscreen */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            
            {/* Fullscreen Image */}
            <img
              src={currentImage.main_url || currentImage.url}
              alt={currentImage.alt_text || `Review image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  {currentImage.caption && (
                    <p className="text-lg mb-2">{currentImage.caption}</p>
                  )}
                  {currentImage.original_filename && (
                    <p className="text-sm text-gray-300">{currentImage.original_filename}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {images.length > 1 && (
                    <span className="text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                      {currentIndex + 1} / {images.length}
                    </span>
                  )}
                  
                  {allowDownload && (
                    <button
                      onClick={() => downloadImage(
                        currentImage.main_url || currentImage.url,
                        currentImage.original_filename || `image-${currentIndex + 1}.jpg`
                      )}
                      className="bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-70 transition-all"
                      title="Download image"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

