
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Star, ThumbsUp, Shield, Filter, ChevronDown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import RecommendationSection from './recommendations/RecommendationSection'
import SimilarProducts from './search/SimilarProducts'
import { api } from '../services/api'

export function ProductPage() {
  const { id } = useParams()
  const [sortBy, setSortBy] = useState('helpful')
  const [filterRating, setFilterRating] = useState('all')

  useEffect(() => {
    // Track product view interaction
    if (id) {
      api.trackInteraction(parseInt(id), 'view').catch(console.error);
    }
  }, [id]);

  // Mock product data
  const product = {
    id: 1,
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
    rating: 4.5,
    totalReviews: 1247,
    specifications: [
      '6.1-inch Display',
      '128GB Storage',
      '48MP Main Camera',
      'A17 Pro Chip',
      'Titanium Build'
    ],
    priceRange: '$999 - $1,199',
    description: 'The iPhone 15 Pro features a titanium design, advanced camera system, and the powerful A17 Pro chip for exceptional performance.'
  }

  const ratingDistribution = [
    { stars: 5, count: 623, percentage: 50 },
    { stars: 4, count: 374, percentage: 30 },
    { stars: 3, count: 125, percentage: 10 },
    { stars: 2, count: 75, percentage: 6 },
    { stars: 1, count: 50, percentage: 4 }
  ]

  const reviews = [
    {
      id: 1,
      user: 'John D.',
      rating: 5,
      title: 'Great phone!',
      content: 'I\'ve been using this phone for 3 months now and I\'m really impressed with the camera quality and performance. The titanium build feels premium and the battery life is excellent.',
      date: '2 weeks ago',
      verified: true,
      helpful: 12,
      images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200']
    },
    {
      id: 2,
      user: 'Sarah M.',
      rating: 4,
      title: 'Solid upgrade',
      content: 'Coming from iPhone 13, this is a nice upgrade. The camera improvements are noticeable and the new Action Button is useful. Only downside is the price.',
      date: '1 month ago',
      verified: true,
      helpful: 8,
      images: []
    },
    {
      id: 3,
      user: 'Mike R.',
      rating: 5,
      title: 'Best iPhone yet',
      content: 'The A17 Pro chip makes everything incredibly smooth. Gaming performance is outstanding and the phone doesn\'t get hot like my previous Android.',
      date: '3 weeks ago',
      verified: false,
      helpful: 15,
      images: []
    }
  ]

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Product Header */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <div>
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-96 object-cover rounded-lg shadow-lg"
          />
        </div>
        
        <div>
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-lg text-gray-600">{product.brand}</p>
          </div>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-1">
              {renderStars(product.rating)}
              <span className="text-lg font-semibold ml-2">{product.rating}</span>
            </div>
            <span className="text-gray-600">({product.totalReviews} reviews)</span>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Specifications</h3>
            <ul className="space-y-2">
              {product.specifications.map((spec, index) => (
                <li key={index} className="text-gray-700">• {spec}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700">{product.description}</p>
          </div>
          
          <div className="mb-6">
            <p className="text-lg font-semibold text-gray-900">Price Range: {product.priceRange}</p>
          </div>
          
          <div className="flex space-x-4">
            <Button size="lg" className="flex-1">
              Compare Prices
            </Button>
            <Button size="lg" variant="outline">
              Write Review
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Rating Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">{product.rating}</div>
                <div className="flex justify-center mb-2">
                  {renderStars(product.rating)}
                </div>
                <p className="text-gray-600">{product.totalReviews} total reviews</p>
              </div>
              
              <div className="space-y-3">
                {ratingDistribution.map((item) => (
                  <div key={item.stars} className="flex items-center space-x-3">
                    <span className="text-sm w-6">{item.stars}★</span>
                    <Progress value={item.percentage} className="flex-1" />
                    <span className="text-sm text-gray-600 w-12">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="helpful">Most Helpful</option>
                <option value="recent">Most Recent</option>
                <option value="rating">Highest Rating</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Rating:</span>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>

          {/* Individual Reviews */}
          <div className="space-y-6">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold">{review.user}</span>
                        {review.verified && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <Shield className="h-3 w-3 mr-1" />
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm text-gray-600">{review.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                  <p className="text-gray-700 mb-4">{review.content}</p>
                  
                  {review.images.length > 0 && (
                    <div className="flex space-x-2 mb-4">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt="Review"
                          className="w-20 h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Helpful ({review.helpful})
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      Reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Button variant="outline">Load More Reviews</Button>
          </div>
        </div>
      </div>

      {/* Visual Similar Products Section */}
      <div className="mt-16">
        <SimilarProducts productId={parseInt(id)} />
      </div>

      {/* Similar Products Section */}
      <div className="mt-16">
        <RecommendationSection
          title="Similar Products"
          type="similar"
          productId={parseInt(id)}
          limit={6}
          showReasons={false}
        />
      </div>
    </div>
  )
}


