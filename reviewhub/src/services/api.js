/**
 * API service for ReviewHub frontend
 * Handles all HTTP requests to the backend
 */

// Use Vite env; fallback to same-origin /api (good for proxies) or localhost in dev
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api');

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // ---- Helpers ----
  getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultHeaders = { 'Content-Type': 'application/json', ...this.getAuthHeaders() };
    const config = {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    };

    // If body is FormData, let the browser set Content-Type
    const isFormData = config.body instanceof FormData;
    if (isFormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ---- Auth ----
  async register(userData) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
  }

  async login(credentials) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async verifyEmail(token) {
    return this.request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
  }

  async resendVerificationEmail(email) {
    return this.request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  }

  async resetPassword(token, password) {
    return this.request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
  }

  // ---- Profile ----
  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) });
  }

  async changePassword(passwordData) {
    return this.request('/change-password', { method: 'POST', body: JSON.stringify(passwordData) });
  }

  // ---- Products / Categories ----
  async getProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(qs ? `/products?${qs}` : '/products');
  }

  async getProduct(productId) {
    return this.request(`/products/${productId}`);
  }

  async getCategories() {
    return this.request('/categories');
  }

  // ---- Reviews ----
  async getReviews(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/reviews${qs ? `?${qs}` : ''}`);
  }

  async getReview(id) {
    return this.request(`/reviews/${id}`);
  }

  async createReview(reviewData) {
    return this.request('/reviews', { method: 'POST', body: JSON.stringify(reviewData) });
  }

  async updateReview(id, reviewData) {
    return this.request(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(reviewData) });
  }

  async deleteReview(id) {
    return this.request(`/reviews/${id}`, { method: 'DELETE' });
  }

  async voteOnReview(reviewId, isHelpful) {
    return this.request(`/reviews/${reviewId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ is_helpful: isHelpful }),
    });
  }

  // (Alias methods you also defined later)
  async voteReview(reviewId, isHelpful) {
    return this.voteOnReview(reviewId, isHelpful);
  }

  async removeVote(reviewId) {
    return this.request(`/reviews/${reviewId}/vote`, { method: 'DELETE' });
  }

  // ---- Recommendations ----
  async getUserRecommendations(limit = 10) {
    return this.request(`/recommendations/user?limit=${encodeURIComponent(limit)}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async getSimilarProducts(productId, limit = 5) {
    return this.request(`/recommendations/similar/${productId}?limit=${encodeURIComponent(limit)}`);
  }

  async getTrendingProducts(categoryId = null, limit = 10) {
    const url = categoryId
      ? `/recommendations/trending?category_id=${encodeURIComponent(categoryId)}&limit=${encodeURIComponent(limit)}`
      : `/recommendations/trending?limit=${encodeURIComponent(limit)}`;
    return this.request(url);
  }

  // ---- Analytics ----
  async getUserAnalytics() {
    return this.request('/analytics/user', { headers: this.getAuthHeaders() });
  }

  // Track interaction
  async trackInteraction(productId, interactionType, rating = null) {
    return this.request('/interactions/track', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, interaction_type: interactionType, rating }),
      headers: this.getAuthHeaders(),
    });
  }

  // ---- Admin (dashboard/users/products/reviews) ----
  async getAdminDashboard() {
    return this.request('/admin/dashboard', { headers: this.getAuthHeaders() });
  }

  async getAdminUsers(page = 1, perPage = 20, search = '', sortBy = 'created_at', order = 'desc') {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      sort_by: sortBy,
      order,
    });
    if (search) params.append('search', search);
    return this.request(`/admin/users?${params.toString()}`, { headers: this.getAuthHeaders() });
  }

  async updateUserStatus(userId, isActive) {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
      headers: this.getAuthHeaders(),
    });
  }

  async getAdminProducts(page = 1, perPage = 20, search = '', categoryId = null, sortBy = 'created_at', order = 'desc') {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      sort_by: sortBy,
      order,
    });
    if (search) params.append('search', search);
    if (categoryId) params.append('category_id', String(categoryId));
    return this.request(`/admin/products?${params.toString()}`, { headers: this.getAuthHeaders() });
  }

  async createAdminProduct(productData) {
    return this.request('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData),
      headers: this.getAuthHeaders(),
    });
  }

  async updateAdminProduct(productId, productData) {
    return this.request(`/admin/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
      headers: this.getAuthHeaders(),
    });
  }

  async updateProductStatus(productId, isActive) {
    return this.request(`/admin/products/${productId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
      headers: this.getAuthHeaders(),
    });
  }

  async getAdminReviews(page = 1, perPage = 20, search = '', productId = null, userId = null, rating = null, sortBy = 'created_at', order = 'desc') {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      sort_by: sortBy,
      order,
    });
    if (search) params.append('search', search);
    if (productId) params.append('product_id', String(productId));
    if (userId) params.append('user_id', String(userId));
    if (rating) params.append('rating', String(rating));

    return this.request(`/admin/reviews?${params.toString()}`, { headers: this.getAuthHeaders() });
  }

  async updateReviewStatus(reviewId, isActive) {
    return this.request(`/admin/reviews/${reviewId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
      headers: this.getAuthHeaders(),
    });
  }

  async createAdminCategory(categoryData) {
    return this.request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
      headers: this.getAuthHeaders(),
    });
  }

  async getAdminAnalytics(days = 30) {
    return this.request(`/admin/analytics?days=${encodeURIComponent(days)}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async bulkUpdateProducts(productIds, updates) {
    return this.request('/admin/products/bulk-update', {
      method: 'PUT',
      body: JSON.stringify({ product_ids: productIds, updates }),
      headers: this.getAuthHeaders(),
    });
  }

  async bulkUpdateReviews(reviewIds, updates) {
    return this.request('/admin/reviews/bulk-update', {
      method: 'PUT',
      body: JSON.stringify({ review_ids: reviewIds, updates }),
      headers: this.getAuthHeaders(),
    });
  }

  // ---- Performance monitoring ----
  async getPerformanceMetrics() {
    return this.request('/performance/metrics', { headers: this.getAuthHeaders() });
  }

  async getCacheStats() {
    return this.request('/performance/cache/stats', { headers: this.getAuthHeaders() });
  }

  async clearCache(pattern = '*') {
    return this.request('/performance/cache/clear', {
      method: 'POST',
      body: JSON.stringify({ pattern }),
      headers: this.getAuthHeaders(),
    });
  }

  async warmCache() {
    return this.request('/performance/cache/warm', {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  async optimizeDatabase() {
    return this.request('/performance/database/optimize', {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  // ---- Images ----
  async uploadReviewImage(file, reviewId = null, altText = '', caption = '') {
    const formData = new FormData();
    formData.append('image', file);
    if (reviewId) formData.append('review_id', reviewId);
    if (altText) formData.append('alt_text', altText);
    if (caption) formData.append('caption', caption);

    return this.request('/images/upload/review', {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    });
  }

  async uploadMultipleReviewImages(files, reviewId = null) {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    if (reviewId) formData.append('review_id', reviewId);

    return this.request('/images/upload/multiple', {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    });
  }

  async uploadProfileImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    return this.request('/images/upload/profile', {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(),
    });
  }

  async getImage(imageId) {
    return this.request(`/images/${imageId}`);
  }

  async updateImage(imageId, imageData) {
    return this.request(`/images/${imageId}`, { method: 'PUT', body: JSON.stringify(imageData) });
  }

  async deleteImage(imageId) {
    return this.request(`/images/${imageId}`, { method: 'DELETE' });
  }

  async getUserImages(userId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/images/user/${userId}${qs ? `?${qs}` : ''}`);
  }

  async getReviewImages(reviewId) {
    return this.request(`/images/review/${reviewId}`);
  }

  async getUserReviews(userId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/users/${userId}/reviews${qs ? `?${qs}` : ''}`);
  }

  // ---- GDPR ----
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
    const response = await fetch(`${this.baseURL}/data-export/download/${requestId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Download failed');
    }
    return response;
  }

  // ---- Admin GDPR ----
  async adminGetDeletionRequests(status = 'pending') {
    return this.request(`/admin/gdpr/deletion-requests?status=${encodeURIComponent(status)}`);
  }

  async adminProcessDeletionRequest(requestId) {
    return this.request(`/admin/gdpr/deletion-request/${requestId}/process`, { method: 'POST' });
  }

  // ---- Admin Data Export ----
  async adminCleanupExports() {
    return this.request('/admin/data-export/cleanup', { method: 'POST' });
  }

  async adminGetExportStats() {
    return this.request('/admin/data-export/stats');
  }

  // ---- Privacy Settings ----
  async getPrivacySettings() {
    return this.request('/privacy/settings');
  }

  async updatePrivacySettings(settings) {
    return this.request('/privacy/settings', { method: 'PUT', body: JSON.stringify(settings) });
  }

  async resetPrivacySettings() {
    return this.request('/privacy/settings/reset', { method: 'POST' });
  }

  async checkContentVisibility(contentType, targetUserId) {
    return this.request('/privacy/visibility-check', {
      method: 'POST',
      body: JSON.stringify({ content_type: contentType, target_user_id: targetUserId }),
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

  // ---- Visual Search ----
  async uploadImageForVisualSearch(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this.request('/visual-search/upload', { method: 'POST', body: formData, headers: {} });
  }

  async searchVisuallySimilar(searchId) {
    return this.request('/visual-search/search', { method: 'POST', body: JSON.stringify({ search_id: searchId }) });
  }

  async getVisuallySimilarProducts(productId) {
    return this.request(`/visual-search/similar/${productId}`);
  }

  async getVisualSearchStats() {
    return this.request('/visual-search/stats');
  }

  async adminReindexVisualSearch() {
    return this.request('/admin/visual-search/reindex', { method: 'POST' });
  }

  async adminCleanupVisualSearch(days = 7) {
    return this.request('/admin/visual-search/cleanup', { method: 'POST', body: JSON.stringify({ days }) });
  }

  // ---- Voice Search ----
  async processVoiceQuery(text) {
    return this.request('/voice-search/process', { method: 'POST', body: JSON.stringify({ text }) });
  }

  async voiceSearch(text) {
    return this.request('/voice-search/search', { method: 'POST', body: JSON.stringify({ text }) });
  }

  async getVoiceSearchSuggestions(partialText, limit = 5) {
    const params = new URLSearchParams({ q: partialText, limit: String(limit) });
    return this.request(`/voice-search/suggestions?${params.toString()}`);
  }

  async getVoiceSearchAnalytics(days = 30) {
    const params = new URLSearchParams({ days: String(days) });
    return this.request(`/voice-search/analytics?${params.toString()}`);
  }

  // ---- Health ----
  async healthCheck() {
    return this.request('/health');
  }
}

// Create and export a singleton instance (default + named)
const api = new ApiService();
export default api;
export { api };
export { api as apiService };
