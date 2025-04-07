import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Testmodus: tijdens testen wordt alleen verzonden naar jouw testadres.
TEST_MODE = True

# SMTP instellingen voor Hostnet (gebruik de juiste SMTP-server en poort voor het verzenden)
SMTP_SERVER = "smtp.hostnet.nl"
SMTP_PORT = 587

# Instellingen voor facturatie/verloning-e-mails (boekhouding)
SENDER_EMAIL = "boekhouding@secufy.nl"
SENDER_PASSWORD = "Abdelmosince2014!"  # Zorg ervoor dat dit een geldig wachtwoord of app-wachtwoord is

# Instellingen voor planning/dienstaanvragen-e-mails
PLANNING_SENDER_EMAIL = "planning@secufy.nl"
PLANNING_SENDER_PASSWORD = "PlanzeVol.2024"  # Pas dit aan naar jouw planning-app wachtwoord

def send_invoice_email(invoice_data: dict, client_email: str):
    """
    Verstuurt een factuur per e-mail naar de opdrachtgever, met CC naar boekhouden.secufy@gmail.com.
    Tijdens de testfase wordt de e-mail naar zowel SENDER_EMAIL als naar boekhouden.secufy@gmail.com verzonden.
    (Gebruikt boekhouding als afzender.)
    """
    subject = f"Factuur voor opdracht {invoice_data.get('opdrachtgever_id', 'Onbekend')}"
    body = (
        "Geachte opdrachtgever,\n\n"
        "Hierbij ontvangt u de factuur:\n\n"
        f"{invoice_data.get('factuur_text', '')}\n\n"
        "Met vriendelijke groet,\nSecufy"
    )

    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    if TEST_MODE:
        msg["To"] = SENDER_EMAIL
        msg["CC"] = "boekhouden.secufy@gmail.com"
        recipients = [SENDER_EMAIL, "boekhouden.secufy@gmail.com"]
    else:
        msg["To"] = client_email
        msg["CC"] = "boekhouden.secufy@gmail.com"
        recipients = [client_email, "boekhouden.secufy@gmail.com"]
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipients, msg.as_string())

def send_payroll_email(csv_content: str, year: int, periode: int):
    """
    Verstuurt het mutatieblad (loonstrookgegevens) als CSV-bestand per e-mail.
    Tijdens de testfase wordt de e-mail naar zowel SENDER_EMAIL als naar boekhouden.secufy@gmail.com verzonden.
    (Gebruikt boekhouding als afzender.)
    """
    subject = f"Mutatieblad Loonstrook {year} - Periode {periode}"
    body = (
        f"Beste,\n\n"
        f"In de bijlage vindt u het mutatieblad met de loonstrookgegevens voor periode {periode} in {year}.\n\n"
        "Met vriendelijke groet,\nSecufy"
    )

    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    if TEST_MODE:
        msg["To"] = SENDER_EMAIL
        msg["CC"] = "boekhouden.secufy@gmail.com"
        recipients = [SENDER_EMAIL, "boekhouden.secufy@gmail.com"]
    else:
        msg["To"] = "info@loonbureau.nl"
        msg["CC"] = "boekhouden.secufy@gmail.com"
        recipients = ["info@loonbureau.nl", "boekhouden.secufy@gmail.com"]
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    # Voeg CSV als bijlage toe
    attachment = MIMEText(csv_content, "csv")
    attachment.add_header("Content-Disposition", "attachment", filename=f"Mutatieblad_{year}_periode_{periode}.csv")
    msg.attach(attachment)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipients, msg.as_string())

def send_shift_registration_email(employee_email: str, shift_details: dict):
    """
    Verstuurt een bevestigingsmail naar de medewerker wanneer hij/zij zich inschrijft voor een dienst.
    (Gebruikt planning@secufy.nl als afzender.)
    """
    subject = "Bevestiging inschrijving dienst"
    body = (
        f"Beste medewerker,\n\n"
        f"Je inschrijving voor de dienst op {shift_details.get('shift_date')} bij {shift_details.get('location')} is bevestigd.\n\n"
        f"Details:\n"
        f"Shift: {shift_details.get('titel', 'Onbekend')}\n"
        f"Start: {shift_details.get('start_time')}\n"
        f"Einde: {shift_details.get('end_time')}\n\n"
        "Met vriendelijke groet,\nSecufy Planning"
    )

    msg = MIMEMultipart()
    msg["From"] = PLANNING_SENDER_EMAIL
    if TEST_MODE:
        msg["To"] = PLANNING_SENDER_EMAIL
        recipients = [PLANNING_SENDER_EMAIL]
    else:
        msg["To"] = employee_email
        recipients = [employee_email]
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(PLANNING_SENDER_EMAIL, PLANNING_SENDER_PASSWORD)
        server.sendmail(PLANNING_SENDER_EMAIL, recipients, msg.as_string())

def send_shift_unregistration_email(employee_email: str, shift_details: dict):
    """
    Verstuurt een bevestigingsmail naar de medewerker wanneer hij/zij zich uitschrijft van een dienst.
    (Gebruikt planning@secufy.nl als afzender.)
    """
    subject = "Bevestiging uitschrijving dienst"
    body = (
        f"Beste medewerker,\n\n"
        f"Je uitschrijving van de dienst op {shift_details.get('shift_date')} bij {shift_details.get('location')} is bevestigd.\n\n"
        f"Details:\n"
        f"Shift: {shift_details.get('titel', 'Onbekend')}\n"
        f"Start: {shift_details.get('start_time')}\n"
        f"Einde: {shift_details.get('end_time')}\n\n"
        "Met vriendelijke groet,\nSecufy Planning"
    )

    msg = MIMEMultipart()
    msg["From"] = PLANNING_SENDER_EMAIL
    if TEST_MODE:
        msg["To"] = PLANNING_SENDER_EMAIL
        recipients = [PLANNING_SENDER_EMAIL]
    else:
        msg["To"] = employee_email
        recipients = [employee_email]
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(PLANNING_SENDER_EMAIL, PLANNING_SENDER_PASSWORD)
        server.sendmail(PLANNING_SENDER_EMAIL, recipients, msg.as_string())
