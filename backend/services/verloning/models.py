from sqlalchemy import Column, Integer, DateTime, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.database import Base


class Verloning(Base):
    __tablename__ = "verloningen"

    id = Column(Integer, primary_key=True, index=True)
    medewerker_id = Column(Integer, ForeignKey("medewerkers.id"))
    datum = Column(DateTime)
    bedrag = Column(Float)
    status = Column(String(50))
    medewerker = relationship("Medewerker", back_populates="verloningen") 