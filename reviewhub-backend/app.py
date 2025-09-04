from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

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

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    reviews = db.relationship('Review', backref='user', lazy=True, cascade='all, delete-orphan')
    review_votes = db.relationship('ReviewVote', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active
        }

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon_url = db.Column(db.String(255), nullable=True)
    
    # Relationships
    products = db.relationship('Product', backref='category', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'icon_url': self.icon_url,
            'product_count': len(self.products)
        }

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    price_min = db.Column(db.Float, nullable=True)
    price_max = db.Column(db.Float, nullable=True)
    specifications = db.Column(db.JSON, nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
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
    
    @property
    def price_range(self):
        if self.price_min and self.price_max:
            return f"${self.price_min:.0f} - ${self.price_max:.0f}"
        elif self.price_min:
            return f"From ${self.price_min:.0f}"
        elif self.price_max:
            return f"Up to ${self.price_max:.0f}"
        return "Price not available"

    def to_dict(self, include_reviews=False):
        data = {
            'id': self.id,
            'name': self.name,
            'brand': self.brand,
            'description': self.description,
            'image_url': self.image_url,
            'price_min': self.price_min,
            'price_max': self.price_max,
            'price_range': self.price_range,
            'specifications': self.specifications,
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'average_rating': round(self.average_rating, 1),
            'review_count': self.review_count,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active
        }
        
        if include_reviews:
            data['reviews'] = [review.to_dict() for review in self.reviews]
        
        return data

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    title = db.Column(db.String(200), nullable=True)
    content = db.Column(db.Text, nullable=False)
    is_verified_purchase = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    votes = db.relationship('ReviewVote', backref='review', lazy=True, cascade='all, delete-orphan')

    @property
    def helpful_votes(self):
        return len([vote for vote in self.votes if vote.is_helpful])
    
    @property
    def unhelpful_votes(self):
        return len([vote for vote in self.votes if not vote.is_helpful])

    def to_dict(self, include_user=True):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'rating': self.rating,
            'title': self.title,
            'content': self.content,
            'is_verified_purchase': self.is_verified_purchase,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'is_active': self.is_active,
            'helpful_votes': self.helpful_votes,
            'unhelpful_votes': self.unhelpful_votes
        }
        
        if include_user and self.user:
            data['user'] = {
                'id': self.user.id,
                'username': self.user.username,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name
            }
        
        return data

class ReviewVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('review.id'), nullable=False)
    is_helpful = db.Column(db.Boolean, nullable=False)  # True for helpful, False for unhelpful
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate votes
    __table_args__ = (db.UniqueConstraint('user_id', 'review_id', name='unique_user_review_vote'),)

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'ReviewHub API is running'})

