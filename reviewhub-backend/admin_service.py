"""
Admin Service for ReviewHub
Provides administrative functions for content management, user management, and analytics
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy import func, desc, asc

logger = logging.getLogger(__name__)

class AdminService:
    def __init__(self, db):
        self.db = db
    
    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get overview statistics for admin dashboard"""
        try:
            from app_enhanced import User, Product, Review, Category, UserInteraction
            
            # Basic counts
            total_users = User.query.count()
            total_products = Product.query.filter_by(is_active=True).count()
            total_reviews = Review.query.filter_by(is_active=True).count()
            total_categories = Category.query.count()
            
            # Recent activity (last 30 days)
            recent_date = datetime.utcnow() - timedelta(days=30)
            new_users = User.query.filter(User.created_at >= recent_date).count()
            new_reviews = Review.query.filter(Review.created_at >= recent_date).count()
            
            # User engagement
            active_users = self.db.session.query(UserInteraction.user_id).distinct().filter(
                UserInteraction.timestamp >= recent_date
            ).count()
            
            # Review statistics
            avg_rating = self.db.session.query(func.avg(Review.rating)).filter(
                Review.is_active == True
            ).scalar() or 0
            
            # Top categories by product count
            top_categories = self.db.session.query(
                Category.name,
                func.count(Product.id).label('product_count')
            ).join(Product).filter(Product.is_active == True).group_by(
                Category.id, Category.name
            ).order_by(desc('product_count')).limit(5).all()
            
            return {
                'overview': {
                    'total_users': total_users,
                    'total_products': total_products,
                    'total_reviews': total_reviews,
                    'total_categories': total_categories,
                    'new_users_30d': new_users,
                    'new_reviews_30d': new_reviews,
                    'active_users_30d': active_users,
                    'average_rating': round(avg_rating, 2)
                },
                'top_categories': [
                    {'name': name, 'product_count': count} 
                    for name, count in top_categories
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {e}")
            return {}
    
    def get_users(self, page: int = 1, per_page: int = 20, search: str = None, 
                  sort_by: str = 'created_at', order: str = 'desc') -> Dict[str, Any]:
        """Get paginated list of users with search and sorting"""
        try:
            from app_enhanced import User, Review
            
            query = User.query
            
            # Apply search filter
            if search:
                query = query.filter(
                    User.username.contains(search) |
                    User.email.contains(search) |
                    User.first_name.contains(search) |
                    User.last_name.contains(search)
                )
            
            # Apply sorting
            sort_column = getattr(User, sort_by, User.created_at)
            if order == 'desc':
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
            
            # Paginate
            users = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            # Add review counts
            user_data = []
            for user in users.items:
                user_dict = user.to_dict()
                user_dict['review_count'] = Review.query.filter_by(
                    user_id=user.id, is_active=True
                ).count()
                user_data.append(user_dict)
            
            return {
                'users': user_data,
                'total': users.total,
                'pages': users.pages,
                'current_page': page,
                'per_page': per_page
            }
            
        except Exception as e:
            logger.error(f"Error getting users: {e}")
            return {'users': [], 'total': 0, 'pages': 0, 'current_page': 1}
    
    def get_products(self, page: int = 1, per_page: int = 20, search: str = None,
                     category_id: int = None, sort_by: str = 'created_at', 
                     order: str = 'desc') -> Dict[str, Any]:
        """Get paginated list of products with search and filtering"""
        try:
            from app_enhanced import Product, Category
            
            query = Product.query
            
            # Apply search filter
            if search:
                query = query.filter(
                    Product.name.contains(search) |
                    Product.brand.contains(search) |
                    Product.description.contains(search)
                )
            
            # Apply category filter
            if category_id:
                query = query.filter(Product.category_id == category_id)
            
            # Apply sorting
            sort_column = getattr(Product, sort_by, Product.created_at)
            if order == 'desc':
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
            
            # Paginate
            products = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            return {
                'products': [product.to_dict() for product in products.items],
                'total': products.total,
                'pages': products.pages,
                'current_page': page,
                'per_page': per_page
            }
            
        except Exception as e:
            logger.error(f"Error getting products: {e}")
            return {'products': [], 'total': 0, 'pages': 0, 'current_page': 1}
    
    def get_reviews(self, page: int = 1, per_page: int = 20, search: str = None,
                    product_id: int = None, user_id: int = None, rating: int = None,
                    sort_by: str = 'created_at', order: str = 'desc') -> Dict[str, Any]:
        """Get paginated list of reviews with search and filtering"""
        try:
            from app_enhanced import Review, Product, User
            
            query = Review.query.join(User).join(Product)
            
            # Apply search filter
            if search:
                query = query.filter(
                    Review.title.contains(search) |
                    Review.content.contains(search) |
                    Product.name.contains(search) |
                    User.username.contains(search)
                )
            
            # Apply filters
            if product_id:
                query = query.filter(Review.product_id == product_id)
            
            if user_id:
                query = query.filter(Review.user_id == user_id)
            
            if rating:
                query = query.filter(Review.rating == rating)
            
            # Apply sorting
            sort_column = getattr(Review, sort_by, Review.created_at)
            if order == 'desc':
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
            
            # Paginate
            reviews = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            return {
                'reviews': [review.to_dict() for review in reviews.items],
                'total': reviews.total,
                'pages': reviews.pages,
                'current_page': page,
                'per_page': per_page
            }
            
        except Exception as e:
            logger.error(f"Error getting reviews: {e}")
            return {'reviews': [], 'total': 0, 'pages': 0, 'current_page': 1}
    
    def update_user_status(self, user_id: int, is_active: bool) -> bool:
        """Update user active status"""
        try:
            from app_enhanced import User
            
            user = User.query.get(user_id)
            if not user:
                return False
            
            user.is_active = is_active
            self.db.session.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating user status: {e}")
            self.db.session.rollback()
            return False
    
    def update_product_status(self, product_id: int, is_active: bool) -> bool:
        """Update product active status"""
        try:
            from app_enhanced import Product
            
            product = Product.query.get(product_id)
            if not product:
                return False
            
            product.is_active = is_active
            self.db.session.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating product status: {e}")
            self.db.session.rollback()
            return False
    
    def update_review_status(self, review_id: int, is_active: bool) -> bool:
        """Update review active status"""
        try:
            from app_enhanced import Review
            
            review = Review.query.get(review_id)
            if not review:
                return False
            
            review.is_active = is_active
            self.db.session.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating review status: {e}")
            self.db.session.rollback()
            return False
    
    def create_product(self, product_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new product"""
        try:
            from app_enhanced import Product
            
            product = Product(
                name=product_data['name'],
                brand=product_data.get('brand'),
                model=product_data.get('model'),
                description=product_data.get('description'),
                category_id=product_data['category_id'],
                image_url=product_data.get('image_url'),
                price_min=product_data.get('price_min'),
                price_max=product_data.get('price_max'),
                specifications=product_data.get('specifications')
            )
            
            self.db.session.add(product)
            self.db.session.commit()
            
            return product.to_dict()
            
        except Exception as e:
            logger.error(f"Error creating product: {e}")
            self.db.session.rollback()
            return None
    
    def update_product(self, product_id: int, product_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing product"""
        try:
            from app_enhanced import Product
            
            product = Product.query.get(product_id)
            if not product:
                return None
            
            # Update allowed fields
            allowed_fields = [
                'name', 'brand', 'model', 'description', 'category_id',
                'image_url', 'price_min', 'price_max', 'specifications'
            ]
            
            for field in allowed_fields:
                if field in product_data:
                    setattr(product, field, product_data[field])
            
            product.updated_at = datetime.utcnow()
            self.db.session.commit()
            
            return product.to_dict()
            
        except Exception as e:
            logger.error(f"Error updating product: {e}")
            self.db.session.rollback()
            return None
    
    def create_category(self, category_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new category"""
        try:
            from app_enhanced import Category
            
            # Generate slug from name
            slug = category_data['name'].lower().replace(' ', '-').replace('&', 'and')
            
            category = Category(
                name=category_data['name'],
                slug=slug,
                description=category_data.get('description'),
                icon_url=category_data.get('icon_url')
            )
            
            self.db.session.add(category)
            self.db.session.commit()
            
            return {
                'id': category.id,
                'name': category.name,
                'slug': category.slug,
                'description': category.description,
                'icon_url': category.icon_url,
                'created_at': category.created_at.isoformat() if category.created_at else None
            }
            
        except Exception as e:
            logger.error(f"Error creating category: {e}")
            self.db.session.rollback()
            return None
    
    def get_analytics_data(self, days: int = 30) -> Dict[str, Any]:
        """Get detailed analytics data for admin dashboard"""
        try:
            from app_enhanced import User, Product, Review, UserInteraction
            
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Daily user registrations
            daily_users = self.db.session.query(
                func.date(User.created_at).label('date'),
                func.count(User.id).label('count')
            ).filter(
                User.created_at >= start_date
            ).group_by(func.date(User.created_at)).all()
            
            # Daily review counts
            daily_reviews = self.db.session.query(
                func.date(Review.created_at).label('date'),
                func.count(Review.id).label('count')
            ).filter(
                Review.created_at >= start_date,
                Review.is_active == True
            ).group_by(func.date(Review.created_at)).all()
            
            # Rating distribution
            rating_dist = self.db.session.query(
                Review.rating,
                func.count(Review.id).label('count')
            ).filter(Review.is_active == True).group_by(Review.rating).all()
            
            # Top products by review count
            top_products = self.db.session.query(
                Product.name,
                func.count(Review.id).label('review_count'),
                func.avg(Review.rating).label('avg_rating')
            ).join(Review).filter(
                Review.is_active == True,
                Product.is_active == True
            ).group_by(Product.id, Product.name).order_by(
                desc('review_count')
            ).limit(10).all()
            
            # User interaction types
            interaction_types = self.db.session.query(
                UserInteraction.interaction_type,
                func.count(UserInteraction.id).label('count')
            ).filter(
                UserInteraction.timestamp >= start_date
            ).group_by(UserInteraction.interaction_type).all()
            
            return {
                'daily_users': [
                    {'date': date.isoformat(), 'count': count} 
                    for date, count in daily_users
                ],
                'daily_reviews': [
                    {'date': date.isoformat(), 'count': count} 
                    for date, count in daily_reviews
                ],
                'rating_distribution': [
                    {'rating': rating, 'count': count} 
                    for rating, count in rating_dist
                ],
                'top_products': [
                    {
                        'name': name, 
                        'review_count': review_count,
                        'avg_rating': float(avg_rating) if avg_rating else 0
                    }
                    for name, review_count, avg_rating in top_products
                ],
                'interaction_types': [
                    {'type': interaction_type, 'count': count}
                    for interaction_type, count in interaction_types
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting analytics data: {e}")
            return {}
    
    def bulk_update_products(self, product_ids: List[int], updates: Dict[str, Any]) -> int:
        """Bulk update multiple products"""
        try:
            from app_enhanced import Product
            
            updated_count = 0
            for product_id in product_ids:
                product = Product.query.get(product_id)
                if product:
                    for field, value in updates.items():
                        if hasattr(product, field):
                            setattr(product, field, value)
                    product.updated_at = datetime.utcnow()
                    updated_count += 1
            
            self.db.session.commit()
            return updated_count
            
        except Exception as e:
            logger.error(f"Error bulk updating products: {e}")
            self.db.session.rollback()
            return 0
    
    def bulk_update_reviews(self, review_ids: List[int], updates: Dict[str, Any]) -> int:
        """Bulk update multiple reviews"""
        try:
            from app_enhanced import Review
            
            updated_count = 0
            for review_id in review_ids:
                review = Review.query.get(review_id)
                if review:
                    for field, value in updates.items():
                        if hasattr(review, field):
                            setattr(review, field, value)
                    review.updated_at = datetime.utcnow()
                    updated_count += 1
            
            self.db.session.commit()
            return updated_count
            
        except Exception as e:
            logger.error(f"Error bulk updating reviews: {e}")
            self.db.session.rollback()
            return 0

# Global admin service instance
admin_service = None

def get_admin_service(db):
    """Get or create admin service instance"""
    global admin_service
    if admin_service is None:
        admin_service = AdminService(db)
    return admin_service

