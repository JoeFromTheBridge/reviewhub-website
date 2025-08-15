import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Search, Loader2, Image as ImageIcon } from 'lucide-react';
import apiService from '../../services/api';

const VisualSearch = ({ onResults, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [searchId, setSearchId] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleImageUpload = async (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file (JPEG, PNG, WebP)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      onError('Image file size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);

      // Upload image
      const response = await apiService.uploadImageForVisualSearch(file);
      
      if (response.search_id) {
        setSearchId(response.search_id);
      } else {
        throw new Error('No search ID returned from upload');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      onError(error.message || 'Failed to upload image. Please try again.');
      setUploadedImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVisualSearch = async () => {
    if (!searchId) {
      onError('Please upload an image first');
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await apiService.searchVisuallySimilar(searchId);
      
      if (response.results) {
        onResults(response.results, 'visual');
      } else {
        onError('No similar products found');
      }
    } catch (error) {
      console.error('Error performing visual search:', error);
      onError(error.message || 'Failed to search for similar products. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setSearchId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Visual Search</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Upload an image to find visually similar products
      </p>

      {!uploadedImage ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Processing image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-xs text-gray-500">
                Supports JPEG, PNG, WebP (max 10MB)
              </p>
              <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                <Upload className="h-4 w-4" />
                Choose Image
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded for search"
              className="w-full h-48 object-cover rounded-lg border"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <button
            onClick={handleVisualSearch}
            disabled={isSearching || !searchId}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching for similar products...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find Similar Products
              </>
            )}
          </button>
          
          <button
            onClick={clearImage}
            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Upload Different Image
          </button>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <h4 className="text-sm font-medium text-blue-900 mb-1">How it works:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Upload a clear image of a product you're looking for</li>
          <li>• Our AI analyzes colors, shapes, and textures</li>
          <li>• Get results ranked by visual similarity</li>
          <li>• Works best with product photos on clean backgrounds</li>
        </ul>
      </div>
    </div>
  );
};

export default VisualSearch;

