import { useState } from 'react';
import { Star, Loader2, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

export function ReviewForm({ productId, onReviewSubmitted, onCancel }) {
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    comment: '',
  });
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const { isAuthenticated } = useAuth();

  const handleRatingClick = (rating) => {
    setFormData({ ...formData, rating });
    setError('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const handleImagesChange = (images) => {
    setSelectedImages(images);
  };

  const uploadImages = async (reviewId) => {
    if (selectedImages.length === 0) return [];

    setUploadingImages(true);
    const uploadedImages = [];

    try {
      if (selectedImages.length === 1) {
        // Upload single image
        const result = await apiService.uploadReviewImage(selectedImages[0], reviewId);
        uploadedImages.push(result.image);
      } else {
        // Upload multiple images
        const result = await apiService.uploadMultipleReviewImages(selectedImages, reviewId);
        if (result.images) {
          uploadedImages.push(...result.images);
        }
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new Error('Failed to upload images: ' + error.message);
    } finally {
      setUploadingImages(false);
    }

    return uploadedImages;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('You must be logged in to submit a review');
      return;
    }

    if (formData.rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a review title');
      return;
    }

    if (!formData.comment.trim()) {
      setError('Please enter a review comment');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const reviewData = {
        product_id: productId,
        rating: formData.rating,
        title: formData.title.trim(),
        comment: formData.comment.trim(),
      };

      // Create the review first
      const reviewResponse = await apiService.createReview(reviewData);
      const reviewId = reviewResponse.review?.id;

      // Upload images if any are selected
      let uploadedImages = [];
      if (selectedImages.length > 0 && reviewId) {
        try {
          uploadedImages = await uploadImages(reviewId);
        } catch (imageError) {
          // Review was created successfully, but image upload failed
          console.error('Image upload failed:', imageError);
          setError('Review submitted successfully, but some images failed to upload. You can edit your review to add images later.');
        }
      }
      
      // Reset form
      setFormData({
        rating: 0,
        title: '',
        comment: '',
      });
      setSelectedImages([]);
      
      // Notify parent component
      if (onReviewSubmitted) {
        onReviewSubmitted({
          ...reviewResponse,
          uploadedImages
        });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">You must be logged in to write a review.</p>
            <Button onClick={() => window.location.reload()}>
              Sign In to Write Review
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Write a Review</CardTitle>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating *
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 hover:scale-110 transition-transform"
                  disabled={isSubmitting}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoveredRating || formData.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {formData.rating > 0 && `${formData.rating} star${formData.rating !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Review Title *
            </label>
            <Input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="Summarize your experience"
              disabled={isSubmitting}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              Your Review *
            </label>
            <textarea
              id="comment"
              name="comment"
              required
              value={formData.comment}
              onChange={handleChange}
              placeholder="Share your detailed experience with this product..."
              disabled={isSubmitting}
              rows={4}
              maxLength={1000}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.comment.length}/1000 characters
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="inline h-4 w-4 mr-1" />
              Add Photos (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Help others by sharing photos of the product. You can upload up to 5 images.
            </p>
            <ImageUpload
              onImagesChange={handleImagesChange}
              maxImages={5}
              disabled={isSubmitting || uploadingImages}
              className="border-2 border-dashed border-gray-200 rounded-lg"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || uploadingImages}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || uploadingImages || formData.rating === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingImages ? 'Uploading Images...' : 'Submitting...'}
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

