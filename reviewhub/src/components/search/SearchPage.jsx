import React, { useState, useEffect } from 'react';
import { Search, Filter, SortAsc, Camera, Mic } from 'lucide-react';
import AdvancedSearch from './AdvancedSearch';
import SearchResultsDisplay from './SearchResultsDisplay';
import VisualSearch from './VisualSearch';
import VoiceSearch from './VoiceSearch';
import apiService from '../../services/api';

const SearchPage = () => {
  const [activeSearchTab, setActiveSearchTab] = useState('text'); // 'text', 'visual', or 'voice'
  const [activeResultsTab, setActiveResultsTab] = useState('products'); // 'products' or 'reviews'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState('text'); // 'text', 'visual', or 'voice'

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    const initialFilters = {};
    for (let [key, value] of params.entries()) {
      if (key !== 'q') {
        initialFilters[key] = value;
      }
    }
    if (query) {
      performSearch(query, initialFilters);
    }
  }, [location.search]);

  const performSearch = async (query, filters) => {
    setLoading(true);
    setError(null);
    setSearchType('text');
    try {
      const productResults = await apiService.searchProducts(query, filters);
      const reviewResults = await apiService.searchReviews(query, filters);
      setSearchResults({
        products: productResults.products || [],
        reviews: reviewResults.reviews || []
      });
    } catch (err) {
      setError('Failed to fetch search results.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVisualSearchResults = (results, type) => {
    setSearchResults({
      products: results,
      reviews: []
    });
    setSearchType('visual');
    setError(null);
  };

  const handleVisualSearchError = (errorMessage) => {
    setError(errorMessage);
    setSearchResults({ products: [], reviews: [] });
  };

  const handleVoiceSearchResults = (results) => {
    setSearchResults({
      products: results.products || [],
      reviews: results.reviews || []
    });
    setSearchType('voice');
    setError(null);
  };

  const handleVoiceSearchParams = (params) => {
    // Update URL with voice search parameters
    const urlParams = new URLSearchParams();
    for (const key in params) {
      if (params[key]) {
        urlParams.set(key, params[key]);
      }
    }
    window.history.pushState({}, '', `/search?${urlParams.toString()}`);
  };

  const handleSearch = (query, filters) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    for (const key in filters) {
      if (filters[key]) {
        params.set(key, filters[key]);
      }
    }
    window.history.pushState({}, '', `/search?${params.toString()}`);
    performSearch(query, filters);
  };

  const handleFiltersChange = (newFilters) => {
    // This function is mainly for updating the internal state of AdvancedSearch
    // The actual search is triggered by handleSearch when the form is submitted
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Search ReviewHub</h1>
      
      {/* Search Type Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-3 px-6 text-lg font-medium ${activeSearchTab === 'text' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSearchTab('text')}
        >
          <Search className="h-5 w-5 inline mr-2" />
          Text Search
        </button>
        <button
          className={`py-3 px-6 text-lg font-medium ${activeSearchTab === 'visual' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSearchTab('visual')}
        >
          <Camera className="h-5 w-5 inline mr-2" />
          Visual Search
        </button>
        <button
          className={`py-3 px-6 text-lg font-medium ${activeSearchTab === 'voice' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSearchTab('voice')}
        >
          <Mic className="h-5 w-5 inline mr-2" />
          Voice Search
        </button>
      </div>

      {/* Search Interface */}
      {activeSearchTab === 'text' ? (
        <AdvancedSearch onSearch={handleSearch} onFiltersChange={handleFiltersChange} />
      ) : activeSearchTab === 'visual' ? (
        <VisualSearch 
          onResults={handleVisualSearchResults} 
          onError={handleVisualSearchError} 
        />
      ) : (
        <VoiceSearch 
          onSearchResults={handleVoiceSearchResults}
          onSearchParams={handleVoiceSearchParams}
        />
      )}

      {/* Results Section */}
      {(searchResults.products.length > 0 || searchResults.reviews.length > 0 || error) && (
        <>
          {/* Results Type Tabs */}
          <div className="flex border-b border-gray-200 mb-4 mt-8">
            <button
              className={`py-2 px-4 text-lg font-medium ${activeResultsTab === 'products' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveResultsTab('products')}
            >
              Products ({searchResults.products.length})
              {searchType === 'visual' && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Visual</span>}
            </button>
            {searchType === 'text' && (
              <button
                className={`py-2 px-4 text-lg font-medium ${activeResultsTab === 'reviews' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveResultsTab('reviews')}
              >
                Reviews ({searchResults.reviews.length})
              </button>
            )}
          </div>

          <SearchResultsDisplay
            results={searchResults}
            activeTab={activeResultsTab}
            loading={loading}
            error={error}
            searchType={searchType}
          />
        </>
      )}
    </div>
  );
};

export default SearchPage;

