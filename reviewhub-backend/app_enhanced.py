from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from email_service import email_service, generate_token
from search_service import search_service
from image_upload_routes import register_image_routes
from PIL import Image # Add this line to import Image from Pillow
from recommendation_engine import get_recommendation_engine
from admin_service import get_admin_service
from performance_service import get_performance_service
from gdpr_service import get_gdpr_service
from data_export_service import data_export_service
from visual_search_service import visual_search_service

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///reviewhub.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)
migrate = Migrate(app, db)

# CORS configuration
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
CORS(app, origins=cors_origins, supports_credentials=True)

# Enhanced Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Email verification fields
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(64), nullable=True)
    email_verification_sent_at = db.Column(db.DateTime, nullable=True)
    
    # Password reset fields
    password_reset_token = db.Column(db.String(64), nullable=True)
    password_reset_sent_at = db.Column(db.DateTime, nullable=True)
    
    # User preferences and analytics
    last_login = db.Column(db.DateTime, nullable=True)
    login_count = db.Column(db.Integer, default=0)
    profile_image_url = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(100), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    
    # Admin role
    is_admin = db.Column(db.Boolean, default=False)
    
    # Relationships
    reviews = db.relationship('Review', backref='user', lazy=True, cascade='all, delete-orphan')
    review_votes = db.relationship('ReviewVote', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def generate_email_verification_token(self):
        self.email_verification_token = generate_token()
        self.email_verification_sent_at = datetime.utcnow()
        return self.email_verification_token
    
    def generate_password_reset_token(self):
        self.password_reset_token = generate_token()
        self.password_reset_sent_at = datetime.utcnow()
        return self.password_reset_token
    
    def is_email_verification_valid(self):
        if not self.email_verification_token or not self.email_verification_sent_at:
            return False
        # Token expires after 24 hours
        return datetime.utcnow() - self.email_verification_sent_at < timedelta(hours=24)
    
    def is_password_reset_valid(self):
        if not self.password_reset_token or not self.password_reset_sent_at:
            return False
        # Token expires after 1 hour
        return datetime.utcnow() - self.password_reset_sent_at < timedelta(hours=1)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'email_verified': self.email_verified,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'login_count': self.login_count,
            'profile_image_url': self.profile_image_url,
            'bio': self.bio,
            'location': self.location,
            'website': self.website,
            'review_count': len(self.reviews),
            'is_admin': self.is_admin
        }

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    products = db.relationship('Product', backref='category', lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(100), nullable=True)
    model = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    price_min = db.Column(db.Float, nullable=True)
    price_max = db.Column(db.Float, nullable=True)
    specifications = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Analytics fields
    view_count = db.Column(db.Integer, default=0)
    
    # Relationships
    reviews = db.relationship('Review', backref='product', lazy=True, cascade='all, delete-orphan')
    
    @property
    def average_rating(self):
        if not self.reviews:
            return 0
        return sum(review.rating for review in self.reviews) / len(self.reviews)
    
    @property
    def review_count(self):
        return len(self.reviews)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'brand': self.brand,
            'model': self.model,
            'description': self.description,
            'category': self.category.name if self.category else None,
            'category_id': self.category_id,
            'image_url': self.image_url,
            'price_min': self.price_min,
            'price_max': self.price_max,
            'specifications': self.specifications,
            'average_rating': self.average_rating,
            'review_count': self.review_count,
            'view_count': self.view_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    title = db.Column(db.String(200), nullable=True)
    content = db.Column(db.Text, nullable=False)
    pros = db.Column(db.JSON, nullable=True)  # List of pros
    cons = db.Column(db.JSON, nullable=True)  # List of cons
    verified_purchase = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Image support
    images = db.Column(db.JSON, nullable=True)  # List of image URLs
    
    # Relationships
    votes = db.relationship('ReviewVote', backref='review', lazy=True, cascade='all, delete-orphan')
    
    @property
    def helpful_votes(self):
        return sum(1 for vote in self.votes if vote.is_helpful)
    
    @property
    def total_votes(self):
        return len(self.votes)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'profile_image_url': self.user.profile_image_url
            },
            'product_id': self.product_id,
            'rating': self.rating,
            'title': self.title,
            'content': self.content,
            'pros': self.pros,
            'cons': self.cons,
            'verified_purchase': self.verified_purchase,
            'helpful_votes': self.helpful_votes,
            'total_votes': self.total_votes,
            'images': self.images,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ReviewVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('review.id'), nullable=False)
    is_helpful = db.Column(db.Boolean, nullable=False)  # True for helpful, False for not helpful
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Ensure one vote per user per review
    __table_args__ = (db.UniqueConstraint('user_id', 'review_id', name='unique_user_review_vote'),)

class UserInteraction(db.Model):
    """Track user interactions for recommendation engine"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    interaction_type = db.Column(db.String(50), nullable=False)  # 'view', 'review', 'search', 'purchase'
    rating = db.Column(db.Integer, nullable=True)  # For review interactions
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='interactions')
    product = db.relationship('Product', backref='interactions')

# GDPR Compliance Models
class UserConsent(db.Model):
    """Track user consent for different types of data processing"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    consent_type = db.Column(db.String(50), nullable=False)  # 'essential', 'analytics', 'marketing', etc.
    granted = db.Column(db.Boolean, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 support
    user_agent = db.Column(db.Text, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='consents')
    
    # Ensure one consent record per user per type
    __table_args__ = (db.UniqueConstraint('user_id', 'consent_type', name='unique_user_consent'),)

class DataDeletionRequest(db.Model):
    """Track data deletion requests (Right to be Forgotten)"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected', 'completed'
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    deletion_summary = db.Column(db.JSON, nullable=True)  # Summary of what was deleted
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='deletion_requests')
    processor = db.relationship('User', foreign_keys=[processed_by])

class DataExportRequest(db.Model):
    """Track data export requests (Right to Data Portability)"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    export_format = db.Column(db.String(10), default='json')  # 'json', 'csv', 'pdf'
    status = db.Column(db.String(20), default='pending')  # 'pending', 'processing', 'completed', 'failed'
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    file_path = db.Column(db.String(255), nullable=True)
    download_count = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime, nullable=True)  # Export files expire after 30 days
    
    # Relationships
    user = db.relationship('User', backref='export_requests')