# Product Routes
@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all products with optional filtering and pagination"""
    try:
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category_id = request.args.get('category_id', type=int)
        search = request.args.get('search', '')
        sort_by = request.args.get('sort_by', 'name')  # name, rating, reviews, price
        sort_order = request.args.get('sort_order', 'asc')  # asc, desc
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        min_rating = request.args.get('min_rating', type=float)
        
        # Build query
        query = Product.query.filter(Product.is_active == True)
        
        # Apply filters
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Product.name.ilike(search_term),
                    Product.brand.ilike(search_term),
                    Product.description.ilike(search_term)
                )
            )
        
        if min_price:
            query = query.filter(Product.price_min >= min_price)
        
        if max_price:
            query = query.filter(Product.price_max <= max_price)
        
        # Apply sorting
        if sort_by == 'rating':
            # This is a simplified sort - in production, you'd want to use a subquery
            query = query.order_by(Product.id.desc() if sort_order == 'desc' else Product.id.asc())
        elif sort_by == 'reviews':
            query = query.order_by(Product.id.desc() if sort_order == 'desc' else Product.id.asc())
        elif sort_by == 'price':
            query = query.order_by(Product.price_min.desc() if sort_order == 'desc' else Product.price_min.asc())
        else:  # name
            query = query.order_by(Product.name.desc() if sort_order == 'desc' else Product.name.asc())
        
        # Paginate
        products = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'products': [product.to_dict() for product in products.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': products.total,
                'pages': products.pages,
                'has_next': products.has_next,
                'has_prev': products.has_prev
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Get a specific product with reviews"""
    try:
        product = Product.query.filter_by(id=product_id, is_active=True).first()
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        return jsonify(product.to_dict(include_reviews=True))
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Category Routes
@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories"""
    try:
        categories = Category.query.all()
        return jsonify([category.to_dict() for category in categories])
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Review Routes
@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    """Get reviews with optional filtering"""
    try:
        product_id = request.args.get('product_id', type=int)
        user_id = request.args.get('user_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'created_at')  # created_at, rating, helpful
        sort_order = request.args.get('sort_order', 'desc')
        
        query = Review.query.filter(Review.is_active == True)
        
        if product_id:
            query = query.filter(Review.product_id == product_id)
        
        if user_id:
            query = query.filter(Review.user_id == user_id)
        
        # Apply sorting
        if sort_by == 'rating':
            query = query.order_by(Review.rating.desc() if sort_order == 'desc' else Review.rating.asc())
        elif sort_by == 'helpful':
            # Simplified - in production, you'd join with votes table
            query = query.order_by(Review.id.desc() if sort_order == 'desc' else Review.id.asc())
        else:  # created_at
            query = query.order_by(Review.created_at.desc() if sort_order == 'desc' else Review.created_at.asc())
        
        reviews = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'reviews': [review.to_dict() for review in reviews.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': reviews.total,
                'pages': reviews.pages,
                'has_next': reviews.has_next,
                'has_prev': reviews.has_prev
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    app.run(host='0.0.0.0', port=5000, debug=True)



# Authentication Routes
@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user"""
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
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', '')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': user.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Find user by username or email
        user = User.query.filter(
            db.or_(
                User.username == data['username'],
                User.email == data['username']
            )
        ).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Create access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': user.to_dict()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client-side token removal)"""
    return jsonify({'message': 'Logout successful'})

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict())
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            # Check if email is already taken by another user
            existing_user = User.query.filter(
                User.email == data['email'],
                User.id != current_user_id
            ).first()
            if existing_user:
                return jsonify({'error': 'Email already exists'}), 400
            user.email = data['email']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        if len(data['new_password']) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        user.set_password(data['new_password'])
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Review Submission and Management Routes
@app.route('/api/reviews', methods=['POST'])
@jwt_required()
def create_review():
    """Create a new review"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['product_id', 'rating', 'content']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate rating
        if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
            return jsonify({'error': 'Rating must be an integer between 1 and 5'}), 400
        
        # Check if product exists
        product = Product.query.filter_by(id=data['product_id'], is_active=True).first()
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check if user already reviewed this product
        existing_review = Review.query.filter_by(
            user_id=current_user_id,
            product_id=data['product_id'],
            is_active=True
        ).first()
        
        if existing_review:
            return jsonify({'error': 'You have already reviewed this product'}), 400
        
        # Create new review
        review = Review(
            user_id=current_user_id,
            product_id=data['product_id'],
            rating=data['rating'],
            title=data.get('title', ''),
            content=data['content'],
            is_verified_purchase=data.get('is_verified_purchase', False)
        )
        
        db.session.add(review)
        db.session.commit()
        
        return jsonify({
            'message': 'Review created successfully',
            'review': review.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/<int:review_id>', methods=['PUT'])
@jwt_required()
def update_review(review_id):
    """Update a review (only by the review author)"""
    try:
        current_user_id = get_jwt_identity()
        review = Review.query.filter_by(id=review_id, is_active=True).first()
        
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        if review.user_id != current_user_id:
            return jsonify({'error': 'You can only update your own reviews'}), 403
        
        data = request.get_json()
        
        # Update allowed fields
        if 'rating' in data:
            if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
                return jsonify({'error': 'Rating must be an integer between 1 and 5'}), 400
            review.rating = data['rating']
        
        if 'title' in data:
            review.title = data['title']
        
        if 'content' in data:
            if not data['content']:
                return jsonify({'error': 'Content is required'}), 400
            review.content = data['content']
        
        review.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Review updated successfully',
            'review': review.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(review_id):
    """Delete a review (only by the review author)"""
    try:
        current_user_id = get_jwt_identity()
        review = Review.query.filter_by(id=review_id, is_active=True).first()
        
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        if review.user_id != current_user_id:
            return jsonify({'error': 'You can only delete your own reviews'}), 403
        
        # Soft delete
        review.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Review deleted successfully'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Review Voting Routes
@app.route('/api/reviews/<int:review_id>/vote', methods=['POST'])
@jwt_required()
def vote_review(review_id):
    """Vote on a review (helpful/unhelpful)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        if 'is_helpful' not in data:
            return jsonify({'error': 'is_helpful field is required'}), 400
        
        if not isinstance(data['is_helpful'], bool):
            return jsonify({'error': 'is_helpful must be a boolean'}), 400
        
        # Check if review exists
        review = Review.query.filter_by(id=review_id, is_active=True).first()
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Users cannot vote on their own reviews
        if review.user_id == current_user_id:
            return jsonify({'error': 'You cannot vote on your own review'}), 400
        
        # Check if user already voted on this review
        existing_vote = ReviewVote.query.filter_by(
            user_id=current_user_id,
            review_id=review_id
        ).first()
        
        if existing_vote:
            # Update existing vote
            existing_vote.is_helpful = data['is_helpful']
            message = 'Vote updated successfully'
        else:
            # Create new vote
            vote = ReviewVote(
                user_id=current_user_id,
                review_id=review_id,
                is_helpful=data['is_helpful']
            )
            db.session.add(vote)
            message = 'Vote recorded successfully'
        
        db.session.commit()
        
        return jsonify({
            'message': message,
            'review_id': review_id,
            'helpful_votes': review.helpful_votes,
            'unhelpful_votes': review.unhelpful_votes
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/<int:review_id>/vote', methods=['DELETE'])
@jwt_required()
def remove_vote(review_id):
    """Remove vote from a review"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if review exists
        review = Review.query.filter_by(id=review_id, is_active=True).first()
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Find and remove the vote
        vote = ReviewVote.query.filter_by(
            user_id=current_user_id,
            review_id=review_id
        ).first()
        
        if not vote:
            return jsonify({'error': 'Vote not found'}), 404
        
        db.session.delete(vote)
        db.session.commit()
        
        return jsonify({
            'message': 'Vote removed successfully',
            'review_id': review_id,
            'helpful_votes': review.helpful_votes,
            'unhelpful_votes': review.unhelpful_votes
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# User Reviews Route
@app.route('/api/users/<int:user_id>/reviews', methods=['GET'])
def get_user_reviews(user_id):
    """Get reviews by a specific user"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        reviews = Review.query.filter_by(
            user_id=user_id,
            is_active=True
        ).order_by(Review.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'reviews': [review.to_dict(include_user=False) for review in reviews.items],
            'user': user.to_dict(),
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': reviews.total,
                'pages': reviews.pages,
                'has_next': reviews.has_next,
                'has_prev': reviews.has_prev
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/my-reviews', methods=['GET'])
@jwt_required()
def get_my_reviews():
    """Get current user's reviews"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        reviews = Review.query.filter_by(
            user_id=current_user_id,
            is_active=True
        ).order_by(Review.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Include product information for each review
        reviews_data = []
        for review in reviews.items:
            review_dict = review.to_dict(include_user=False)
            review_dict['product'] = review.product.to_dict() if review.product else None
            reviews_data.append(review_dict)
        
        return jsonify({
            'reviews': reviews_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': reviews.total,
                'pages': reviews.pages,
                'has_next': reviews.has_next,
                'has_prev': reviews.has_prev
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

