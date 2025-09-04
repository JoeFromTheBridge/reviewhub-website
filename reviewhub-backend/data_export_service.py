"""
Data Export Service for ReviewHub
Handles user data export requests for GDPR compliance (Right to Data Portability)
"""

import json
import csv
import os
import logging
import zipfile
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from io import StringIO, BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from flask import current_app

logger = logging.getLogger(__name__)

class DataExportService:
    def __init__(self, db):
        self.db = db
        self.export_dir = os.path.join(current_app.root_path, 'exports')
        self._ensure_export_directory()
    
    def _ensure_export_directory(self):
        """Ensure export directory exists"""
        if not os.path.exists(self.export_dir):
            os.makedirs(self.export_dir, exist_ok=True)
    
    def request_data_export(self, user_id: int, export_format: str = 'json') -> Dict[str, Any]:
        """Create a new data export request"""
        try:
            from app_enhanced import DataExportRequest, User
            
            user = User.query.get(user_id)
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            # Check if there's already a pending request
            existing_request = DataExportRequest.query.filter_by(
                user_id=user_id,
                status='pending'
            ).first()
            
            if existing_request:
                return {
                    'success': False,
                    'error': 'Export request already pending',
                    'request_id': existing_request.id
                }
            
            # Validate export format
            if export_format not in ['json', 'csv', 'pdf']:
                return {'success': False, 'error': 'Invalid export format'}
            
            # Create export request
            export_request = DataExportRequest(
                user_id=user_id,
                export_format=export_format,
                status='pending',
                requested_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=30)  # Expires in 30 days
            )
            
            self.db.session.add(export_request)
            self.db.session.commit()
            
            # Process export immediately (in production, this might be queued)
            self._process_export_request(export_request.id)
            
            return {
                'success': True,
                'request_id': export_request.id,
                'message': 'Data export request created successfully'
            }
            
        except Exception as e:
            logger.error(f"Error creating export request: {e}")
            self.db.session.rollback()
            return {'success': False, 'error': str(e)}
    
    def _process_export_request(self, request_id: int) -> bool:
        """Process a data export request"""
        try:
            from app_enhanced import DataExportRequest
            
            export_request = DataExportRequest.query.get(request_id)
            if not export_request:
                return False
            
            # Update status to processing
            export_request.status = 'processing'
            self.db.session.commit()
            
            # Collect user data
            user_data = self._collect_user_data(export_request.user_id)
            
            # Generate export file based on format
            if export_request.export_format == 'json':
                file_path = self._generate_json_export(user_data, export_request.user_id)
            elif export_request.export_format == 'csv':
                file_path = self._generate_csv_export(user_data, export_request.user_id)
            elif export_request.export_format == 'pdf':
                file_path = self._generate_pdf_export(user_data, export_request.user_id)
            else:
                raise ValueError(f"Unsupported export format: {export_request.export_format}")
            
            # Update export request with file path
            export_request.file_path = file_path
            export_request.status = 'completed'
            export_request.completed_at = datetime.utcnow()
            self.db.session.commit()
            
            logger.info(f"Export request {request_id} completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error processing export request {request_id}: {e}")
            
            # Update status to failed
            try:
                export_request = DataExportRequest.query.get(request_id)
                if export_request:
                    export_request.status = 'failed'
                    self.db.session.commit()
            except:
                pass
            
            return False
    
    def _collect_user_data(self, user_id: int) -> Dict[str, Any]:
        """Collect all user data for export"""
        try:
            from app_enhanced import (User, Review, UserInteraction, UserConsent, 
                                    DataDeletionRequest, DataExportRequest, PrivacySettings, Image)
            
            user = User.query.get(user_id)
            if not user:
                return {}
            
            # Collect user profile data
            user_data = {
                'profile': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                    'login_count': user.login_count,
                    'profile_image_url': user.profile_image_url,
                    'bio': user.bio,
                    'location': user.location,
                    'website': user.website,
                    'email_verified': user.email_verified,
                    'is_active': user.is_active
                }
            }
            
            # Collect reviews
            reviews = Review.query.filter_by(user_id=user_id).all()
            user_data['reviews'] = []
            for review in reviews:
                review_data = {
                    'id': review.id,
                    'product_id': review.product_id,
                    'product_name': review.product.name if review.product else None,
                    'rating': review.rating,
                    'title': review.title,
                    'content': review.content,
                    'pros': review.pros,
                    'cons': review.cons,
                    'verified_purchase': review.verified_purchase,
                    'images': review.images,
                    'created_at': review.created_at.isoformat() if review.created_at else None,
                    'updated_at': review.updated_at.isoformat() if review.updated_at else None,
                    'helpful_votes': review.helpful_votes,
                    'total_votes': review.total_votes
                }
                user_data['reviews'].append(review_data)
            
            # Collect user interactions
            interactions = UserInteraction.query.filter_by(user_id=user_id).all()
            user_data['interactions'] = []
            for interaction in interactions:
                interaction_data = {
                    'id': interaction.id,
                    'product_id': interaction.product_id,
                    'product_name': interaction.product.name if interaction.product else None,
                    'interaction_type': interaction.interaction_type,
                    'rating': interaction.rating,
                    'timestamp': interaction.timestamp.isoformat() if interaction.timestamp else None
                }
                user_data['interactions'].append(interaction_data)
            
            # Collect consent records
            consents = UserConsent.query.filter_by(user_id=user_id).all()
            user_data['consents'] = []
            for consent in consents:
                consent_data = {
                    'id': consent.id,
                    'consent_type': consent.consent_type,
                    'granted': consent.granted,
                    'created_at': consent.created_at.isoformat() if consent.created_at else None,
                    'updated_at': consent.updated_at.isoformat() if consent.updated_at else None,
                    'ip_address': consent.ip_address,
                    'user_agent': consent.user_agent
                }
                user_data['consents'].append(consent_data)
            
            # Collect privacy settings
            privacy_settings = PrivacySettings.query.filter_by(user_id=user_id).first()
            if privacy_settings:
                user_data['privacy_settings'] = {
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
                    'created_at': privacy_settings.created_at.isoformat() if privacy_settings.created_at else None,
                    'updated_at': privacy_settings.updated_at.isoformat() if privacy_settings.updated_at else None
                }
            
            # Collect deletion requests
            deletion_requests = DataDeletionRequest.query.filter_by(user_id=user_id).all()
            user_data['deletion_requests'] = []
            for req in deletion_requests:
                req_data = {
                    'id': req.id,
                    'reason': req.reason,
                    'status': req.status,
                    'requested_at': req.requested_at.isoformat() if req.requested_at else None,
                    'processed_at': req.processed_at.isoformat() if req.processed_at else None
                }
                user_data['deletion_requests'].append(req_data)
            
            # Collect export requests
            export_requests = DataExportRequest.query.filter_by(user_id=user_id).all()
            user_data['export_requests'] = []
            for req in export_requests:
                req_data = {
                    'id': req.id,
                    'export_format': req.export_format,
                    'status': req.status,
                    'requested_at': req.requested_at.isoformat() if req.requested_at else None,
                    'completed_at': req.completed_at.isoformat() if req.completed_at else None,
                    'download_count': req.download_count
                }
                user_data['export_requests'].append(req_data)
            
            # Collect uploaded images
            images = Image.query.filter_by(uploaded_by=user_id).all()
            user_data['images'] = []
            for image in images:
                image_data = {
                    'id': image.id,
                    'filename': image.filename,
                    'original_filename': image.original_filename,
                    'file_size': image.file_size,
                    'mime_type': image.mime_type,
                    'upload_type': image.upload_type,
                    'created_at': image.created_at.isoformat() if image.created_at else None
                }
                user_data['images'].append(image_data)
            
            # Add export metadata
            user_data['export_metadata'] = {
                'exported_at': datetime.utcnow().isoformat(),
                'export_version': '1.0',
                'total_reviews': len(user_data['reviews']),
                'total_interactions': len(user_data['interactions']),
                'total_consents': len(user_data['consents']),
                'total_images': len(user_data['images'])
            }
            
            return user_data
            
        except Exception as e:
            logger.error(f"Error collecting user data: {e}")
            return {}
    
    def _generate_json_export(self, user_data: Dict[str, Any], user_id: int) -> str:
        """Generate JSON export file"""
        try:
            filename = f"user_data_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            file_path = os.path.join(self.export_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(user_data, f, indent=2, ensure_ascii=False)
            
            return file_path
            
        except Exception as e:
            logger.error(f"Error generating JSON export: {e}")
            raise
    
    def _generate_csv_export(self, user_data: Dict[str, Any], user_id: int) -> str:
        """Generate CSV export file (as ZIP with multiple CSV files)"""
        try:
            filename = f"user_data_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
            file_path = os.path.join(self.export_dir, filename)
            
            with zipfile.ZipFile(file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Profile data
                profile_csv = StringIO()
                profile_writer = csv.writer(profile_csv)
                profile_writer.writerow(['Field', 'Value'])
                for key, value in user_data['profile'].items():
                    profile_writer.writerow([key, value])
                zipf.writestr('profile.csv', profile_csv.getvalue())
                
                # Reviews data
                if user_data['reviews']:
                    reviews_csv = StringIO()
                    reviews_writer = csv.DictWriter(reviews_csv, fieldnames=user_data['reviews'][0].keys())
                    reviews_writer.writeheader()
                    reviews_writer.writerows(user_data['reviews'])
                    zipf.writestr('reviews.csv', reviews_csv.getvalue())
                
                # Interactions data
                if user_data['interactions']:
                    interactions_csv = StringIO()
                    interactions_writer = csv.DictWriter(interactions_csv, fieldnames=user_data['interactions'][0].keys())
                    interactions_writer.writeheader()
                    interactions_writer.writerows(user_data['interactions'])
                    zipf.writestr('interactions.csv', interactions_csv.getvalue())
                
                # Consents data
                if user_data['consents']:
                    consents_csv = StringIO()
                    consents_writer = csv.DictWriter(consents_csv, fieldnames=user_data['consents'][0].keys())
                    consents_writer.writeheader()
                    consents_writer.writerows(user_data['consents'])
                    zipf.writestr('consents.csv', consents_csv.getvalue())
                
                # Privacy settings
                if 'privacy_settings' in user_data:
                    privacy_csv = StringIO()
                    privacy_writer = csv.writer(privacy_csv)
                    privacy_writer.writerow(['Setting', 'Value'])
                    for key, value in user_data['privacy_settings'].items():
                        privacy_writer.writerow([key, value])
                    zipf.writestr('privacy_settings.csv', privacy_csv.getvalue())
                
                # Export metadata
                metadata_csv = StringIO()
                metadata_writer = csv.writer(metadata_csv)
                metadata_writer.writerow(['Field', 'Value'])
                for key, value in user_data['export_metadata'].items():
                    metadata_writer.writerow([key, value])
                zipf.writestr('export_metadata.csv', metadata_csv.getvalue())
            
            return file_path
            
        except Exception as e:
            logger.error(f"Error generating CSV export: {e}")
            raise
    
    def _generate_pdf_export(self, user_data: Dict[str, Any], user_id: int) -> str:
        """Generate PDF export file"""
        try:
            filename = f"user_data_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
            file_path = os.path.join(self.export_dir, filename)
            
            doc = SimpleDocTemplate(file_path, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                textColor=colors.darkblue
            )
            story.append(Paragraph("ReviewHub - User Data Export", title_style))
            story.append(Spacer(1, 20))
            
            # Export metadata
            story.append(Paragraph("Export Information", styles['Heading2']))
            metadata_data = [
                ['Export Date', user_data['export_metadata']['exported_at']],
                ['Export Version', user_data['export_metadata']['export_version']],
                ['Total Reviews', str(user_data['export_metadata']['total_reviews'])],
                ['Total Interactions', str(user_data['export_metadata']['total_interactions'])],
                ['Total Consents', str(user_data['export_metadata']['total_consents'])],
                ['Total Images', str(user_data['export_metadata']['total_images'])]
            ]
            metadata_table = Table(metadata_data, colWidths=[2*inch, 3*inch])
            metadata_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(metadata_table)
            story.append(Spacer(1, 20))
            
            # Profile information
            story.append(Paragraph("Profile Information", styles['Heading2']))
            profile_data = []
            for key, value in user_data['profile'].items():
                if value is not None:
                    profile_data.append([key.replace('_', ' ').title(), str(value)])
            
            profile_table = Table(profile_data, colWidths=[2*inch, 3*inch])
            profile_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(profile_table)
            story.append(Spacer(1, 20))
            
            # Reviews summary
            if user_data['reviews']:
                story.append(Paragraph("Reviews Summary", styles['Heading2']))
                story.append(Paragraph(f"Total Reviews: {len(user_data['reviews'])}", styles['Normal']))
                
                # Show first few reviews
                for i, review in enumerate(user_data['reviews'][:5]):
                    story.append(Paragraph(f"Review {i+1}:", styles['Heading3']))
                    story.append(Paragraph(f"Product: {review['product_name']}", styles['Normal']))
                    story.append(Paragraph(f"Rating: {review['rating']}/5", styles['Normal']))
                    story.append(Paragraph(f"Title: {review['title']}", styles['Normal']))
                    story.append(Paragraph(f"Date: {review['created_at']}", styles['Normal']))
                    story.append(Spacer(1, 10))
                
                if len(user_data['reviews']) > 5:
                    story.append(Paragraph(f"... and {len(user_data['reviews']) - 5} more reviews", styles['Normal']))
                
                story.append(Spacer(1, 20))
            
            # Privacy settings
            if 'privacy_settings' in user_data:
                story.append(Paragraph("Privacy Settings", styles['Heading2']))
                privacy_data = []
                for key, value in user_data['privacy_settings'].items():
                    if key not in ['created_at', 'updated_at']:
                        privacy_data.append([key.replace('_', ' ').title(), str(value)])
                
                privacy_table = Table(privacy_data, colWidths=[2.5*inch, 1.5*inch])
                privacy_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(privacy_table)
            
            # Build PDF
            doc.build(story)
            
            return file_path
            
        except Exception as e:
            logger.error(f"Error generating PDF export: {e}")
            raise
    
    def get_export_requests(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all export requests for a user"""
        try:
            from app_enhanced import DataExportRequest
            
            requests = DataExportRequest.query.filter_by(user_id=user_id).order_by(
                DataExportRequest.requested_at.desc()
            ).all()
            
            requests_data = []
            for req in requests:
                req_data = {
                    'id': req.id,
                    'export_format': req.export_format,
                    'status': req.status,
                    'requested_at': req.requested_at.isoformat() if req.requested_at else None,
                    'completed_at': req.completed_at.isoformat() if req.completed_at else None,
                    'download_count': req.download_count,
                    'expires_at': req.expires_at.isoformat() if req.expires_at else None,
                    'is_expired': req.expires_at < datetime.utcnow() if req.expires_at else False,
                    'file_available': req.file_path and os.path.exists(req.file_path) if req.file_path else False
                }
                requests_data.append(req_data)
            
            return requests_data
            
        except Exception as e:
            logger.error(f"Error getting export requests: {e}")
            return []
    
    def download_export(self, user_id: int, request_id: int) -> Dict[str, Any]:
        """Get download information for an export"""
        try:
            from app_enhanced import DataExportRequest
            
            export_request = DataExportRequest.query.filter_by(
                id=request_id,
                user_id=user_id
            ).first()
            
            if not export_request:
                return {'success': False, 'error': 'Export request not found'}
            
            if export_request.status != 'completed':
                return {'success': False, 'error': 'Export not completed'}
            
            if export_request.expires_at < datetime.utcnow():
                return {'success': False, 'error': 'Export has expired'}
            
            if not export_request.file_path or not os.path.exists(export_request.file_path):
                return {'success': False, 'error': 'Export file not found'}
            
            # Increment download count
            export_request.download_count += 1
            self.db.session.commit()
            
            return {
                'success': True,
                'file_path': export_request.file_path,
                'filename': os.path.basename(export_request.file_path),
                'export_format': export_request.export_format
            }
            
        except Exception as e:
            logger.error(f"Error downloading export: {e}")
            return {'success': False, 'error': str(e)}
    
    def cleanup_expired_exports(self) -> int:
        """Clean up expired export files"""
        try:
            from app_enhanced import DataExportRequest
            
            expired_requests = DataExportRequest.query.filter(
                DataExportRequest.expires_at < datetime.utcnow(),
                DataExportRequest.file_path.isnot(None)
            ).all()
            
            cleaned_count = 0
            for req in expired_requests:
                try:
                    if os.path.exists(req.file_path):
                        os.remove(req.file_path)
                    req.file_path = None
                    cleaned_count += 1
                except Exception as e:
                    logger.error(f"Error cleaning up export file {req.file_path}: {e}")
            
            self.db.session.commit()
            
            logger.info(f"Cleaned up {cleaned_count} expired export files")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired exports: {e}")
            return 0

# Global data export service instance
data_export_service = None

def get_data_export_service(db=None):
    """Get or create data export service instance"""
    global data_export_service
    if data_export_service is None and db is not None:
        data_export_service = DataExportService(db)
    return data_export_service

