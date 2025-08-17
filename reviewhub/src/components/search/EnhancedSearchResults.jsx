import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  List, 
  Star, 
  Eye, 
  Heart, 
  Share2, 
  Filter, 
  SortAsc, 
  SortDesc,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Compare,
  ShoppingCart,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  TrendingUp,
  Clock,
  Award
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';

const EnhancedSearchResults = ({ 
  results, 
  loading, 
  error, 
  searchQuery,
  searchType = 'products',
  onResultClick,
  onSortChange,
  onViewModeChange,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedResults, setSelectedResults] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(20);
  const [savedResults, setSavedResults] = useState(new Set());
  const [compareList, setCompareList] = useState(new Set());

  useEffect(() => {
    // Load saved results from localStorage
    const saved = JSON.parse(localStorage.getItem('reviewhub_saved_results') || '[]');
    setSavedResults(new Set(saved));
  }, []);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    onSortChange?.(value);
  };

  const toggleSaveResult = (resultId) => {
    const newSaved = new Set(savedResults);
    if (newSaved.has(resultId)) {
      newSaved.delete(resultId);
    } else {
      newSaved.add(resultId);
    }
    setSavedResults(newSaved);
    localStorage.setItem('reviewhub_saved_results', JSON.stringify([...newSaved]));
  };

  const toggleCompareResult = (resultId) => {
    const newCompare = new Set(compareList);
    if (newCompare.has(resultId)) {
      newCompare.delete(resultId);
    } else if (newCompare.size < 4) { // Limit to 4 items for comparison
      newCompare.add(resultId);
    }
    setCompareList(newCompare);
  };

  const shareResult = async (result) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: result.name || result.title,
          text: result.description || result.content,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatRating = (rating) => {
    return Number(rating).toFixed(1);
  };

  const getResultsForCurrentPage = () => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    return results.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(results.length / resultsPerPage);
  };

  const renderProductCard = (product, index) => (
    <Card 
      key={product.id} 
      className={`group hover:shadow-lg transition-shadow cursor-pointer ${
        viewMode === 'list' ? 'mb-4' : ''
      }`}
      onClick={() => onResultClick?.(product)}
    >
      <CardContent className={`p-4 ${viewMode === 'list' ? 'flex gap-4' : ''}`}>
        {/* Product Image */}
        <div className={`relative ${viewMode === 'list' ? 'w-32 h-32 flex-shrink-0' : 'w-full h-48 mb-3'}`}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          {/* Quick Actions Overlay */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSaveResult(product.id);
                }}
                className="h-8 w-8 p-0"
              >
                <Heart className={`h-4 w-4 ${savedResults.has(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  shareResult(product);
                }}
                className="h-8 w-8 p-0"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCompareResult(product.id);
                }}
                disabled={compareList.size >= 4 && !compareList.has(product.id)}
                className="h-8 w-8 p-0"
              >
                <Compare className={`h-4 w-4 ${compareList.has(product.id) ? 'text-blue-500' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2">
            <div className="flex flex-col gap-1">
              {product.is_trending && (
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              )}
              {product.is_new && (
                <Badge variant="default" className="text-xs">
                  New
                </Badge>
              )}
              {product.has_discount && (
                <Badge variant="destructive" className="text-xs">
                  Sale
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600">
              {product.name}
            </h3>
            {viewMode === 'grid' && (
              <Checkbox
                checked={selectedResults.has(product.id)}
                onCheckedChange={(checked) => {
                  const newSelected = new Set(selectedResults);
                  if (checked) {
                    newSelected.add(product.id);
                  } else {
                    newSelected.delete(product.id);
                  }
                  setSelectedResults(newSelected);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>

          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
          )}

          {/* Rating */}
          {product.average_rating && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(product.average_rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {formatRating(product.average_rating)} ({product.review_count || 0})
              </span>
            </div>
          )}

          {/* Price */}
          {product.price && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(product.original_price)}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {product.description}
          </p>

          {/* Features/Tags */}
          {product.features && product.features.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {product.features.slice(0, 3).map((feature, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {product.features.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{product.features.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onResultClick?.(product);
              }}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            {product.external_url && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(product.external_url, '_blank');
                }}
                className="flex-1"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderReviewCard = (review, index) => (
    <Card key={review.id} className="mb-4 hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {review.user_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h4 className="font-medium">{review.user_name || 'Anonymous'}</h4>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSaveResult(review.id)}
              className="h-8 w-8 p-0"
            >
              <Bookmark className={`h-4 w-4 ${savedResults.has(review.id) ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareResult(review)}
              className="h-8 w-8 p-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <h3 className="font-semibold mb-2">{review.title}</h3>
        <p className="text-gray-700 mb-3 line-clamp-3">{review.content}</p>

        {review.pros && review.pros.length > 0 && (
          <div className="mb-2">
            <span className="text-sm font-medium text-green-600">Pros: </span>
            <span className="text-sm text-gray-600">{review.pros.join(', ')}</span>
          </div>
        )}

        {review.cons && review.cons.length > 0 && (
          <div className="mb-3">
            <span className="text-sm font-medium text-red-600">Cons: </span>
            <span className="text-sm text-gray-600">{review.cons.join(', ')}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>For: {review.product_name}</span>
          <div className="flex items-center gap-4">
            {review.verified_purchase && (
              <Badge variant="outline" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {review.helpful_count || 0} helpful
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Searching...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No results found for "{searchQuery}"</p>
        <p className="text-sm text-gray-500 mt-2">Try adjusting your search terms or filters</p>
      </div>
    );
  }

  const currentResults = getResultsForCurrentPage();
  const totalPages = getTotalPages();

  return (
    <div className={className}>
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {results.length} results for "{searchQuery}"
          </h2>
          {selectedResults.size > 0 && (
            <Badge variant="secondary">
              {selectedResults.size} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Options */}
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Compare Bar */}
      {compareList.size > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {compareList.size} items selected for comparison
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Compare Now
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setCompareList(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      }>
        {currentResults.map((result, index) => 
          searchType === 'products' 
            ? renderProductCard(result, index)
            : renderReviewCard(result, index)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchResults;

