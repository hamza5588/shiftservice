from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Dienstaanvraag(Base):
    __tablename__ = "dienstaanvragen"

    id = Column(Integer, primary_key=True, index=True)
    medewerker_id = Column(String, ForeignKey("users.username"))
    datum = Column(Date)
    start_tijd = Column(String)  # Format: "HH:MM"
    eind_tijd = Column(String)  # Format: "HH:MM"
    locatie = Column(String)
    status = Column(String, default="open")  # open, approved, rejected
    opmerkingen = Column(Text, nullable=True)
    
    # Relationships
    medewerker = relationship("User", back_populates="dienstaanvragen") 