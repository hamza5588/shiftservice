import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime
from dotenv import load_dotenv
import sys

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Configure logging
logger = logging.getLogger('email_service')
logger.setLevel(logging.DEBUG)

# Create file handler
file_handler = logging.FileHandler('logs/email.log')
file_handler.setLevel(logging.DEBUG)

# Create console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG)

# Create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Load environment variables
load_dotenv()

# Email configuration
EMAIL_CONFIG = {
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': 587,
    'username': 'y7hamzakhanswati@gmail.com',
    'password': 'cama vrpz xowp ziax',
    'from_email': 'y7hamzakhanswati@gmail.com',
    'from_name': 'Secufy Boekhouding'
}

logger.info("="*50)
logger.info("Email Configuration Loaded")
logger.info(f"SMTP Server: {EMAIL_CONFIG['smtp_server']}")
logger.info(f"SMTP Port: {EMAIL_CONFIG['smtp_port']}")
logger.info(f"From Email: {EMAIL_CONFIG['from_email']}")
logger.info(f"From Name: {EMAIL_CONFIG['from_name']}")
logger.info(f"Username configured: {'Yes' if EMAIL_CONFIG['username'] else 'No'}")
logger.info(f"Password configured: {'Yes' if EMAIL_CONFIG['password'] else 'No'}")
logger.info("="*50)

def send_invoice_email(invoice, pdf_content: bytes) -> bool:
    """
    Send an invoice via email.
    
    Args:
        invoice: The invoice object
        pdf_content: The PDF content as bytes
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    logger.info("="*50)
    logger.info(f"Starting email send process for invoice {invoice.factuurnummer}")
    logger.info(f"Timestamp: {datetime.now()}")
    logger.info(f"Recipient: {invoice.email}")
    logger.info("="*50)

    try:
        # Validate email configuration
        logger.debug("Validating email configuration")
        if not all([EMAIL_CONFIG['username'], EMAIL_CONFIG['password']]):
            missing = [k for k, v in EMAIL_CONFIG.items() if not v and k in ['username', 'password']]
            logger.error(f"Missing email configuration: {', '.join(missing)}")
            return False
        logger.debug("Email configuration validation passed")

        # Validate recipient email
        logger.debug(f"Validating recipient email: {invoice.email}")
        if not invoice.email or "@" not in invoice.email:
            logger.error(f"Invalid recipient email: {invoice.email}")
            return False
        logger.debug("Recipient email validation passed")

        # Create message
        logger.debug("Creating email message")
        msg = MIMEMultipart()
        msg['From'] = f"{EMAIL_CONFIG['from_name']} <{EMAIL_CONFIG['from_email']}>"
        msg['To'] = invoice.email
        msg['Subject'] = f"Factuur {invoice.factuurnummer} - {invoice.opdrachtgever_naam}"

        # Add body
        logger.debug("Adding email body")
        body = f"""
        Beste {invoice.opdrachtgever_naam},

        Bijgevoegd vindt u factuur {invoice.factuurnummer} voor een totaalbedrag van €{invoice.bedrag:.2f}.

        Met vriendelijke groet,
        {EMAIL_CONFIG['from_name']}
        """
        msg.attach(MIMEText(body, 'plain'))
        logger.debug("Email body added successfully")

        # Add PDF attachment
        logger.debug("Adding PDF attachment")
        pdf_attachment = MIMEApplication(pdf_content, _subtype='pdf')
        pdf_attachment.add_header('Content-Disposition', 'attachment', filename=f'factuur_{invoice.factuurnummer}.pdf')
        msg.attach(pdf_attachment)
        logger.debug("PDF attachment added successfully")

        # Connect to SMTP server
        logger.debug(f"Connecting to SMTP server: {EMAIL_CONFIG['smtp_server']}:{EMAIL_CONFIG['smtp_port']}")
        with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
            server.starttls()
            logger.debug("TLS started successfully")
            
            # Login
            logger.debug("Attempting SMTP login")
            server.login(EMAIL_CONFIG['username'], EMAIL_CONFIG['password'])
            logger.debug("SMTP login successful")
            
            # Send email
            logger.debug("Sending email")
            server.send_message(msg)
            logger.info(f"Email sent successfully to {invoice.email}")
            logger.info("="*50)
            return True

    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(f"SMTP Authentication failed: {str(auth_err)}", exc_info=True)
        logger.error(f"Error type: {type(auth_err)}")
        logger.error(f"Error details: {auth_err.__dict__ if hasattr(auth_err, '__dict__') else 'No details available'}")
        return False
    except smtplib.SMTPException as smtp_err:
        logger.error(f"SMTP error occurred: {str(smtp_err)}", exc_info=True)
        logger.error(f"Error type: {type(smtp_err)}")
        logger.error(f"Error details: {smtp_err.__dict__ if hasattr(smtp_err, '__dict__') else 'No details available'}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error occurred: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        return False 