import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timedelta
import secrets
import string
from flask import current_app, url_for
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@reviewhub.com')
        self.from_name = os.getenv('FROM_NAME', 'ReviewHub')
        
    def send_email(self, to_email, subject, html_content, text_content=None):
        """Send an email with HTML content"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add text version if provided
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            # Add HTML version
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            if self.smtp_username and self.smtp_password:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                server.quit()
                return True
            else:
                # For development - just log the email
                print(f"EMAIL WOULD BE SENT TO: {to_email}")
                print(f"SUBJECT: {subject}")
                print(f"CONTENT: {html_content}")
                return True
                
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return False
    
    def send_verification_email(self, user_email, username, verification_token):
        """Send email verification email"""
        verification_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token={verification_token}"
        
        subject = "Verify Your ReviewHub Account"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2563EB, #10B981); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to ReviewHub!</h1>
                </div>
                <div class="content">
                    <h2>Hi {username},</h2>
                    <p>Thank you for signing up for ReviewHub! To complete your registration and start sharing your product reviews, please verify your email address.</p>
                    
                    <p style="text-align: center;">
                        <a href="{verification_url}" class="button">Verify Email Address</a>
                    </p>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 4px;">{verification_url}</p>
                    
                    <p>This verification link will expire in 24 hours for security reasons.</p>
                    
                    <p>If you didn't create an account with ReviewHub, please ignore this email.</p>
                    
                    <p>Best regards,<br>The ReviewHub Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 ReviewHub. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to ReviewHub!
        
        Hi {username},
        
        Thank you for signing up for ReviewHub! To complete your registration, please verify your email address by clicking the link below:
        
        {verification_url}
        
        This verification link will expire in 24 hours for security reasons.
        
        If you didn't create an account with ReviewHub, please ignore this email.
        
        Best regards,
        The ReviewHub Team
        """
        
        return self.send_email(user_email, subject, html_content, text_content)
    
    def send_password_reset_email(self, user_email, username, reset_token):
        """Send password reset email"""
        reset_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
        
        subject = "Reset Your ReviewHub Password"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2563EB, #10B981); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                .warning {{ background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 15px; border-radius: 4px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hi {username},</h2>
                    <p>We received a request to reset your password for your ReviewHub account. If you made this request, click the button below to reset your password:</p>
                    
                    <p style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset Password</a>
                    </p>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 4px;">{reset_url}</p>
                    
                    <div class="warning">
                        <strong>Security Notice:</strong> This password reset link will expire in 1 hour for security reasons. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                    </div>
                    
                    <p>For your security, we recommend choosing a strong password that you haven't used before.</p>
                    
                    <p>Best regards,<br>The ReviewHub Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 ReviewHub. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        Hi {username},
        
        We received a request to reset your password for your ReviewHub account. If you made this request, use the link below to reset your password:
        
        {reset_url}
        
        This password reset link will expire in 1 hour for security reasons.
        
        If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        
        Best regards,
        The ReviewHub Team
        """
        
        return self.send_email(user_email, subject, html_content, text_content)
    
    def send_welcome_email(self, user_email, username):
        """Send welcome email after successful verification"""
        subject = "Welcome to ReviewHub - Let's Get Started!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ReviewHub</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2563EB, #10B981); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                .feature {{ background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563EB; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome to ReviewHub!</h1>
                </div>
                <div class="content">
                    <h2>Hi {username},</h2>
                    <p>Your email has been verified and your ReviewHub account is now active! We're excited to have you join our community of honest reviewers.</p>
                    
                    <h3>Here's what you can do now:</h3>
                    
                    <div class="feature">
                        <h4>📝 Write Your First Review</h4>
                        <p>Share your experience with products you've used and help others make informed decisions.</p>
                    </div>
                    
                    <div class="feature">
                        <h4>🔍 Discover Products</h4>
                        <p>Browse thousands of products and read authentic reviews from real users.</p>
                    </div>
                    
                    <div class="feature">
                        <h4>👍 Vote on Reviews</h4>
                        <p>Help the community by voting on reviews that you find helpful.</p>
                    </div>
                    
                    <div class="feature">
                        <h4>📊 Build Your Profile</h4>
                        <p>Earn credibility by writing quality reviews and engaging with the community.</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}" class="button">Start Exploring</a>
                        <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/profile" class="button">View Your Profile</a>
                    </p>
                    
                    <p>Thank you for joining ReviewHub. Together, we're building a more transparent marketplace!</p>
                    
                    <p>Best regards,<br>The ReviewHub Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 ReviewHub. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, html_content)

def generate_token(length=32):
    """Generate a secure random token"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

# Initialize email service
email_service = EmailService()

