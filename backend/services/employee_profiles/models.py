from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from ..database import Base

class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id = Column(Integer, primary_key=True, index=True)
    medewerker_id = Column(String, ForeignKey("users.username"), unique=True)
    pass_type = Column(String)  # blue, yellow, etc.
    phone_allowance = Column(Float, default=0.0)
    meal_allowance = Column(Float, default=0.0)
    de_minimis_bonus = Column(Float, default=0.0)
    wkr_surcharge = Column(Float, default=0.0)
    travel_allowance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    medewerker = relationship("User", back_populates="profile")
    loonstroken = relationship("Loonstrook", back_populates="medewerker_profile") 