/**
 * API service for ReviewHub frontend
 * Handles all HTTP requests to the Flask backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Helper method to handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication methods
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Email verification methods
  async verifyEmail(token) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerificationEmail(email) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Password reset methods
  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, password) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // User profile methods
  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(passwordData) {
    return this.request('/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  }

  // Product methods
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    return this.request(endpoint);
  }

  async getProduct(productId) {
    return this.request(`/products/${productId}`);
  }

  // Category methods
  async getCategories() {
    return this.request('/categories');
  }

  // Review methods
  async getReviews(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/reviews${queryString ? `?${queryString}` : ''}`);
  }

  async getReview(id) {
    return this.request(`/reviews/${id}`);
  }

  async createReview(reviewData) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async updateReview(id, reviewData) {
    return this.request(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  async deleteReview(id) {
    return this.request(`/reviews/${id}`, {
      method: 'DELETE',
    });
  }

  async voteOnReview(reviewId, isHelpful) {
    return this.request(`/reviews/${reviewId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ is_helpful: isHelpful }),
    });
  }

  // Recommendation methods
  getUserRecommendations: async (limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/recommendations/user?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getSimilarProducts: async (productId, limit = 5) => {
    const response = await fetch(`${API_BASE_URL}/recommendations/similar/${productId}?limit=${limit}`);
    return handleResponse(response);
  },

  getTrendingProducts: async (categoryId = null, limit = 10) => {
    const url = categoryId 
      ? `${API_BASE_URL}/recommendations/trending?category_id=${categoryId}&limit=${limit}`
      : `${API_BASE_URL}/recommendations/trending?limit=${limit}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  getUserAnalytics: async () => {
    const response = await fetch(`${API_BASE_URL}/analytics/user`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  trackInteraction: async (productId, interactionType, rating = null) => {
    const response = await fetch(`${API_BASE_URL}/interactions/track`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        product_id: productId,
        interaction_type: interactionType,
        rating: rating
      }),
    });
    return handleResponse(response);
  },

  // Admin methods
  getAdminDashboard: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getAdminUsers: async (page = 1, perPage = 20, search = '', sortBy = 'created_at', order = 'desc') => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      sort_by: sortBy,
      order: order
    });
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateUserStatus: async (userId, isActive) => {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    });
    return handleResponse(response);
  },

  getAdminProducts: async (page = 1, perPage = 20, search = '', categoryId = null, sortBy = 'created_at', order = 'desc') => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      sort_by: sortBy,
      order: order
    });
    if (search) params.append('search', search);
    if (categoryId) params.append('category_id', categoryId.toString());

    const response = await fetch(`${API_BASE_URL}/admin/products?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  createAdminProduct: async (productData) => {
    const response = await fetch(`${API_BASE_URL}/admin/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return handleResponse(response);
  },

  updateAdminProduct: async (productId, productData) => {
    const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    return handleResponse(response);
  },

  updateProductStatus: async (productId, isActive) => {
    const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    });
    return handleResponse(response);
  },

  getAdminReviews: async (page = 1, perPage = 20, search = '', productId = null, userId = null, rating = null, sortBy = 'created_at', order = 'desc') => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      sort_by: sortBy,
      order: order
    });
    if (search) params.append('search', search);
    if (productId) params.append('product_id', productId.toString());
    if (userId) params.append('user_id', userId.toString());
    if (rating) params.append('rating', rating.toString());

    const response = await fetch(`${API_BASE_URL}/admin/reviews?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateReviewStatus: async (reviewId, isActive) => {
    const response = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    });
    return handleResponse(response);
  },

  createAdminCategory: async (categoryData) => {
    const response = await fetch(`${API_BASE_URL}/admin/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    return handleResponse(response);
  },

  getAdminAnalytics: async (days = 30) => {
    const response = await fetch(`${API_BASE_URL}/admin/analytics?days=${days}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  bulkUpdateProducts: async (productIds, updates) => {
    const response = await fetch(`${API_BASE_URL}/admin/products/bulk-update`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        product_ids: productIds,
        updates: updates
      }),
    });
    return handleResponse(response);
  },

  bulkUpdateReviews: async (reviewIds, updates) => {
    const response = await fetch(`${API_BASE_URL}/admin/reviews/bulk-update`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        review_ids: reviewIds,
        updates: updates
      }),
    });
    return handleResponse(response);
  },

  // Performance monitoring methods
  getPerformanceMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/metrics`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getCacheStats: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/cache/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  clearCache: async (pattern = '*') => {
    const response = await fetch(`${API_BASE_URL}/performance/cache/clear`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ pattern }),
    });
    return handleResponse(response);
  },

  warmCache: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/cache/warm`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  optimizeDatabase: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/database/optimize`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  async uploadReviewImage(file, reviewId = null, altText = '', caption = '') {
    const formData = new FormData();
    formData.append('image', file);
    if (reviewId) formData.append('review_id', reviewId);
    if (altText) formData.append('alt_text', altText);
    if (caption) formData.append('caption', caption);

    return this.request('/images/upload/review', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
  }

  async uploadMultipleReviewImages(files, reviewId = null) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    if (reviewId) formData.append('review_id', reviewId);

    return this.request('/images/upload/multiple', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
  }

  async uploadProfileImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    return this.request('/images/upload/profile', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
  }

  async getImage(imageId) {
    return this.request(`/images/${imageId}`);
  }

  async updateImage(imageId, imageData) {
    return this.request(`/images/${imageId}`, {
      method: 'PUT',
      body: JSON.stringify(imageData),
    });
  }

  async deleteImage(imageId) {
    return this.request(`/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  async getUserImages(userId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/images/user/${userId}${queryString ? `?${queryString}` : ''}`);
  }

  async getReviewImages(reviewId) {
    return this.request(`/images/review/${reviewId}`);
  }

  async getUserReviews(userId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/users/${userId}/reviews?${queryString}` : `/users/${userId}/reviews`;
    return this.request(endpoint);
  }

  // Review voting methods
  async voteReview(reviewId, isHelpful) {
    return this.request(`/reviews/${reviewId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ is_helpful: isHelpful }),
    });
  }

  async removeVote(reviewId) {
    return this.request(`/reviews/${reviewId}/vote`, {
      method: 'DELETE',
    });
  }

  // GDPR Compliance methods
  async recordConsent(consentType, granted) {
    return this.request('/gdpr/consent', {
      method: 'POST',
      body: JSON.stringify({ consent_type: consentType, granted }),
    });
  }

  async getUserConsents() {
    return this.request('/gdpr/consent');
  }

  async withdrawConsent(consentType) {
    return this.request('/gdpr/consent/withdraw', {
      method: 'POST',
      body: JSON.stringify({ consent_type: consentType }),
    });
  }

  async requestDataDeletion(reason) {
    return this.request('/gdpr/deletion-request', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getDeletionRequests() {
    return this.request('/gdpr/deletion-requests');
  }

  async getPrivacyReport() {
    return this.request('/gdpr/privacy-report');
  }

  async getDataRetentionInfo() {
    return this.request('/gdpr/data-retention');
  }

  // Data Export methods
  async requestDataExport(exportFormat) {
    return this.request('/data-export/request', {
      method: 'POST',
      body: JSON.stringify({ export_format: exportFormat }),
    });
  }

  async getExportRequests() {
    return this.request('/data-export/requests');
  }

  async downloadExport(requestId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/data-export/download/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Download failed');
    }

    return response;
  }

  // Admin GDPR methods
  async adminGetDeletionRequests(status = 'pending') {
    return this.request(`/admin/gdpr/deletion-requests?status=${status}`);
  }

  async adminProcessDeletionRequest(requestId) {
    return this.request(`/admin/gdpr/deletion-request/${requestId}/process`, {
      method: 'POST',
    });
  }

  // Admin Data Export methods
  async adminCleanupExports() {
    return this.request('/admin/data-export/cleanup', {
      method: 'POST',
    });
  }

  async adminGetExportStats() {
    return this.request('/admin/data-export/stats');
  }

  // Privacy Settings methods
  async getPrivacySettings() {
    return this.request('/privacy/settings');
  }

  async updatePrivacySettings(settings) {
    return this.request('/privacy/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async resetPrivacySettings() {
    return this.request('/privacy/settings/reset', {
      method: 'POST',
    });
  }

  async checkContentVisibility(contentType, targetUserId) {
    return this.request('/privacy/visibility-check', {
      method: 'POST',
      body: JSON.stringify({
        content_type: contentType,
        target_user_id: targetUserId,
      }),
    });
  }

  async getCommunicationPreferences() {
    return this.request('/privacy/communication-preferences');
  }

  async updateCommunicationPreferences(preferences) {
    return this.request('/privacy/communication-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async getDataSharingPreferences() {
    return this.request('/privacy/data-sharing');
  }

  async updateDataSharingPreferences(preferences) {
    return this.request('/privacy/data-sharing', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Visual Search API methods
  async uploadImageForVisualSearch(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return this.request('/visual-search/upload', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it for FormData
      headers: {},
    });
  }

  async searchVisuallySimilar(searchId) {
    return this.request('/visual-search/search', {
      method: 'POST',
      body: JSON.stringify({ search_id: searchId }),
    });
  }

  async getVisuallySimilarProducts(productId) {
    return this.request(`/visual-search/similar/${productId}`);
  }

  async getVisualSearchStats() {
    return this.request('/visual-search/stats');
  }

  async adminReindexVisualSearch() {
    return this.request('/admin/visual-search/reindex', {
      method: 'POST',
    });
  }

  async adminCleanupVisualSearch(days = 7) {
    return this.request('/admin/visual-search/cleanup', {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  }

  // Voice Search API methods
  async processVoiceQuery(text) {
    return this.request('/voice-search/process', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async voiceSearch(text) {
    return this.request('/voice-search/search', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async getVoiceSearchSuggestions(partialText, limit = 5) {
    const params = new URLSearchParams({
      q: partialText,
      limit: limit.toString(),
    });
    return this.request(`/voice-search/suggestions?${params}`);
  }

  async getVoiceSearchAnalytics(days = 30) {
    const params = new URLSearchParams({
      days: days.toString(),
    });
    return this.request(`/voice-search/analytics?${params}`);
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

