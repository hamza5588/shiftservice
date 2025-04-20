from datetime import date
from database import get_db
from sqlalchemy.orm import Session
from models import Factuur
import logging

logger = logging.getLogger(__name__)

def send_payment_reminders():
    today = date.today()
    logger.info(f"{today} - Checking payment reminders...")
    
    db = next(get_db())
    try:
        # Get all open invoices
        open_invoices = db.query(Factuur).filter(Factuur.status == "open").all()
        
        for factuur in open_invoices:
            factuur_date = factuur.factuurdatum
            days_diff = (today - factuur_date).days
            
            if days_diff >= 30:
                factuur.status = "herinnering30"
                logger.info(f"Factuur {factuur.id} krijgt 30 dagen herinnering (oud: {days_diff} dagen).")
            elif days_diff >= 14:
                factuur.status = "herinnering14"
                logger.info(f"Factuur {factuur.id} krijgt 14 dagen herinnering (oud: {days_diff} dagen).")
        
        db.commit()
        logger.info(f"{today} - Finished checking payment reminders.")
    except Exception as e:
        logger.error(f"Error in send_payment_reminders: {str(e)}")
        db.rollback()
    finally:
        db.close()
