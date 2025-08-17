import React from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

const RecommendationCard = ({ product, type = 'recommendation', showReasons = true }) => {
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
        <span className="ml-1 text-sm text-gray-600">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'similar':
        return <Users className="h-4 w-4 text-blue-500" />;
      default:
        return <Star className="h-4 w-4 text-purple-500" />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'trending':
        return 'Trending';
      case 'similar':
        return 'Similar';
      default:
        return 'Recommended';
    }
  };

  const getScoreDisplay = () => {
    if (type === 'trending' && product.trend_score) {
      return `Trend Score: ${product.trend_score.toFixed(1)}`;
    }
    if (type === 'similar' && product.similarity_score) {
      return `${(product.similarity_score * 100).toFixed(0)}% Similar`;
    }
    if (product.recommendation_score) {
      return `Match: ${(product.recommendation_score * 100).toFixed(0)}%`;
    }
    return null;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon()}
            <Badge variant="outline" className="text-xs">
              {getTypeLabel()}
            </Badge>
          </div>
          {getScoreDisplay() && (
            <span className="text-xs text-gray-500">{getScoreDisplay()}</span>
          )}
        </div>
        <CardTitle className="text-lg">
          <Link 
            to={`/product/${product.id}`}
            className="hover:text-blue-600 transition-colors"
          >
            {product.name}
          </Link>
        </CardTitle>
        {product.brand && (
          <p className="text-sm text-gray-500">{product.brand}</p>
        )}
      </CardHeader>
      
      <CardContent>
        {product.image_url && (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-32 object-cover rounded-md mb-3"
          />
        )}
        
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          {renderStars(product.average_rating || 0)}
          <span className="text-sm text-gray-500">
            {product.review_count || 0} reviews
          </span>
        </div>
        
        {product.price_min && product.price_max && (
          <div className="mb-3">
            <span className="text-lg font-semibold text-green-600">
              ${product.price_min} - ${product.price_max}
            </span>
          </div>
        )}
        
        {product.category && (
          <Badge variant="secondary" className="mb-3">
            {product.category}
          </Badge>
        )}
        
        {/* Recommendation Reasons */}
        {showReasons && product.recommendation_reasons && product.recommendation_reasons.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-gray-600 mb-1">Why recommended:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              {product.recommendation_reasons.slice(0, 2).map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Trending specific info */}
        {type === 'trending' && product.recent_interactions && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500">
              {product.recent_interactions} recent interactions this week
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationCard;

