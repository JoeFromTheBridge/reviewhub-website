"""
GDPR Compliance Service for ReviewHub
Handles data protection, consent management, and user rights under GDPR
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from sqlalchemy import and_, or_
from flask import current_app

logger = logging.getLogger(__name__)

class ConsentType(Enum):
    ESSENTIAL = "essential"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    PERSONALIZATION = "personalization"
    THIRD_PARTY = "third_party"

class DataProcessingPurpose(Enum):
    ACCOUNT_MANAGEMENT = "account_management"
    REVIEW_PROCESSING = "review_processing"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    PERSONALIZATION = "personalization"
    SECURITY = "security"
    LEGAL_COMPLIANCE = "legal_compliance"

class GDPRService:
    def __init__(self, db):
        self.db = db
    
    def record_consent(self, user_id: int, consent_type: ConsentType, 
                      granted: bool, ip_address: str = None, 
                      user_agent: str = None) -> bool:
        """Record user consent for data processing"""
        try:
            from app_enhanced import UserConsent
            
            # Check if consent record already exists
            existing_consent = UserConsent.query.filter_by(
                user_id=user_id,
                consent_type=consent_type.value
            ).first()
            
            if existing_consent:
                # Update existing consent
                existing_consent.granted = granted
                existing_consent.updated_at = datetime.utcnow()
                existing_consent.ip_address = ip_address
                existing_consent.user_agent = user_agent
            else:
                # Create new consent record
                consent = UserConsent(
                    user_id=user_id,
                    consent_type=consent_type.value,
                    granted=granted,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.session.add(consent)
            
            self.db.session.commit()
            
            # Log consent change
            self._log_consent_change(user_id, consent_type, granted, ip_address)
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording consent: {e}")
            self.db.session.rollback()
            return False
    
    def get_user_consents(self, user_id: int) -> Dict[str, Any]:
        """Get all consent records for a user"""
        try:
            from app_enhanced import UserConsent
            
            consents = UserConsent.query.filter_by(user_id=user_id).all()
            
            consent_dict = {}
            for consent in consents:
                consent_dict[consent.consent_type] = {
                    'granted': consent.granted,
                    'created_at': consent.created_at.isoformat(),
                    'updated_at': consent.updated_at.isoformat(),
                    'ip_address': consent.ip_address,
                    'user_agent': consent.user_agent
                }
            
            return consent_dict
            
        except Exception as e:
            logger.error(f"Error getting user consents: {e}")
            return {}
    
    def check_consent(self, user_id: int, consent_type: ConsentType) -> bool:
        """Check if user has granted specific consent"""
        try:
            from app_enhanced import UserConsent
            
            consent = UserConsent.query.filter_by(
                user_id=user_id,
                consent_type=consent_type.value,
                granted=True
            ).first()
            
            return consent is not None
            
        except Exception as e:
            logger.error(f"Error checking consent: {e}")
            return False
    
    def withdraw_consent(self, user_id: int, consent_type: ConsentType,
                        ip_address: str = None, user_agent: str = None) -> bool:
        """Withdraw user consent and handle data implications"""
        try:
            # Record consent withdrawal
            success = self.record_consent(
                user_id, consent_type, False, ip_address, user_agent
            )
            
            if success:
                # Handle data implications based on consent type
                self._handle_consent_withdrawal(user_id, consent_type)
            
            return success
            
        except Exception as e:
            logger.error(f"Error withdrawing consent: {e}")
            return False
    
    def request_data_deletion(self, user_id: int, reason: str = None) -> Dict[str, Any]:
        """Handle right to be forgotten request"""
        try:
            from app_enhanced import DataDeletionRequest, User
            
            user = User.query.get(user_id)
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            # Check if there's already a pending request
            existing_request = DataDeletionRequest.query.filter_by(
                user_id=user_id,
                status='pending'
            ).first()
            
            if existing_request:
                return {
                    'success': False, 
                    'error': 'Deletion request already pending',
                    'request_id': existing_request.id
                }
            
            # Create deletion request
            deletion_request = DataDeletionRequest(
                user_id=user_id,
                reason=reason,
                status='pending',
                requested_at=datetime.utcnow()
            )
            
            self.db.session.add(deletion_request)
            self.db.session.commit()
            
            # Log the request
            self._log_deletion_request(user_id, deletion_request.id, reason)
            
            return {
                'success': True,
                'request_id': deletion_request.id,
                'message': 'Data deletion request submitted successfully'
            }
            
        except Exception as e:
            logger.error(f"Error requesting data deletion: {e}")
            self.db.session.rollback()
            return {'success': False, 'error': str(e)}
    
    def process_data_deletion(self, request_id: int, admin_user_id: int) -> Dict[str, Any]:
        """Process approved data deletion request"""
        try:
            from app_enhanced import DataDeletionRequest, User, Review, UserInteraction
            
            deletion_request = DataDeletionRequest.query.get(request_id)
            if not deletion_request:
                return {'success': False, 'error': 'Deletion request not found'}
            
            if deletion_request.status != 'pending':
                return {'success': False, 'error': 'Request already processed'}
            
            user_id = deletion_request.user_id
            
            # Start deletion process
            deletion_summary = {
                'user_data': False,
                'reviews': 0,
                'interactions': 0,
                'images': 0,
                'consents': 0
            }
            
            # Delete user interactions
            interactions = UserInteraction.query.filter_by(user_id=user_id).all()
            deletion_summary['interactions'] = len(interactions)
            for interaction in interactions:
                self.db.session.delete(interaction)
            
            # Handle reviews - either delete or anonymize based on policy
            reviews = Review.query.filter_by(user_id=user_id).all()
            deletion_summary['reviews'] = len(reviews)
            
            for review in reviews:
                if self._should_anonymize_review(review):
                    # Anonymize review instead of deleting
                    review.user_id = None
                    review.is_anonymous = True
                else:
                    # Delete review and associated data
                    self.db.session.delete(review)
            
            # Delete user consents
            from app_enhanced import UserConsent
            consents = UserConsent.query.filter_by(user_id=user_id).all()
            deletion_summary['consents'] = len(consents)
            for consent in consents:
                self.db.session.delete(consent)
            
            # Delete user images
            from app_enhanced import Image
            user_images = Image.query.filter_by(uploaded_by=user_id).all()
            deletion_summary['images'] = len(user_images)
            for image in user_images:
                # Delete physical file
                self._delete_image_file(image.file_path)
                self.db.session.delete(image)
            
            # Finally, delete user account
            user = User.query.get(user_id)
            if user:
                self.db.session.delete(user)
                deletion_summary['user_data'] = True
            
            # Update deletion request
            deletion_request.status = 'completed'
            deletion_request.processed_at = datetime.utcnow()
            deletion_request.processed_by = admin_user_id
            deletion_request.deletion_summary = json.dumps(deletion_summary)
            
            self.db.session.commit()
            
            # Log completion
            self._log_deletion_completion(user_id, request_id, deletion_summary)
            
            return {
                'success': True,
                'message': 'Data deletion completed successfully',
                'summary': deletion_summary
            }
            
        except Exception as e:
            logger.error(f"Error processing data deletion: {e}")
            self.db.session.rollback()
            return {'success': False, 'error': str(e)}
    
    def get_data_retention_info(self, user_id: int) -> Dict[str, Any]:
        """Get data retention information for user"""
        try:
            from app_enhanced import User, Review, UserInteraction
            
            user = User.query.get(user_id)
            if not user:
                return {'error': 'User not found'}
            
            # Calculate data retention periods
            retention_info = {
                'account_created': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'data_categories': {
                    'account_data': {
                        'retention_period': '7 years after account closure',
                        'legal_basis': 'Legitimate interest for fraud prevention'
                    },
                    'review_data': {
                        'retention_period': 'Indefinite (with user consent)',
                        'legal_basis': 'User consent for service provision'
                    },
                    'analytics_data': {
                        'retention_period': '26 months',
                        'legal_basis': 'User consent for service improvement'
                    },
                    'marketing_data': {
                        'retention_period': 'Until consent withdrawn',
                        'legal_basis': 'User consent for marketing communications'
                    }
                }
            }
            
            # Add data volumes
            review_count = Review.query.filter_by(user_id=user_id).count()
            interaction_count = UserInteraction.query.filter_by(user_id=user_id).count()
            
            retention_info['data_volumes'] = {
                'reviews': review_count,
                'interactions': interaction_count
            }
            
            return retention_info
            
        except Exception as e:
            logger.error(f"Error getting retention info: {e}")
            return {'error': str(e)}
    
    def generate_privacy_report(self, user_id: int) -> Dict[str, Any]:
        """Generate comprehensive privacy report for user"""
        try:
            report = {
                'user_id': user_id,
                'generated_at': datetime.utcnow().isoformat(),
                'consents': self.get_user_consents(user_id),
                'data_retention': self.get_data_retention_info(user_id),
                'data_processing_purposes': self._get_data_processing_purposes(user_id),
                'third_party_sharing': self._get_third_party_sharing_info(user_id),
                'user_rights': {
                    'right_to_access': 'Available via data export',
                    'right_to_rectification': 'Available via profile settings',
                    'right_to_erasure': 'Available via deletion request',
                    'right_to_portability': 'Available via data export',
                    'right_to_object': 'Available via consent management'
                }
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating privacy report: {e}")
            return {'error': str(e)}
    
    def _handle_consent_withdrawal(self, user_id: int, consent_type: ConsentType):
        """Handle data implications when consent is withdrawn"""
        if consent_type == ConsentType.ANALYTICS:
            # Stop analytics data collection
            self._disable_analytics_tracking(user_id)
        elif consent_type == ConsentType.MARKETING:
            # Remove from marketing lists
            self._remove_from_marketing(user_id)
        elif consent_type == ConsentType.PERSONALIZATION:
            # Clear personalization data
            self._clear_personalization_data(user_id)
    
    def _should_anonymize_review(self, review) -> bool:
        """Determine if review should be anonymized instead of deleted"""
        # Keep reviews that are highly rated by community
        if hasattr(review, 'helpful_count') and review.helpful_count > 10:
            return True
        
        # Keep reviews older than 1 year for platform integrity
        if review.created_at < datetime.utcnow() - timedelta(days=365):
            return True
        
        return False
    
    def _delete_image_file(self, file_path: str):
        """Delete physical image file"""
        try:
            import os
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.error(f"Error deleting image file {file_path}: {e}")
    
    def _get_data_processing_purposes(self, user_id: int) -> List[Dict[str, str]]:
        """Get list of data processing purposes for user"""
        purposes = []
        
        # Check which purposes apply based on user data and consents
        if self.check_consent(user_id, ConsentType.ESSENTIAL):
            purposes.append({
                'purpose': DataProcessingPurpose.ACCOUNT_MANAGEMENT.value,
                'legal_basis': 'Contract performance',
                'description': 'Managing your account and providing core services'
            })
        
        if self.check_consent(user_id, ConsentType.ANALYTICS):
            purposes.append({
                'purpose': DataProcessingPurpose.ANALYTICS.value,
                'legal_basis': 'User consent',
                'description': 'Analyzing usage patterns to improve our services'
            })
        
        if self.check_consent(user_id, ConsentType.MARKETING):
            purposes.append({
                'purpose': DataProcessingPurpose.MARKETING.value,
                'legal_basis': 'User consent',
                'description': 'Sending marketing communications and recommendations'
            })
        
        return purposes
    
    def _get_third_party_sharing_info(self, user_id: int) -> List[Dict[str, str]]:
        """Get information about third-party data sharing"""
        sharing_info = []
        
        if self.check_consent(user_id, ConsentType.THIRD_PARTY):
            sharing_info.append({
                'partner': 'Analytics Providers',
                'purpose': 'Service improvement and analytics',
                'data_types': 'Usage data, preferences',
                'legal_basis': 'User consent'
            })
        
        return sharing_info
    
    def _disable_analytics_tracking(self, user_id: int):
        """Disable analytics tracking for user"""
        # Implementation would depend on analytics system
        logger.info(f"Analytics tracking disabled for user {user_id}")
    
    def _remove_from_marketing(self, user_id: int):
        """Remove user from marketing communications"""
        # Implementation would depend on marketing system
        logger.info(f"User {user_id} removed from marketing communications")
    
    def _clear_personalization_data(self, user_id: int):
        """Clear personalization data for user"""
        try:
            from app_enhanced import UserInteraction
            
            # Clear recommendation-related interactions
            interactions = UserInteraction.query.filter_by(
                user_id=user_id,
                interaction_type='recommendation_view'
            ).all()
            
            for interaction in interactions:
                self.db.session.delete(interaction)
            
            self.db.session.commit()
            
        except Exception as e:
            logger.error(f"Error clearing personalization data: {e}")
    
    def _log_consent_change(self, user_id: int, consent_type: ConsentType, 
                           granted: bool, ip_address: str):
        """Log consent changes for audit trail"""
        logger.info(f"Consent {consent_type.value} {'granted' if granted else 'withdrawn'} "
                   f"for user {user_id} from IP {ip_address}")
    
    def _log_deletion_request(self, user_id: int, request_id: int, reason: str):
        """Log data deletion request"""
        logger.info(f"Data deletion requested for user {user_id}, "
                   f"request ID {request_id}, reason: {reason}")
    
    def _log_deletion_completion(self, user_id: int, request_id: int, 
                                summary: Dict[str, Any]):
        """Log completion of data deletion"""
        logger.info(f"Data deletion completed for user {user_id}, "
                   f"request ID {request_id}, summary: {summary}")

# Global GDPR service instance
gdpr_service = None

def get_gdpr_service(db=None):
    """Get or create GDPR service instance"""
    global gdpr_service
    if gdpr_service is None and db is not None:
        gdpr_service = GDPRService(db)
    return gdpr_service

