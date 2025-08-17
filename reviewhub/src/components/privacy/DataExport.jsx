import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Download, FileText, Database, FileSpreadsheet, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import apiService from '../../services/api';

const DataExport = () => {
  const [exportRequests, setExportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadExportRequests();
  }, []);

  const loadExportRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getExportRequests();
      setExportRequests(response.export_requests || []);
    } catch (err) {
      setError('Failed to load export requests');
      console.error('Error loading export requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const requestExport = async (format) => {
    try {
      setRequesting(true);
      setError('');
      setSuccess('');

      const response = await apiService.requestDataExport(format);
      
      if (response.success) {
        setSuccess(`Data export request created successfully. You will be notified when it's ready for download.`);
        loadExportRequests(); // Refresh the list
      } else {
        setError(response.error || 'Failed to create export request');
      }
    } catch (err) {
      setError(err.message || 'Failed to create export request');
      console.error('Error requesting export:', err);
    } finally {
      setRequesting(false);
    }
  };

  const downloadExport = async (requestId, filename) => {
    try {
      const response = await apiService.downloadExport(requestId);
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Refresh the list to update download count
      loadExportRequests();
    } catch (err) {
      setError(err.message || 'Failed to download export');
      console.error('Error downloading export:', err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      processing: 'secondary',
      failed: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'secondary'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'json':
        return <Database className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>Export your personal data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Request New Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Request Data Export
          </CardTitle>
          <CardDescription>
            Download all your personal data in your preferred format. This includes your profile, reviews, interactions, and privacy settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">JSON Format</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Machine-readable format with complete data structure. Best for developers and data analysis.
              </p>
              <Button
                onClick={() => requestExport('json')}
                disabled={requesting}
                className="w-full"
                variant="outline"
              >
                {requesting ? 'Requesting...' : 'Request JSON Export'}
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">CSV Format</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Spreadsheet-compatible format with multiple CSV files in a ZIP archive. Great for Excel analysis.
              </p>
              <Button
                onClick={() => requestExport('csv')}
                disabled={requesting}
                className="w-full"
                variant="outline"
              >
                {requesting ? 'Requesting...' : 'Request CSV Export'}
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-red-600" />
                <h3 className="font-medium">PDF Format</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Human-readable document format with formatted tables and summaries. Easy to read and print.
              </p>
              <Button
                onClick={() => requestExport('pdf')}
                disabled={requesting}
                className="w-full"
                variant="outline"
              >
                {requesting ? 'Requesting...' : 'Request PDF Export'}
              </Button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Export files are available for 30 days after generation. 
              Processing typically takes a few minutes depending on the amount of data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            View and download your previous data export requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exportRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No export requests found</p>
              <p className="text-sm text-gray-400">Request your first data export above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exportRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getFormatIcon(request.export_format)}
                      <span className="font-medium">
                        {request.export_format.toUpperCase()} Export
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>Requested: {formatDate(request.requested_at)}</p>
                      {request.completed_at && (
                        <p>Completed: {formatDate(request.completed_at)}</p>
                      )}
                      {request.download_count > 0 && (
                        <p>Downloaded: {request.download_count} times</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(request.status)}
                    
                    {request.status === 'completed' && request.file_available && !isExpired(request.expires_at) && (
                      <Button
                        onClick={() => downloadExport(request.id, `export_${request.id}.${request.export_format}`)}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                    
                    {request.status === 'completed' && isExpired(request.expires_at) && (
                      <Badge variant="secondary">Expired</Badge>
                    )}
                    
                    {request.status === 'processing' && (
                      <div className="flex items-center gap-2">
                        <Progress value={50} className="w-20" />
                        <span className="text-sm text-gray-500">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>What's Included in Your Export?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Personal Information</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Profile details and settings</li>
                <li>• Account creation and login history</li>
                <li>• Contact information</li>
                <li>• Privacy preferences</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Activity Data</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All reviews and ratings</li>
                <li>• Product interactions and views</li>
                <li>• Search history</li>
                <li>• Uploaded images and content</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Consent Records</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Data processing consents</li>
                <li>• Marketing preferences</li>
                <li>• Cookie and tracking settings</li>
                <li>• Communication preferences</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Administrative Data</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Previous export requests</li>
                <li>• Data deletion requests</li>
                <li>• Support interactions</li>
                <li>• Account status changes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExport;

