import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, TrendingUp, X, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import apiService from '../../services/api';

const SearchAutocomplete = ({ 
  value, 
  onChange, 
  onSearch, 
  placeholder = "Search products, reviews, brands...",
  className = "" 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    // Load recent searches from localStorage
    const recent = JSON.parse(localStorage.getItem('reviewhub_recent_searches') || '[]');
    setRecentSearches(recent.slice(0, 5));
    
    // Load trending searches (mock data for now)
    setTrendingSearches([
      'wireless headphones',
      'smartphone cases',
      'laptop stands',
      'gaming keyboards',
      'fitness trackers'
    ]);
  }, []);

  useEffect(() => {
    if (value && value.length > 2) {
      // Debounce the search suggestions
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const fetchSuggestions = async (query) => {
    setLoading(true);
    try {
      // Get search suggestions from multiple sources
      const [productSuggestions, voiceSuggestions] = await Promise.all([
        apiService.getSearchSuggestions(query, 5),
        apiService.getVoiceSearchSuggestions(query, 3)
      ]);

      const combined = [
        ...productSuggestions.map(s => ({ text: s, type: 'product', icon: Search })),
        ...voiceSuggestions.map(s => ({ text: s, type: 'voice', icon: Search }))
      ];

      // Remove duplicates and limit results
      const unique = combined.filter((item, index, self) => 
        index === self.findIndex(t => t.text === item.text)
      ).slice(0, 8);

      setSuggestions(unique);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = (e) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 200);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion);
    setShowSuggestions(false);
    saveRecentSearch(suggestion);
    onSearch(suggestion);
  };

  const handleRecentSearchClick = (search) => {
    onChange(search);
    setShowSuggestions(false);
    onSearch(search);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    const allSuggestions = [
      ...suggestions.map(s => s.text),
      ...recentSearches,
      ...trendingSearches
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
          const selected = allSuggestions[selectedIndex];
          onChange(selected);
          setShowSuggestions(false);
          saveRecentSearch(selected);
          onSearch(selected);
        } else if (value.trim()) {
          setShowSuggestions(false);
          saveRecentSearch(value.trim());
          onSearch(value.trim());
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const saveRecentSearch = (search) => {
    if (!search.trim()) return;
    
    const recent = JSON.parse(localStorage.getItem('reviewhub_recent_searches') || '[]');
    const updated = [search, ...recent.filter(s => s !== search)].slice(0, 10);
    localStorage.setItem('reviewhub_recent_searches', JSON.stringify(updated));
    setRecentSearches(updated.slice(0, 5));
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('reviewhub_recent_searches');
    setRecentSearches([]);
  };

  const removeRecentSearch = (searchToRemove) => {
    const recent = JSON.parse(localStorage.getItem('reviewhub_recent_searches') || '[]');
    const updated = recent.filter(s => s !== searchToRemove);
    localStorage.setItem('reviewhub_recent_searches', JSON.stringify(updated));
    setRecentSearches(updated.slice(0, 5));
  };

  const renderSuggestionItem = (text, icon, type, index, isSelected) => (
    <div
      key={`${type}-${index}`}
      className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
      }`}
      onClick={() => handleSuggestionClick(text)}
    >
      {React.createElement(icon, { className: "h-4 w-4 text-gray-400" })}
      <span className="flex-1 text-sm">{text}</span>
      {type === 'voice' && (
        <Badge variant="outline" className="text-xs">
          Voice
        </Badge>
      )}
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => 
                renderSuggestionItem(
                  suggestion.text, 
                  suggestion.icon, 
                  suggestion.type, 
                  index, 
                  index === selectedIndex
                )
              )}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b flex items-center justify-between">
                <span>Recent Searches</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-xs h-auto p-1"
                >
                  Clear
                </Button>
              </div>
              {recentSearches.map((search, index) => (
                <div
                  key={`recent-${index}`}
                  className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 group ${
                    suggestions.length + index === selectedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleRecentSearchClick(search)}
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="flex-1 text-sm">{search}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(search);
                    }}
                    className="opacity-0 group-hover:opacity-100 h-auto p-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {trendingSearches.length > 0 && !value && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                Trending Searches
              </div>
              {trendingSearches.map((search, index) => (
                <div
                  key={`trending-${index}`}
                  className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-gray-50 ${
                    suggestions.length + recentSearches.length + index === selectedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleSuggestionClick(search)}
                >
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  <span className="flex-1 text-sm">{search}</span>
                  <Badge variant="secondary" className="text-xs">
                    Trending
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {suggestions.length === 0 && recentSearches.length === 0 && value && (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No suggestions found</p>
              <p className="text-xs text-gray-400 mt-1">
                Press Enter to search for "{value}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;

