import React, { useState, useEffect } from 'react';
import { Eye, Star, ShoppingCart, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';

const SimilarProducts = ({ productId, className = '' }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);

  useEffect(() => {
    if (productId) {
      fetchSimilarProducts();
    }
  }, [productId]);

  const fetchSimilarProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getVisuallySimilarProducts(productId);
      
      if (response.similar_products) {
        setSimilarProducts(response.similar_products);
        setCurrentProduct(response.product);
      } else {
        setSimilarProducts([]);
      }
    } catch (error) {
      console.error('Error fetching similar products:', error);
      setError('Failed to load similar products');
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (score) => {
    if (score >= 0.9) return 'text-green-600 bg-green-100';
    if (score >= 0.8) return 'text-blue-600 bg-blue-100';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getSimilarityLabel = (score) => {
    if (score >= 0.9) return 'Very Similar';
    if (score >= 0.8) return 'Similar';
    if (score >= 0.7) return 'Somewhat Similar';
    return 'Related';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Visually Similar Products</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Finding similar products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Visually Similar Products</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchSimilarProducts}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (similarProducts.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Visually Similar Products</h3>
        </div>
        <div className="text-center py-8">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No visually similar products found</p>
          <p className="text-sm text-gray-500 mt-1">
            This product may have a unique design or we need more product images to compare
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Visually Similar Products</h3>
        <span className="text-sm text-gray-500">({similarProducts.length} found)</span>
      </div>
      
      {currentProduct && (
        <p className="text-sm text-gray-600 mb-6">
          Products that look similar to <strong>{currentProduct.name}</strong> by <strong>{currentProduct.brand}</strong>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {similarProducts.map((product) => (
          <div key={product.product_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <Link to={`/product/${product.product_id}`} className="block">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-md mb-3"
                />
              ) : (
                <div className="w-full h-32 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
                  <ShoppingCart className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
                    {product.name}
                  </h4>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(product.similarity_score)}`}>
                    {Math.round(product.similarity_score * 100)}%
                  </span>
                </div>
                
                <p className="text-sm text-gray-600">{product.brand}</p>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    ${product.price?.toFixed(2) || 'N/A'}
                  </span>
                  
                  {product.average_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">
                        {product.average_rating} ({product.review_count})
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{product.category}</span>
                  <span className={`px-2 py-1 rounded-full ${getSimilarityColor(product.similarity_score)}`}>
                    {getSimilarityLabel(product.similarity_score)}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <div className="flex items-start gap-2">
          <Percent className="h-4 w-4 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Similarity Scoring</h4>
            <p className="text-xs text-blue-800 mt-1">
              Products are ranked by visual similarity based on color, texture, and shape analysis. 
              Higher percentages indicate stronger visual resemblance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarProducts;

