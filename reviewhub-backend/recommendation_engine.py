"""
Recommendation Engine for ReviewHub
Provides personalized product recommendations based on user behavior and preferences
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class RecommendationEngine:
    def __init__(self, db):
        self.db = db
        self.user_preferences = {}
        self.product_similarities = {}
        self.category_preferences = {}
        
    def track_user_interaction(self, user_id: int, product_id: int, interaction_type: str, rating: Optional[int] = None):
        """
        Track user interactions for recommendation learning
        
        Args:
            user_id: ID of the user
            product_id: ID of the product
            interaction_type: 'view', 'review', 'search', 'purchase'
            rating: Rating given (for review interactions)
        """
        try:
            from app_enhanced import UserInteraction
            
            interaction = UserInteraction(
                user_id=user_id,
                product_id=product_id,
                interaction_type=interaction_type,
                rating=rating,
                timestamp=datetime.utcnow()
            )
            
            self.db.session.add(interaction)
            self.db.session.commit()
            
            # Update user preferences cache
            self._update_user_preferences(user_id)
            
        except Exception as e:
            logger.error(f"Error tracking user interaction: {e}")
            self.db.session.rollback()
    
    def get_user_recommendations(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get personalized product recommendations for a user
        
        Args:
            user_id: ID of the user
            limit: Number of recommendations to return
            
        Returns:
            List of recommended products with scores
        """
        try:
            # Get user preferences
            user_prefs = self._get_user_preferences(user_id)
            
            # Get collaborative filtering recommendations
            collab_recs = self._collaborative_filtering(user_id, limit * 2)
            
            # Get content-based recommendations
            content_recs = self._content_based_filtering(user_id, limit * 2)
            
            # Combine and rank recommendations
            combined_recs = self._combine_recommendations(collab_recs, content_recs, user_prefs)
            
            # Get product details
            recommendations = []
            for product_id, score in combined_recs[:limit]:
                product = self._get_product_details(product_id)
                if product:
                    product['recommendation_score'] = score
                    product['recommendation_reasons'] = self._get_recommendation_reasons(user_id, product_id)
                    recommendations.append(product)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting user recommendations: {e}")
            return []
    
    def get_similar_products(self, product_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get products similar to a given product
        
        Args:
            product_id: ID of the reference product
            limit: Number of similar products to return
            
        Returns:
            List of similar products with similarity scores
        """
        try:
            from app_enhanced import Product, Review
            
            # Get the reference product
            ref_product = Product.query.get(product_id)
            if not ref_product:
                return []
            
            # Find products in the same category
            similar_products = Product.query.filter(
                Product.category_id == ref_product.category_id,
                Product.id != product_id,
                Product.is_active == True
            ).all()
            
            # Calculate similarity scores
            similarities = []
            for product in similar_products:
                similarity_score = self._calculate_product_similarity(ref_product, product)
                similarities.append((product.id, similarity_score))
            
            # Sort by similarity score
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            # Get product details
            recommendations = []
            for product_id, score in similarities[:limit]:
                product = self._get_product_details(product_id)
                if product:
                    product['similarity_score'] = score
                    recommendations.append(product)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting similar products: {e}")
            return []
    
    def get_trending_products(self, category_id: Optional[int] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get trending products based on recent activity
        
        Args:
            category_id: Optional category filter
            limit: Number of trending products to return
            
        Returns:
            List of trending products with trend scores
        """
        try:
            from app_enhanced import Product, Review, UserInteraction
            
            # Calculate trend scores based on recent activity
            recent_date = datetime.utcnow() - timedelta(days=7)
            
            # Query for recent interactions
            query = self.db.session.query(
                UserInteraction.product_id,
                self.db.func.count(UserInteraction.id).label('interaction_count'),
                self.db.func.avg(UserInteraction.rating).label('avg_rating')
            ).filter(
                UserInteraction.timestamp >= recent_date
            ).group_by(UserInteraction.product_id)
            
            if category_id:
                query = query.join(Product).filter(Product.category_id == category_id)
            
            trending_data = query.order_by(
                self.db.desc('interaction_count')
            ).limit(limit * 2).all()
            
            # Get product details and calculate trend scores
            recommendations = []
            for product_id, interaction_count, avg_rating in trending_data:
                product = self._get_product_details(product_id)
                if product:
                    # Calculate trend score (weighted by interactions and rating)
                    trend_score = interaction_count * (avg_rating or 0) / 5.0
                    product['trend_score'] = trend_score
                    product['recent_interactions'] = interaction_count
                    recommendations.append(product)
            
            # Sort by trend score
            recommendations.sort(key=lambda x: x['trend_score'], reverse=True)
            
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error getting trending products: {e}")
            return []
    
    def get_user_analytics(self, user_id: int) -> Dict[str, Any]:
        """
        Get analytics data for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            Dictionary containing user analytics
        """
        try:
            from app_enhanced import User, Review, UserInteraction, Product, Category
            
            user = User.query.get(user_id)
            if not user:
                return {}
            
            # Basic user stats
            review_count = Review.query.filter_by(user_id=user_id, is_active=True).count()
            
            # Interaction stats
            interactions = UserInteraction.query.filter_by(user_id=user_id).all()
            interaction_stats = Counter([i.interaction_type for i in interactions])
            
            # Category preferences
            category_interactions = self.db.session.query(
                Category.name,
                self.db.func.count(UserInteraction.id).label('count')
            ).join(Product).join(UserInteraction).filter(
                UserInteraction.user_id == user_id
            ).group_by(Category.id, Category.name).all()
            
            # Rating distribution
            ratings = [r.rating for r in Review.query.filter_by(user_id=user_id, is_active=True).all()]
            rating_distribution = Counter(ratings) if ratings else {}
            
            # Recent activity
            recent_interactions = UserInteraction.query.filter_by(user_id=user_id).order_by(
                UserInteraction.timestamp.desc()
            ).limit(10).all()
            
            return {
                'user_id': user_id,
                'username': user.username,
                'member_since': user.created_at.isoformat() if user.created_at else None,
                'review_count': review_count,
                'interaction_stats': dict(interaction_stats),
                'category_preferences': [{'category': name, 'count': count} for name, count in category_interactions],
                'rating_distribution': dict(rating_distribution),
                'average_rating': sum(ratings) / len(ratings) if ratings else 0,
                'recent_activity': [
                    {
                        'type': i.interaction_type,
                        'product_id': i.product_id,
                        'timestamp': i.timestamp.isoformat(),
                        'rating': i.rating
                    }
                    for i in recent_interactions
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting user analytics: {e}")
            return {}
    
    def _get_user_preferences(self, user_id: int) -> Dict[str, Any]:
        """Get or calculate user preferences"""
        if user_id in self.user_preferences:
            return self.user_preferences[user_id]
        
        return self._update_user_preferences(user_id)
    
    def _update_user_preferences(self, user_id: int) -> Dict[str, Any]:
        """Update user preferences based on interactions"""
        try:
            from app_enhanced import UserInteraction, Product, Category
            
            # Get user interactions
            interactions = self.db.session.query(
                UserInteraction, Product, Category
            ).join(Product).join(Category).filter(
                UserInteraction.user_id == user_id
            ).all()
            
            # Calculate preferences
            category_scores = defaultdict(float)
            brand_scores = defaultdict(float)
            price_preferences = []
            rating_preferences = []
            
            for interaction, product, category in interactions:
                weight = self._get_interaction_weight(interaction.interaction_type)
                
                # Category preferences
                category_scores[category.name] += weight
                
                # Brand preferences
                if product.brand:
                    brand_scores[product.brand] += weight
                
                # Price preferences
                if product.price_min and product.price_max:
                    avg_price = (product.price_min + product.price_max) / 2
                    price_preferences.append(avg_price)
                
                # Rating preferences
                if interaction.rating:
                    rating_preferences.append(interaction.rating)
            
            # Normalize scores
            total_category_score = sum(category_scores.values())
            if total_category_score > 0:
                category_scores = {k: v/total_category_score for k, v in category_scores.items()}
            
            total_brand_score = sum(brand_scores.values())
            if total_brand_score > 0:
                brand_scores = {k: v/total_brand_score for k, v in brand_scores.items()}
            
            preferences = {
                'categories': dict(category_scores),
                'brands': dict(brand_scores),
                'avg_price_preference': np.mean(price_preferences) if price_preferences else None,
                'avg_rating_given': np.mean(rating_preferences) if rating_preferences else None,
                'interaction_count': len(interactions)
            }
            
            self.user_preferences[user_id] = preferences
            return preferences
            
        except Exception as e:
            logger.error(f"Error updating user preferences: {e}")
            return {}
    
    def _collaborative_filtering(self, user_id: int, limit: int) -> List[tuple]:
        """Collaborative filtering recommendations"""
        try:
            from app_enhanced import UserInteraction, User
            
            # Find users with similar preferences
            user_interactions = UserInteraction.query.filter_by(user_id=user_id).all()
            user_products = set([i.product_id for i in user_interactions])
            
            if not user_products:
                return []
            
            # Find similar users
            similar_users = []
            all_users = User.query.filter(User.id != user_id).all()
            
            for other_user in all_users:
                other_interactions = UserInteraction.query.filter_by(user_id=other_user.id).all()
                other_products = set([i.product_id for i in other_interactions])
                
                # Calculate Jaccard similarity
                intersection = len(user_products.intersection(other_products))
                union = len(user_products.union(other_products))
                
                if union > 0:
                    similarity = intersection / union
                    if similarity > 0.1:  # Minimum similarity threshold
                        similar_users.append((other_user.id, similarity))
            
            # Sort by similarity
            similar_users.sort(key=lambda x: x[1], reverse=True)
            
            # Get recommendations from similar users
            recommendations = defaultdict(float)
            for similar_user_id, similarity in similar_users[:10]:  # Top 10 similar users
                similar_interactions = UserInteraction.query.filter_by(user_id=similar_user_id).all()
                
                for interaction in similar_interactions:
                    if interaction.product_id not in user_products:
                        weight = similarity * self._get_interaction_weight(interaction.interaction_type)
                        if interaction.rating:
                            weight *= (interaction.rating / 5.0)
                        recommendations[interaction.product_id] += weight
            
            # Sort recommendations
            sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
            return sorted_recs[:limit]
            
        except Exception as e:
            logger.error(f"Error in collaborative filtering: {e}")
            return []
    
    def _content_based_filtering(self, user_id: int, limit: int) -> List[tuple]:
        """Content-based filtering recommendations"""
        try:
            user_prefs = self._get_user_preferences(user_id)
            
            if not user_prefs or not user_prefs.get('categories'):
                return []
            
            from app_enhanced import Product, Category, UserInteraction
            
            # Get products the user hasn't interacted with
            user_products = set([
                i.product_id for i in UserInteraction.query.filter_by(user_id=user_id).all()
            ])
            
            # Score products based on user preferences
            recommendations = []
            
            for category_name, category_score in user_prefs['categories'].items():
                category = Category.query.filter_by(name=category_name).first()
                if not category:
                    continue
                
                products = Product.query.filter(
                    Product.category_id == category.id,
                    Product.is_active == True
                ).all()
                
                for product in products:
                    if product.id not in user_products:
                        score = category_score
                        
                        # Boost score for preferred brands
                        if product.brand and product.brand in user_prefs.get('brands', {}):
                            score *= (1 + user_prefs['brands'][product.brand])
                        
                        # Consider product rating
                        if product.average_rating > 0:
                            score *= (product.average_rating / 5.0)
                        
                        recommendations.append((product.id, score))
            
            # Sort and return top recommendations
            recommendations.sort(key=lambda x: x[1], reverse=True)
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error in content-based filtering: {e}")
            return []
    
    def _combine_recommendations(self, collab_recs: List[tuple], content_recs: List[tuple], user_prefs: Dict) -> List[tuple]:
        """Combine collaborative and content-based recommendations"""
        combined = defaultdict(float)
        
        # Weight collaborative filtering recommendations
        for product_id, score in collab_recs:
            combined[product_id] += score * 0.6  # 60% weight
        
        # Weight content-based recommendations
        for product_id, score in content_recs:
            combined[product_id] += score * 0.4  # 40% weight
        
        # Sort by combined score
        sorted_combined = sorted(combined.items(), key=lambda x: x[1], reverse=True)
        return sorted_combined
    
    def _calculate_product_similarity(self, product1, product2) -> float:
        """Calculate similarity between two products"""
        similarity = 0.0
        
        # Category similarity
        if product1.category_id == product2.category_id:
            similarity += 0.4
        
        # Brand similarity
        if product1.brand and product2.brand and product1.brand == product2.brand:
            similarity += 0.3
        
        # Price similarity
        if product1.price_min and product1.price_max and product2.price_min and product2.price_max:
            price1 = (product1.price_min + product1.price_max) / 2
            price2 = (product2.price_min + product2.price_max) / 2
            price_diff = abs(price1 - price2) / max(price1, price2)
            price_similarity = max(0, 1 - price_diff)
            similarity += price_similarity * 0.2
        
        # Rating similarity
        rating_diff = abs(product1.average_rating - product2.average_rating) / 5.0
        rating_similarity = max(0, 1 - rating_diff)
        similarity += rating_similarity * 0.1
        
        return similarity
    
    def _get_interaction_weight(self, interaction_type: str) -> float:
        """Get weight for different interaction types"""
        weights = {
            'view': 1.0,
            'search': 1.5,
            'review': 3.0,
            'purchase': 5.0
        }
        return weights.get(interaction_type, 1.0)
    
    def _get_product_details(self, product_id: int) -> Optional[Dict[str, Any]]:
        """Get product details for recommendations"""
        try:
            from app_enhanced import Product
            
            product = Product.query.get(product_id)
            if not product:
                return None
            
            return product.to_dict()
            
        except Exception as e:
            logger.error(f"Error getting product details: {e}")
            return None
    
    def _get_recommendation_reasons(self, user_id: int, product_id: int) -> List[str]:
        """Get reasons why a product is recommended"""
        reasons = []
        
        try:
            user_prefs = self._get_user_preferences(user_id)
            product = self._get_product_details(product_id)
            
            if not user_prefs or not product:
                return reasons
            
            # Category-based reason
            if product.get('category') in user_prefs.get('categories', {}):
                reasons.append(f"You've shown interest in {product['category']} products")
            
            # Brand-based reason
            if product.get('brand') in user_prefs.get('brands', {}):
                reasons.append(f"You like {product['brand']} products")
            
            # Rating-based reason
            if product.get('average_rating', 0) >= 4.0:
                reasons.append(f"Highly rated ({product['average_rating']:.1f}/5.0)")
            
            # Review count reason
            if product.get('review_count', 0) >= 10:
                reasons.append(f"Popular choice ({product['review_count']} reviews)")
            
            return reasons
            
        except Exception as e:
            logger.error(f"Error getting recommendation reasons: {e}")
            return reasons

# Global recommendation engine instance
recommendation_engine = None

def get_recommendation_engine(db):
    """Get or create recommendation engine instance"""
    global recommendation_engine
    if recommendation_engine is None:
        recommendation_engine = RecommendationEngine(db)
    return recommendation_engine

