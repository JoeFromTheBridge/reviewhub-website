"""
Voice Search Service for ReviewHub
Handles speech-to-text processing and natural language query understanding
"""

import re
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import sqlite3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class VoiceSearchQuery:
    """Data class for voice search queries"""
    original_text: str
    processed_text: str
    intent: str
    entities: Dict[str, str]
    confidence: float
    timestamp: datetime

class VoiceSearchService:
    """Service for processing voice search queries and natural language understanding"""
    
    def __init__(self, db_path: str = 'reviewhub.db'):
        self.db_path = db_path
        self.init_database()
        
        # Common search intents and patterns
        self.intent_patterns = {
            'product_search': [
                r'find\s+(.+)',
                r'search\s+for\s+(.+)',
                r'show\s+me\s+(.+)',
                r'looking\s+for\s+(.+)',
                r'i\s+want\s+(.+)',
                r'need\s+(.+)'
            ],
            'category_search': [
                r'show\s+(.+)\s+category',
                r'browse\s+(.+)',
                r'(.+)\s+products',
                r'all\s+(.+)'
            ],
            'price_filter': [
                r'under\s+\$?(\d+)',
                r'less\s+than\s+\$?(\d+)',
                r'below\s+\$?(\d+)',
                r'cheaper\s+than\s+\$?(\d+)',
                r'between\s+\$?(\d+)\s+and\s+\$?(\d+)',
                r'from\s+\$?(\d+)\s+to\s+\$?(\d+)'
            ],
            'rating_filter': [
                r'(\d+)\s+star[s]?\s+or\s+higher',
                r'rated\s+(\d+)\s+star[s]?\s+or\s+above',
                r'minimum\s+(\d+)\s+star[s]?',
                r'at\s+least\s+(\d+)\s+star[s]?'
            ],
            'brand_search': [
                r'from\s+(.+)\s+brand',
                r'by\s+(.+)',
                r'made\s+by\s+(.+)',
                r'(.+)\s+brand'
            ]
        }
        
        # Common product categories
        self.categories = [
            'electronics', 'clothing', 'books', 'home', 'garden', 'sports',
            'automotive', 'beauty', 'health', 'toys', 'games', 'music',
            'movies', 'food', 'beverages', 'furniture', 'appliances'
        ]
        
        # Common brands (can be expanded)
        self.brands = [
            'apple', 'samsung', 'sony', 'nike', 'adidas', 'amazon',
            'google', 'microsoft', 'dell', 'hp', 'canon', 'nikon'
        ]
        
    def init_database(self):
        """Initialize voice search database tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Voice search queries table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS voice_search_queries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    original_text TEXT NOT NULL,
                    processed_text TEXT NOT NULL,
                    intent TEXT,
                    entities TEXT,
                    confidence REAL,
                    results_count INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            # Voice search analytics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS voice_search_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    total_queries INTEGER DEFAULT 0,
                    successful_queries INTEGER DEFAULT 0,
                    failed_queries INTEGER DEFAULT 0,
                    avg_confidence REAL DEFAULT 0.0,
                    top_intents TEXT,
                    UNIQUE(date)
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Voice search database initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing voice search database: {e}")
            
    def process_voice_query(self, text: str, user_id: Optional[int] = None) -> VoiceSearchQuery:
        """
        Process a voice search query and extract intent and entities
        
        Args:
            text: Raw speech-to-text input
            user_id: Optional user ID for analytics
            
        Returns:
            VoiceSearchQuery object with processed information
        """
        try:
            # Clean and normalize the text
            processed_text = self._clean_text(text)
            
            # Extract intent and entities
            intent, entities, confidence = self._extract_intent_and_entities(processed_text)
            
            # Create query object
            query = VoiceSearchQuery(
                original_text=text,
                processed_text=processed_text,
                intent=intent,
                entities=entities,
                confidence=confidence,
                timestamp=datetime.now()
            )
            
            # Log the query
            self._log_voice_query(query, user_id)
            
            return query
            
        except Exception as e:
            logger.error(f"Error processing voice query: {e}")
            # Return a basic query object
            return VoiceSearchQuery(
                original_text=text,
                processed_text=text.lower().strip(),
                intent='product_search',
                entities={'query': text.lower().strip()},
                confidence=0.5,
                timestamp=datetime.now()
            )
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text input"""
        # Convert to lowercase
        text = text.lower().strip()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common filler words
        filler_words = ['um', 'uh', 'like', 'you know', 'actually', 'basically']
        for word in filler_words:
            text = re.sub(rf'\b{word}\b', '', text)
        
        # Clean up extra spaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def _extract_intent_and_entities(self, text: str) -> Tuple[str, Dict[str, str], float]:
        """Extract intent and entities from processed text"""
        entities = {}
        intent = 'product_search'  # default intent
        confidence = 0.5
        
        # Check for different intents
        for intent_type, patterns in self.intent_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    intent = intent_type
                    confidence = 0.8
                    
                    if intent_type == 'product_search':
                        entities['query'] = match.group(1).strip()
                    elif intent_type == 'category_search':
                        entities['category'] = match.group(1).strip()
                    elif intent_type == 'price_filter':
                        if len(match.groups()) == 2:  # price range
                            entities['min_price'] = match.group(1)
                            entities['max_price'] = match.group(2)
                        else:  # single price limit
                            entities['max_price'] = match.group(1)
                    elif intent_type == 'rating_filter':
                        entities['min_rating'] = match.group(1)
                    elif intent_type == 'brand_search':
                        entities['brand'] = match.group(1).strip()
                    
                    break
            
            if confidence > 0.5:  # Found a match
                break
        
        # Extract additional entities
        self._extract_additional_entities(text, entities)
        
        # If no specific query was extracted, use the whole text
        if 'query' not in entities and intent == 'product_search':
            entities['query'] = text
        
        return intent, entities, confidence
    
    def _extract_additional_entities(self, text: str, entities: Dict[str, str]):
        """Extract additional entities like categories, brands, etc."""
        
        # Extract categories
        for category in self.categories:
            if category in text.lower():
                entities['category'] = category
                break
        
        # Extract brands
        for brand in self.brands:
            if brand in text.lower():
                entities['brand'] = brand
                break
        
        # Extract price mentions
        price_patterns = [
            r'\$(\d+(?:\.\d{2})?)',
            r'(\d+)\s*dollars?',
            r'(\d+)\s*bucks?'
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if 'max_price' not in entities:
                    entities['max_price'] = match.group(1)
                break
        
        # Extract rating mentions
        rating_pattern = r'(\d+(?:\.\d)?)\s*star[s]?'
        match = re.search(rating_pattern, text, re.IGNORECASE)
        if match:
            entities['min_rating'] = match.group(1)
    
    def convert_to_search_params(self, query: VoiceSearchQuery) -> Dict[str, str]:
        """Convert voice query to search parameters"""
        params = {}
        
        # Main search query
        if 'query' in query.entities:
            params['q'] = query.entities['query']
        
        # Category filter
        if 'category' in query.entities:
            params['category'] = query.entities['category']
        
        # Brand filter
        if 'brand' in query.entities:
            params['brand'] = query.entities['brand']
        
        # Price filters
        if 'min_price' in query.entities:
            params['min_price'] = query.entities['min_price']
        if 'max_price' in query.entities:
            params['max_price'] = query.entities['max_price']
        
        # Rating filter
        if 'min_rating' in query.entities:
            params['min_rating'] = query.entities['min_rating']
        
        # Default sorting for voice search
        params['sort'] = 'relevance'
        
        return params
    
    def _log_voice_query(self, query: VoiceSearchQuery, user_id: Optional[int] = None):
        """Log voice search query for analytics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO voice_search_queries 
                (user_id, original_text, processed_text, intent, entities, confidence, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                query.original_text,
                query.processed_text,
                query.intent,
                json.dumps(query.entities),
                query.confidence,
                query.timestamp
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error logging voice query: {e}")
    
    def get_voice_search_analytics(self, days: int = 30) -> Dict:
        """Get voice search analytics for the specified number of days"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get query statistics
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_queries,
                    AVG(confidence) as avg_confidence,
                    intent,
                    COUNT(*) as intent_count
                FROM voice_search_queries 
                WHERE timestamp >= datetime('now', '-{} days')
                GROUP BY intent
                ORDER BY intent_count DESC
            '''.format(days))
            
            intent_stats = cursor.fetchall()
            
            # Get daily query counts
            cursor.execute('''
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as query_count,
                    AVG(confidence) as avg_confidence
                FROM voice_search_queries 
                WHERE timestamp >= datetime('now', '-{} days')
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
            '''.format(days))
            
            daily_stats = cursor.fetchall()
            
            # Get top queries
            cursor.execute('''
                SELECT 
                    processed_text,
                    COUNT(*) as frequency
                FROM voice_search_queries 
                WHERE timestamp >= datetime('now', '-{} days')
                GROUP BY processed_text
                ORDER BY frequency DESC
                LIMIT 10
            '''.format(days))
            
            top_queries = cursor.fetchall()
            
            conn.close()
            
            return {
                'intent_statistics': [
                    {
                        'intent': row[2],
                        'count': row[3],
                        'percentage': (row[3] / sum([r[3] for r in intent_stats])) * 100 if intent_stats else 0
                    }
                    for row in intent_stats
                ],
                'daily_statistics': [
                    {
                        'date': row[0],
                        'query_count': row[1],
                        'avg_confidence': round(row[2], 2) if row[2] else 0
                    }
                    for row in daily_stats
                ],
                'top_queries': [
                    {
                        'query': row[0],
                        'frequency': row[1]
                    }
                    for row in top_queries
                ],
                'total_queries': sum([row[3] for row in intent_stats]),
                'average_confidence': round(sum([row[1] for row in intent_stats]) / len(intent_stats), 2) if intent_stats else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting voice search analytics: {e}")
            return {
                'intent_statistics': [],
                'daily_statistics': [],
                'top_queries': [],
                'total_queries': 0,
                'average_confidence': 0
            }
    
    def get_search_suggestions(self, partial_text: str, limit: int = 5) -> List[str]:
        """Get search suggestions based on partial voice input"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get suggestions from previous successful queries
            cursor.execute('''
                SELECT DISTINCT processed_text, COUNT(*) as frequency
                FROM voice_search_queries 
                WHERE processed_text LIKE ? AND confidence > 0.7
                GROUP BY processed_text
                ORDER BY frequency DESC, processed_text
                LIMIT ?
            ''', (f'%{partial_text.lower()}%', limit))
            
            suggestions = [row[0] for row in cursor.fetchall()]
            
            conn.close()
            
            # Add some common suggestions if we don't have enough
            if len(suggestions) < limit:
                common_suggestions = [
                    f"find {partial_text}",
                    f"search for {partial_text}",
                    f"show me {partial_text}",
                    f"{partial_text} products",
                    f"{partial_text} reviews"
                ]
                
                for suggestion in common_suggestions:
                    if suggestion not in suggestions and len(suggestions) < limit:
                        suggestions.append(suggestion)
            
            return suggestions[:limit]
            
        except Exception as e:
            logger.error(f"Error getting search suggestions: {e}")
            return []
    
    def update_query_results(self, query_id: int, results_count: int):
        """Update the results count for a voice search query"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE voice_search_queries 
                SET results_count = ?
                WHERE id = ?
            ''', (results_count, query_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error updating query results: {e}")

# Global voice search service instance
voice_search_service = VoiceSearchService()

