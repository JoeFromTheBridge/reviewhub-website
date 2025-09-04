"""
Performance Service for ReviewHub
Handles caching, database optimization, and performance monitoring
"""

import redis
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
from functools import wraps
import hashlib
import os

logger = logging.getLogger(__name__)

class PerformanceService:
    def __init__(self, app=None, db=None):
        self.app = app
        self.db = db
        self.redis_client = None
        self.cache_enabled = False
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the performance service with Flask app"""
        self.app = app
        
        # Initialize Redis if available
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()  # Test connection
            self.cache_enabled = True
            logger.info("Redis cache initialized successfully")
        except Exception as e:
            logger.warning(f"Redis not available, caching disabled: {e}")
            self.cache_enabled = False
    
    def generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a unique cache key from prefix and arguments"""
        key_data = f"{prefix}:{':'.join(str(arg) for arg in args)}"
        if kwargs:
            key_data += f":{':'.join(f'{k}={v}' for k, v in sorted(kwargs.items()))}"
        
        # Hash long keys to avoid Redis key length limits
        if len(key_data) > 200:
            key_data = f"{prefix}:{hashlib.md5(key_data.encode()).hexdigest()}"
        
        return key_data
    
    def cache_get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.cache_enabled:
            return None
        
        try:
            cached_data = self.redis_client.get(key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
        
        return None
    
    def cache_set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL (default 5 minutes)"""
        if not self.cache_enabled:
            return False
        
        try:
            serialized_value = json.dumps(value, default=str)
            self.redis_client.setex(key, ttl, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    def cache_delete(self, key: str) -> bool:
        """Delete value from cache"""
        if not self.cache_enabled:
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    def cache_delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.cache_enabled:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0
    
    def cached(self, ttl: int = 300, key_prefix: str = None):
        """Decorator for caching function results"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                if not self.cache_enabled:
                    return func(*args, **kwargs)
                
                # Generate cache key
                prefix = key_prefix or f"func:{func.__name__}"
                cache_key = self.generate_cache_key(prefix, *args, **kwargs)
                
                # Try to get from cache
                cached_result = self.cache_get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                self.cache_set(cache_key, result, ttl)
                
                return result
            return wrapper
        return decorator
    
    def invalidate_cache_group(self, group: str):
        """Invalidate all cache entries for a specific group"""
        pattern = f"{group}:*"
        deleted_count = self.cache_delete_pattern(pattern)
        logger.info(f"Invalidated {deleted_count} cache entries for group: {group}")
        return deleted_count
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.cache_enabled:
            return {"cache_enabled": False}
        
        try:
            info = self.redis_client.info()
            return {
                "cache_enabled": True,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(
                    info.get("keyspace_hits", 0), 
                    info.get("keyspace_misses", 0)
                )
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"cache_enabled": True, "error": str(e)}
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate percentage"""
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 2)
    
    def optimize_database_indexes(self):
        """Create database indexes for better query performance"""
        if not self.db:
            logger.error("Database not available for index optimization")
            return False
        
        try:
            # Import models
            from app_enhanced import User, Product, Review, Category, UserInteraction
            
            # Create indexes using raw SQL for better control
            indexes = [
                # User indexes
                "CREATE INDEX IF NOT EXISTS idx_users_email ON user(email)",
                "CREATE INDEX IF NOT EXISTS idx_users_username ON user(username)",
                "CREATE INDEX IF NOT EXISTS idx_users_created_at ON user(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_users_is_active ON user(is_active)",
                "CREATE INDEX IF NOT EXISTS idx_users_email_verified ON user(email_verified)",
                
                # Product indexes
                "CREATE INDEX IF NOT EXISTS idx_products_name ON product(name)",
                "CREATE INDEX IF NOT EXISTS idx_products_brand ON product(brand)",
                "CREATE INDEX IF NOT EXISTS idx_products_category_id ON product(category_id)",
                "CREATE INDEX IF NOT EXISTS idx_products_is_active ON product(is_active)",
                "CREATE INDEX IF NOT EXISTS idx_products_created_at ON product(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_products_rating ON product(average_rating)",
                
                # Review indexes
                "CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON review(product_id)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON review(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_rating ON review(rating)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON review(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_is_active ON review(is_active)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_helpful_count ON review(helpful_count)",
                
                # Composite indexes for common queries
                "CREATE INDEX IF NOT EXISTS idx_reviews_product_rating ON review(product_id, rating)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON review(product_id, created_at)",
                "CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON review(user_id, created_at)",
                "CREATE INDEX IF NOT EXISTS idx_products_category_rating ON product(category_id, average_rating)",
                
                # UserInteraction indexes
                "CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_interaction(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_interactions_product_id ON user_interaction(product_id)",
                "CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interaction(interaction_type)",
                "CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON user_interaction(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_interactions_user_product ON user_interaction(user_id, product_id)",
                
                # Category indexes
                "CREATE INDEX IF NOT EXISTS idx_categories_slug ON category(slug)",
                "CREATE INDEX IF NOT EXISTS idx_categories_name ON category(name)",
            ]
            
            created_count = 0
            for index_sql in indexes:
                try:
                    self.db.session.execute(index_sql)
                    created_count += 1
                except Exception as e:
                    logger.warning(f"Index creation failed: {index_sql} - {e}")
            
            self.db.session.commit()
            logger.info(f"Database optimization complete. Created/verified {created_count} indexes.")
            return True
            
        except Exception as e:
            logger.error(f"Database index optimization failed: {e}")
            self.db.session.rollback()
            return False
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "cache": self.get_cache_stats()
        }
        
        # Database metrics
        if self.db:
            try:
                from app_enhanced import User, Product, Review
                
                metrics["database"] = {
                    "total_users": User.query.count(),
                    "total_products": Product.query.count(),
                    "total_reviews": Review.query.count(),
                    "active_users": User.query.filter_by(is_active=True).count(),
                    "active_products": Product.query.filter_by(is_active=True).count(),
                    "active_reviews": Review.query.filter_by(is_active=True).count(),
                }
            except Exception as e:
                metrics["database"] = {"error": str(e)}
        
        return metrics
    
    def warm_cache(self):
        """Pre-populate cache with frequently accessed data"""
        if not self.cache_enabled:
            return False
        
        try:
            from app_enhanced import Product, Category, Review
            
            # Cache popular products
            popular_products = Product.query.filter_by(is_active=True)\
                .order_by(Product.average_rating.desc())\
                .limit(20).all()
            
            for product in popular_products:
                cache_key = f"product:{product.id}"
                self.cache_set(cache_key, product.to_dict(), ttl=1800)  # 30 minutes
            
            # Cache categories
            categories = Category.query.all()
            categories_data = [cat.to_dict() for cat in categories]
            self.cache_set("categories:all", categories_data, ttl=3600)  # 1 hour
            
            # Cache recent reviews
            recent_reviews = Review.query.filter_by(is_active=True)\
                .order_by(Review.created_at.desc())\
                .limit(50).all()
            
            reviews_data = [review.to_dict() for review in recent_reviews]
            self.cache_set("reviews:recent", reviews_data, ttl=600)  # 10 minutes
            
            logger.info("Cache warming completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
            return False

# Global performance service instance
performance_service = None

def get_performance_service(app=None, db=None):
    """Get or create performance service instance"""
    global performance_service
    if performance_service is None:
        performance_service = PerformanceService(app, db)
    return performance_service

