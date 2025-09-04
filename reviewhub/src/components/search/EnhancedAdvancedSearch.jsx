import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  History,
  Bookmark,
  Settings,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SearchAutocomplete from './SearchAutocomplete';
import SearchFilters from './SearchFilters';
import SearchHistory from './SearchHistory';
import apiService from '../../services/api';

const EnhancedAdvancedSearch = ({ 
  onSearch, 
  onFiltersChange, 
  initialFilters = {},
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    hasReviews: false,
    verifiedOnly: false,
    hasImages: false,
    dateRange: '',
    ...initialFilters
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    brands: [],
    priceRanges: [],
    features: []
  });
  
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [quickFilters, setQuickFilters] = useState([]);
  const [searchStats, setSearchStats] = useState({});

  useEffect(() => {
    loadAvailableFilters();
    loadQuickFilters();
    loadSearchStats();
  }, []);

  const loadAvailableFilters = async () => {
    try {
      // Load categories
      const categoriesResponse = await apiService.getCategories();
      
      // Load brands (this would need to be implemented in the backend)
      const brands = [
        'Apple', 'Samsung', 'Google', 'Microsoft', 'Sony', 'LG', 'Dell', 
        'HP', 'Lenovo', 'ASUS', 'Acer', 'Canon', 'Nikon', 'Nike', 'Adidas',
        'Amazon', 'Netflix', 'Spotify', 'Tesla', 'BMW', 'Mercedes', 'Toyota'
      ];

      setAvailableFilters({
        categories: categoriesResponse.categories || [],
        brands: brands,
        priceRanges: [
          { label: 'Under $25', min: 0, max: 25 },
          { label: '$25 - $50', min: 25, max: 50 },
          { label: '$50 - $100', min: 50, max: 100 },
          { label: '$100 - $250', min: 100, max: 250 },
          { label: '$250 - $500', min: 250, max: 500 },
          { label: 'Over $500', min: 500, max: null }
        ],
        features: [
          'Free Shipping',
          'Prime Eligible',
          'Best Seller',
          'Editor\'s Choice',
          'Customer Favorite',
          'New Release'
        ]
      });
    } catch (error) {
      console.error('Error loading available filters:', error);
    }
  };

  const loadQuickFilters = () => {
    // Popular filter combinations
    setQuickFilters([
      {
        name: 'Highly Rated',
        filters: { minRating: 4, hasReviews: true },
        icon: '⭐'
      },
      {
        name: 'Budget Friendly',
        filters: { maxPrice: 50 },
        icon: '💰'
      },
      {
        name: 'Premium',
        filters: { minPrice: 200, minRating: 4 },
        icon: '👑'
      },
      {
        name: 'Verified Reviews',
        filters: { verifiedOnly: true, hasReviews: true },
        icon: '✅'
      },
      {
        name: 'With Images',
        filters: { hasImages: true },
        icon: '📷'
      },
      {
        name: 'Recent',
        filters: { dateRange: '1m' },
        icon: '🆕'
      }
    ]);
  };

  const loadSearchStats = async () => {
    try {
      // This would load search analytics from the backend
      setSearchStats({
        totalSearches: 1250,
        popularCategories: ['Electronics', 'Clothing', 'Books'],
        trendingQueries: ['wireless headphones', 'laptop stand', 'coffee maker'],
        avgResultsPerSearch: 45
      });
    } catch (error) {
      console.error('Error loading search stats:', error);
    }
  };

  const handleSearch = (searchQuery = query, searchFilters = filters) => {
    if (!searchQuery.trim()) return;

    // Save search to history
    saveSearchToHistory(searchQuery, searchFilters);
    
    // Trigger search
    onSearch(searchQuery, searchFilters);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleQuickFilterClick = (quickFilter) => {
    const newFilters = { ...filters, ...quickFilter.filters };
    setFilters(newFilters);
    handleFiltersChange(newFilters);
    handleSearch(query, newFilters);
  };

  const handleHistorySearch = (historyQuery, historyFilters = {}) => {
    setQuery(historyQuery);
    const newFilters = { ...filters, ...historyFilters };
    setFilters(newFilters);
    handleSearch(historyQuery, newFilters);
  };

  const saveSearchToHistory = (searchQuery, searchFilters) => {
    try {
      const history = JSON.parse(localStorage.getItem('reviewhub_search_history') || '[]');
      const newSearch = {
        id: Date.now(),
        query: searchQuery,
        filters: searchFilters,
        timestamp: new Date().toISOString(),
        results: 0 // This would be updated after getting results
      };
      
      const updatedHistory = [newSearch, ...history.slice(0, 99)]; // Keep last 100 searches
      localStorage.setItem('reviewhub_search_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving search to history:', error);
    }
  };

  const resetFilters = () => {
    const resetFilters = {
      category: '',
      brand: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      hasReviews: false,
      verifiedOnly: false,
      hasImages: false,
      dateRange: ''
    };
    setFilters(resetFilters);
    handleFiltersChange(resetFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== null && value !== '' && value !== false
    ).length;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search Input with Autocomplete */}
            <div className="relative">
              <SearchAutocomplete
                value={query}
                onChange={setQuery}
                onSearch={(searchQuery) => handleSearch(searchQuery)}
                placeholder="Search products, reviews, brands..."
                className="w-full"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">Quick filters:</span>
              {quickFilters.map((quickFilter, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilterClick(quickFilter)}
                  className="text-xs"
                >
                  <span className="mr-1">{quickFilter.icon}</span>
                  {quickFilter.name}
                </Button>
              ))}
            </div>

            {/* Search Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleSearch()}
                  disabled={!query.trim()}
                  className="px-6"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Advanced
                  {getActiveFiltersCount() > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {getActiveFiltersCount()}
                    </Badge>
                  )}
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{searchStats.totalSearches || 0} searches today</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Search Panel */}
      {showAdvanced && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters */}
          <div className="lg:col-span-2">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onApplyFilters={(newFilters) => handleSearch(query, newFilters)}
              onResetFilters={resetFilters}
              availableFilters={availableFilters}
            />
          </div>

          {/* Search History & Stats */}
          <div className="space-y-6">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trends
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="history">
                <SearchHistory
                  onSearchSelect={handleHistorySearch}
                  className="h-96"
                />
              </TabsContent>
              
              <TabsContent value="stats">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Search Trends</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Popular Categories */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Popular Categories</h4>
                      <div className="flex flex-wrap gap-1">
                        {searchStats.popularCategories?.map((category, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => {
                              const newFilters = { ...filters, category };
                              setFilters(newFilters);
                              handleSearch(query, newFilters);
                            }}
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Trending Queries */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Trending Searches</h4>
                      <div className="space-y-1">
                        {searchStats.trendingQueries?.map((trendingQuery, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearch(trendingQuery)}
                            className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 py-1"
                          >
                            <TrendingUp className="h-3 w-3 inline mr-2" />
                            {trendingQuery}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {searchStats.totalSearches || 0}
                        </div>
                        <div className="text-xs text-gray-600">Total Searches</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {searchStats.avgResultsPerSearch || 0}
                        </div>
                        <div className="text-xs text-gray-600">Avg Results</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Active filters:</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(filters).map(([key, value]) => {
                    if (!value || value === false || value === '') return null;
                    
                    return (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {value.toString()}
                        <button
                          onClick={() => {
                            const newFilters = { ...filters, [key]: '' };
                            setFilters(newFilters);
                            handleFiltersChange(newFilters);
                          }}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedAdvancedSearch;

