import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const LazyLoading = ({ 
  loadMore, 
  hasMore, 
  loading, 
  children, 
  threshold = 100,
  className = "",
  loadingComponent = null 
}) => {
  const [items, setItems] = useState([]);
  const observerRef = useRef();
  const loadingRef = useRef();

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: `${threshold}px`,
      }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loading, threshold]);

  const defaultLoadingComponent = (
    <div className="flex justify-center items-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="ml-2 text-gray-600">Loading more...</span>
    </div>
  );

  return (
    <div className={className}>
      {children}
      
      {/* Loading indicator */}
      {hasMore && (
        <div ref={loadingRef} className="w-full">
          {loading ? (
            loadingComponent || defaultLoadingComponent
          ) : (
            <div className="h-4" /> // Invisible trigger area
          )}
        </div>
      )}
      
      {/* End of list indicator */}
      {!hasMore && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>You've reached the end!</p>
        </div>
      )}
    </div>
  );
};

// Hook for managing paginated data with lazy loading
export const useLazyLoading = (fetchFunction, initialPage = 1, initialPerPage = 20) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchFunction(page, initialPerPage);
      
      if (response.items || response.products || response.reviews) {
        const newItems = response.items || response.products || response.reviews || [];
        
        setData(prevData => {
          // Avoid duplicates by checking IDs
          const existingIds = new Set(prevData.map(item => item.id));
          const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
          return [...prevData, ...uniqueNewItems];
        });
        
        setTotalCount(response.total || 0);
        setHasMore(newItems.length === initialPerPage && (response.total ? data.length + newItems.length < response.total : true));
        setPage(prevPage => prevPage + 1);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load more items');
      console.error('Lazy loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, initialPerPage, loading, hasMore, data.length]);

  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
  }, [initialPage]);

  const refresh = useCallback(async () => {
    reset();
    // Wait for state to update, then load first page
    setTimeout(() => {
      loadMore();
    }, 0);
  }, [reset, loadMore]);

  // Load initial data
  useEffect(() => {
    if (data.length === 0 && !loading) {
      loadMore();
    }
  }, []);

  return {
    data,
    loading,
    hasMore,
    error,
    totalCount,
    loadMore,
    reset,
    refresh
  };
};

// Virtualized list component for better performance with large datasets
export const VirtualizedList = ({ 
  items, 
  renderItem, 
  itemHeight = 100, 
  containerHeight = 400,
  overscan = 5,
  className = ""
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef();

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={item.id || startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LazyLoading;

