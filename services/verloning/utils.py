from datetime import date, timedelta


def get_period_dates(year: int, periode: int) -> (date, date):
    """
    Bepaal de start- en einddatum van een 4-wekenperiode (1 t/m 13) voor het opgegeven jaar.
    Periode 1 t/m 12: 28 dagen per periode, periode 13: rest van het jaar.
    """
    if periode < 1 or periode > 13:
        raise ValueError("Periode moet tussen 1 en 13 liggen.")
    if periode <= 12:
        start = date(year, 1, 1) + timedelta(days=(periode - 1) * 28)
        end = start + timedelta(days=27)
    else:
        start = date(year, 1, 1) + timedelta(days=12 * 28)
        end = date(year, 12, 31)
    return start, end 