import { useState, useEffect } from 'react';
import { Star, Edit2, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

export function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyReviews();
    }
  }, [isAuthenticated]);

  const fetchMyReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getMyReviews();
      setReviews(response.reviews || []);
    } catch (error) {
      setError('Failed to load your reviews');
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      setDeletingId(reviewId);
      await apiService.deleteReview(reviewId);
      setReviews(reviews.filter(review => review.id !== reviewId));
    } catch (error) {
      setError('Failed to delete review');
      console.error('Error deleting review:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-600">Please log in to view your reviews.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-600">Loading your reviews...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Reviews</h1>
        <p className="text-gray-600">
          Manage and view all the reviews you've written
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No reviews yet
              </h3>
              <p className="text-gray-600 mb-4">
                You haven't written any reviews yet. Start by browsing products and sharing your experiences!
              </p>
              <Button onClick={() => window.location.href = '/'}>
                Browse Products
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {review.product?.name || 'Product'}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {renderStars(review.rating)}
                      <span>•</span>
                      <span>{new Date(review.created_at).toLocaleDateString()}</span>
                      {review.is_verified && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Verified Purchase
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement edit functionality
                        alert('Edit functionality coming soon!');
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deletingId === review.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">{review.title}</h4>
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                  
                  {review.helpful_count > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span>{review.helpful_count} people found this helpful</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-sm text-gray-600">
                      Product: {review.product?.brand} {review.product?.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = `/product/${review.product?.id}`}
                    >
                      View Product
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

