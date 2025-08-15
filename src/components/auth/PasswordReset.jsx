import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Mail, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '../../contexts/AuthContext';

export function PasswordReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { forgotPassword, resetPassword, loading, error } = useAuth();
  
  const [mode, setMode] = useState('request'); // request, reset, success
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      setMode('reset');
    }
  }, [token]);

  const validatePassword = (password) => {
    const errors = {};
    
    if (password.length < 8) {
      errors.length = 'Password must be at least 8 characters long';
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.lowercase = 'Password must contain at least one lowercase letter';
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.uppercase = 'Password must contain at least one uppercase letter';
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.number = 'Password must contain at least one number';
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.special = 'Password must contain at least one special character (@$!%*?&)';
    }
    
    return errors;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }

    try {
      await forgotPassword(email);
      setMessage('If an account with this email exists, a password reset link has been sent to your email address. Please check your inbox and spam folder.');
    } catch (error) {
      setMessage(error.message || 'Failed to send password reset email.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setValidationErrors({});

    // Validate passwords
    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    const passwordErrors = validatePassword(password);
    if (Object.keys(passwordErrors).length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }

    try {
      await resetPassword(token, password);
      setMode('success');
      setMessage('Your password has been successfully reset. You can now log in with your new password.');
    } catch (error) {
      setMessage(error.message || 'Failed to reset password. The reset link may be expired or invalid.');
    }
  };

  const renderForgotPasswordForm = () => (
    <div className="py-8">
      <div className="text-center mb-8">
        <Lock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Your Password?</h2>
        <p className="text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
          />
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('sent') || message.includes('exists')
              ? 'bg-blue-50 border border-blue-200 text-blue-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {message.includes('sent') || message.includes('exists') ? (
                <Mail className="h-5 w-5 mr-2" />
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
              Send Reset Link
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

  const renderResetPasswordForm = () => (
    <div className="py-8">
      <div className="text-center mb-8">
        <Lock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h2>
        <p className="text-gray-600">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        {password && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
            <ul className="text-sm space-y-1">
              <li className={`flex items-center ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`h-4 w-4 mr-2 ${password.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} />
                At least 8 characters
              </li>
              <li className={`flex items-center ${/(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`h-4 w-4 mr-2 ${/(?=.*[a-z])/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                One lowercase letter
              </li>
              <li className={`flex items-center ${/(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`h-4 w-4 mr-2 ${/(?=.*[A-Z])/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                One uppercase letter
              </li>
              <li className={`flex items-center ${/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`h-4 w-4 mr-2 ${/(?=.*\d)/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                One number
              </li>
              <li className={`flex items-center ${/(?=.*[@$!%*?&])/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                <CheckCircle className={`h-4 w-4 mr-2 ${/(?=.*[@$!%*?&])/.test(password) ? 'text-green-500' : 'text-gray-400'}`} />
                One special character (@$!%*?&)
              </li>
            </ul>
          </div>
        )}

        {/* Validation Errors */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-800 font-medium">Password Requirements Not Met:</span>
            </div>
            <ul className="text-red-700 text-sm list-disc list-inside">
              {Object.values(validationErrors).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-800">{message}</span>
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
              Resetting...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Reset Password
            </>
          )}
        </Button>
      </form>
    </div>
  );

  const renderSuccessMessage = () => (
    <div className="text-center py-8">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-800 font-medium">What's Next?</span>
        </div>
        <p className="text-green-700 mt-2">
          You can now log in to your account using your new password.
        </p>
      </div>

      <div className="space-y-3">
        <Button 
          onClick={() => navigate('/?login=true')}
          className="w-full"
        >
          Go to Login
        </Button>
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="w-full"
        >
          Return to Homepage
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (mode) {
      case 'request':
        return renderForgotPasswordForm();
      case 'reset':
        return renderResetPasswordForm();
      case 'success':
        return renderSuccessMessage();
      default:
        return renderForgotPasswordForm();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Password Reset
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

