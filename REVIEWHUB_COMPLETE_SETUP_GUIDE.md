# ReviewHub Enhanced Platform - Complete Setup Guide

## 🌟 Overview

This guide provides step-by-step instructions for setting up the enhanced ReviewHub platform with all new features including email verification, image uploads, advanced search, recommendation engine, admin panel, performance optimizations, and mobile app.

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Mobile App Setup](#mobile-app-setup)
5. [Database Configuration](#database-configuration)
6. [External Services](#external-services)
7. [Performance Optimization](#performance-optimization)
8. [Deployment](#deployment)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## 🔧 System Requirements

### Minimum Requirements
- **Operating System**: Ubuntu 20.04+ / macOS 10.15+ / Windows 10+
- **Node.js**: 18.0.0 or higher
- **Python**: 3.9 or higher
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 10GB free space

### Required Software
- Git
- Docker (optional but recommended)
- PostgreSQL 13+ or SQLite (for development)
- Redis 6+ (for caching)
- Elasticsearch 8+ (for advanced search)

### Development Tools
- VS Code or similar IDE
- Postman (for API testing)
- React Native CLI (for mobile development)
- Android Studio / Xcode (for mobile testing)

## 🔙 Backend Setup

### 1. Clone and Setup Backend

```bash
# Navigate to backend directory
cd reviewhub-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create `.env` file in the backend directory:

```env
# Flask Configuration
FLASK_APP=app_enhanced.py
FLASK_ENV=development
SECRET_KEY=your-super-secret-key-here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/reviewhub
# For development with SQLite:
# DATABASE_URL=sqlite:///reviewhub.db

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_ACCESS_TOKEN_EXPIRES=3600

# Email Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379/0

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX_PREFIX=reviewhub

# File Storage Configuration
STORAGE_TYPE=local  # or 's3'
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216  # 16MB

# AWS S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_S3_REGION=us-east-1

# Security Configuration
BCRYPT_LOG_ROUNDS=12
PASSWORD_RESET_EXPIRES=3600
EMAIL_VERIFICATION_EXPIRES=86400
```

### 3. Database Setup

```bash
# Initialize database
python -c "from app_enhanced import db; db.create_all()"

# Run database migrations (if using Flask-Migrate)
flask db upgrade

# Seed initial data
python seed_data.py
```

### 4. Start Backend Server

```bash
# Development server
python app_enhanced.py

# Or using Flask CLI
flask run --host=0.0.0.0 --port=5000

# Production server (using Gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 app_enhanced:app
```

## 🎨 Frontend Setup

### 1. Setup React Application

```bash
# Navigate to frontend directory
cd reviewhub

# Install dependencies
npm install

# Or using yarn
yarn install
```

### 2. Environment Configuration

Create `.env` file in the frontend directory:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_API_TIMEOUT=10000

# App Configuration
REACT_APP_NAME=ReviewHub
REACT_APP_VERSION=2.0.0
REACT_APP_DESCRIPTION=Enhanced Product Review Platform

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_RECOMMENDATIONS=true
REACT_APP_ENABLE_ADVANCED_SEARCH=true

# External Services
REACT_APP_GOOGLE_ANALYTICS_ID=your-ga-id
REACT_APP_SENTRY_DSN=your-sentry-dsn
```

### 3. Start Development Server

```bash
# Start development server
npm start

# Or using yarn
yarn start

# Build for production
npm run build
```

## 📱 Mobile App Setup

### 1. Setup React Native Environment

```bash
# Install React Native CLI
npm install -g react-native-cli

# Navigate to mobile app directory
cd reviewhub-mobile

# Install dependencies
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..
```

### 2. Configure Mobile Environment

Create `.env` file in the mobile directory:

```env
# API Configuration
API_BASE_URL=https://your-api-domain.com/api
API_TIMEOUT=10000

# App Configuration
APP_NAME=ReviewHub
APP_VERSION=1.0.0
APP_BUNDLE_ID=com.reviewhub.mobile

# Feature Configuration
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
```

### 3. Run Mobile App

```bash
# Start Metro bundler
npx react-native start

# Run on Android
npx react-native run-android

# Run on iOS (macOS only)
npx react-native run-ios

# Build for production
# Android
cd android && ./gradlew assembleRelease

# iOS (use Xcode)
```

## 🗄️ Database Configuration

### PostgreSQL Setup

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE reviewhub;
CREATE USER reviewhub_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE reviewhub TO reviewhub_user;
\q
```

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_product_id ON user_interactions(product_id);
```

## 🔧 External Services

### Redis Setup

```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
```

### Elasticsearch Setup

```bash
# Install Elasticsearch
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt-get update && sudo apt-get install elasticsearch

# Start Elasticsearch
sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch

# Test Elasticsearch
curl -X GET "localhost:9200/"
```

### Email Service Configuration

#### Gmail Setup
1. Enable 2-factor authentication
2. Generate app-specific password
3. Use app password in MAIL_PASSWORD

#### SendGrid Setup (Alternative)
```env
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
```

## ⚡ Performance Optimization

### 1. Enable Caching

```bash
# Warm up cache
curl -X POST http://localhost:5000/api/performance/cache/warm \
  -H "Authorization: Bearer your-admin-token"

# Check cache stats
curl -X GET http://localhost:5000/api/performance/cache/stats \
  -H "Authorization: Bearer your-admin-token"
```

### 2. Database Optimization

```bash
# Optimize database indexes
curl -X POST http://localhost:5000/api/performance/database/optimize \
  -H "Authorization: Bearer your-admin-token"
```

### 3. Frontend Optimization

```bash
# Build optimized production bundle
npm run build

# Analyze bundle size
npm install -g webpack-bundle-analyzer
npx webpack-bundle-analyzer build/static/js/*.js
```

## 🚀 Deployment

### Backend Deployment

#### Using Docker

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app_enhanced:app"]
```

```bash
# Build and run
docker build -t reviewhub-backend .
docker run -p 5000:5000 --env-file .env reviewhub-backend
```

#### Using Heroku

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create reviewhub-backend

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set DATABASE_URL=your-database-url

# Deploy
git push heroku main
```

### Frontend Deployment

#### Using Netlify

```bash
# Build production bundle
npm run build

# Deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

#### Using Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Mobile App Deployment

#### Android (Google Play Store)

```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# Upload to Google Play Console
```

#### iOS (App Store)

```bash
# Use Xcode to archive and upload to App Store Connect
```

## 🧪 Testing

### Backend Testing

```bash
# Run unit tests
python -m pytest tests/

# Run with coverage
python -m pytest --cov=app_enhanced tests/

# Test API endpoints
curl -X GET http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Frontend Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

### Mobile App Testing

```bash
# Run tests
npm test

# Run on device
npx react-native run-android --device
npx react-native run-ios --device
```

## 🔍 Troubleshooting

### Common Issues

#### Backend Issues

**Database Connection Error**
```bash
# Check database status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U reviewhub_user -d reviewhub
```

**Redis Connection Error**
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping
```

**Email Sending Issues**
- Verify SMTP credentials
- Check firewall settings
- Ensure 2FA and app passwords are configured

#### Frontend Issues

**API Connection Error**
- Verify REACT_APP_API_BASE_URL
- Check CORS configuration
- Ensure backend is running

**Build Errors**
```bash
# Clear cache
npm start -- --reset-cache

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Mobile App Issues

**Metro Bundler Issues**
```bash
# Reset cache
npx react-native start --reset-cache

# Clean build
cd android && ./gradlew clean
cd ios && xcodebuild clean
```

**Android Build Issues**
```bash
# Check Android SDK
echo $ANDROID_HOME

# Update Gradle
cd android && ./gradlew wrapper --gradle-version=7.6
```

### Performance Issues

**Slow API Responses**
- Enable Redis caching
- Optimize database queries
- Add database indexes

**High Memory Usage**
- Monitor with performance dashboard
- Optimize image sizes
- Enable lazy loading

### Getting Help

- Check logs: `tail -f app.log`
- Monitor performance: Access `/admin/performance`
- Database queries: Enable query logging
- API debugging: Use Postman collection

## 📞 Support

For additional support:
- Check the troubleshooting section
- Review error logs
- Contact the development team
- Submit issues on the project repository

---

**Next Steps**: After completing the setup, proceed to the [User Guide](REVIEWHUB_USER_GUIDE.md) and [Admin Manual](REVIEWHUB_ADMIN_MANUAL.md) for detailed usage instructions.

