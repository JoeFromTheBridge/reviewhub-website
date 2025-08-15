"""
Visual Search Service for ReviewHub

This service provides image-based product search capabilities using computer vision
and machine learning techniques to find visually similar products.
"""

import os
import json
import hashlib
import numpy as np
from PIL import Image, ImageOps
import requests
from io import BytesIO
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VisualSearchService:
    """Service for handling visual search operations"""
    
    def __init__(self, app=None):
        self.app = app
        self.image_features_cache = {}
        self.similarity_threshold = 0.7
        self.max_results = 20
        
        # Image processing settings
        self.target_size = (224, 224)
        self.supported_formats = ['JPEG', 'JPG', 'PNG', 'WEBP']
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the service with Flask app"""
        self.app = app
        
        # Create directories for visual search
        self.upload_dir = os.path.join(app.instance_path, 'visual_search_uploads')
        self.features_dir = os.path.join(app.instance_path, 'visual_features')
        
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.features_dir, exist_ok=True)
        
        logger.info("Visual Search Service initialized")
    
    def validate_image(self, image_file) -> Tuple[bool, str]:
        """Validate uploaded image file"""
        try:
            # Check file size
            if hasattr(image_file, 'content_length') and image_file.content_length > self.max_file_size:
                return False, f"File size exceeds {self.max_file_size // (1024*1024)}MB limit"
            
            # Try to open and validate image
            image = Image.open(image_file)
            
            # Check format
            if image.format not in self.supported_formats:
                return False, f"Unsupported format. Supported: {', '.join(self.supported_formats)}"
            
            # Check dimensions
            if image.size[0] < 50 or image.size[1] < 50:
                return False, "Image too small. Minimum size: 50x50 pixels"
            
            if image.size[0] > 4000 or image.size[1] > 4000:
                return False, "Image too large. Maximum size: 4000x4000 pixels"
            
            return True, "Valid image"
            
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
    
    def preprocess_image(self, image_path_or_file) -> np.ndarray:
        """Preprocess image for feature extraction"""
        try:
            # Load image
            if isinstance(image_path_or_file, str):
                image = Image.open(image_path_or_file)
            else:
                image = Image.open(image_path_or_file)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize while maintaining aspect ratio
            image = ImageOps.fit(image, self.target_size, Image.Resampling.LANCZOS)
            
            # Convert to numpy array and normalize
            image_array = np.array(image, dtype=np.float32) / 255.0
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    def extract_color_features(self, image_array: np.ndarray) -> Dict:
        """Extract color-based features from image"""
        try:
            # Calculate color histograms
            hist_r = np.histogram(image_array[:, :, 0], bins=32, range=(0, 1))[0]
            hist_g = np.histogram(image_array[:, :, 1], bins=32, range=(0, 1))[0]
            hist_b = np.histogram(image_array[:, :, 2], bins=32, range=(0, 1))[0]
            
            # Normalize histograms
            hist_r = hist_r / np.sum(hist_r)
            hist_g = hist_g / np.sum(hist_g)
            hist_b = hist_b / np.sum(hist_b)
            
            # Calculate dominant colors
            dominant_colors = self._get_dominant_colors(image_array)
            
            # Calculate average color
            avg_color = np.mean(image_array.reshape(-1, 3), axis=0)
            
            return {
                'color_histogram_r': hist_r.tolist(),
                'color_histogram_g': hist_g.tolist(),
                'color_histogram_b': hist_b.tolist(),
                'dominant_colors': dominant_colors,
                'average_color': avg_color.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error extracting color features: {str(e)}")
            return {}
    
    def extract_texture_features(self, image_array: np.ndarray) -> Dict:
        """Extract texture-based features from image"""
        try:
            # Convert to grayscale
            gray = np.dot(image_array[...,:3], [0.2989, 0.5870, 0.1140])
            
            # Calculate texture features using simple statistical measures
            # In a production environment, you might use more sophisticated methods
            # like Local Binary Patterns (LBP) or Gabor filters
            
            # Standard deviation (texture roughness)
            texture_std = np.std(gray)
            
            # Edge density using simple gradient
            grad_x = np.abs(np.diff(gray, axis=1))
            grad_y = np.abs(np.diff(gray, axis=0))
            edge_density = (np.mean(grad_x) + np.mean(grad_y)) / 2
            
            # Contrast
            contrast = np.max(gray) - np.min(gray)
            
            return {
                'texture_std': float(texture_std),
                'edge_density': float(edge_density),
                'contrast': float(contrast)
            }
            
        except Exception as e:
            logger.error(f"Error extracting texture features: {str(e)}")
            return {}
    
    def extract_shape_features(self, image_array: np.ndarray) -> Dict:
        """Extract shape-based features from image"""
        try:
            # Convert to grayscale and threshold
            gray = np.dot(image_array[...,:3], [0.2989, 0.5870, 0.1140])
            threshold = np.mean(gray)
            binary = (gray > threshold).astype(np.uint8)
            
            # Calculate basic shape features
            # In production, you might use more sophisticated shape descriptors
            
            # Aspect ratio
            height, width = binary.shape
            aspect_ratio = width / height
            
            # Fill ratio (percentage of non-zero pixels)
            fill_ratio = np.sum(binary) / (height * width)
            
            # Compactness (simplified)
            perimeter = np.sum(np.abs(np.diff(binary, axis=0))) + np.sum(np.abs(np.diff(binary, axis=1)))
            area = np.sum(binary)
            compactness = (perimeter ** 2) / (4 * np.pi * area) if area > 0 else 0
            
            return {
                'aspect_ratio': float(aspect_ratio),
                'fill_ratio': float(fill_ratio),
                'compactness': float(compactness)
            }
            
        except Exception as e:
            logger.error(f"Error extracting shape features: {str(e)}")
            return {}
    
    def _get_dominant_colors(self, image_array: np.ndarray, k: int = 5) -> List[List[float]]:
        """Extract dominant colors using simple clustering"""
        try:
            # Reshape image to list of pixels
            pixels = image_array.reshape(-1, 3)
            
            # Simple k-means clustering (simplified implementation)
            # In production, you might use sklearn.cluster.KMeans
            
            # Random initialization
            np.random.seed(42)
            centroids = np.random.rand(k, 3)
            
            # Simple k-means iterations
            for _ in range(10):
                # Assign pixels to nearest centroid
                distances = np.sqrt(((pixels - centroids[:, np.newaxis])**2).sum(axis=2))
                closest_centroid = np.argmin(distances, axis=0)
                
                # Update centroids
                for i in range(k):
                    if np.sum(closest_centroid == i) > 0:
                        centroids[i] = np.mean(pixels[closest_centroid == i], axis=0)
            
            return centroids.tolist()
            
        except Exception as e:
            logger.error(f"Error extracting dominant colors: {str(e)}")
            return []
    
    def extract_features(self, image_path_or_file) -> Dict:
        """Extract comprehensive features from image"""
        try:
            # Preprocess image
            image_array = self.preprocess_image(image_path_or_file)
            
            # Extract different types of features
            color_features = self.extract_color_features(image_array)
            texture_features = self.extract_texture_features(image_array)
            shape_features = self.extract_shape_features(image_array)
            
            # Combine all features
            features = {
                'color': color_features,
                'texture': texture_features,
                'shape': shape_features,
                'extracted_at': datetime.utcnow().isoformat()
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {str(e)}")
            raise
    
    def calculate_similarity(self, features1: Dict, features2: Dict) -> float:
        """Calculate similarity between two feature sets"""
        try:
            similarity_scores = []
            
            # Color similarity
            if 'color' in features1 and 'color' in features2:
                color_sim = self._calculate_color_similarity(
                    features1['color'], features2['color']
                )
                similarity_scores.append(color_sim * 0.5)  # 50% weight
            
            # Texture similarity
            if 'texture' in features1 and 'texture' in features2:
                texture_sim = self._calculate_texture_similarity(
                    features1['texture'], features2['texture']
                )
                similarity_scores.append(texture_sim * 0.3)  # 30% weight
            
            # Shape similarity
            if 'shape' in features1 and 'shape' in features2:
                shape_sim = self._calculate_shape_similarity(
                    features1['shape'], features2['shape']
                )
                similarity_scores.append(shape_sim * 0.2)  # 20% weight
            
            # Calculate weighted average
            if similarity_scores:
                return sum(similarity_scores) / sum([0.5, 0.3, 0.2][:len(similarity_scores)])
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            return 0.0
    
    def _calculate_color_similarity(self, color1: Dict, color2: Dict) -> float:
        """Calculate color similarity between two color feature sets"""
        try:
            similarities = []
            
            # Histogram similarity
            for channel in ['color_histogram_r', 'color_histogram_g', 'color_histogram_b']:
                if channel in color1 and channel in color2:
                    hist1 = np.array(color1[channel])
                    hist2 = np.array(color2[channel])
                    # Bhattacharyya coefficient
                    similarity = np.sum(np.sqrt(hist1 * hist2))
                    similarities.append(similarity)
            
            # Average color similarity
            if 'average_color' in color1 and 'average_color' in color2:
                avg1 = np.array(color1['average_color'])
                avg2 = np.array(color2['average_color'])
                # Euclidean distance converted to similarity
                distance = np.linalg.norm(avg1 - avg2)
                similarity = 1.0 / (1.0 + distance)
                similarities.append(similarity)
            
            return np.mean(similarities) if similarities else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating color similarity: {str(e)}")
            return 0.0
    
    def _calculate_texture_similarity(self, texture1: Dict, texture2: Dict) -> float:
        """Calculate texture similarity between two texture feature sets"""
        try:
            similarities = []
            
            for feature in ['texture_std', 'edge_density', 'contrast']:
                if feature in texture1 and feature in texture2:
                    val1 = texture1[feature]
                    val2 = texture2[feature]
                    # Normalized difference
                    max_val = max(val1, val2)
                    if max_val > 0:
                        similarity = 1.0 - abs(val1 - val2) / max_val
                        similarities.append(similarity)
            
            return np.mean(similarities) if similarities else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating texture similarity: {str(e)}")
            return 0.0
    
    def _calculate_shape_similarity(self, shape1: Dict, shape2: Dict) -> float:
        """Calculate shape similarity between two shape feature sets"""
        try:
            similarities = []
            
            for feature in ['aspect_ratio', 'fill_ratio', 'compactness']:
                if feature in shape1 and feature in shape2:
                    val1 = shape1[feature]
                    val2 = shape2[feature]
                    # Normalized difference
                    max_val = max(val1, val2, 1.0)  # Avoid division by zero
                    similarity = 1.0 - abs(val1 - val2) / max_val
                    similarities.append(similarity)
            
            return np.mean(similarities) if similarities else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating shape similarity: {str(e)}")
            return 0.0
    
    def save_image_features(self, product_id: int, image_path: str, features: Dict):
        """Save extracted features to file"""
        try:
            features_file = os.path.join(self.features_dir, f"product_{product_id}_features.json")
            
            feature_data = {
                'product_id': product_id,
                'image_path': image_path,
                'features': features,
                'created_at': datetime.utcnow().isoformat()
            }
            
            with open(features_file, 'w') as f:
                json.dump(feature_data, f, indent=2)
            
            logger.info(f"Saved features for product {product_id}")
            
        except Exception as e:
            logger.error(f"Error saving features: {str(e)}")
    
    def load_image_features(self, product_id: int) -> Optional[Dict]:
        """Load features from file"""
        try:
            features_file = os.path.join(self.features_dir, f"product_{product_id}_features.json")
            
            if os.path.exists(features_file):
                with open(features_file, 'r') as f:
                    return json.load(f)
            
            return None
            
        except Exception as e:
            logger.error(f"Error loading features: {str(e)}")
            return None
    
    def process_uploaded_image(self, image_file) -> Tuple[bool, str, Optional[Dict]]:
        """Process uploaded image for visual search"""
        try:
            # Validate image
            is_valid, message = self.validate_image(image_file)
            if not is_valid:
                return False, message, None
            
            # Generate unique filename
            image_file.seek(0)  # Reset file pointer
            file_hash = hashlib.md5(image_file.read()).hexdigest()
            image_file.seek(0)  # Reset again
            
            filename = f"search_{file_hash}_{int(datetime.utcnow().timestamp())}.jpg"
            image_path = os.path.join(self.upload_dir, filename)
            
            # Save uploaded image
            image = Image.open(image_file)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image.save(image_path, 'JPEG', quality=85)
            
            # Extract features
            features = self.extract_features(image_path)
            
            return True, "Image processed successfully", {
                'image_path': image_path,
                'filename': filename,
                'features': features
            }
            
        except Exception as e:
            logger.error(f"Error processing uploaded image: {str(e)}")
            return False, f"Error processing image: {str(e)}", None
    
    def search_similar_products(self, query_features: Dict, product_features_list: List[Dict]) -> List[Dict]:
        """Search for similar products based on visual features"""
        try:
            results = []
            
            for product_data in product_features_list:
                if 'features' in product_data:
                    similarity = self.calculate_similarity(
                        query_features, product_data['features']
                    )
                    
                    if similarity >= self.similarity_threshold:
                        results.append({
                            'product_id': product_data.get('product_id'),
                            'similarity_score': similarity,
                            'features': product_data['features']
                        })
            
            # Sort by similarity score (descending)
            results.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            # Limit results
            return results[:self.max_results]
            
        except Exception as e:
            logger.error(f"Error searching similar products: {str(e)}")
            return []
    
    def get_visual_search_stats(self) -> Dict:
        """Get visual search statistics"""
        try:
            stats = {
                'total_processed_images': 0,
                'total_features_stored': 0,
                'average_processing_time': 0,
                'supported_formats': self.supported_formats,
                'max_file_size_mb': self.max_file_size // (1024 * 1024),
                'similarity_threshold': self.similarity_threshold
            }
            
            # Count processed images
            if os.path.exists(self.upload_dir):
                stats['total_processed_images'] = len(os.listdir(self.upload_dir))
            
            # Count stored features
            if os.path.exists(self.features_dir):
                stats['total_features_stored'] = len([
                    f for f in os.listdir(self.features_dir) 
                    if f.endswith('_features.json')
                ])
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting visual search stats: {str(e)}")
            return {}
    
    def cleanup_old_files(self, days: int = 7):
        """Clean up old uploaded images and features"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            cleaned_count = 0
            
            # Clean upload directory
            if os.path.exists(self.upload_dir):
                for filename in os.listdir(self.upload_dir):
                    file_path = os.path.join(self.upload_dir, filename)
                    if os.path.isfile(file_path):
                        file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                        if file_time < cutoff_date:
                            os.remove(file_path)
                            cleaned_count += 1
            
            logger.info(f"Cleaned up {cleaned_count} old files")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old files: {str(e)}")
            return 0

# Global instance
visual_search_service = VisualSearchService()

