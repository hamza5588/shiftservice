from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Factuur(Base):
    __tablename__ = "facturen"

    id = Column(Integer, primary_key=True, index=True)
    factuurnummer = Column(String, unique=True, index=True)
    opdrachtgever_id = Column(String, ForeignKey("opdrachtgevers.id"))
    locatie = Column(String)
    datum = Column(Date)
    vervaldatum = Column(Date)
    bedrag = Column(Float)
    status = Column(String, default="open")
    factuur_text = Column(Text, nullable=True)
    
    # Relationships
    opdrachtgever = relationship("Opdrachtgever", back_populates="facturen")
    loonstroken = relationship("Loonstrook", back_populates="factuur")

class Loonstrook(Base):
    __tablename__ = "loonstroken"

    id = Column(Integer, primary_key=True, index=True)
    factuur_id = Column(Integer, ForeignKey("facturen.id"))
    medewerker_id = Column(String, ForeignKey("users.username"))
    periode = Column(String)  # Format: "YYYY-P" where P is the period number (1-13)
    uren = Column(Float)
    tarief = Column(Float)
    bedrag = Column(Float)
    
    # Relationships
    factuur = relationship("Factuur", back_populates="loonstroken")
    medewerker = relationship("User", back_populates="loonstroken") 