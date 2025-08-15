import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  Zap, 
  Database, 
  Server, 
  Clock, 
  Activity, 
  RefreshCw, 
  Trash2, 
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { api } from '../../services/api';

const AdminPerformance = () => {
  const [performanceData, setPerformanceData] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const [performance, cache] = await Promise.all([
        api.getPerformanceMetrics(),
        api.getCacheStats()
      ]);
      
      setPerformanceData(performance);
      setCacheStats(cache);
    } catch (err) {
      setError('Failed to load performance data');
      console.error('Error fetching performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async (pattern = '*') => {
    try {
      setActionLoading(prev => ({ ...prev, clearCache: true }));
      await api.clearCache(pattern);
      await fetchPerformanceData(); // Refresh data
      alert('Cache cleared successfully');
    } catch (err) {
      console.error('Error clearing cache:', err);
      alert('Failed to clear cache');
    } finally {
      setActionLoading(prev => ({ ...prev, clearCache: false }));
    }
  };

  const handleWarmCache = async () => {
    try {
      setActionLoading(prev => ({ ...prev, warmCache: true }));
      await api.warmCache();
      await fetchPerformanceData(); // Refresh data
      alert('Cache warmed successfully');
    } catch (err) {
      console.error('Error warming cache:', err);
      alert('Failed to warm cache');
    } finally {
      setActionLoading(prev => ({ ...prev, warmCache: false }));
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      setActionLoading(prev => ({ ...prev, optimizeDb: true }));
      await api.optimizeDatabase();
      alert('Database optimization completed');
    } catch (err) {
      console.error('Error optimizing database:', err);
      alert('Failed to optimize database');
    } finally {
      setActionLoading(prev => ({ ...prev, optimizeDb: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchPerformanceData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const database = performanceData?.database || {};
  const cache = performanceData?.cache || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Monitor</h1>
          <p className="text-gray-600">Monitor and optimize platform performance</p>
        </div>
        <Button onClick={fetchPerformanceData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Database Records</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(database.total_users || 0) + (database.total_products || 0) + (database.total_reviews || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {database.total_users || 0} users, {database.total_products || 0} products, {database.total_reviews || 0} reviews
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cache Status</p>
                <div className="flex items-center space-x-2">
                  {cache.cache_enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <p className="text-lg font-bold text-gray-900">
                    {cache.cache_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                {cache.cache_enabled && (
                  <p className="text-xs text-gray-500">
                    Hit rate: {cache.hit_rate || 0}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Records</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(database.active_users || 0) + (database.active_products || 0) + (database.active_reviews || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  Active content only
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cache.used_memory || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  {cache.connected_clients || 0} connections
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cache Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              Cache Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cache.cache_enabled ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Hit Rate:</span>
                      <span className="ml-2 font-medium">{cache.hit_rate || 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Memory:</span>
                      <span className="ml-2 font-medium">{cache.used_memory || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Hits:</span>
                      <span className="ml-2 font-medium">{cache.keyspace_hits || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Misses:</span>
                      <span className="ml-2 font-medium">{cache.keyspace_misses || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleWarmCache}
                      disabled={actionLoading.warmCache}
                      className="flex-1"
                    >
                      {actionLoading.warmCache ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Warm Cache
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClearCache()}
                      disabled={actionLoading.clearCache}
                      className="flex-1"
                    >
                      {actionLoading.clearCache ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Clear All
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Cache is not enabled</p>
                  <p className="text-sm text-gray-500">Enable Redis to improve performance</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Database Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Users:</span>
                  <span className="ml-2 font-medium">{database.total_users || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Active Users:</span>
                  <span className="ml-2 font-medium">{database.active_users || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Products:</span>
                  <span className="ml-2 font-medium">{database.total_products || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Active Products:</span>
                  <span className="ml-2 font-medium">{database.active_products || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Reviews:</span>
                  <span className="ml-2 font-medium">{database.total_reviews || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Active Reviews:</span>
                  <span className="ml-2 font-medium">{database.active_reviews || 0}</span>
                </div>
              </div>
              
              <Button
                onClick={handleOptimizeDatabase}
                disabled={actionLoading.optimizeDb}
                className="w-full"
              >
                {actionLoading.optimizeDb ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                Optimize Database
              </Button>
              
              <p className="text-xs text-gray-500">
                Creates indexes for frequently queried fields to improve performance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!cache.cache_enabled && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Enable Redis Caching</h4>
                  <p className="text-sm text-yellow-700">
                    Set up Redis to significantly improve API response times and reduce database load.
                  </p>
                </div>
              </div>
            )}
            
            {cache.cache_enabled && cache.hit_rate < 50 && (
              <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">Low Cache Hit Rate</h4>
                  <p className="text-sm text-orange-700">
                    Consider warming the cache or adjusting TTL values to improve hit rate.
                  </p>
                </div>
              </div>
            )}
            
            {(database.total_products || 0) > 1000 && (
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Large Dataset Detected</h4>
                  <p className="text-sm text-blue-700">
                    Consider implementing pagination and lazy loading for better user experience.
                  </p>
                </div>
              </div>
            )}
            
            {cache.cache_enabled && cache.hit_rate >= 80 && (
              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Excellent Performance</h4>
                  <p className="text-sm text-green-700">
                    Your cache hit rate is excellent! The system is performing optimally.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPerformance;

