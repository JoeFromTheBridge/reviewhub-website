import os
import uuid
import boto3
from PIL import Image, ImageOps
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from flask import current_app
import io
import mimetypes
from datetime import datetime
from typing import Optional, Tuple, List
import hashlib

class FileStorageService:
    def __init__(self):
        self.storage_type = os.getenv('STORAGE_TYPE', 'local')  # 'local' or 's3'
        self.upload_folder = os.getenv('UPLOAD_FOLDER', 'uploads')
        self.max_file_size = int(os.getenv('MAX_CONTENT_LENGTH', 16777216))  # 16MB
        self.allowed_extensions = set(os.getenv('ALLOWED_EXTENSIONS', 'png,jpg,jpeg,gif,webp').split(','))
        
        # Image processing settings
        self.image_quality = int(os.getenv('IMAGE_QUALITY', 85))
        self.thumbnail_size = tuple(map(int, os.getenv('THUMBNAIL_SIZE', '300,300').split(',')))
        self.max_image_size = tuple(map(int, os.getenv('MAX_IMAGE_SIZE', '1920,1080').split(',')))
        
        # AWS S3 settings
        if self.storage_type == 's3':
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_S3_REGION', 'us-east-1')
            )
            self.s3_bucket = os.getenv('AWS_S3_BUCKET')
        
        # Ensure upload directory exists for local storage
        if self.storage_type == 'local':
            os.makedirs(self.upload_folder, exist_ok=True)
            os.makedirs(os.path.join(self.upload_folder, 'thumbnails'), exist_ok=True)
            os.makedirs(os.path.join(self.upload_folder, 'reviews'), exist_ok=True)
    
    def allowed_file(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.allowed_extensions
    
    def generate_filename(self, original_filename: str, prefix: str = '') -> str:
        """Generate a unique filename"""
        ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime('%Y%m%d')
        
        if prefix:
            return f"{prefix}_{timestamp}_{unique_id}.{ext}"
        return f"{timestamp}_{unique_id}.{ext}"
    
    def get_file_hash(self, file_data: bytes) -> str:
        """Generate MD5 hash of file data for deduplication"""
        return hashlib.md5(file_data).hexdigest()
    
    def validate_file(self, file: FileStorage) -> Tuple[bool, str]:
        """Validate uploaded file"""
        if not file or not file.filename:
            return False, "No file selected"
        
        if not self.allowed_file(file.filename):
            return False, f"File type not allowed. Allowed types: {', '.join(self.allowed_extensions)}"
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > self.max_file_size:
            return False, f"File too large. Maximum size: {self.max_file_size // (1024*1024)}MB"
        
        # Validate image
        try:
            image = Image.open(file.stream)
            image.verify()
            file.seek(0)  # Reset file pointer
            return True, "Valid file"
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
    
    def process_image(self, file_data: bytes, resize_for: str = 'review') -> Tuple[bytes, bytes]:
        """Process image: resize and create thumbnail"""
        image = Image.open(io.BytesIO(file_data))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Auto-orient based on EXIF data
        image = ImageOps.exif_transpose(image)
        
        # Resize main image
        if resize_for == 'review':
            max_size = self.max_image_size
        else:
            max_size = (800, 600)  # Default size
        
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Create main image bytes
        main_buffer = io.BytesIO()
        image.save(main_buffer, format='JPEG', quality=self.image_quality, optimize=True)
        main_image_data = main_buffer.getvalue()
        
        # Create thumbnail
        thumbnail = image.copy()
        thumbnail.thumbnail(self.thumbnail_size, Image.Resampling.LANCZOS)
        
        thumb_buffer = io.BytesIO()
        thumbnail.save(thumb_buffer, format='JPEG', quality=self.image_quality, optimize=True)
        thumbnail_data = thumb_buffer.getvalue()
        
        return main_image_data, thumbnail_data
    
    def save_local_file(self, file_data: bytes, filename: str, subfolder: str = '') -> str:
        """Save file to local storage"""
        if subfolder:
            folder_path = os.path.join(self.upload_folder, subfolder)
            os.makedirs(folder_path, exist_ok=True)
            file_path = os.path.join(folder_path, filename)
        else:
            file_path = os.path.join(self.upload_folder, filename)
        
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        return file_path
    
    def save_s3_file(self, file_data: bytes, filename: str, subfolder: str = '') -> str:
        """Save file to AWS S3"""
        if subfolder:
            s3_key = f"{subfolder}/{filename}"
        else:
            s3_key = filename
        
        # Determine content type
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        
        self.s3_client.put_object(
            Bucket=self.s3_bucket,
            Key=s3_key,
            Body=file_data,
            ContentType=content_type,
            ACL='public-read'  # Make images publicly accessible
        )
        
        # Return public URL
        return f"https://{self.s3_bucket}.s3.amazonaws.com/{s3_key}"
    
    def upload_review_image(self, file: FileStorage, user_id: int, review_id: Optional[int] = None) -> dict:
        """Upload and process a review image"""
        # Validate file
        is_valid, message = self.validate_file(file)
        if not is_valid:
            raise ValueError(message)
        
        # Read file data
        file_data = file.read()
        file.seek(0)
        
        # Check for duplicate
        file_hash = self.get_file_hash(file_data)
        
        # Process image
        main_image_data, thumbnail_data = self.process_image(file_data, 'review')
        
        # Generate filenames
        original_filename = secure_filename(file.filename)
        main_filename = self.generate_filename(original_filename, f'review_{user_id}')
        thumb_filename = self.generate_filename(original_filename, f'thumb_{user_id}')
        
        try:
            if self.storage_type == 'local':
                # Save to local storage
                main_path = self.save_local_file(main_image_data, main_filename, 'reviews')
                thumb_path = self.save_local_file(thumbnail_data, thumb_filename, 'thumbnails')
                
                # Return relative URLs for local storage
                main_url = f"/uploads/reviews/{main_filename}"
                thumb_url = f"/uploads/thumbnails/{thumb_filename}"
            else:
                # Save to S3
                main_url = self.save_s3_file(main_image_data, main_filename, 'reviews')
                thumb_url = self.save_s3_file(thumbnail_data, thumb_filename, 'thumbnails')
            
            return {
                'success': True,
                'main_url': main_url,
                'thumbnail_url': thumb_url,
                'filename': main_filename,
                'file_hash': file_hash,
                'file_size': len(main_image_data),
                'original_filename': original_filename
            }
            
        except Exception as e:
            raise Exception(f"Failed to upload image: {str(e)}")
    
    def upload_profile_image(self, file: FileStorage, user_id: int) -> dict:
        """Upload and process a profile image"""
        # Validate file
        is_valid, message = self.validate_file(file)
        if not is_valid:
            raise ValueError(message)
        
        # Read file data
        file_data = file.read()
        
        # Process image (smaller size for profiles)
        image = Image.open(io.BytesIO(file_data))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Auto-orient based on EXIF data
        image = ImageOps.exif_transpose(image)
        
        # Resize to square profile image
        profile_size = (400, 400)
        image.thumbnail(profile_size, Image.Resampling.LANCZOS)
        
        # Create square crop
        width, height = image.size
        if width != height:
            # Crop to square
            size = min(width, height)
            left = (width - size) // 2
            top = (height - size) // 2
            right = left + size
            bottom = top + size
            image = image.crop((left, top, right, bottom))
        
        # Save processed image
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=self.image_quality, optimize=True)
        processed_data = buffer.getvalue()
        
        # Generate filename
        original_filename = secure_filename(file.filename)
        filename = self.generate_filename(original_filename, f'profile_{user_id}')
        
        try:
            if self.storage_type == 'local':
                file_path = self.save_local_file(processed_data, filename, 'profiles')
                url = f"/uploads/profiles/{filename}"
            else:
                url = self.save_s3_file(processed_data, filename, 'profiles')
            
            return {
                'success': True,
                'url': url,
                'filename': filename,
                'file_size': len(processed_data),
                'original_filename': original_filename
            }
            
        except Exception as e:
            raise Exception(f"Failed to upload profile image: {str(e)}")
    
    def delete_file(self, filename: str, subfolder: str = '') -> bool:
        """Delete a file from storage"""
        try:
            if self.storage_type == 'local':
                if subfolder:
                    file_path = os.path.join(self.upload_folder, subfolder, filename)
                else:
                    file_path = os.path.join(self.upload_folder, filename)
                
                if os.path.exists(file_path):
                    os.remove(file_path)
                    return True
            else:
                # Delete from S3
                if subfolder:
                    s3_key = f"{subfolder}/{filename}"
                else:
                    s3_key = filename
                
                self.s3_client.delete_object(Bucket=self.s3_bucket, Key=s3_key)
                return True
                
        except Exception as e:
            print(f"Error deleting file {filename}: {str(e)}")
            return False
        
        return False
    
    def get_file_info(self, filename: str, subfolder: str = '') -> Optional[dict]:
        """Get information about a stored file"""
        try:
            if self.storage_type == 'local':
                if subfolder:
                    file_path = os.path.join(self.upload_folder, subfolder, filename)
                else:
                    file_path = os.path.join(self.upload_folder, filename)
                
                if os.path.exists(file_path):
                    stat = os.stat(file_path)
                    return {
                        'filename': filename,
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime),
                        'exists': True
                    }
            else:
                # Get from S3
                if subfolder:
                    s3_key = f"{subfolder}/{filename}"
                else:
                    s3_key = filename
                
                response = self.s3_client.head_object(Bucket=self.s3_bucket, Key=s3_key)
                return {
                    'filename': filename,
                    'size': response['ContentLength'],
                    'modified': response['LastModified'],
                    'exists': True
                }
                
        except Exception as e:
            print(f"Error getting file info for {filename}: {str(e)}")
        
        return None

# Initialize file storage service
file_storage = FileStorageService()