class PrivacySettings(db.Model):
    """User privacy settings and preferences"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    
    # Profile visibility settings
    profile_public = db.Column(db.Boolean, default=True)
    show_real_name = db.Column(db.Boolean, default=False)
    show_location = db.Column(db.Boolean, default=False)
    show_review_count = db.Column(db.Boolean, default=True)
    
    # Review privacy settings
    reviews_public = db.Column(db.Boolean, default=True)
    allow_review_comments = db.Column(db.Boolean, default=True)
    show_verified_purchases = db.Column(db.Boolean, default=True)
    
    # Communication preferences
    email_notifications = db.Column(db.Boolean, default=True)
    marketing_emails = db.Column(db.Boolean, default=False)
    review_notifications = db.Column(db.Boolean, default=True)
    recommendation_emails = db.Column(db.Boolean, default=False)
    
    # Data sharing preferences
    allow_analytics = db.Column(db.Boolean, default=True)
    allow_personalization = db.Column(db.Boolean, default=True)
    third_party_sharing = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='privacy_settings', uselist=False)

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            email_verified=False  # Require email verification
        )
        user.set_password(data['password'])
        
        # Generate email verification token
        verification_token = user.generate_email_verification_token()
        
        db.session.add(user)
        db.session.commit()
        
        # Send verification email
        email_sent = email_service.send_verification_email(
            user.email, 
            user.username, 
            verification_token
        )
        
        return jsonify({
            'message': 'User registered successfully. Please check your email to verify your account.',
            'email_sent': email_sent,
            'user_id': user.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify-email', methods=['POST'])
def verify_email():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Verification token is required'}), 400
        
        # Find user with this token
        user = User.query.filter_by(email_verification_token=token).first()
        
        if not user:
            return jsonify({'error': 'Invalid verification token'}), 400
        
        if user.email_verified:
            return jsonify({'message': 'Email already verified'}), 200
        
        if not user.is_email_verification_valid():
            return jsonify({'error': 'Verification token has expired'}), 400
        
        # Verify the email
        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        
        db.session.commit()
        
        # Send welcome email
        email_service.send_welcome_email(user.email, user.username)
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Email verified successfully',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/resend-verification', methods=['POST'])
def resend_verification():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.email_verified:
            return jsonify({'message': 'Email already verified'}), 200
        
        # Generate new verification token
        verification_token = user.generate_email_verification_token()
        db.session.commit()
        
        # Send verification email
        email_sent = email_service.send_verification_email(
            user.email, 
            user.username, 
            verification_token
        )
        
        return jsonify({
            'message': 'Verification email sent successfully',
            'email_sent': email_sent
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username_or_email = data.get('username')
        password = data.get('password')
        
        if not username_or_email or not password:
            return jsonify({'error': 'Username/email and password are required'}), 400
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username_or_email) | 
            (User.email == username_or_email)
        ).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401
        
        if not user.email_verified:
            return jsonify({
                'error': 'Email not verified. Please check your email and verify your account.',
                'email_verified': False
            }), 401
        
        # Update login statistics
        user.last_login = datetime.utcnow()
        user.login_count += 1
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({
                'message': 'If an account with this email exists, a password reset link has been sent.'
            }), 200
        
        # Generate password reset token
        reset_token = user.generate_password_reset_token()
        db.session.commit()
        
        # Send password reset email
        email_sent = email_service.send_password_reset_email(
            user.email, 
            user.username, 
            reset_token
        )
        
        return jsonify({
            'message': 'If an account with this email exists, a password reset link has been sent.',
            'email_sent': email_sent
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        # Find user with this token
        user = User.query.filter_by(password_reset_token=token).first()
        
        if not user:
            return jsonify({'error': 'Invalid reset token'}), 400
        
        if not user.is_password_reset_valid():
            return jsonify({'error': 'Reset token has expired'}), 400
        
        # Reset the password
        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_sent_at = None
        
        db.session.commit()
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'bio', 'location', 'website']
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route("/api/search/products", methods=["GET"])
def search_products():
    query = request.args.get("q", "")
    category = request.args.get("category")
    brand = request.args.get("brand")
    price_min = request.args.get("price_min", type=float)
    price_max = request.args.get("price_max", type=float)
    rating_min = request.args.get("rating_min", type=int)
    has_reviews = request.args.get("has_reviews", type=lambda v: v.lower() == "true")
    sort_by = request.args.get("sort_by", "relevance")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    filters = {
        "category": category,
        "brand": brand,
        "price_min": price_min,
        "price_max": price_max,
        "rating_min": rating_min,
        "has_reviews": has_reviews,
    }
    # Remove None values from filters
    filters = {k: v for k, v in filters.items() if v is not None}

    results = search_service.search_products(
        query=query,
        filters=filters,
        sort_by=sort_by,
        page=page,
        per_page=per_page,
    )
    return jsonify(results)

@app.route("/api/search/reviews", methods=["GET"])
def search_reviews():
    query = request.args.get("q", "")
    product_id = request.args.get("product_id", type=int)
    user_id = request.args.get("user_id", type=int)
    rating = request.args.get("rating", type=int)
    rating_min = request.args.get("rating_min", type=int)
    verified_only = request.args.get("verified_only", type=lambda v: v.lower() == "true")
    has_images = request.args.get("has_images", type=lambda v: v.lower() == "true")
    sort_by = request.args.get("sort_by", "relevance")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    filters = {
        "product_id": product_id,
        "user_id": user_id,
        "rating": rating,
        "rating_min": rating_min,
        "verified_only": verified_only,
        "has_images": has_images,
    }
    # Remove None values from filters
    filters = {k: v for k, v in filters.items() if v is not None}

    results = search_service.search_reviews(
        query=query,
        filters=filters,
        sort_by=sort_by,
        page=page,
        per_page=per_page,
    )
    return jsonify(results)

@app.route("/api/search/suggestions", methods=["GET"])
def search_suggestions():
    query = request.args.get("q", "")
    suggestion_type = request.args.get("type", "products") # products or users
    suggestions = search_service.get_suggestions(query, suggestion_type)
    return jsonify({"suggestions": suggestions})

# Continue with existing routes from the original app.py...
# (Products, Reviews, Categories, etc.)

# Configure file upload settings
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16777216))  # 16MB
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')

# Register image upload routes
from image_upload_routes import register_image_routes
Image = register_image_routes(app, db)

# Update Review model to include image relationship
Review.image_records = db.relationship('Image', 
    primaryjoin="and_(Review.id==foreign(Image.related_id), Image.image_type=='review')",
    lazy='dynamic')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)



# Product and Review Routes (from original app.py)
@app.route("/api/products", methods=["GET"])
def get_products():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category_id = request.args.get('category_id', type=int)
        
        query = Product.query.filter_by(is_active=True)
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        products = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Index products in Elasticsearch if available
        if search_service.is_available:
            for product in products.items:
                search_service.index_product(product.to_dict())
        
        return jsonify({
            "products": [product.to_dict() for product in products.items],
            "total": products.total,
            "pages": products.pages,
            "current_page": page
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        
        # Increment view count
        product.view_count += 1
        db.session.commit()
        
        return jsonify({"product": product.to_dict()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products", methods=["POST"])
@jwt_required()
def create_product():
    try:
        data = request.get_json()
        
        # Basic validation
        required_fields = ['name', 'category_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        product = Product(
            name=data["name"],
            brand=data.get("brand"),
            model=data.get("model"),
            description=data.get("description"),
            category_id=data["category_id"],
            image_url=data.get("image_url"),
            price_min=data.get("price_min"),
            price_max=data.get("price_max"),
            specifications=data.get("specifications")
        )
        
        db.session.add(product)
        db.session.commit()
        
        # Index the product in Elasticsearch
        if search_service.is_available:
            search_service.index_product(product.to_dict())
        
        return jsonify({"message": "Product created successfully", "product": product.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<int:product_id>/reviews", methods=["GET"])
def get_product_reviews(product_id):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'newest')  # newest, oldest, highest_rated, lowest_rated, most_helpful
        
        query = Review.query.filter_by(product_id=product_id, is_active=True)
        
        # Apply sorting
        if sort_by == 'newest':
            query = query.order_by(Review.created_at.desc())
        elif sort_by == 'oldest':
            query = query.order_by(Review.created_at.asc())
        elif sort_by == 'highest_rated':
            query = query.order_by(Review.rating.desc())
        elif sort_by == 'lowest_rated':
            query = query.order_by(Review.rating.asc())
        elif sort_by == 'most_helpful':
            # This would require a more complex query with vote counts
            query = query.order_by(Review.created_at.desc())
        
        reviews = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            "reviews": [review.to_dict() for review in reviews.items],
            "total": reviews.total,
            "pages": reviews.pages,
            "current_page": page
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/reviews", methods=["POST"])
@jwt_required()
def create_review():
    try:
        data = request.get_json()
        product_id = data.get("product_id")
        
        # Basic validation
        if not product_id or not data.get("rating") or not data.get("content"):
            return jsonify({"error": "Product ID, rating, and content are required"}), 400

        review = Review(
            user_id=get_jwt_identity(),
            product_id=product_id,
            rating=data["rating"],
            title=data.get("title"),
            content=data["content"],
            pros=data.get("pros"),
            cons=data.get("cons"),
            verified_purchase=data.get("verified_purchase", False)
        )
        db.session.add(review)
        db.session.commit()

        # Index the review in Elasticsearch
        if search_service.is_available:
            product = Product.query.get(product_id)
            user = User.query.get(get_jwt_identity())
            search_service.index_review({
                "id": review.id,
                "user_id": review.user_id,
                "product_id": review.product_id,
                "product_name": product.name if product else None,
                "user_username": user.username if user else None,
                "rating": review.rating,
                "title": review.title,
                "content": review.content,
                "pros": review.pros,
                "cons": review.cons,
                "verified_purchase": review.verified_purchase,
                "helpful_votes": review.helpful_votes,
                "total_votes": review.total_votes,
                "has_images": len(review.image_records.all()) > 0,
                "image_count": len(review.image_records.all()),
                "created_at": review.created_at.isoformat(),
                "updated_at": review.updated_at.isoformat(),
                "is_active": review.is_active
            })

        return jsonify({"message": "Review created successfully", "review": review.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/api/reviews/<int:review_id>/vote", methods=["POST"])
@jwt_required()
def vote_review(review_id):
    try:
        data = request.get_json()
        is_helpful = data.get("is_helpful")
        
        if is_helpful is None:
            return jsonify({"error": "is_helpful field is required"}), 400
        
        user_id = get_jwt_identity()
        
        # Check if user already voted
        existing_vote = ReviewVote.query.filter_by(
            user_id=user_id, 
            review_id=review_id
        ).first()
        
        if existing_vote:
            # Update existing vote
            existing_vote.is_helpful = is_helpful
        else:
            # Create new vote
            vote = ReviewVote(
                user_id=user_id,
                review_id=review_id,
                is_helpful=is_helpful
            )
            db.session.add(vote)
        
        db.session.commit()
        
        return jsonify({"message": "Vote recorded successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/api/categories", methods=["GET"])
def get_categories():
    try:
        categories = Category.query.all()
        return jsonify({
            "categories": [
                {
                    "id": cat.id,
                    "name": cat.name,
                    "slug": cat.slug,
                    "description": cat.description,
                    "icon_url": cat.icon_url,
                    "product_count": len(cat.products)
                }
                for cat in categories
            ]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/categories", methods=["POST"])
@jwt_required()
def create_category():
    try:
        data = request.get_json()
        
        if not data.get("name"):
            return jsonify({"error": "Category name is required"}), 400
        
        # Generate slug from name
        slug = data["name"].lower().replace(" ", "-").replace("&", "and")
        
        category = Category(
            name=data["name"],
            slug=slug,
            description=data.get("description"),
            icon_url=data.get("icon_url")
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({"message": "Category created successfully", "category": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
            "description": category.description,
            "icon_url": category.icon_url
        }}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Bulk indexing route for Elasticsearch
@app.route("/api/admin/reindex", methods=["POST"])
@jwt_required()
def reindex_data():
    try:
        if not search_service.is_available:
            return jsonify({"error": "Elasticsearch is not available"}), 503
        
        # Reindex all products
        products = Product.query.filter_by(is_active=True).all()
        for product in products:
            search_service.index_product(product.to_dict())
        
        # Reindex all reviews
        reviews = Review.query.filter_by(is_active=True).all()
        for review in reviews:
            product = Product.query.get(review.product_id)
            user = User.query.get(review.user_id)
            search_service.index_review({
                "id": review.id,
                "user_id": review.user_id,
                "product_id": review.product_id,
                "product_name": product.name if product else None,
                "user_username": user.username if user else None,
                "rating": review.rating,
                "title": review.title,
                "content": review.content,
                "pros": review.pros,
                "cons": review.cons,
                "verified_purchase": review.verified_purchase,
                "helpful_votes": review.helpful_votes,
                "total_votes": review.total_votes,
                "has_images": len(review.image_records.all()) > 0,
                "image_count": len(review.image_records.all()),
                "created_at": review.created_at.isoformat(),
                "updated_at": review.updated_at.isoformat(),
                "is_active": review.is_active
            })
        
        return jsonify({
            "message": "Reindexing completed successfully",
            "products_indexed": len(products),
            "reviews_indexed": len(reviews)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Recommendation Routes
@app.route("/api/recommendations/user", methods=["GET"])
@jwt_required()
def get_user_recommendations():
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        rec_engine = get_recommendation_engine(db)
        recommendations = rec_engine.get_user_recommendations(user_id, limit)
        
        return jsonify({
            "recommendations": recommendations,
            "user_id": user_id
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/recommendations/similar/<int:product_id>", methods=["GET"])
def get_similar_products(product_id):
    try:
        limit = request.args.get('limit', 5, type=int)
        
        rec_engine = get_recommendation_engine(db)
        similar_products = rec_engine.get_similar_products(product_id, limit)
        
        return jsonify({
            "similar_products": similar_products,
            "product_id": product_id
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/recommendations/trending", methods=["GET"])
def get_trending_products():
    try:
        category_id = request.args.get('category_id', type=int)
        limit = request.args.get('limit', 10, type=int)
        
        rec_engine = get_recommendation_engine(db)
        trending_products = rec_engine.get_trending_products(category_id, limit)
        
        return jsonify({
            "trending_products": trending_products,
            "category_id": category_id
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/analytics/user", methods=["GET"])
@jwt_required()
def get_user_analytics():
    try:
        user_id = get_jwt_identity()
        
        rec_engine = get_recommendation_engine(db)
        analytics = rec_engine.get_user_analytics(user_id)
        
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/interactions/track", methods=["POST"])
@jwt_required()
def track_interaction():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        product_id = data.get('product_id')
        interaction_type = data.get('interaction_type')
        rating = data.get('rating')
        
        if not product_id or not interaction_type:
            return jsonify({"error": "product_id and interaction_type are required"}), 400
        
        rec_engine = get_recommendation_engine(db)
        rec_engine.track_user_interaction(user_id, product_id, interaction_type, rating)
        
        return jsonify({"message": "Interaction tracked successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update existing routes to track interactions
@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product_enhanced(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        
        # Increment view count
        product.view_count += 1
        db.session.commit()
        
        # Track user interaction if authenticated
        try:
            user_id = get_jwt_identity()
            if user_id:
                rec_engine = get_recommendation_engine(db)
                rec_engine.track_user_interaction(user_id, product_id, 'view')
        except:
            pass  # User not authenticated, skip tracking
        
        # Get similar products
        rec_engine = get_recommendation_engine(db)
        similar_products = rec_engine.get_similar_products(product_id, 4)
        
        return jsonify({
            "product": product.to_dict(),
            "similar_products": similar_products
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update create_review route to track interaction
@app.route("/api/reviews", methods=["POST"])
@jwt_required()
def create_review_enhanced():
    try:
        data = request.get_json()
        product_id = data.get("product_id")
        user_id = get_jwt_identity()
        
        # Basic validation
        if not product_id or not data.get("rating") or not data.get("content"):
            return jsonify({"error": "Product ID, rating, and content are required"}), 400

        review = Review(
            user_id=user_id,
            product_id=product_id,
            rating=data["rating"],
            title=data.get("title"),
            content=data["content"],
            pros=data.get("pros"),
            cons=data.get("cons"),
            verified_purchase=data.get("verified_purchase", False)
        )
        db.session.add(review)
        db.session.commit()

        # Track user interaction
        rec_engine = get_recommendation_engine(db)
        rec_engine.track_user_interaction(user_id, product_id, 'review', data["rating"])

        # Index the review in Elasticsearch
        if search_service.is_available:
            product = Product.query.get(product_id)
            user = User.query.get(user_id)
            search_service.index_review({
                "id": review.id,
                "user_id": review.user_id,
                "product_id": review.product_id,
                "product_name": product.name if product else None,
                "user_username": user.username if user else None,
                "rating": review.rating,
                "title": review.title,
                "content": review.content,
                "pros": review.pros,
                "cons": review.cons,
                "verified_purchase": review.verified_purchase,
                "helpful_votes": review.helpful_votes,
                "total_votes": review.total_votes,
                "has_images": len(review.image_records.all()) > 0,
                "image_count": len(review.image_records.all()),
                "created_at": review.created_at.isoformat(),
                "updated_at": review.updated_at.isoformat(),
                "is_active": review.is_active
            })

        return jsonify({"message": "Review created successfully", "review": review.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# Admin decorator for route protection
def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or not user.is_admin:
                return jsonify({'error': 'Admin access required'}), 403
            return f(*args, **kwargs)
        except:
            return jsonify({'error': 'Authentication required'}), 401
    return decorated_function

# Admin Routes
@app.route("/api/admin/dashboard", methods=["GET"])
@jwt_required()
@admin_required
def admin_dashboard():
    try:
        admin_svc = get_admin_service(db)
        stats = admin_svc.get_dashboard_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/users", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_users():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search')
        sort_by = request.args.get('sort_by', 'created_at')
        order = request.args.get('order', 'desc')
        
        admin_svc = get_admin_service(db)
        result = admin_svc.get_users(page, per_page, search, sort_by, order)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/users/<int:user_id>/status", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update_user_status(user_id):
    try:
        data = request.get_json()
        is_active = data.get('is_active')
        
        if is_active is None:
            return jsonify({"error": "is_active field is required"}), 400
        
        admin_svc = get_admin_service(db)
        success = admin_svc.update_user_status(user_id, is_active)
        
        if success:
            return jsonify({"message": "User status updated successfully"}), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/products", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_products():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search')
        category_id = request.args.get('category_id', type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        order = request.args.get('order', 'desc')
        
        admin_svc = get_admin_service(db)
        result = admin_svc.get_products(page, per_page, search, category_id, sort_by, order)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/products", methods=["POST"])
@jwt_required()
@admin_required
def admin_create_product():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'category_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        admin_svc = get_admin_service(db)
        product = admin_svc.create_product(data)
        
        if product:
            return jsonify({"message": "Product created successfully", "product": product}), 201
        else:
            return jsonify({"error": "Failed to create product"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/products/<int:product_id>", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update_product(product_id):
    try:
        data = request.get_json()
        
        admin_svc = get_admin_service(db)
        product = admin_svc.update_product(product_id, data)
        
        if product:
            return jsonify({"message": "Product updated successfully", "product": product}), 200
        else:
            return jsonify({"error": "Product not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/products/<int:product_id>/status", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update_product_status(product_id):
    try:
        data = request.get_json()
        is_active = data.get('is_active')
        
        if is_active is None:
            return jsonify({"error": "is_active field is required"}), 400
        
        admin_svc = get_admin_service(db)
        success = admin_svc.update_product_status(product_id, is_active)
        
        if success:
            return jsonify({"message": "Product status updated successfully"}), 200
        else:
            return jsonify({"error": "Product not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/reviews", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_reviews():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search')
        product_id = request.args.get('product_id', type=int)
        user_id = request.args.get('user_id', type=int)
        rating = request.args.get('rating', type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        order = request.args.get('order', 'desc')
        
        admin_svc = get_admin_service(db)
        result = admin_svc.get_reviews(page, per_page, search, product_id, user_id, rating, sort_by, order)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/reviews/<int:review_id>/status", methods=["PUT"])
@jwt_required()
@admin_required
def admin_update_review_status(review_id):
    try:
        data = request.get_json()
        is_active = data.get('is_active')
        
        if is_active is None:
            return jsonify({"error": "is_active field is required"}), 400
        
        admin_svc = get_admin_service(db)
        success = admin_svc.update_review_status(review_id, is_active)
        
        if success:
            return jsonify({"message": "Review status updated successfully"}), 200
        else:
            return jsonify({"error": "Review not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/categories", methods=["POST"])
@jwt_required()
@admin_required
def admin_create_category():
    try:
        data = request.get_json()
        
        if not data.get("name"):
            return jsonify({"error": "Category name is required"}), 400
        
        admin_svc = get_admin_service(db)
        category = admin_svc.create_category(data)
        
        if category:
            return jsonify({"message": "Category created successfully", "category": category}), 201
        else:
            return jsonify({"error": "Failed to create category"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/analytics", methods=["GET"])
@jwt_required()
@admin_required
def admin_get_analytics():
    try:
        days = request.args.get('days', 30, type=int)
        
        admin_svc = get_admin_service(db)
        analytics = admin_svc.get_analytics_data(days)
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/products/bulk-update", methods=["PUT"])
@jwt_required()
@admin_required
def admin_bulk_update_products():
    try:
        data = request.get_json()
        product_ids = data.get('product_ids', [])
        updates = data.get('updates', {})
        
        if not product_ids or not updates:
            return jsonify({"error": "product_ids and updates are required"}), 400
        
        admin_svc = get_admin_service(db)
        updated_count = admin_svc.bulk_update_products(product_ids, updates)
        
        return jsonify({
            "message": f"Updated {updated_count} products successfully",
            "updated_count": updated_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/reviews/bulk-update", methods=["PUT"])
@jwt_required()
@admin_required
def admin_bulk_update_reviews():
    try:
        data = request.get_json()
        review_ids = data.get('review_ids', [])
        updates = data.get('updates', {})
        
        if not review_ids or not updates:
            return jsonify({"error": "review_ids and updates are required"}), 400
        
        admin_svc = get_admin_service(db)
        updated_count = admin_svc.bulk_update_reviews(review_ids, updates)
        
        return jsonify({
            "message": f"Updated {updated_count} reviews successfully",
            "updated_count": updated_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Initialize performance service
performance_svc = get_performance_service(app, db)

# Performance and monitoring routes
@app.route("/api/performance/metrics", methods=["GET"])
@jwt_required()
@admin_required
def get_performance_metrics():
    try:
        metrics = performance_svc.get_performance_metrics()
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/performance/cache/stats", methods=["GET"])
@jwt_required()
@admin_required
def get_cache_stats():
    try:
        stats = performance_svc.get_cache_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/performance/cache/clear", methods=["POST"])
@jwt_required()
@admin_required
def clear_cache():
    try:
        data = request.get_json()
        pattern = data.get('pattern', '*')
        
        if pattern == '*':
            # Clear all cache
            deleted_count = performance_svc.cache_delete_pattern('*')
        else:
            # Clear specific pattern
            deleted_count = performance_svc.cache_delete_pattern(pattern)
        
        return jsonify({
            "message": f"Cleared {deleted_count} cache entries",
            "deleted_count": deleted_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/performance/cache/warm", methods=["POST"])
@jwt_required()
@admin_required
def warm_cache():
    try:
        success = performance_svc.warm_cache()
        if success:
            return jsonify({"message": "Cache warming completed successfully"}), 200
        else:
            return jsonify({"error": "Cache warming failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/performance/database/optimize", methods=["POST"])
@jwt_required()
@admin_required
def optimize_database():
    try:
        success = performance_svc.optimize_database_indexes()
        if success:
            return jsonify({"message": "Database optimization completed successfully"}), 200
        else:
            return jsonify({"error": "Database optimization failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Enhanced product routes with caching
@app.route("/api/products", methods=["GET"])
def get_products_cached():
    try:
        # Generate cache key based on query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category_id = request.args.get('category_id', type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        
        cache_key = performance_svc.generate_cache_key(
            'products', page, per_page, category_id, sort_by
        )
        
        # Try to get from cache first
        cached_result = performance_svc.cache_get(cache_key)
        if cached_result:
            return jsonify(cached_result), 200
        
        # Query database
        query = Product.query.filter_by(is_active=True)
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        if sort_by == 'rating':
            query = query.order_by(Product.average_rating.desc())
        elif sort_by == 'name':
            query = query.order_by(Product.name)
        else:
            query = query.order_by(Product.created_at.desc())
        
        products = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        result = {
            'products': [product.to_dict() for product in products.items],
            'total': products.total,
            'pages': products.pages,
            'current_page': page,
            'per_page': per_page
        }
        
        # Cache the result for 5 minutes
        performance_svc.cache_set(cache_key, result, ttl=300)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Enhanced categories route with caching
@app.route("/api/categories", methods=["GET"])
def get_categories_cached():
    try:
        cache_key = "categories:all"
        
        # Try to get from cache first
        cached_result = performance_svc.cache_get(cache_key)
        if cached_result:
            return jsonify({"categories": cached_result}), 200
        
        # Query database
        categories = Category.query.all()
        categories_data = []
        
        for category in categories:
            category_dict = {
                'id': category.id,
                'name': category.name,
                'slug': category.slug,
                'description': category.description,
                'icon_url': category.icon_url,
                'product_count': len(category.products)
            }
            categories_data.append(category_dict)
        
        # Cache the result for 1 hour
        performance_svc.cache_set(cache_key, categories_data, ttl=3600)
        
        return jsonify({"categories": categories_data}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GDPR Compliance Routes
@app.route('/api/gdpr/consent', methods=['POST'])
@jwt_required()
def record_consent():
    """Record user consent for data processing"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        consent_type = data.get('consent_type')
        granted = data.get('granted', False)
        
        if not consent_type:
            return jsonify({'error': 'Consent type is required'}), 400
        
        # Get client information
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        user_agent = request.headers.get('User-Agent')
        
        gdpr_svc = get_gdpr_service(db)
        from gdpr_service import ConsentType
        
        try:
            consent_enum = ConsentType(consent_type)
        except ValueError:
            return jsonify({'error': 'Invalid consent type'}), 400
        
        success = gdpr_svc.record_consent(
            user_id, consent_enum, granted, ip_address, user_agent
        )
        
        if success:
            return jsonify({'message': 'Consent recorded successfully'}), 200
        else:
            return jsonify({'error': 'Failed to record consent'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gdpr/consent', methods=['GET'])
@jwt_required()
def get_user_consents():
    """Get all consent records for the current user"""
    try:
        user_id = get_jwt_identity()
        gdpr_svc = get_gdpr_service(db)
        
        consents = gdpr_svc.get_user_consents(user_id)
        return jsonify({'consents': consents}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gdpr/consent/withdraw', methods=['POST'])
@jwt_required()
def withdraw_consent():
    """Withdraw user consent"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        consent_type = data.get('consent_type')
        if not consent_type:
            return jsonify({'error': 'Consent type is required'}), 400
        
        # Get client information
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        user_agent = request.headers.get('User-Agent')
        
        gdpr_svc = get_gdpr_service(db)
        from gdpr_service import ConsentType
        
        try:
            consent_enum = ConsentType(consent_type)
        except ValueError:
            return jsonify({'error': 'Invalid consent type'}), 400
        
        success = gdpr_svc.withdraw_consent(
            user_id, consent_enum, ip_address, user_agent
        )
        
        if success:
            return jsonify({'message': 'Consent withdrawn successfully'}), 200
        else:
            return jsonify({'error': 'Failed to withdraw consent'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gdpr/deletion-request', methods=['POST'])
@jwt_required()
def request_data_deletion():
    """Request data deletion (Right to be Forgotten)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        reason = data.get('reason', '')
        
        gdpr_svc = get_gdpr_service(db)
        result = gdpr_svc.request_data_deletion(user_id, reason)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gdpr/deletion-requests', methods=['GET'])
@jwt_required()
def get_deletion_requests():
    """Get user's deletion requests"""
    try:
        user_id = get_jwt_identity()
        
        deletion_requests = DataDeletionRequest.query.filter_by(user_id=user_id).all()
        
        requests_data = []
        for req in deletion_requests:
            requests_data.append({
                'id': req.id,
                'reason': req.reason,
                'status': req.status,
                'requested_at': req.requested_at.isoformat(),
                'processed_at': req.processed_at.isoformat() if req.processed_at else None
            })
        
        return jsonify({'deletion_requests': requests_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gdpr/privacy-report', methods=['GET'])
@jwt_required()
def get_privacy_report():
    """Generate comprehensive privacy report for user"""
    try:
        user_id = get_jwt_identity()
        gdpr_svc = get_gdpr_service(db)
        
        report = gdpr_svc.generate_privacy_report(user_id)
        
        if 'error' in report:
            return jsonify(report), 500
        
        return jsonify({'privacy_report': report}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gdpr/data-retention', methods=['GET'])
@jwt_required()
def get_data_retention_info():
    """Get data retention information for user"""
    try:
        user_id = get_jwt_identity()
        gdpr_svc = get_gdpr_service(db)
        
        retention_info = gdpr_svc.get_data_retention_info(user_id)
        
        if 'error' in retention_info:
            return jsonify(retention_info), 500
        
        return jsonify({'retention_info': retention_info}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin GDPR Routes
@app.route('/api/admin/gdpr/deletion-requests', methods=['GET'])
@jwt_required()
def admin_get_deletion_requests():
    """Get all pending deletion requests (Admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        status = request.args.get('status', 'pending')
        
        deletion_requests = DataDeletionRequest.query.filter_by(status=status).all()
        
        requests_data = []
        for req in deletion_requests:
            requests_data.append({
                'id': req.id,
                'user_id': req.user_id,
                'username': req.user.username,
                'email': req.user.email,
                'reason': req.reason,
                'status': req.status,
                'requested_at': req.requested_at.isoformat(),
                'processed_at': req.processed_at.isoformat() if req.processed_at else None
            })
        
        return jsonify({'deletion_requests': requests_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/gdpr/deletion-request/<int:request_id>/process', methods=['POST'])
@jwt_required()
def admin_process_deletion_request(request_id):
    """Process a data deletion request (Admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        gdpr_svc = get_gdpr_service(db)
        result = gdpr_svc.process_data_deletion(request_id, user_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Data Export Routes
@app.route('/api/data-export/request', methods=['POST'])
@jwt_required()
def request_data_export():
    """Request user data export"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        export_format = data.get('export_format', 'json')
        
        export_svc = get_data_export_service(db)
        result = export_svc.request_data_export(user_id, export_format)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/data-export/requests', methods=['GET'])
@jwt_required()
def get_export_requests():
    """Get user's data export requests"""
    try:
        user_id = get_jwt_identity()
        
        export_svc = get_data_export_service(db)
        requests = export_svc.get_export_requests(user_id)
        
        return jsonify({'export_requests': requests}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/data-export/download/<int:request_id>', methods=['GET'])
@jwt_required()
def download_export(request_id):
    """Download exported data file"""
    try:
        user_id = get_jwt_identity()
        
        export_svc = get_data_export_service(db)
        result = export_svc.download_export(user_id, request_id)
        
        if result['success']:
            from flask import send_file
            return send_file(
                result['file_path'],
                as_attachment=True,
                download_name=result['filename']
            )
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin Data Export Routes
@app.route('/api/admin/data-export/cleanup', methods=['POST'])
@jwt_required()
def admin_cleanup_exports():
    """Clean up expired export files (Admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        export_svc = get_data_export_service(db)
        cleaned_count = export_svc.cleanup_expired_exports()
        
        return jsonify({
            'message': f'Cleaned up {cleaned_count} expired export files',
            'cleaned_count': cleaned_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/data-export/stats', methods=['GET'])
@jwt_required()
def admin_export_stats():
    """Get data export statistics (Admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get export statistics
        total_requests = DataExportRequest.query.count()
        pending_requests = DataExportRequest.query.filter_by(status='pending').count()
        completed_requests = DataExportRequest.query.filter_by(status='completed').count()
        failed_requests = DataExportRequest.query.filter_by(status='failed').count()
        
        # Get format breakdown
        json_requests = DataExportRequest.query.filter_by(export_format='json').count()
        csv_requests = DataExportRequest.query.filter_by(export_format='csv').count()
        pdf_requests = DataExportRequest.query.filter_by(export_format='pdf').count()
        
        # Get recent requests
        recent_requests = DataExportRequest.query.order_by(
            DataExportRequest.requested_at.desc()
        ).limit(10).all()
        
        recent_data = []
        for req in recent_requests:
            recent_data.append({
                'id': req.id,
                'user_id': req.user_id,
                'username': req.user.username,
                'export_format': req.export_format,
                'status': req.status,
                'requested_at': req.requested_at.isoformat(),
                'download_count': req.download_count
            })
        
        stats = {
            'total_requests': total_requests,
            'status_breakdown': {
                'pending': pending_requests,
                'completed': completed_requests,
                'failed': failed_requests
            },
            'format_breakdown': {
                'json': json_requests,
                'csv': csv_requests,
                'pdf': pdf_requests
            },
            'recent_requests': recent_data
        }
        
        return jsonify({'export_stats': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Privacy Settings Routes
@app.route('/api/privacy/settings', methods=['GET'])
@jwt_required()
def get_privacy_settings():
    """Get user's privacy settings"""
    try:
        user_id = get_jwt_identity()
        
        privacy_settings = PrivacySettings.query.filter_by(user_id=user_id).first()
        
        if not privacy_settings:
            # Create default privacy settings if none exist
            privacy_settings = PrivacySettings(user_id=user_id)
            db.session.add(privacy_settings)
            db.session.commit()
        
        settings_data = {
            'profile_public': privacy_settings.profile_public,
            'show_real_name': privacy_settings.show_real_name,
            'show_location': privacy_settings.show_location,
            'show_review_count': privacy_settings.show_review_count,
            'reviews_public': privacy_settings.reviews_public,
            'allow_review_comments': privacy_settings.allow_review_comments,
            'show_verified_purchases': privacy_settings.show_verified_purchases,
            'email_notifications': privacy_settings.email_notifications,
            'marketing_emails': privacy_settings.marketing_emails,
            'review_notifications': privacy_settings.review_notifications,
            'recommendation_emails': privacy_settings.recommendation_emails,
            'allow_analytics': privacy_settings.allow_analytics,
            'allow_personalization': privacy_settings.allow_personalization,
            'third_party_sharing': privacy_settings.third_party_sharing,
            'updated_at': privacy_settings.updated_at.isoformat() if privacy_settings.updated_at else None
        }
        
        return jsonify({'privacy_settings': settings_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/privacy/settings', methods=['PUT'])
@jwt_required()
def update_privacy_settings():
    """Update user's privacy settings"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        privacy_settings = PrivacySettings.query.filter_by(user_id=user_id).first()
        
        if not privacy_settings:
            privacy_settings = PrivacySettings(user_id=user_id)
            db.session.add(privacy_settings)
        
        # Update settings
        updatable_fields = [
            'profile_public', 'show_real_name', 'show_location', 'show_review_count',
            'reviews_public', 'allow_review_comments', 'show_verified_purchases',
            'email_notifications', 'marketing_emails', 'review_notifications', 
            'recommendation_emails', 'allow_analytics', 'allow_personalization', 
            'third_party_sharing'
        ]
        
        updated_fields = []
        for field in updatable_fields:
            if field in data:
                old_value = getattr(privacy_settings, field)
                new_value = data[field]
                if old_value != new_value:
                    setattr(privacy_settings, field, new_value)
                    updated_fields.append(field)
        
        privacy_settings.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Privacy settings updated successfully',
            'updated_fields': updated_fields
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/privacy/settings/reset', methods=['POST'])
@jwt_required()
def reset_privacy_settings():
    """Reset privacy settings to defaults"""
    try:
        user_id = get_jwt_identity()
        
        privacy_settings = PrivacySettings.query.filter_by(user_id=user_id).first()
        
        if privacy_settings:
            # Reset to default values
            privacy_settings.profile_public = True
            privacy_settings.show_real_name = False
            privacy_settings.show_location = False
            privacy_settings.show_review_count = True
            privacy_settings.reviews_public = True
            privacy_settings.allow_review_comments = True
            privacy_settings.show_verified_purchases = True
            privacy_settings.email_notifications = True
            privacy_settings.marketing_emails = False
            privacy_settings.review_notifications = True
            privacy_settings.recommendation_emails = False
            privacy_settings.allow_analytics = True
            privacy_settings.allow_personalization = True
            privacy_settings.third_party_sharing = False
            privacy_settings.updated_at = datetime.utcnow()
        else:
            # Create new settings with defaults
            privacy_settings = PrivacySettings(user_id=user_id)
            db.session.add(privacy_settings)
        
        db.session.commit()
        
        return jsonify({'message': 'Privacy settings reset to defaults'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/privacy/visibility-check', methods=['POST'])
@jwt_required()
def check_content_visibility():
    """Check if content should be visible based on privacy settings"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        content_type = data.get('content_type')  # 'profile', 'review', etc.
        target_user_id = data.get('target_user_id')
        
        if not content_type or not target_user_id:
            return jsonify({'error': 'content_type and target_user_id are required'}), 400
        
        # Get target user's privacy settings
        privacy_settings = PrivacySettings.query.filter_by(user_id=target_user_id).first()
        
        if not privacy_settings:
            # Default settings if none exist
            visibility = {
                'profile': True,
                'reviews': True,
                'real_name': False,
                'location': False,
                'review_count': True,
                'verified_purchases': True
            }
        else:
            visibility = {
                'profile': privacy_settings.profile_public,
                'reviews': privacy_settings.reviews_public,
                'real_name': privacy_settings.show_real_name,
                'location': privacy_settings.show_location,
                'review_count': privacy_settings.show_review_count,
                'verified_purchases': privacy_settings.show_verified_purchases
            }
        
        # Check if user is viewing their own content (always visible)
        is_own_content = user_id == target_user_id
        
        result = {
            'visible': visibility.get(content_type, True) or is_own_content,
            'is_own_content': is_own_content,
            'visibility_settings': visibility if is_own_content else {}
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/privacy/communication-preferences', methods=['GET'])
@jwt_required()
def get_communication_preferences():
    """Get user's communication preferences"""
    try:
        user_id = get_jwt_identity()
        
        privacy_settings = PrivacySettings.query.filter_by(user_id=user_id).first()
        
        if not privacy_settings:
            # Create default settings
            privacy_settings = PrivacySettings(user_id=user_id)
            db.session.add(privacy_settings)
            db.session.commit()
        
        preferences = {
            'email_notifications': privacy_settings.email_notifications,
            'marketing_emails': privacy_settings.marketing_emails,
            'review_notifications': privacy_settings.review_notifications,
            'recommendation_emails': privacy_settings.recommendation_emails
        }
        
        return jsonify({'communication_preferences': preferences}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/privacy/communication-preferences', methods=['PUT'])
@jwt_required()
def update_communication_preferences():
    """Update user's communication preferences"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        privacy_settings = PrivacySettings.query.filter_by(user_id=user_id).first()
        
        if not privacy_settings:
            privacy_settings = PrivacySettings(user_id=user_id)
            db.session.add(privacy_settings)
        
        # Update communication preferences
        communication_fields = [
            'email_notifications', 'marketing_emails', 
            'review_notifications', 'recommendation_emails'
        ]
        
        updated_fields = []
        for field in communication_fields:
            if field in data:
                old_value = getattr(privacy_settings, field)
                new_value = data[field]
                if old_value != new_value:
                    setattr(privacy_settings, field, new_value)
                    updated_fields.append(field)
        
        privacy_settings.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Communication preferences updated successfully',
            'updated_fields': updated_fields
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/privacy/data-sharing', methods=['GET'])
@jwt_required()
def get_data_sharing_preferences():
    """Get user's data sharing preferences"""
    try:
        user_id = get_jwt_identity()
        
        privacy_settings = PrivacySettings.query.filter_by(user_id=user_id).first()
        
        if not privacy_settings:
            privacy_settings = PrivacySettings(user_id=user_id)
            db.session.add(privacy_settings)
            db.session.commit()
        
        preferences = {
            'allow_analytics': privacy_settings.allow_analytics,
            'allow_personalization': privacy_settings.allow_personalization,
            'third_party_sharing': privacy_settings.third_party_sharing
        }
        
        return jsonify({'data_sharing_preferences': preferences}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/privacy/data-sharing', methods=['PUT'])
@jwt_required()
def update_data_sharing_preferences():
    """Update user's data sharing preferences"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        privacy_settings = PrivacySettings.query.filter_by(user_id=user_id).first()
        
        if not privacy_settings:
            privacy_settings = PrivacySettings(user_id=user_id)
            db.session.add(privacy_settings)
        
        # Update data sharing preferences
        sharing_fields = ['allow_analytics', 'allow_personalization', 'third_party_sharing']
        
        updated_fields = []
        for field in sharing_fields:
            if field in data:
                old_value = getattr(privacy_settings, field)
                new_value = data[field]
                if old_value != new_value:
                    setattr(privacy_settings, field, new_value)
                    updated_fields.append(field)
        
        privacy_settings.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Data sharing preferences updated successfully',
            'updated_fields': updated_fields
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Visual Search Routes
@app.route('/api/visual-search/upload', methods=['POST'])
@jwt_required()
def visual_search_upload():
    """Upload image for visual search"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        # Process uploaded image
        success, message, result = visual_search_service.process_uploaded_image(image_file)
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({
            'message': message,
            'search_id': result['filename'],
            'features_extracted': True
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/visual-search/search', methods=['POST'])
@jwt_required()
def visual_search_products():
    """Search for visually similar products"""
    try:
        data = request.get_json()
        search_id = data.get('search_id')
        
        if not search_id:
            return jsonify({'error': 'search_id is required'}), 400
        
        # Load query image features
        query_image_path = os.path.join(visual_search_service.upload_dir, search_id)
        if not os.path.exists(query_image_path):
            return jsonify({'error': 'Search image not found'}), 404
        
        query_features = visual_search_service.extract_features(query_image_path)
        
        # Get all products with images
        products_with_images = db.session.query(Product, Image).join(
            Image, Product.id == Image.product_id
        ).filter(Image.image_type == 'product').all()
        
        # Prepare product features list
        product_features_list = []
        for product, image in products_with_images:
            # Try to load existing features or extract new ones
            features = visual_search_service.load_image_features(product.id)
            
            if not features:
                # Extract features for this product image
                try:
                    image_path = image.file_path
                    if os.path.exists(image_path):
                        product_features = visual_search_service.extract_features(image_path)
                        visual_search_service.save_image_features(product.id, image_path, product_features)
                        features = {
                            'product_id': product.id,
                            'features': product_features
                        }
                except Exception as e:
                    logger.warning(f"Could not extract features for product {product.id}: {e}")
                    continue
            
            if features:
                product_features_list.append(features)
        
        # Search for similar products
        similar_products = visual_search_service.search_similar_products(
            query_features, product_features_list
        )
        
        # Get full product details for results
        results = []
        for similar in similar_products:
            product = Product.query.get(similar['product_id'])
            if product:
                # Get product image
                product_image = Image.query.filter_by(
                    product_id=product.id, 
                    image_type='product'
                ).first()
                
                # Get average rating
                reviews = Review.query.filter_by(product_id=product.id).all()
                avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
                
                results.append({
                    'product_id': product.id,
                    'name': product.name,
                    'brand': product.brand,
                    'category': product.category,
                    'price': product.price,
                    'image_url': product_image.file_url if product_image else None,
                    'average_rating': round(avg_rating, 1),
                    'review_count': len(reviews),
                    'similarity_score': round(similar['similarity_score'], 3)
                })
        
        return jsonify({
            'results': results,
            'total_results': len(results),
            'query_processed': True
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/visual-search/similar/<int:product_id>', methods=['GET'])
def get_visually_similar_products(product_id):
    """Get visually similar products for a specific product"""
    try:
        # Get the target product
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Get product image
        product_image = Image.query.filter_by(
            product_id=product_id, 
            image_type='product'
        ).first()
        
        if not product_image:
            return jsonify({'error': 'Product has no image for visual comparison'}), 404
        
        # Load or extract features for the target product
        features = visual_search_service.load_image_features(product_id)
        
        if not features:
            try:
                if os.path.exists(product_image.file_path):
                    product_features = visual_search_service.extract_features(product_image.file_path)
                    visual_search_service.save_image_features(product_id, product_image.file_path, product_features)
                    features = {
                        'product_id': product_id,
                        'features': product_features
                    }
                else:
                    return jsonify({'error': 'Product image file not found'}), 404
            except Exception as e:
                return jsonify({'error': f'Could not process product image: {str(e)}'}), 500
        
        # Get all other products with images
        other_products = db.session.query(Product, Image).join(
            Image, Product.id == Image.product_id
        ).filter(
            Image.image_type == 'product',
            Product.id != product_id
        ).all()
        
        # Prepare product features list
        product_features_list = []
        for other_product, image in other_products:
            other_features = visual_search_service.load_image_features(other_product.id)
            
            if not other_features:
                try:
                    if os.path.exists(image.file_path):
                        other_product_features = visual_search_service.extract_features(image.file_path)
                        visual_search_service.save_image_features(other_product.id, image.file_path, other_product_features)
                        other_features = {
                            'product_id': other_product.id,
                            'features': other_product_features
                        }
                except Exception as e:
                    continue
            
            if other_features:
                product_features_list.append(other_features)
        
        # Search for similar products
        similar_products = visual_search_service.search_similar_products(
            features['features'], product_features_list
        )
        
        # Get full product details for results
        results = []
        for similar in similar_products[:10]:  # Limit to top 10
            similar_product = Product.query.get(similar['product_id'])
            if similar_product:
                # Get product image
                similar_image = Image.query.filter_by(
                    product_id=similar_product.id, 
                    image_type='product'
                ).first()
                
                # Get average rating
                reviews = Review.query.filter_by(product_id=similar_product.id).all()
                avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0
                
                results.append({
                    'product_id': similar_product.id,
                    'name': similar_product.name,
                    'brand': similar_product.brand,
                    'category': similar_product.category,
                    'price': similar_product.price,
                    'image_url': similar_image.file_url if similar_image else None,
                    'average_rating': round(avg_rating, 1),
                    'review_count': len(reviews),
                    'similarity_score': round(similar['similarity_score'], 3)
                })
        
        return jsonify({
            'product': {
                'id': product.id,
                'name': product.name,
                'brand': product.brand
            },
            'similar_products': results,
            'total_similar': len(results)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/visual-search/stats', methods=['GET'])
@jwt_required()
def get_visual_search_stats():
    """Get visual search statistics"""
    try:
        stats = visual_search_service.get_visual_search_stats()
        return jsonify({'visual_search_stats': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/visual-search/reindex', methods=['POST'])
@jwt_required()
def admin_reindex_visual_features():
    """Admin: Reindex all product images for visual search"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get all products with images
        products_with_images = db.session.query(Product, Image).join(
            Image, Product.id == Image.product_id
        ).filter(Image.image_type == 'product').all()
        
        processed_count = 0
        error_count = 0
        
        for product, image in products_with_images:
            try:
                if os.path.exists(image.file_path):
                    features = visual_search_service.extract_features(image.file_path)
                    visual_search_service.save_image_features(product.id, image.file_path, features)
                    processed_count += 1
                else:
                    error_count += 1
            except Exception as e:
                logger.error(f"Error processing product {product.id}: {e}")
                error_count += 1
        
        return jsonify({
            'message': 'Visual search reindexing completed',
            'processed_products': processed_count,
            'errors': error_count,
            'total_products': len(products_with_images)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/visual-search/cleanup', methods=['POST'])
@jwt_required()
def admin_cleanup_visual_search():
    """Admin: Clean up old visual search files"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        days = data.get('days', 7)
        
        cleaned_count = visual_search_service.cleanup_old_files(days)
        
        return jsonify({
            'message': f'Cleaned up {cleaned_count} old files',
            'cleaned_files': cleaned_count,
            'retention_days': days
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Voice Search Routes
@app.route('/api/voice-search/process', methods=['POST'])
@jwt_required()
def process_voice_query():
    """Process a voice search query and return search parameters"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Process the voice query
        from voice_search_service import voice_search_service
        query = voice_search_service.process_voice_query(text, current_user_id)
        
        # Convert to search parameters
        search_params = voice_search_service.convert_to_search_params(query)
        
        return jsonify({
            'original_text': query.original_text,
            'processed_text': query.processed_text,
            'intent': query.intent,
            'entities': query.entities,
            'confidence': query.confidence,
            'search_params': search_params,
            'timestamp': query.timestamp.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice-search/suggestions', methods=['GET'])
def get_voice_search_suggestions():
    """Get voice search suggestions based on partial input"""
    try:
        partial_text = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 5)), 10)
        
        if not partial_text:
            return jsonify({'suggestions': []}), 200
        
        from voice_search_service import voice_search_service
        suggestions = voice_search_service.get_search_suggestions(partial_text, limit)
        
        return jsonify({
            'suggestions': suggestions,
            'partial_text': partial_text
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice-search/analytics', methods=['GET'])
@jwt_required()
def get_voice_search_analytics():
    """Get voice search analytics (admin only)"""
    try:
        # Check if user is admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        days = min(int(request.args.get('days', 30)), 365)
        
        from voice_search_service import voice_search_service
        analytics = voice_search_service.get_voice_search_analytics(days)
        
        return jsonify(analytics), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice-search/search', methods=['POST'])
@jwt_required()
def voice_search():
    """Perform search based on voice query"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # Get current user
        current_user_id = get_jwt_identity()
        
        # Process the voice query
        from voice_search_service import voice_search_service
        query = voice_search_service.process_voice_query(text, current_user_id)
        
        # Convert to search parameters
        search_params = voice_search_service.convert_to_search_params(query)
        
        # Perform the actual search using existing search functionality
        from search_service import search_service
        
        # Build search query
        search_query = search_params.get('q', '')
        filters = {
            'category': search_params.get('category'),
            'brand': search_params.get('brand'),
            'min_price': search_params.get('min_price'),
            'max_price': search_params.get('max_price'),
            'min_rating': search_params.get('min_rating')
        }
        
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        # Perform search
        results = search_service.search_products(
            query=search_query,
            filters=filters,
            sort_by=search_params.get('sort', 'relevance'),
            page=1,
            per_page=20
        )
        
        return jsonify({
            'voice_query': {
                'original_text': query.original_text,
                'processed_text': query.processed_text,
                'intent': query.intent,
                'entities': query.entities,
                'confidence': query.confidence
            },
            'search_results': results,
            'search_params': search_params
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Cache invalidation hooks
@app.after_request
def invalidate_cache_on_mutations(response):
    """Invalidate relevant cache entries after data mutations"""
    if request.method in ['POST', 'PUT', 'DELETE'] and response.status_code < 400:
        try:
            # Invalidate cache based on endpoint
            if '/products' in request.path:
                performance_svc.invalidate_cache_group('products')
                performance_svc.invalidate_cache_group('categories')
            elif '/reviews' in request.path:
                performance_svc.invalidate_cache_group('reviews')
                performance_svc.invalidate_cache_group('products')
            elif '/categories' in request.path:
                performance_svc.invalidate_cache_group('categories')
        except Exception as e:
            logger.warning(f"Cache invalidation error: {e}")
    
    return response

if __name__ == "__main__":
    # Initialize database indexes on startup
    with app.app_context():
        db.create_all()
        performance_svc.optimize_database_indexes()
        performance_svc.warm_cache()
        
        # Initialize GDPR service
        gdpr_svc = get_gdpr_service(db)
        
        # Initialize data export service
        export_svc = get_data_export_service(db)
        
        # Initialize visual search service
        visual_search_service.init_app(app)
    
    app.run(host="0.0.0.0", port=5000, debug=True)

