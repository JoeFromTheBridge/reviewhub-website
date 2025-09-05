# email_service.py
import os
import ssl
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
import secrets
import string

load_dotenv()


class EmailService:
    def __init__(self):
        # Choose backend: "smtp" (default) or "console" to log emails only
        self.backend = os.getenv("EMAIL_BACKEND", "smtp").lower()

        # SMTP settings — supports both SMTP_* and MAIL_* env var names
        self.smtp_host = (
            os.getenv("SMTP_HOST")
            or os.getenv("SMTP_SERVER")
            or os.getenv("MAIL_SERVER")
            or ""
        )
        self.smtp_port = int(
            os.getenv("SMTP_PORT")
            or os.getenv("MAIL_PORT")
            or "587"
        )
        self.smtp_username = (
            os.getenv("SMTP_USERNAME")
            or os.getenv("MAIL_USERNAME")
            or ""
        )
        self.smtp_password = (
            os.getenv("SMTP_PASSWORD")
            or os.getenv("MAIL_PASSWORD")
            or ""
        )
        # TLS/SSL flags (STARTTLS vs SSL) — use either naming scheme
        self.smtp_use_tls = (os.getenv("SMTP_USE_TLS") or os.getenv("MAIL_USE_TLS") or "true").lower() == "true"
        self.smtp_use_ssl = (os.getenv("SMTP_USE_SSL") or os.getenv("MAIL_USE_SSL") or "false").lower() == "true"

        # From identity (support a typical Flask-Mail var too)
        self.from_email = os.getenv("FROM_EMAIL") or os.getenv("MAIL_DEFAULT_SENDER") or "noreply@reviewhub.com"
        self.from_name = os.getenv("FROM_NAME", "ReviewHub")

        # Frontend URLs for links
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.frontend_verify_url = os.getenv("FRONTEND_VERIFY_URL", f"{self.frontend_url}/verify-email")
        self.frontend_reset_url = os.getenv("FRONTEND_RESET_URL", f"{self.frontend_url}/reset-password")

    # ---------- Public API ----------
    def send_verification_email(self, user_email, username, verification_token):
        verify_link = f"{self.frontend_verify_url}?token={verification_token}"
        subject = "Verify Your ReviewHub Account"
        html = f"""
        <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
          <h2>Welcome to ReviewHub, {username}!</h2>
          <p>Click the button below to verify your email address.</p>
          <p style="margin:16px 0">
            <a href="{verify_link}" style="background:#2563EB;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">
              Verify Email
            </a>
          </p>
          <p>If the button doesn't work, paste this link in your browser:</p>
          <p style="word-break:break-all"><a href="{verify_link}">{verify_link}</a></p>
          <p style="color:#6b7280;font-size:12px">This link expires in 24 hours.</p>
        </body></html>
        """
        text = f"Verify your account:\n{verify_link}\n(This link expires in 24 hours.)"
        return self._send_email(user_email, subject, html, text)

    def send_password_reset_email(self, user_email, username, reset_token):
        link = f"{self.frontend_reset_url}?token={reset_token}"
        subject = "Reset Your ReviewHub Password"
        html = f"""
        <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
          <h2>Password reset</h2>
          <p>Hello {username}, click the button below to reset your password.</p>
          <p style="margin:16px 0">
            <a href="{link}" style="background:#2563EB;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">
              Reset Password
            </a>
          </p>
          <p>If the button doesn't work, paste this link:</p>
          <p style="word-break:break-all"><a href="{link}">{link}</a></p>
          <p style="color:#6b7280;font-size:12px">This link expires in 1 hour.</p>
        </body></html>
        """
        text = f"Reset your password:\n{link}\n(This link expires in 1 hour.)"
        return self._send_email(user_email, subject, html, text)

    def send_welcome_email(self, user_email, username):
        subject = "Welcome to ReviewHub 🎉"
        html = f"""
        <html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
          <h2>You're in, {username}!</h2>
          <p>Your email has been verified. Start exploring products and writing reviews.</p>
          <p><a href="{self.frontend_url}" style="background:#10B981;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Open ReviewHub</a></p>
        </body></html>
        """
        return self._send_email(user_email, subject, html)

    # ---------- Core SMTP / Console ----------
    def _send_email(self, to_email: str, subject: str, html_body: str, text_body: str | None = None) -> bool:
        if self.backend == "console":
            # Dev mode: print to logs and succeed
            print("=== EMAIL (console) ===")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(html_body)
            print("=======================")
            return True

        if not self.smtp_host:
            print("[EMAIL:error] SMTP host not set. Set EMAIL_BACKEND=console to log instead.")
            return False

        msg = EmailMessage()
        msg["From"] = f"{self.from_name} <{self.from_email}>" if self.from_name else self.from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        if text_body:
            msg.set_content(text_body)
        else:
            msg.set_content("This email contains HTML content.")
        msg.add_alternative(html_body, subtype="html")

        try:
            if self.smtp_use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=context, timeout=30) as server:
                    if self.smtp_username or self.smtp_password:
                        server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                    server.ehlo()
                    if self.smtp_use_tls:
                        server.starttls(context=ssl.create_default_context())
                        server.ehlo()
                    if self.smtp_username or self.smtp_password:
                        server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
            return True
        except Exception as e:
            print(f"[EMAIL:error] {e}")
            return False


def generate_token(length=32):
    """Generate a secure random token (URL-safe alphanumerics)."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


# Initialize email service
email_service = EmailService()
