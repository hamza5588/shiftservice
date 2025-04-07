from Backend.email_utils import send_invoice_email, send_payroll_email

if __name__ == "__main__":
    # Test factuur-email
    test_invoice = {
        "opdrachtgever_id": 1,
        "factuur_text": "Test factuur:\nDatum: 2025-01-15\nShift: Avonddienst Locatie A\nGewerkte uren: 8.0"
    }
    try:
        send_invoice_email(test_invoice, "info@loonbureau.nl")
        print("Factuur-email succesvol verzonden (testmodus: alleen naar boekhouden.secufy@gmail.com)")
    except Exception as e:
        print("Fout bij het verzenden van de factuur-email:", e)

    # Test payroll-email met een dummy CSV-string
    dummy_csv = "Personeelsnummer,Naam,gewerkte uren\n1,John Doe,8.0"
    try:
        send_payroll_email(dummy_csv, 2025, 1)
        print("Payroll-email succesvol verzonden (testmodus: alleen naar boekhouden.secufy@gmail.com)")
    except Exception as e:
        print("Fout bij het verzenden van de payroll-email:", e)
