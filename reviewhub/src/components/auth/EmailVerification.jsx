import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../contexts/AuthContext';

export function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendVerificationEmail, loading, error, emailVerificationStatus } = useAuth();
  
  const [verificationState, setVerificationState] = useState('checking'); // checking, success, failed, resend
  const [resendEmail, setResendEmail] = useState('');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      handleEmailVerification(token);
    } else {
      setVerificationState('resend');
    }
  }, [token]);

  const handleEmailVerification = async (verificationToken) => {
    try {
      setVerificationState('checking');
      await verifyEmail(verificationToken);
      setVerificationState('success');
      setMessage('Your email has been successfully verified! You can now access all features of ReviewHub.');
      
      // Redirect to home page after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      setVerificationState('failed');
      setMessage(error.message || 'Email verification failed. The link may be expired or invalid.');
    }
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();
    if (!resendEmail) {
      setMessage('Please enter your email address.');
      return;
    }

    try {
      await resendVerificationEmail(resendEmail);
      setMessage('Verification email sent! Please check your inbox and spam folder.');
    } catch (error) {
      setMessage(error.message || 'Failed to send verification email.');
    }
  };

  const renderVerificationStatus = () => {
    switch (verificationState) {
      case 'checking':
        return (
          <div className="text-center py-8">
            <RefreshCw className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified Successfully!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-800 font-medium">Welcome to ReviewHub!</span>
              </div>
              <p className="text-green-700 mt-2">
                You can now write reviews, vote on helpful reviews, and access your profile.
              </p>
            </div>
            <p className="text-sm text-gray-500">Redirecting you to the homepage in a few seconds...</p>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-800 font-medium">Common Issues:</span>
              </div>
              <ul className="text-red-700 mt-2 text-sm list-disc list-inside">
                <li>The verification link has expired (links expire after 24 hours)</li>
                <li>The link has already been used</li>
                <li>The link was copied incorrectly</li>
              </ul>
            </div>
            <Button 
              onClick={() => setVerificationState('resend')}
              className="mb-4"
            >
              Request New Verification Email
            </Button>
            <div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        );

      case 'resend':
        return (
          <div className="py-8">
            <div className="text-center mb-8">
              <Mail className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
              <p className="text-gray-600">
                Enter your email address to receive a new verification link.
              </p>
            </div>

            <form onSubmit={handleResendVerification} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.includes('sent') 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center">
                    {message.includes('sent') ? (
                      <CheckCircle className="h-5 w-5 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mr-2" />
                    )}
                    <span>{message}</span>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Verification Email
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Email Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderVerificationStatus()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

