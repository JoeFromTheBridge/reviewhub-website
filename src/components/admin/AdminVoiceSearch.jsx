import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  TrendingUp, 
  BarChart3, 
  Users, 
  MessageSquare,
  Calendar,
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import apiService from '../../services/api';

const AdminVoiceSearch = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const periods = [
    { value: 7, label: '7 Days' },
    { value: 30, label: '30 Days' },
    { value: 90, label: '90 Days' },
    { value: 365, label: '1 Year' }
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiService.getVoiceSearchAnalytics(selectedPeriod);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading voice search analytics:', error);
      setError('Failed to load voice search analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    const data = {
      period: `${selectedPeriod} days`,
      generated_at: new Date().toISOString(),
      summary: {
        total_queries: analytics.total_queries,
        average_confidence: analytics.average_confidence
      },
      intent_statistics: analytics.intent_statistics,
      daily_statistics: analytics.daily_statistics,
      top_queries: analytics.top_queries
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-search-analytics-${selectedPeriod}days-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading voice search analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No voice search data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Voice Search Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportAnalytics} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_queries}</div>
            <p className="text-xs text-muted-foreground">
              Voice searches in {selectedPeriod} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.average_confidence}%</div>
            <p className="text-xs text-muted-foreground">
              Speech recognition accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.total_queries / selectedPeriod)}
            </div>
            <p className="text-xs text-muted-foreground">
              Queries per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Intent</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.intent_statistics[0]?.intent?.replace('_', ' ') || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Most common search type
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Queries Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Voice Search Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.daily_statistics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [value, name === 'query_count' ? 'Queries' : 'Confidence']}
                />
                <Line 
                  type="monotone" 
                  dataKey="query_count" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Queries"
                />
                <Line 
                  type="monotone" 
                  dataKey="avg_confidence" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Avg Confidence"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Intent Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Search Intent Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.intent_statistics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ intent, percentage }) => `${intent.replace('_', ' ')}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.intent_statistics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [value, props.payload.intent.replace('_', ' ')]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Intent Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Search Intent Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.intent_statistics.map((intent, index) => (
              <div key={intent.intent} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <div className="font-medium capitalize">
                      {intent.intent.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {intent.count} queries
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">
                  {intent.percentage.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Most Popular Voice Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.top_queries.map((query, index) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span className="font-medium">{query.query}</span>
                </div>
                <Badge variant="secondary">
                  {query.frequency} times
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Search Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Performance Metrics</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Average confidence above 80% indicates good speech recognition</li>
                <li>• Product search is typically the most common intent</li>
                <li>• Daily query patterns can help optimize server resources</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Optimization Tips</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Monitor low-confidence queries for improvement opportunities</li>
                <li>• Popular queries can inform product catalog expansion</li>
                <li>• Intent distribution helps prioritize feature development</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVoiceSearch;

