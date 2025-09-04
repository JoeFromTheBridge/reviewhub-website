from flask import request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from file_storage import file_storage

def register_image_routes(app, db):
    """Register image upload routes with the Flask app"""
    
    # Image model for storing metadata
    class Image(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        filename = db.Column(db.String(255), nullable=False)
        original_filename = db.Column(db.String(255), nullable=False)
        file_hash = db.Column(db.String(32), nullable=True)  # MD5 hash for deduplication
        file_size = db.Column(db.Integer, nullable=False)
        mime_type = db.Column(db.String(100), nullable=True)
        main_url = db.Column(db.String(500), nullable=False)
        thumbnail_url = db.Column(db.String(500), nullable=True)
        alt_text = db.Column(db.String(255), nullable=True)
        caption = db.Column(db.Text, nullable=True)
        image_type = db.Column(db.String(50), nullable=False)  # 'review', 'profile', 'product'
        related_id = db.Column(db.Integer, nullable=True)  # ID of related entity (review_id, product_id, etc.)
        is_active = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', backref='images')
        
        def to_dict(self):
            return {
                'id': self.id,
                'filename': self.filename,
                'original_filename': self.original_filename,
                'file_size': self.file_size,
                'main_url': self.main_url,
                'thumbnail_url': self.thumbnail_url,
                'alt_text': self.alt_text,
                'caption': self.caption,
                'image_type': self.image_type,
                'related_id': self.related_id,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    @app.route('/api/images/upload/review', methods=['POST'])
    @jwt_required()
    def upload_review_image():
        """Upload an image for a review"""
        try:
            user_id = get_jwt_identity()
            
            # Check if file is present
            if 'image' not in request.files:
                return jsonify({'error': 'No image file provided'}), 400
            
            file = request.files['image']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Get optional metadata
            alt_text = request.form.get('alt_text', '')
            caption = request.form.get('caption', '')
            review_id = request.form.get('review_id')
            
            # Upload and process image
            upload_result = file_storage.upload_review_image(file, user_id, review_id)
            
            # Save image metadata to database
            image = Image(
                user_id=user_id,
                filename=upload_result['filename'],
                original_filename=upload_result['original_filename'],
                file_hash=upload_result['file_hash'],
                file_size=upload_result['file_size'],
                main_url=upload_result['main_url'],
                thumbnail_url=upload_result['thumbnail_url'],
                alt_text=alt_text,
                caption=caption,
                image_type='review',
                related_id=int(review_id) if review_id else None
            )
            
            db.session.add(image)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Image uploaded successfully',
                'image': image.to_dict()
            }), 201
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    
    @app.route('/api/images/upload/profile', methods=['POST'])
    @jwt_required()
    def upload_profile_image():
        """Upload a profile image"""
        try:
            user_id = get_jwt_identity()
            
            # Check if file is present
            if 'image' not in request.files:
                return jsonify({'error': 'No image file provided'}), 400
            
            file = request.files['image']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Upload and process image
            upload_result = file_storage.upload_profile_image(file, user_id)
            
            # Delete old profile image if exists
            old_image = Image.query.filter_by(
                user_id=user_id, 
                image_type='profile', 
                is_active=True
            ).first()
            
            if old_image:
                # Deactivate old image
                old_image.is_active = False
                # Optionally delete the file
                file_storage.delete_file(old_image.filename, 'profiles')
            
            # Save new image metadata to database
            image = Image(
                user_id=user_id,
                filename=upload_result['filename'],
                original_filename=upload_result['original_filename'],
                file_size=upload_result['file_size'],
                main_url=upload_result['url'],
                image_type='profile'
            )
            
            db.session.add(image)
            
            # Update user's profile image URL
            from app_enhanced import User  # Import here to avoid circular imports
            user = User.query.get(user_id)
            if user:
                user.profile_image_url = upload_result['url']
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Profile image uploaded successfully',
                'image': image.to_dict(),
                'profile_image_url': upload_result['url']
            }), 201
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    
    @app.route('/api/images/upload/multiple', methods=['POST'])
    @jwt_required()
    def upload_multiple_images():
        """Upload multiple images for a review"""
        try:
            user_id = get_jwt_identity()
            
            # Check if files are present
            if 'images' not in request.files:
                return jsonify({'error': 'No image files provided'}), 400
            
            files = request.files.getlist('images')
            if not files or all(f.filename == '' for f in files):
                return jsonify({'error': 'No files selected'}), 400
            
            # Limit number of files
            max_files = 5
            if len(files) > max_files:
                return jsonify({'error': f'Maximum {max_files} files allowed'}), 400
            
            # Get optional metadata
            review_id = request.form.get('review_id')
            
            uploaded_images = []
            errors = []
            
            for i, file in enumerate(files):
                try:
                    if file.filename == '':
                        continue
                    
                    # Upload and process image
                    upload_result = file_storage.upload_review_image(file, user_id, review_id)
                    
                    # Save image metadata to database
                    image = Image(
                        user_id=user_id,
                        filename=upload_result['filename'],
                        original_filename=upload_result['original_filename'],
                        file_hash=upload_result['file_hash'],
                        file_size=upload_result['file_size'],
                        main_url=upload_result['main_url'],
                        thumbnail_url=upload_result['thumbnail_url'],
                        image_type='review',
                        related_id=int(review_id) if review_id else None
                    )
                    
                    db.session.add(image)
                    uploaded_images.append(image.to_dict())
                    
                except Exception as e:
                    errors.append(f"File {i+1} ({file.filename}): {str(e)}")
            
            if uploaded_images:
                db.session.commit()
            
            response_data = {
                'success': len(uploaded_images) > 0,
                'uploaded_count': len(uploaded_images),
                'images': uploaded_images
            }
            
            if errors:
                response_data['errors'] = errors
            
            status_code = 201 if uploaded_images else 400
            return jsonify(response_data), status_code
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    
    @app.route('/api/images/<int:image_id>', methods=['GET'])
    def get_image(image_id):
        """Get image metadata"""
        try:
            image = Image.query.filter_by(id=image_id, is_active=True).first()
            
            if not image:
                return jsonify({'error': 'Image not found'}), 404
            
            return jsonify({'image': image.to_dict()}), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/images/<int:image_id>', methods=['PUT'])
    @jwt_required()
    def update_image(image_id):
        """Update image metadata (alt text, caption)"""
        try:
            user_id = get_jwt_identity()
            image = Image.query.filter_by(id=image_id, user_id=user_id, is_active=True).first()
            
            if not image:
                return jsonify({'error': 'Image not found'}), 404
            
            data = request.get_json()
            
            # Update allowed fields
            if 'alt_text' in data:
                image.alt_text = data['alt_text']
            if 'caption' in data:
                image.caption = data['caption']
            
            image.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Image updated successfully',
                'image': image.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/images/<int:image_id>', methods=['DELETE'])
    @jwt_required()
    def delete_image(image_id):
        """Delete an image"""
        try:
            user_id = get_jwt_identity()
            image = Image.query.filter_by(id=image_id, user_id=user_id, is_active=True).first()
            
            if not image:
                return jsonify({'error': 'Image not found'}), 404
            
            # Mark as inactive instead of deleting
            image.is_active = False
            image.updated_at = datetime.utcnow()
            
            # Optionally delete the actual file
            if image.image_type == 'review':
                file_storage.delete_file(image.filename, 'reviews')
                if image.thumbnail_url:
                    thumb_filename = image.filename.replace('review_', 'thumb_')
                    file_storage.delete_file(thumb_filename, 'thumbnails')
            elif image.image_type == 'profile':
                file_storage.delete_file(image.filename, 'profiles')
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Image deleted successfully'
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/images/user/<int:user_id>', methods=['GET'])
    def get_user_images(user_id):
        """Get all images for a user"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            image_type = request.args.get('type')  # Filter by image type
            
            query = Image.query.filter_by(user_id=user_id, is_active=True)
            
            if image_type:
                query = query.filter_by(image_type=image_type)
            
            query = query.order_by(Image.created_at.desc())
            
            pagination = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            images = [image.to_dict() for image in pagination.items]
            
            return jsonify({
                'images': images,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/images/review/<int:review_id>', methods=['GET'])
    def get_review_images(review_id):
        """Get all images for a specific review"""
        try:
            images = Image.query.filter_by(
                related_id=review_id, 
                image_type='review', 
                is_active=True
            ).order_by(Image.created_at.asc()).all()
            
            return jsonify({
                'images': [image.to_dict() for image in images]
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    # Serve uploaded files for local storage
    if file_storage.storage_type == 'local':
        @app.route('/uploads/<path:filename>')
        def uploaded_file(filename):
            """Serve uploaded files"""
            return send_from_directory(file_storage.upload_folder, filename)
    
    # Return the Image model for use in other parts of the app
    return Image

