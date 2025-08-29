import os
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from elasticsearch import Elasticsearch, NotFoundError
from elasticsearch.helpers import bulk
import logging

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.es_url = os.getenv('ELASTICSEARCH_URL', 'http://localhost:9200')
        self.index_prefix = os.getenv('ELASTICSEARCH_INDEX', 'reviewhub')
        
        # Initialize Elasticsearch client
        try:
            self.es = Elasticsearch([self.es_url])
            self.is_available = self.es.ping()
            if self.is_available:
                logger.info(f"Connected to Elasticsearch at {self.es_url}")
            else:
                logger.warning(f"Elasticsearch not available at {self.es_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch: {str(e)}")
            self.es = None
            self.is_available = False
        
        # Index names
        self.products_index = f"{self.index_prefix}_products"
        self.reviews_index = f"{self.index_prefix}_reviews"
        self.users_index = f"{self.index_prefix}_users"
    
    def create_indices(self):
        """Create Elasticsearch indices with proper mappings"""
        if not self.is_available:
            logger.warning("Elasticsearch not available, skipping index creation")
            return False
        
        try:
            # Products index mapping
            products_mapping = {
                "mappings": {
                    "properties": {
                        "id": {"type": "integer"},
                        "name": {
                            "type": "text",
                            "analyzer": "standard",
                            "fields": {
                                "keyword": {"type": "keyword"},
                                "suggest": {
                                    "type": "completion",
                                    "analyzer": "simple"
                                }
                            }
                        },
                        "brand": {
                            "type": "text",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "model": {
                            "type": "text",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "description": {"type": "text", "analyzer": "standard"},
                        "category": {
                            "type": "text",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "category_id": {"type": "integer"},
                        "price_min": {"type": "float"},
                        "price_max": {"type": "float"},
                        "average_rating": {"type": "float"},
                        "review_count": {"type": "integer"},
                        "view_count": {"type": "integer"},
                        "specifications": {"type": "object"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"},
                        "is_active": {"type": "boolean"}
                    }
                },
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "analysis": {
                        "analyzer": {
                            "product_analyzer": {
                                "type": "custom",
                                "tokenizer": "standard",
                                "filter": ["lowercase", "stop", "snowball"]
                            }
                        }
                    }
                }
            }
            
            # Reviews index mapping
            reviews_mapping = {
                "mappings": {
                    "properties": {
                        "id": {"type": "integer"},
                        "user_id": {"type": "integer"},
                        "product_id": {"type": "integer"},
                        "product_name": {
                            "type": "text",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "user_username": {
                            "type": "text",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "rating": {"type": "integer"},
                        "title": {
                            "type": "text",
                            "analyzer": "standard",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "content": {"type": "text", "analyzer": "standard"},
                        "pros": {"type": "text"},
                        "cons": {"type": "text"},
                        "verified_purchase": {"type": "boolean"},
                        "helpful_votes": {"type": "integer"},
                        "total_votes": {"type": "integer"},
                        "has_images": {"type": "boolean"},
                        "image_count": {"type": "integer"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"},
                        "is_active": {"type": "boolean"}
                    }
                },
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0
                }
            }
            
            # Users index mapping (for search suggestions)
            users_mapping = {
                "mappings": {
                    "properties": {
                        "id": {"type": "integer"},
                        "username": {
                            "type": "text",
                            "fields": {
                                "keyword": {"type": "keyword"},
                                "suggest": {
                                    "type": "completion",
                                    "analyzer": "simple"
                                }
                            }
                        },
                        "first_name": {"type": "text"},
                        "last_name": {"type": "text"},
                        "full_name": {"type": "text"},
                        "review_count": {"type": "integer"},
                        "average_rating_given": {"type": "float"},
                        "created_at": {"type": "date"},
                        "is_active": {"type": "boolean"}
                    }
                },
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0
                }
            }
            
            # Create indices
            indices = [
                (self.products_index, products_mapping),
                (self.reviews_index, reviews_mapping),
                (self.users_index, users_mapping)
            ]
            
            for index_name, mapping in indices:
                if not self.es.indices.exists(index=index_name):
                    self.es.indices.create(index=index_name, body=mapping)
                    logger.info(f"Created index: {index_name}")
                else:
                    logger.info(f"Index already exists: {index_name}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to create indices: {str(e)}")
            return False
    
    def index_product(self, product_data: Dict[str, Any]) -> bool:
        """Index a single product"""
        if not self.is_available:
            return False
        
        try:
            # Prepare document for indexing
            doc = {
                "id": product_data.get("id"),
                "name": product_data.get("name"),
                "brand": product_data.get("brand"),
                "model": product_data.get("model"),
                "description": product_data.get("description"),
                "category": product_data.get("category"),
                "category_id": product_data.get("category_id"),
                "price_min": product_data.get("price_min"),
                "price_max": product_data.get("price_max"),
                "average_rating": product_data.get("average_rating", 0),
                "review_count": product_data.get("review_count", 0),
                "view_count": product_data.get("view_count", 0),
                "specifications": product_data.get("specifications"),
                "created_at": product_data.get("created_at"),
                "updated_at": product_data.get("updated_at"),
                "is_active": product_data.get("is_active", True)
            }
            
            # Add suggestion field for autocomplete
            if doc["name"]:
                doc["name"]["suggest"] = doc["name"]
            
            self.es.index(
                index=self.products_index,
                id=product_data["id"],
                body=doc
            )
            
            logger.debug(f"Indexed product: {product_data.get('name')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to index product {product_data.get('id')}: {str(e)}")
            return False
    
    def index_review(self, review_data: Dict[str, Any]) -> bool:
        """Index a single review"""
        if not self.is_available:
            return False
        
        try:
            # Prepare document for indexing
            doc = {
                "id": review_data.get("id"),
                "user_id": review_data.get("user_id"),
                "product_id": review_data.get("product_id"),
                "product_name": review_data.get("product_name"),
                "user_username": review_data.get("user_username"),
                "rating": review_data.get("rating"),
                "title": review_data.get("title"),
                "content": review_data.get("content"),
                "pros": " ".join(review_data.get("pros", [])) if review_data.get("pros") else None,
                "cons": " ".join(review_data.get("cons", [])) if review_data.get("cons") else None,
                "verified_purchase": review_data.get("verified_purchase", False),
                "helpful_votes": review_data.get("helpful_votes", 0),
                "total_votes": review_data.get("total_votes", 0),
                "has_images": review_data.get("has_images", False),
                "image_count": review_data.get("image_count", 0),
                "created_at": review_data.get("created_at"),
                "updated_at": review_data.get("updated_at"),
                "is_active": review_data.get("is_active", True)
            }
            
            self.es.index(
                index=self.reviews_index,
                id=review_data["id"],
                body=doc
            )
            
            logger.debug(f"Indexed review: {review_data.get('id')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to index review {review_data.get('id')}: {str(e)}")
            return False
    
    def search_products(self, 
                       query: str = "", 
                       filters: Dict[str, Any] = None,
                       sort_by: str = "relevance",
                       page: int = 1,
                       per_page: int = 20) -> Dict[str, Any]:
        """Search products with filters and pagination"""
        if not self.is_available:
            return {"products": [], "total": 0, "page": page, "per_page": per_page}
        
        try:
            # Build search query
            search_body = {
                "from": (page - 1) * per_page,
                "size": per_page,
                "query": {"bool": {"must": [], "filter": []}},
                "aggs": {
                    "categories": {"terms": {"field": "category.keyword", "size": 20}},
                    "brands": {"terms": {"field": "brand.keyword", "size": 20}},
                    "price_ranges": {
                        "range": {
                            "field": "price_min",
                            "ranges": [
                                {"key": "under_50", "to": 50},
                                {"key": "50_100", "from": 50, "to": 100},
                                {"key": "100_500", "from": 100, "to": 500},
                                {"key": "500_1000", "from": 500, "to": 1000},
                                {"key": "over_1000", "from": 1000}
                            ]
                        }
                    },
                    "ratings": {
                        "range": {
                            "field": "average_rating",
                            "ranges": [
                                {"key": "4_plus", "from": 4},
                                {"key": "3_plus", "from": 3},
                                {"key": "2_plus", "from": 2},
                                {"key": "1_plus", "from": 1}
                            ]
                        }
                    }
                }
            }
            
            # Add text search if query provided
            if query.strip():
                search_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query,
                        "fields": [
                            "name^3",
                            "brand^2",
                            "model^2",
                            "description",
                            "category"
                        ],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                })
            else:
                search_body["query"]["bool"]["must"].append({"match_all": {}})
            
            # Add filters
            if filters:
                if filters.get("category"):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"category.keyword": filters["category"]}
                    })
                
                if filters.get("brand"):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"brand.keyword": filters["brand"]}
                    })
                
                if filters.get("price_min") or filters.get("price_max"):
                    price_range = {}
                    if filters.get("price_min"):
                        price_range["gte"] = filters["price_min"]
                    if filters.get("price_max"):
                        price_range["lte"] = filters["price_max"]
                    
                    search_body["query"]["bool"]["filter"].append({
                        "range": {"price_min": price_range}
                    })
                
                if filters.get("rating_min"):
                    search_body["query"]["bool"]["filter"].append({
                        "range": {"average_rating": {"gte": filters["rating_min"]}}
                    })
                
                if filters.get("has_reviews"):
                    search_body["query"]["bool"]["filter"].append({
                        "range": {"review_count": {"gt": 0}}
                    })
            
            # Add active filter
            search_body["query"]["bool"]["filter"].append({
                "term": {"is_active": True}
            })
            
            # Add sorting
            if sort_by == "price_low":
                search_body["sort"] = [{"price_min": {"order": "asc"}}]
            elif sort_by == "price_high":
                search_body["sort"] = [{"price_min": {"order": "desc"}}]
            elif sort_by == "rating":
                search_body["sort"] = [{"average_rating": {"order": "desc"}}]
            elif sort_by == "reviews":
                search_body["sort"] = [{"review_count": {"order": "desc"}}]
            elif sort_by == "newest":
                search_body["sort"] = [{"created_at": {"order": "desc"}}]
            elif sort_by == "popular":
                search_body["sort"] = [{"view_count": {"order": "desc"}}]
            # Default is relevance (no explicit sort)
            
            # Execute search
            response = self.es.search(index=self.products_index, body=search_body)
            
            # Process results
            products = []
            for hit in response["hits"]["hits"]:
                product = hit["_source"]
                product["score"] = hit["_score"]
                products.append(product)
            
            # Process aggregations
            aggregations = {}
            if "aggregations" in response:
                for agg_name, agg_data in response["aggregations"].items():
                    if "buckets" in agg_data:
                        aggregations[agg_name] = agg_data["buckets"]
            
            return {
                "products": products,
                "total": response["hits"]["total"]["value"],
                "page": page,
                "per_page": per_page,
                "aggregations": aggregations
            }
            
        except Exception as e:
            logger.error(f"Product search failed: {str(e)}")
            return {"products": [], "total": 0, "page": page, "per_page": per_page}
    
    def search_reviews(self,
                      query: str = "",
                      filters: Dict[str, Any] = None,
                      sort_by: str = "relevance",
                      page: int = 1,
                      per_page: int = 20) -> Dict[str, Any]:
        """Search reviews with filters and pagination"""
        if not self.is_available:
            return {"reviews": [], "total": 0, "page": page, "per_page": per_page}
        
        try:
            # Build search query
            search_body = {
                "from": (page - 1) * per_page,
                "size": per_page,
                "query": {"bool": {"must": [], "filter": []}},
                "aggs": {
                    "ratings": {"terms": {"field": "rating", "size": 5}},
                    "verified_purchases": {"terms": {"field": "verified_purchase", "size": 2}},
                    "products": {"terms": {"field": "product_name.keyword", "size": 20}}
                }
            }
            
            # Add text search if query provided
            if query.strip():
                search_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query,
                        "fields": [
                            "title^3",
                            "content^2",
                            "pros",
                            "cons",
                            "product_name"
                        ],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                })
            else:
                search_body["query"]["bool"]["must"].append({"match_all": {}})
            
            # Add filters
            if filters:
                if filters.get("product_id"):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"product_id": filters["product_id"]}
                    })
                
                if filters.get("user_id"):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"user_id": filters["user_id"]}
                    })
                
                if filters.get("rating"):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"rating": filters["rating"]}
                    })
                
                if filters.get("rating_min"):
                    search_body["query"]["bool"]["filter"].append({
                        "range": {"rating": {"gte": filters["rating_min"]}}
                    })
                
                if filters.get("verified_only"):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"verified_purchase": True}
                    })
                
                if filters.get("has_images"):
                    search_body["query"]["bool"]["filter"].append({
                        "term": {"has_images": True}
                    })
            
            # Add active filter
            search_body["query"]["bool"]["filter"].append({
                "term": {"is_active": True}
            })
            
            # Add sorting
            if sort_by == "newest":
                search_body["sort"] = [{"created_at": {"order": "desc"}}]
            elif sort_by == "oldest":
                search_body["sort"] = [{"created_at": {"order": "asc"}}]
            elif sort_by == "rating_high":
                search_body["sort"] = [{"rating": {"order": "desc"}}]
            elif sort_by == "rating_low":
                search_body["sort"] = [{"rating": {"order": "asc"}}]
            elif sort_by == "helpful":
                search_body["sort"] = [{"helpful_votes": {"order": "desc"}}]
            # Default is relevance (no explicit sort)
            
            # Execute search
            response = self.es.search(index=self.reviews_index, body=search_body)
            
            # Process results
            reviews = []
            for hit in response["hits"]["hits"]:
                review = hit["_source"]
                review["score"] = hit["_score"]
                reviews.append(review)
            
            # Process aggregations
            aggregations = {}
            if "aggregations" in response:
                for agg_name, agg_data in response["aggregations"].items():
                    if "buckets" in agg_data:
                        aggregations[agg_name] = agg_data["buckets"]
            
            return {
                "reviews": reviews,
                "total": response["hits"]["total"]["value"],
                "page": page,
                "per_page": per_page,
                "aggregations": aggregations
            }
            
        except Exception as e:
            logger.error(f"Review search failed: {str(e)}")
            return {"reviews": [], "total": 0, "page": page, "per_page": per_page}
    
    def get_suggestions(self, query: str, suggestion_type: str = "products") -> List[str]:
        """Get autocomplete suggestions"""
        if not self.is_available or not query.strip():
            return []
        
        try:
            if suggestion_type == "products":
                index = self.products_index
                field = "name.suggest"
            elif suggestion_type == "users":
                index = self.users_index
                field = "username.suggest"
            else:
                return []
            
            search_body = {
                "suggest": {
                    "autocomplete": {
                        "prefix": query,
                        "completion": {
                            "field": field,
                            "size": 10
                        }
                    }
                }
            }
            
            response = self.es.search(index=index, body=search_body)
            
            suggestions = []
            if "suggest" in response and "autocomplete" in response["suggest"]:
                for suggestion in response["suggest"]["autocomplete"]:
                    for option in suggestion["options"]:
                        suggestions.append(option["text"])
            
            return suggestions[:10]  # Limit to 10 suggestions
            
        except Exception as e:
            logger.error(f"Suggestion search failed: {str(e)}")
            return []
    
    def bulk_index_products(self, products: List[Dict[str, Any]]) -> bool:
        """Bulk index multiple products"""
        if not self.is_available or not products:
            return False
        
        try:
            actions = []
            for product in products:
                action = {
                    "_index": self.products_index,
                    "_id": product["id"],
                    "_source": product
                }
                actions.append(action)
            
            success, failed = bulk(self.es, actions)
            logger.info(f"Bulk indexed {success} products, {len(failed)} failed")
            return len(failed) == 0
            
        except Exception as e:
            logger.error(f"Bulk product indexing failed: {str(e)}")
            return False
    
    def bulk_index_reviews(self, reviews: List[Dict[str, Any]]) -> bool:
        """Bulk index multiple reviews"""
        if not self.is_available or not reviews:
            return False
        
        try:
            actions = []
            for review in reviews:
                action = {
                    "_index": self.reviews_index,
                    "_id": review["id"],
                    "_source": review
                }
                actions.append(action)
            
            success, failed = bulk(self.es, actions)
            logger.info(f"Bulk indexed {success} reviews, {len(failed)} failed")
            return len(failed) == 0
            
        except Exception as e:
            logger.error(f"Bulk review indexing failed: {str(e)}")
            return False
    
    def delete_document(self, index: str, doc_id: int) -> bool:
        """Delete a document from an index"""
        if not self.is_available:
            return False
        
        try:
            self.es.delete(index=index, id=doc_id)
            return True
        except NotFoundError:
            logger.warning(f"Document {doc_id} not found in {index}")
            return True  # Already deleted
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id} from {index}: {str(e)}")
            return False
    
    def get_search_analytics(self) -> Dict[str, Any]:
        """Get search analytics and statistics"""
        if not self.is_available:
            return {}
        
        try:
            # Get index statistics
            stats = {}
            
            # Product stats
            product_stats = self.es.count(index=self.products_index)
            stats["total_products"] = product_stats["count"]
            
            # Review stats
            review_stats = self.es.count(index=self.reviews_index)
            stats["total_reviews"] = review_stats["count"]
            
            # Top categories
            category_agg = self.es.search(
                index=self.products_index,
                body={
                    "size": 0,
                    "aggs": {
                        "top_categories": {
                            "terms": {"field": "category.keyword", "size": 10}
                        }
                    }
                }
            )
            
            if "aggregations" in category_agg:
                stats["top_categories"] = category_agg["aggregations"]["top_categories"]["buckets"]
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get search analytics: {str(e)}")
            return {}

# Initialize search service
search_service = SearchService()

