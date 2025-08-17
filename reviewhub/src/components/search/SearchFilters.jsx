import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  DollarSign, 
  Calendar,
  Package,
  Users,
  Image,
  CheckCircle,
  RotateCcw,
  Save,
  Bookmark
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const SearchFilters = ({ 
  filters, 
  onFiltersChange, 
  onApplyFilters,
  onResetFilters,
  className = '',
  availableFilters = {}
}) => {
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    rating: true,
    category: true,
    brand: false,
    features: false,
    date: false
  });
  const [savedFilterSets, setSavedFilterSets] = useState([]);
  const [filterSetName, setFilterSetName] = useState('');

  useEffect(() => {
    setLocalFilters(filters || {});
  }, [filters]);

  useEffect(() => {
    // Load saved filter sets
    const saved = JSON.parse(localStorage.getItem('reviewhub_saved_filters') || '[]');
    setSavedFilterSets(saved);
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleApplyFilters = () => {
    onApplyFilters(localFilters);
  };

  const handleResetFilters = () => {
    setLocalFilters({});
    onResetFilters();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const saveFilterSet = () => {
    if (!filterSetName.trim()) return;

    const newFilterSet = {
      id: Date.now(),
      name: filterSetName,
      filters: localFilters,
      created: new Date().toISOString()
    };

    const updated = [...savedFilterSets, newFilterSet];
    setSavedFilterSets(updated);
    localStorage.setItem('reviewhub_saved_filters', JSON.stringify(updated));
    setFilterSetName('');
  };

  const loadFilterSet = (filterSet) => {
    setLocalFilters(filterSet.filters);
    onFiltersChange(filterSet.filters);
  };

  const deleteFilterSet = (id) => {
    const updated = savedFilterSets.filter(set => set.id !== id);
    setSavedFilterSets(updated);
    localStorage.setItem('reviewhub_saved_filters', JSON.stringify(updated));
  };

  const getActiveFiltersCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== null && value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length;
  };

  const renderPriceFilter = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Price Range</label>
        <span className="text-xs text-gray-500">
          ${localFilters.minPrice || 0} - ${localFilters.maxPrice || 1000}
        </span>
      </div>
      <div className="px-2">
        <Slider
          value={[localFilters.minPrice || 0, localFilters.maxPrice || 1000]}
          onValueChange={([min, max]) => {
            handleFilterChange('minPrice', min);
            handleFilterChange('maxPrice', max);
          }}
          max={1000}
          step={10}
          className="w-full"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Min"
          value={localFilters.minPrice || ''}
          onChange={(e) => handleFilterChange('minPrice', Number(e.target.value))}
          className="flex-1 px-2 py-1 text-xs border rounded"
        />
        <input
          type="number"
          placeholder="Max"
          value={localFilters.maxPrice || ''}
          onChange={(e) => handleFilterChange('maxPrice', Number(e.target.value))}
          className="flex-1 px-2 py-1 text-xs border rounded"
        />
      </div>
    </div>
  );

  const renderRatingFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium">Minimum Rating</label>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map(rating => (
          <label key={rating} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="rating"
              checked={localFilters.minRating === rating}
              onChange={() => handleFilterChange('minRating', rating)}
              className="text-blue-600"
            />
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="text-xs text-gray-600">& up</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const renderCategoryFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium">Categories</label>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {(availableFilters.categories || []).map(category => (
          <label key={category} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={(localFilters.categories || []).includes(category)}
              onCheckedChange={(checked) => {
                const current = localFilters.categories || [];
                const updated = checked
                  ? [...current, category]
                  : current.filter(c => c !== category);
                handleFilterChange('categories', updated);
              }}
            />
            <span className="text-sm capitalize">{category}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderBrandFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium">Brands</label>
      <Select
        value={localFilters.brand || ''}
        onValueChange={(value) => handleFilterChange('brand', value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Brands</SelectItem>
          {(availableFilters.brands || []).map(brand => (
            <SelectItem key={brand} value={brand}>
              {brand}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderFeaturesFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium">Features</label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={localFilters.hasImages || false}
            onCheckedChange={(checked) => handleFilterChange('hasImages', checked)}
          />
          <Image className="h-4 w-4" />
          <span className="text-sm">Has Images</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={localFilters.verifiedPurchase || false}
            onCheckedChange={(checked) => handleFilterChange('verifiedPurchase', checked)}
          />
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Verified Purchase</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={localFilters.hasReviews || false}
            onCheckedChange={(checked) => handleFilterChange('hasReviews', checked)}
          />
          <Users className="h-4 w-4" />
          <span className="text-sm">Has Reviews</span>
        </label>
      </div>
    </div>
  );

  const renderDateFilter = () => (
    <div className="space-y-2">
      <label className="text-sm font-medium">Date Range</label>
      <Select
        value={localFilters.dateRange || ''}
        onValueChange={(value) => handleFilterChange('dateRange', value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Any time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Any time</SelectItem>
          <SelectItem value="1d">Last 24 hours</SelectItem>
          <SelectItem value="1w">Last week</SelectItem>
          <SelectItem value="1m">Last month</SelectItem>
          <SelectItem value="3m">Last 3 months</SelectItem>
          <SelectItem value="1y">Last year</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderFilterSection = (key, title, icon, content) => (
    <div key={key} className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => toggleSection(key)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {expandedSections[key] ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {expandedSections[key] && (
        <div className="px-3 pb-3">
          {content}
        </div>
      )}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            disabled={getActiveFiltersCount() === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Active Filters */}
        {getActiveFiltersCount() > 0 && (
          <div className="p-3 bg-blue-50 border-b">
            <div className="flex flex-wrap gap-1">
              {Object.entries(localFilters).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                
                const displayValue = Array.isArray(value) ? value.join(', ') : value;
                return (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {displayValue}
                    <button
                      onClick={() => handleFilterChange(key, Array.isArray(value) ? [] : '')}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Sections */}
        <div>
          {renderFilterSection('price', 'Price', <DollarSign className="h-4 w-4" />, renderPriceFilter())}
          {renderFilterSection('rating', 'Rating', <Star className="h-4 w-4" />, renderRatingFilter())}
          {renderFilterSection('category', 'Category', <Package className="h-4 w-4" />, renderCategoryFilter())}
          {renderFilterSection('brand', 'Brand', <Package className="h-4 w-4" />, renderBrandFilter())}
          {renderFilterSection('features', 'Features', <CheckCircle className="h-4 w-4" />, renderFeaturesFilter())}
          {renderFilterSection('date', 'Date', <Calendar className="h-4 w-4" />, renderDateFilter())}
        </div>

        {/* Saved Filter Sets */}
        {savedFilterSets.length > 0 && (
          <div className="p-3 border-t">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Saved Filters
            </div>
            <div className="space-y-1">
              {savedFilterSets.map(filterSet => (
                <div key={filterSet.id} className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadFilterSet(filterSet)}
                    className="flex-1 justify-start text-xs h-8"
                  >
                    {filterSet.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFilterSet(filterSet.id)}
                    className="h-8 w-8 p-0 text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Current Filters */}
        {getActiveFiltersCount() > 0 && (
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Filter set name"
                value={filterSetName}
                onChange={(e) => setFilterSetName(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border rounded"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={saveFilterSet}
                disabled={!filterSetName.trim()}
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Apply Filters Button */}
        <div className="p-3 border-t">
          <Button
            onClick={handleApplyFilters}
            className="w-full"
            disabled={getActiveFiltersCount() === 0}
          >
            Apply Filters ({getActiveFiltersCount()})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchFilters;

