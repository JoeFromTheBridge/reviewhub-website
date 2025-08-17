import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Shield, 
  Settings, 
  Download, 
  FileText, 
  Eye,
  Database,
  Lock
} from 'lucide-react';
import PrivacyDashboard from './PrivacyDashboard';
import GDPRCompliance from './GDPRCompliance';
import DataExport from './DataExport';

const PrivacyPage = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const sections = [
    {
      id: 'dashboard',
      title: 'Privacy Dashboard',
      description: 'Manage your privacy settings and view your privacy score',
      icon: <Shield className="h-5 w-5" />,
      component: PrivacyDashboard
    },
    {
      id: 'gdpr',
      title: 'GDPR Compliance',
      description: 'Consent management and data protection rights',
      icon: <Lock className="h-5 w-5" />,
      component: GDPRCompliance
    },
    {
      id: 'export',
      title: 'Data Export',
      description: 'Download your personal data in various formats',
      icon: <Download className="h-5 w-5" />,
      component: DataExport
    }
  ];

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || PrivacyDashboard;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy & Data Protection</h1>
        <p className="text-gray-600">
          Control your privacy settings, manage your data, and understand your rights under GDPR.
        </p>
      </div>

      {/* Section Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {sections.map((section) => (
          <Card 
            key={section.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeSection === section.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setActiveSection(section.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  activeSection === section.id 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium mb-1 ${
                    activeSection === section.id ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {section.title}
                  </h3>
                  <p className={`text-sm ${
                    activeSection === section.id ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {section.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Section Content */}
      <div className="transition-all duration-300">
        <ActiveComponent />
      </div>

      {/* Privacy Information Footer */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Privacy Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Data We Collect</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Profile information you provide</li>
                <li>• Reviews and ratings you submit</li>
                <li>• Product interactions and preferences</li>
                <li>• Usage analytics and performance data</li>
                <li>• Communication preferences</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">How We Use Your Data</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Provide and improve our services</li>
                <li>• Personalize your experience</li>
                <li>• Send notifications and communications</li>
                <li>• Ensure platform security and safety</li>
                <li>• Comply with legal obligations</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Your Rights</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Access your personal data</li>
                <li>• Correct inaccurate information</li>
                <li>• Delete your data (right to be forgotten)</li>
                <li>• Export your data (data portability)</li>
                <li>• Object to data processing</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Data Security</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• End-to-end encryption for sensitive data</li>
                <li>• Regular security audits and updates</li>
                <li>• Secure data centers and infrastructure</li>
                <li>• Limited access on a need-to-know basis</li>
                <li>• Compliance with industry standards</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Privacy Commitment</p>
                <p className="text-sm text-blue-700 mt-1">
                  We are committed to protecting your privacy and giving you control over your personal data. 
                  Our practices comply with GDPR, CCPA, and other privacy regulations. 
                  For questions about our privacy practices, contact us at privacy@reviewhub.com
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Privacy Policy
            </Button>
            <Button variant="outline" size="sm">
              Terms of Service
            </Button>
            <Button variant="outline" size="sm">
              Cookie Policy
            </Button>
            <Button variant="outline" size="sm">
              Contact Privacy Team
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPage;

