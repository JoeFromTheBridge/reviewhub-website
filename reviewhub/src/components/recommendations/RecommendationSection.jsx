import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import RecommendationCard from './RecommendationCard';
import { api } from '../../services/api';

const RecommendationSection = ({ 
  title, 
  type = 'recommendation', 
  userId = null, 
  productId = null, 
  categoryId = null,
  limit = 6,
  showReasons = true 
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchRecommendations();
  }, [type, userId, productId, categoryId, limit]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data;
      
      switch (type) {
        case 'user':
          data = await api.getUserRecommendations(limit);
          setRecommendations(data.recommendations || []);
          break;
          
        case 'similar':
          if (productId) {
            data = await api.getSimilarProducts(productId, limit);
            setRecommendations(data.similar_products || []);
          }
          break;
          
        case 'trending':
          data = await api.getTrendingProducts(categoryId, limit);
          setRecommendations(data.trending_products || []);
          break;
          
        default:
          setRecommendations([]);
      }
    } catch (err) {
      setError('Failed to load recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const itemsPerPage = 3;
  const maxIndex = Math.max(0, recommendations.length - itemsPerPage);

  const nextSlide = () => {
    setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show section if no recommendations
  }

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        
        {recommendations.length > itemsPerPage && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="p-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              disabled={currentIndex >= maxIndex}
              className="p-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)` }}
        >
          {recommendations.map((product, index) => (
            <div 
              key={product.id || index} 
              className="w-1/3 flex-shrink-0 px-2"
            >
              <RecommendationCard 
                product={product} 
                type={type}
                showReasons={showReasons}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      {recommendations.length > itemsPerPage && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationSection;

