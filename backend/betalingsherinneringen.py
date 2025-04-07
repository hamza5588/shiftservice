from datetime import date
from facturatie import fake_facturen_db

def send_payment_reminders():
    today = date.today()
    print(f"{today} - Checking payment reminders...")
    for factuur in fake_facturen_db:
        if factuur.get("status") == "open":
            factuur_date = factuur.get("factuurdatum")
            # Als factuur_date een string is, converteer deze dan naar een date object
            if isinstance(factuur_date, str):
                factuur_date = date.fromisoformat(factuur_date)
            days_diff = (today - factuur_date).days
            if days_diff >= 30:
                factuur["status"] = "herinnering30"
                print(f"Factuur {factuur['id']} krijgt 30 dagen herinnering (oud: {days_diff} dagen).")
            elif days_diff >= 14:
                factuur["status"] = "herinnering14"
                print(f"Factuur {factuur['id']} krijgt 14 dagen herinnering (oud: {days_diff} dagen).")
    print(f"{today} - Finished checking payment reminders.")
