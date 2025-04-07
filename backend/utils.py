# utils.py

from datetime import datetime, timedelta, date, time

def calculate_hours(shift: dict) -> float:
    """
    Bereken het aantal gewerkte uren op basis van de start- en eindtijd van een shift.
    Houdt rekening met diensten die over middernacht gaan.
    """
    start = datetime.combine(shift["shift_date"], shift["start_time"])
    end = datetime.combine(shift["shift_date"], shift["end_time"])
    if end < start:
        end += timedelta(days=1)
    return (end - start).seconds / 3600

def get_bonus_percentage(shift: dict) -> float:
    """
    Bepaal het bonuspercentage voor een shift:
      - Weekend (zaterdag of zondag): 35%
      - Als de shift start na 22:00: 10%
      - Als de shift start vóór 06:00: 20%
      - Anders: 0%
    """
    weekday = shift["shift_date"].weekday()  # Maandag = 0, zondag = 6
    if weekday >= 5:
        return 0.35
    if shift["start_time"] >= time(22, 0):
        return 0.10
    if shift["start_time"] < time(6, 0):
        return 0.20
    return 0.0
