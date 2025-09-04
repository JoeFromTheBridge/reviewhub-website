import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Header } from './components/Header'
import { HomePage } from './components/HomePage'
import { ProductPage } from './components/ProductPage'
import SearchPage from './components/search/SearchPage';
import UserAnalyticsPage from './components/profile/UserAnalyticsPage';
import PrivacyPage from './components/privacy/PrivacyPage';
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminUsers from './components/admin/AdminUsers'
import AdminPerformance from './components/admin/AdminPerformance'
import AdminVoiceSearch from './components/admin/AdminVoiceSearch'
import { useAuth } from './contexts/AuthContext'
// ❌ removed: import './App.css'

// Admin route wrapper to check admin permissions
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }
  
  return <AdminLayout>{children}</AdminLayout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={
              <>
                <Header />
                <HomePage />
              </>
            } />
            <Route path="/product/:id" element={
              <>
                <Header />
                <ProductPage />
              </>
            } />
            <Route path="/search" element={
              <>
                <Header />
                <SearchPage />
              </>
            } />
            <Route path="/analytics" element={
              <>
                <Header />
                <UserAnalyticsPage />
              </>
            } />
            <Route path="/privacy" element={
              <>
                <Header />
                <PrivacyPage />
              </>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            } />
            <Route path="/admin/voice-search" element={
              <AdminRoute>
                <AdminVoiceSearch />
              </AdminRoute>
            } />
            <Route path="/admin/performance" element={
              <AdminRoute>
                <AdminPerformance />
              </AdminRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
