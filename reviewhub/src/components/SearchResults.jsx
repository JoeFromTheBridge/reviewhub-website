import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Star, Filter, Grid, List, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import apiService from '../services/api'

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState('grid')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Filter states
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    minRating: searchParams.get('minRating') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sort') || 'relevance'
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [searchParams, currentPage])

  const fetchCategories = async () => {
    try {
      const response = await apiService.getCategories()
      setCategories(response.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params = {
        q: searchParams.get('q') || '',
        category: searchParams.get('category') || '',
        min_rating: searchParams.get('minRating') || '',
        max_price: searchParams.get('maxPrice') || '',
        sort: searchParams.get('sort') || 'relevance',
        page: currentPage,
        limit: 12
      }

      const response = await apiService.getProducts(params)
      setProducts(response.products || [])
      setTotalResults(response.total || 0)
    } catch (error) {
      setError('Failed to load products')
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key === 'sortBy' ? 'sort' : key, value)
    } else {
      newParams.delete(key === 'sortBy' ? 'sort' : key)
    }
    setSearchParams(newParams)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      minRating: '',
      maxPrice: '',
      sortBy: 'relevance'
    })
    setSearchParams({})
    setCurrentPage(1)
  }

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
        <span className="ml-1 text-sm text-gray-600">{rating}</span>
      </div>
    )
  }

  const ProductCard = ({ product }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <Link to={`/product/${product.id}`}>
          <img
            src={product.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300'}
            alt={product.name}
            className="w-full h-48 object-cover rounded-md mb-4"
          />
        </Link>
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Link
                to={`/product/${product.id}`}
                className="font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2"
              >
                {product.name}
              </Link>
              <p className="text-sm text-gray-600">{product.brand}</p>
            </div>
            <Badge variant="outline">{product.category}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            {renderStars(product.average_rating || 0)}
            <span className="text-sm text-gray-600">
              ({product.review_count || 0} reviews)
            </span>
          </div>
          
          {product.price_range && (
            <p className="text-lg font-semibold text-gray-900">{product.price_range}</p>
          )}
          
          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
        </div>
      </CardContent>
    </Card>
  )

  const ProductListItem = ({ product }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Link to={`/product/${product.id}`} className="flex-shrink-0">
            <img
              src={product.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300'}
              alt={product.name}
              className="w-24 h-24 object-cover rounded-md"
            />
          </Link>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link
                  to={`/product/${product.id}`}
                  className="font-semibold text-lg text-gray-900 hover:text-primary transition-colors"
                >
                  {product.name}
                </Link>
                <p className="text-gray-600">{product.brand}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline">{product.category}</Badge>
                {product.price_range && (
                  <p className="text-lg font-semibold text-gray-900 mt-1">{product.price_range}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {renderStars(product.average_rating || 0)}
              <span className="text-sm text-gray-600">
                ({product.review_count || 0} reviews)
              </span>
            </div>
            
            <p className="text-gray-600 line-clamp-2">{product.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {filters.query ? `Search results for "${filters.query}"` : 'All Products'}
          </h1>
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${totalResults} products found`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search
                    </label>
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={filters.query}
                      onChange={(e) => handleFilterChange('query', e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Rating
                    </label>
                    <select
                      value={filters.minRating}
                      onChange={(e) => handleFilterChange('minRating', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Any Rating</option>
                      <option value="4">4+ Stars</option>
                      <option value="3">3+ Stars</option>
                      <option value="2">2+ Stars</option>
                      <option value="1">1+ Stars</option>
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Price
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter max price"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Sort and View Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="relevance">Relevance</option>
                  <option value="rating">Highest Rated</option>
                  <option value="reviews">Most Reviews</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="newest">Newest</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">Loading products...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchProducts} className="mt-4">
                  Try Again
                </Button>
              </div>
            )}

            {/* No Results */}
            {!loading && !error && products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No products found matching your criteria.</p>
                <Button onClick={clearFilters}>Clear Filters</Button>
              </div>
            )}

            {/* Products Grid/List */}
            {!loading && !error && products.length > 0 && (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <ProductListItem key={product.id} product={product} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <div className="flex justify-center mt-12">
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button variant="default">{currentPage}</Button>
                    <Button 
                      variant="outline"
                      disabled={products.length < 12}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

