import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { 
  Shield, 
  Eye, 
  Database, 
  Mail, 
  Users, 
  Trash2, 
  FileText, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import apiService from '../../services/api';

const GDPRCompliance = () => {
  const [consents, setConsents] = useState({});
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [privacyReport, setPrivacyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [showDeletionForm, setShowDeletionForm] = useState(false);

  const consentTypes = [
    {
      type: 'essential',
      title: 'Essential Functionality',
      description: 'Required for basic website functionality, account management, and security.',
      icon: <Shield className="h-5 w-5" />,
      required: true
    },
    {
      type: 'analytics',
      title: 'Analytics & Performance',
      description: 'Help us understand how you use our platform to improve performance and user experience.',
      icon: <Database className="h-5 w-5" />,
      required: false
    },
    {
      type: 'marketing',
      title: 'Marketing Communications',
      description: 'Receive promotional emails, product updates, and personalized recommendations.',
      icon: <Mail className="h-5 w-5" />,
      required: false
    },
    {
      type: 'personalization',
      title: 'Personalization',
      description: 'Customize your experience with personalized content and product recommendations.',
      icon: <Eye className="h-5 w-5" />,
      required: false
    },
    {
      type: 'third_party',
      title: 'Third-Party Sharing',
      description: 'Share anonymized data with trusted partners for research and improvement purposes.',
      icon: <Users className="h-5 w-5" />,
      required: false
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load consents
      const consentsResponse = await apiService.getUserConsents();
      const consentsMap = {};
      consentsResponse.consents?.forEach(consent => {
        consentsMap[consent.consent_type] = consent.granted;
      });
      setConsents(consentsMap);

      // Load deletion requests
      const deletionResponse = await apiService.getDeletionRequests();
      setDeletionRequests(deletionResponse.deletion_requests || []);

      // Load privacy report
      const reportResponse = await apiService.getPrivacyReport();
      setPrivacyReport(reportResponse.privacy_report);

    } catch (err) {
      setError('Failed to load privacy data');
      console.error('Error loading privacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = async (consentType, granted) => {
    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      await apiService.recordConsent(consentType, granted);
      
      setConsents(prev => ({
        ...prev,
        [consentType]: granted
      }));

      setSuccess(`Consent ${granted ? 'granted' : 'withdrawn'} successfully`);
    } catch (err) {
      setError(err.message || 'Failed to update consent');
      console.error('Error updating consent:', err);
    } finally {
      setUpdating(false);
    }
  };

  const requestDataDeletion = async () => {
    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      const response = await apiService.requestDataDeletion(deletionReason);
      
      if (response.success) {
        setSuccess('Data deletion request submitted successfully. We will review your request within 30 days.');
        setShowDeletionForm(false);
        setDeletionReason('');
        loadData(); // Refresh deletion requests
      } else {
        setError(response.error || 'Failed to submit deletion request');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit deletion request');
      console.error('Error requesting deletion:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GDPR Compliance</CardTitle>
          <CardDescription>Manage your privacy and data protection settings</CardDescription>
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
      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Consent Management
          </CardTitle>
          <CardDescription>
            Control how we process your personal data. You can withdraw consent at any time.
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

          <div className="space-y-4">
            {consentTypes.map((consentType) => (
              <div
                key={consentType.type}
                className="border rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">{consentType.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{consentType.title}</h3>
                      {consentType.required && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{consentType.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={consents[consentType.type] || consentType.required}
                    onCheckedChange={(checked) => updateConsent(consentType.type, checked)}
                    disabled={consentType.required || updating}
                  />
                  <span className="text-sm text-gray-500">
                    {consents[consentType.type] || consentType.required ? 'Granted' : 'Withdrawn'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Legal Basis:</strong> We process your data based on your consent, legitimate interests, 
              and legal obligations. Essential functionality is required for contract performance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Report */}
      {privacyReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Privacy Report
            </CardTitle>
            <CardDescription>
              Overview of your data and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{privacyReport.total_reviews || 0}</div>
                <div className="text-sm text-gray-600">Reviews Written</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{privacyReport.total_interactions || 0}</div>
                <div className="text-sm text-gray-600">Product Interactions</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{privacyReport.total_consents || 0}</div>
                <div className="text-sm text-gray-600">Active Consents</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{privacyReport.data_retention_days || 0}</div>
                <div className="text-sm text-gray-600">Days Data Retained</div>
              </div>
            </div>

            {privacyReport.last_activity && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">
                  <strong>Last Activity:</strong> {formatDate(privacyReport.last_activity)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Deletion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Right to be Forgotten
          </CardTitle>
          <CardDescription>
            Request deletion of your personal data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeletionForm ? (
            <div>
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">Important Notice</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Requesting data deletion will permanently remove your account and all associated data. 
                      This includes your reviews, profile, and interaction history. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowDeletionForm(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Request Data Deletion
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for deletion (optional)
                </label>
                <Textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Please let us know why you're requesting data deletion..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={requestDataDeletion}
                  disabled={updating}
                  variant="destructive"
                >
                  {updating ? 'Submitting...' : 'Submit Deletion Request'}
                </Button>
                <Button
                  onClick={() => {
                    setShowDeletionForm(false);
                    setDeletionReason('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Deletion Request History */}
          {deletionRequests.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Deletion Request History</h4>
              <div className="space-y-2">
                {deletionRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <span className="font-medium">Request #{request.id}</span>
                        <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Requested: {formatDate(request.requested_at)}
                        {request.processed_at && (
                          <span> • Processed: {formatDate(request.processed_at)}</span>
                        )}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-500 mt-1">Reason: {request.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Rights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Privacy Rights</CardTitle>
          <CardDescription>
            Under GDPR, you have the following rights regarding your personal data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Right to Access</h4>
                <p className="text-sm text-gray-600">Request a copy of your personal data</p>
              </div>
              
              <div>
                <h4 className="font-medium">Right to Rectification</h4>
                <p className="text-sm text-gray-600">Correct inaccurate or incomplete data</p>
              </div>
              
              <div>
                <h4 className="font-medium">Right to Erasure</h4>
                <p className="text-sm text-gray-600">Request deletion of your personal data</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Right to Portability</h4>
                <p className="text-sm text-gray-600">Export your data in a machine-readable format</p>
              </div>
              
              <div>
                <h4 className="font-medium">Right to Object</h4>
                <p className="text-sm text-gray-600">Object to processing based on legitimate interests</p>
              </div>
              
              <div>
                <h4 className="font-medium">Right to Restrict Processing</h4>
                <p className="text-sm text-gray-600">Limit how we process your data</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              To exercise any of these rights or if you have questions about our data processing, 
              please contact our Data Protection Officer at privacy@reviewhub.com
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GDPRCompliance;

