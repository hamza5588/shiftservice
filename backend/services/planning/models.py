from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    datum = Column(Date, nullable=False)
    start_tijd = Column(String, nullable=False)  # Stored as "HH:MM"
    eind_tijd = Column(String, nullable=False)  # Stored as "HH:MM"
    locatie = Column(String, nullable=False)
    status = Column(String, default="open")
    
    # Optional fields
    titel = Column(String, nullable=True)
    stad = Column(String, nullable=True)
    provincie = Column(String, nullable=True)
    adres = Column(String, nullable=True)
    required_profile = Column(String, nullable=True)
    
    # Relationships
    medewerker_id = Column(String, ForeignKey("users.username"), nullable=True)
    medewerker = relationship("User", back_populates="shifts") 