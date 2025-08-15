import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  X, 
  Trash2, 
  Star, 
  TrendingUp, 
  Calendar,
  Filter,
  Download,
  BarChart3
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';

const SearchHistory = ({ onSearchSelect, className = '' }) => {
  const [searchHistory, setSearchHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'recent', 'frequent', 'saved'
  const [searchStats, setSearchStats] = useState({});
  const [selectedSearches, setSelectedSearches] = useState(new Set());

  useEffect(() => {
    loadSearchHistory();
  }, []);

  useEffect(() => {
    filterSearchHistory();
  }, [searchHistory, filterType]);

  const loadSearchHistory = () => {
    try {
      // Load search history from localStorage
      const history = JSON.parse(localStorage.getItem('reviewhub_search_history') || '[]');
      const saved = JSON.parse(localStorage.getItem('reviewhub_saved_searches') || '[]');
      
      // Merge and enhance search data
      const enhancedHistory = history.map(item => ({
        ...item,
        isSaved: saved.includes(item.query),
        frequency: history.filter(h => h.query === item.query).length
      }));

      // Sort by timestamp (most recent first)
      enhancedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setSearchHistory(enhancedHistory);
      calculateSearchStats(enhancedHistory);
    } catch (error) {
      console.error('Error loading search history:', error);
      setSearchHistory([]);
    }
  };

  const calculateSearchStats = (history) => {
    const stats = {
      totalSearches: history.length,
      uniqueSearches: new Set(history.map(h => h.query)).size,
      averagePerDay: 0,
      topCategories: {},
      searchTrends: {}
    };

    // Calculate searches per day
    if (history.length > 0) {
      const oldestSearch = new Date(history[history.length - 1].timestamp);
      const daysDiff = Math.max(1, Math.ceil((Date.now() - oldestSearch.getTime()) / (1000 * 60 * 60 * 24)));
      stats.averagePerDay = (history.length / daysDiff).toFixed(1);
    }

    // Calculate top categories and trends
    history.forEach(search => {
      // Category analysis (simplified)
      const category = search.filters?.category || 'general';
      stats.topCategories[category] = (stats.topCategories[category] || 0) + 1;

      // Daily trends
      const date = new Date(search.timestamp).toDateString();
      stats.searchTrends[date] = (stats.searchTrends[date] || 0) + 1;
    });

    setSearchStats(stats);
  };

  const filterSearchHistory = () => {
    let filtered = [...searchHistory];

    switch (filterType) {
      case 'recent':
        // Last 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(item => new Date(item.timestamp) > weekAgo);
        break;
      case 'frequent':
        // Searches with frequency > 1, sorted by frequency
        filtered = filtered
          .filter(item => item.frequency > 1)
          .sort((a, b) => b.frequency - a.frequency);
        break;
      case 'saved':
        filtered = filtered.filter(item => item.isSaved);
        break;
      default:
        // All searches, already sorted by timestamp
        break;
    }

    // Remove duplicates for display (keep most recent)
    const uniqueFiltered = [];
    const seen = new Set();
    
    filtered.forEach(item => {
      if (!seen.has(item.query)) {
        seen.add(item.query);
        uniqueFiltered.push(item);
      }
    });

    setFilteredHistory(uniqueFiltered);
  };

  const saveSearchHistory = (history) => {
    try {
      localStorage.setItem('reviewhub_search_history', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const addToHistory = (query, filters = {}, results = 0) => {
    const newSearch = {
      id: Date.now(),
      query,
      filters,
      results,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [newSearch, ...searchHistory];
    setSearchHistory(updatedHistory);
    saveSearchHistory(updatedHistory);
  };

  const removeFromHistory = (searchId) => {
    const updatedHistory = searchHistory.filter(item => item.id !== searchId);
    setSearchHistory(updatedHistory);
    saveSearchHistory(updatedHistory);
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('reviewhub_search_history');
    setSearchStats({});
  };

  const toggleSaveSearch = (query) => {
    try {
      const saved = JSON.parse(localStorage.getItem('reviewhub_saved_searches') || '[]');
      let updatedSaved;
      
      if (saved.includes(query)) {
        updatedSaved = saved.filter(s => s !== query);
      } else {
        updatedSaved = [...saved, query];
      }
      
      localStorage.setItem('reviewhub_saved_searches', JSON.stringify(updatedSaved));
      
      // Update search history to reflect saved status
      const updatedHistory = searchHistory.map(item => ({
        ...item,
        isSaved: updatedSaved.includes(item.query)
      }));
      
      setSearchHistory(updatedHistory);
    } catch (error) {
      console.error('Error toggling saved search:', error);
    }
  };

  const handleSearchSelect = (search) => {
    if (onSearchSelect) {
      onSearchSelect(search.query, search.filters);
    }
  };

  const exportSearchHistory = () => {
    const data = {
      exported_at: new Date().toISOString(),
      total_searches: searchHistory.length,
      search_history: searchHistory,
      search_stats: searchStats
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviewhub-search-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getFilterLabel = (type) => {
    switch (type) {
      case 'recent': return 'Recent (7 days)';
      case 'frequent': return 'Frequent';
      case 'saved': return 'Saved';
      default: return 'All';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Search History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportSearchHistory}
              disabled={searchHistory.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllHistory}
              disabled={searchHistory.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Stats */}
        {searchStats.totalSearches > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{searchStats.totalSearches}</div>
              <div className="text-xs text-gray-600">Total Searches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{searchStats.uniqueSearches}</div>
              <div className="text-xs text-gray-600">Unique Queries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{searchStats.averagePerDay}</div>
              <div className="text-xs text-gray-600">Per Day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(searchStats.topCategories).length}
              </div>
              <div className="text-xs text-gray-600">Categories</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200">
          {['all', 'recent', 'frequent', 'saved'].map(type => (
            <button
              key={type}
              className={`py-2 px-4 text-sm font-medium border-b-2 ${
                filterType === type
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setFilterType(type)}
            >
              {getFilterLabel(type)}
            </button>
          ))}
        </div>

        {/* Search History List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <Alert>
              <Search className="h-4 w-4" />
              <AlertDescription>
                {filterType === 'all' 
                  ? 'No search history found. Start searching to see your history here.'
                  : `No ${filterType} searches found.`
                }
              </AlertDescription>
            </Alert>
          ) : (
            filteredHistory.map((search) => (
              <div
                key={search.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => handleSearchSelect(search)}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                    >
                      {search.query}
                    </button>
                    {search.isSaved && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    {search.frequency > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {search.frequency}x
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatTimestamp(search.timestamp)}
                    </span>
                    {search.results !== undefined && (
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {search.results} results
                      </span>
                    )}
                    {Object.keys(search.filters || {}).length > 0 && (
                      <span className="flex items-center gap-1">
                        <Filter className="h-3 w-3" />
                        {Object.keys(search.filters).length} filters
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSaveSearch(search.query)}
                    className="h-8 w-8 p-0"
                  >
                    <Star className={`h-4 w-4 ${search.isSaved ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromHistory(search.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchHistory;

