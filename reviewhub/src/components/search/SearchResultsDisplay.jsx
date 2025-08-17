import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const SearchResultsDisplay = ({ results, type }) => {
  if (!results || results.length === 0) {
    return <p className="text-center text-gray-500">No {type} found matching your criteria.</p>;
  }

  const renderProductCard = (product) => (
    <Card key={product.id} className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-lg"><Link to={`/product/${product.id}`}>{product.name}</Link></CardTitle>
        <p className="text-sm text-gray-500">{product.brand} - {product.model}</p>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-2 line-clamp-2">{product.description}</p>
        <div className="flex items-center mb-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
          <span className="text-sm font-semibold">{product.average_rating.toFixed(1)}</span>
          <span className="text-sm text-gray-500 ml-1">({product.review_count} reviews)</span>
        </div>
        {product.category && <Badge variant="secondary">{product.category}</Badge>}
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="mt-4 w-full h-32 object-cover rounded-md" />
        )}
      </CardContent>
    </Card>
  );

  const renderReviewCard = (review) => (
    <Card key={review.id} className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-lg"><Link to={`/product/${review.product_id}`}>{review.title || `Review for ${review.product_name}`}</Link></CardTitle>
        <p className="text-sm text-gray-500">By {review.user_username} on {new Date(review.created_at).toLocaleDateString()}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-2">
          {[...Array(review.rating)].map((_, i) => (
            <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          ))}
          {[...Array(5 - review.rating)].map((_, i) => (
            <Star key={i + review.rating} className="w-4 h-4 text-gray-300" />
          ))}
          {review.verified_purchase && <Badge className="ml-2" variant="success">Verified Purchase</Badge>}
        </div>
        <p className="text-gray-700 mb-2 line-clamp-3">{review.content}</p>
        {review.has_images && <Badge variant="outline">Has Images</Badge>}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {type === "products" && results.map(renderProductCard)}
      {type === "reviews" && results.map(renderReviewCard)}
    </div>
  );
};

export default SearchResultsDisplay;

