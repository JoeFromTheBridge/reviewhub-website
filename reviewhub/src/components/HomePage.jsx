import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Star, TrendingUp, Users, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RecommendationSection from './recommendations/RecommendationSection'
import LazyLoading, { useLazyLoading } from './ui/lazy-loading'
import ImageOptimizer from './ui/image-optimizer'
import { useAuth } from '../contexts/AuthContext'
import apiService from '../services/api'
import heroImage from '../assets/hero_image.png'
import electronicsIcon from '../assets/category_electronics.png'
import automotiveIcon from '../assets/category_automotive.png'
import homeIcon from '../assets/category_home.png'
import beautyIcon from '../assets/category_beauty.png'

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState([])
  const [featuredReviews, setFeaturedReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    fetchHomePageData()
  }, [])

  const fetchHomePageData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Fetch categories and recent reviews in parallel
      const [categoriesResponse, reviewsResponse] = await Promise.all([
        apiService.getCategories(),
        apiService.getReviews({ limit: 6, sort: 'created_at' })
      ])
      
      setCategories(categoriesResponse.categories || [])
      setFeaturedReviews(reviewsResponse.reviews || [])
    } catch (error) {
      setError('Failed to load homepage data')
      console.error('Error fetching homepage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'Electronics': electronicsIcon,
      'Automotive': automotiveIcon,
      'Home & Garden': homeIcon,
      'Beauty & Health': beautyIcon,
    }
    return iconMap[categoryName] || electronicsIcon
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Make Smarter
                <span className="block text-yellow-300">Purchase Decisions</span>
              </h1>
              <p className="text-xl mb-8 opacity-90">
                Read authentic reviews from real customers and share your own experiences 
                to help others make informed choices.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" variant="secondary" onClick={() => navigate('/search')}>
                  Explore Reviews
                </Button>
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-600">
                  Write a Review
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <ImageOptimizer
                src={heroImage}
                alt="ReviewHub - Product Reviews Platform"
                width={500}
                height={400}
                className="rounded-lg shadow-2xl"
                lazy={false}
              />
            </div>
          </div>
        </div>
      </section>      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">50K+</h3>
              <p className="text-gray-600">Active Reviewers</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">2.5M+</h3>
              <p className="text-gray-600">Product Reviews</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">99.9%</h3>
              <p className="text-gray-600">Verified Reviews</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-xl text-gray-600">Find reviews for products in every category</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/search?category=${encodeURIComponent(category.name)}`}
                  className="group"
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <img 
                        src={getCategoryIcon(category.name)} 
                        alt={category.name}
                        className="w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform"
                      />
                      <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.product_count || 0} products</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Reviews Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Recent Reviews</h2>
            <p className="text-xl text-gray-600">See what our community is saying</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredReviews.map((review) => (
                <Card key={review.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link 
                          to={`/product/${review.product?.id}`}
                          className="font-semibold text-gray-900 hover:text-primary transition-colors"
                        >
                          {review.product?.name || 'Product'}
                        </Link>
                        <p className="text-sm text-gray-600">{review.product?.brand}</p>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                    <p className="text-gray-700 text-sm mb-4 line-clamp-3">{review.comment}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>By {review.user?.username || 'Anonymous'}</span>
                        {review.is_verified && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            Verified
                          </span>
                        )}
                      </div>
                      <span>{review.helpful_count || 0} helpful</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={() => navigate('/search')}>
              View All Reviews
            </Button>
          </div>
        </div>
      </section>

      {/* Personalized Recommendations (for authenticated users) */}
      {isAuthenticated && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RecommendationSection
              title="Recommended for You"
              type="user"
              limit={6}
              showReasons={true}
            />
          </div>
        </section>
      )}

      {/* Trending Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RecommendationSection
            title="Trending Products"
            type="trending"
            limit={6}
            showReasons={false}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
          <p className="text-xl mb-8 opacity-90">
            Share your experiences and help others make better purchasing decisions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary">
              Write Your First Review
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-primary">
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

