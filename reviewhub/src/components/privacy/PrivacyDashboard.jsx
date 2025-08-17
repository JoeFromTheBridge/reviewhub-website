import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Users, 
  Mail, 
  Bell, 
  Database, 
  Settings, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import apiService from '../../services/api';

const PrivacyDashboard = () => {
  const [privacySettings, setPrivacySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPrivacySettings();
      setPrivacySettings(response.privacy_settings || {});
    } catch (err) {
      setError('Failed to load privacy settings');
      console.error('Error loading privacy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field, value) => {
    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      const updatedSettings = { ...privacySettings, [field]: value };
      await apiService.updatePrivacySettings({ [field]: value });
      
      setPrivacySettings(updatedSettings);
      setSuccess('Privacy setting updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update privacy setting');
      console.error('Error updating privacy setting:', err);
    } finally {
      setUpdating(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setUpdating(true);
      setError('');
      setSuccess('');

      await apiService.resetPrivacySettings();
      await loadPrivacySettings(); // Reload settings
      
      setSuccess('Privacy settings reset to defaults');
    } catch (err) {
      setError(err.message || 'Failed to reset privacy settings');
      console.error('Error resetting privacy settings:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getPrivacyScore = () => {
    const settings = privacySettings;
    let score = 0;
    let total = 0;

    // Profile privacy (weight: 3)
    if (settings.profile_public === false) score += 3;
    total += 3;

    // Real name privacy (weight: 2)
    if (settings.show_real_name === false) score += 2;
    total += 2;

    // Location privacy (weight: 2)
    if (settings.show_location === false) score += 2;
    total += 2;

    // Review privacy (weight: 2)
    if (settings.reviews_public === false) score += 2;
    total += 2;

    // Marketing emails (weight: 1)
    if (settings.marketing_emails === false) score += 1;
    total += 1;

    // Third party sharing (weight: 3)
    if (settings.third_party_sharing === false) score += 3;
    total += 3;

    return Math.round((score / total) * 100);
  };

  const getPrivacyScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPrivacyScoreLabel = (score) => {
    if (score >= 80) return 'High Privacy';
    if (score >= 60) return 'Medium Privacy';
    return 'Low Privacy';
  };

  const tabs = [
    { id: 'profile', label: 'Profile Privacy', icon: <Eye className="h-4 w-4" /> },
    { id: 'reviews', label: 'Review Privacy', icon: <Users className="h-4 w-4" /> },
    { id: 'communication', label: 'Communications', icon: <Mail className="h-4 w-4" /> },
    { id: 'data', label: 'Data Sharing', icon: <Database className="h-4 w-4" /> }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Privacy Dashboard</CardTitle>
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

  const privacyScore = getPrivacyScore();

  return (
    <div className="space-y-6">
      {/* Privacy Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Score
          </CardTitle>
          <CardDescription>
            Your current privacy protection level based on your settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getPrivacyScoreColor(privacyScore)}`}>
                  {privacyScore}%
                </div>
                <div className="text-sm text-gray-600">{getPrivacyScoreLabel(privacyScore)}</div>
              </div>
              
              <div className="flex-1 max-w-md">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      privacyScore >= 80 ? 'bg-green-600' : 
                      privacyScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${privacyScore}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Higher scores indicate better privacy protection
                </p>
              </div>
            </div>

            <Button
              onClick={resetToDefaults}
              disabled={updating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        </div>
      )}

      {/* Privacy Settings Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>
            Configure your privacy preferences across different areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Privacy Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Public Profile</h3>
                    <p className="text-sm text-gray-600">
                      Allow other users to view your profile information
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.profile_public || false}
                  onCheckedChange={(checked) => updateSetting('profile_public', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Show Real Name</h3>
                    <p className="text-sm text-gray-600">
                      Display your first and last name on your profile
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.show_real_name || false}
                  onCheckedChange={(checked) => updateSetting('show_real_name', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Show Location</h3>
                    <p className="text-sm text-gray-600">
                      Display your location on your profile
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.show_location || false}
                  onCheckedChange={(checked) => updateSetting('show_location', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1" />
                  <div>
                    <h3 className="font-medium">Show Review Count</h3>
                    <p className="text-sm text-gray-600">
                      Display the number of reviews you've written
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.show_review_count !== false}
                  onCheckedChange={(checked) => updateSetting('show_review_count', checked)}
                  disabled={updating}
                />
              </div>
            </div>
          )}

          {/* Review Privacy Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Public Reviews</h3>
                    <p className="text-sm text-gray-600">
                      Allow other users to see your reviews and ratings
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.reviews_public !== false}
                  onCheckedChange={(checked) => updateSetting('reviews_public', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Allow Review Comments</h3>
                    <p className="text-sm text-gray-600">
                      Let other users comment on your reviews
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.allow_review_comments !== false}
                  onCheckedChange={(checked) => updateSetting('allow_review_comments', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Show Verified Purchases</h3>
                    <p className="text-sm text-gray-600">
                      Display verified purchase badges on your reviews
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.show_verified_purchases !== false}
                  onCheckedChange={(checked) => updateSetting('show_verified_purchases', checked)}
                  disabled={updating}
                />
              </div>
            </div>
          )}

          {/* Communication Tab */}
          {activeTab === 'communication' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-gray-600">
                      Receive important account and security notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.email_notifications !== false}
                  onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-red-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Marketing Emails</h3>
                    <p className="text-sm text-gray-600">
                      Receive promotional emails and product updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.marketing_emails || false}
                  onCheckedChange={(checked) => updateSetting('marketing_emails', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Review Notifications</h3>
                    <p className="text-sm text-gray-600">
                      Get notified when someone comments on your reviews
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.review_notifications !== false}
                  onCheckedChange={(checked) => updateSetting('review_notifications', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Recommendation Emails</h3>
                    <p className="text-sm text-gray-600">
                      Receive personalized product recommendations
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.recommendation_emails || false}
                  onCheckedChange={(checked) => updateSetting('recommendation_emails', checked)}
                  disabled={updating}
                />
              </div>
            </div>
          )}

          {/* Data Sharing Tab */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Analytics & Performance</h3>
                    <p className="text-sm text-gray-600">
                      Help us improve the platform with usage analytics
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.allow_analytics !== false}
                  onCheckedChange={(checked) => updateSetting('allow_analytics', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Personalization</h3>
                    <p className="text-sm text-gray-600">
                      Use your data to personalize your experience and recommendations
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.allow_personalization !== false}
                  onCheckedChange={(checked) => updateSetting('allow_personalization', checked)}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-red-600 mt-1" />
                  <div>
                    <h3 className="font-medium">Third-Party Sharing</h3>
                    <p className="text-sm text-gray-600">
                      Share anonymized data with trusted partners for research
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      <span className="text-xs text-yellow-600">Affects privacy score</span>
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacySettings.third_party_sharing || false}
                  onCheckedChange={(checked) => updateSetting('third_party_sharing', checked)}
                  disabled={updating}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Privacy Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Maximize Privacy</h4>
              <p className="text-sm text-blue-700">
                Turn off public profile, real name display, and third-party sharing for maximum privacy protection.
              </p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-1">Balance & Engagement</h4>
              <p className="text-sm text-green-700">
                Keep reviews public and allow comments to help other users while maintaining reasonable privacy.
              </p>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-1">Communication Control</h4>
              <p className="text-sm text-yellow-700">
                Customize email preferences to receive only the notifications you want.
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-1">Data Rights</h4>
              <p className="text-sm text-purple-700">
                You can export or delete your data at any time through the GDPR compliance section.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyDashboard;

