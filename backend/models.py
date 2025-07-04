from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Date, Float, Text, JSON, Table, Index, text
from sqlalchemy.orm import relationship
from database import Base, engine
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Association table for User-Role many-to-many relationship
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(100))
    full_name = Column(String(100))
    reset_token = Column(String(100), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    shifts = relationship("Shift", back_populates="medewerker")
    medewerker_profile = relationship("Medewerker", back_populates="user")
    hour_increase_requests = relationship("ShiftHourIncreaseRequest", back_populates="employee")

    def __repr__(self):
        return f"<User {self.username}>"

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True)
    permissions = Column(JSON)
    users = relationship("User", secondary=user_roles, back_populates="roles")

    def __repr__(self):
        return f"<Role {self.name}>"

class Medewerker(Base):
    __tablename__ = "medewerkers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.username"), unique=True, index=True)
    naam = Column(String(100))
    voornaam = Column(String(100))  # First names
    tussenvoegsel = Column(String(50), nullable=True)  # Surname prefix
    achternaam = Column(String(100))  # Surname
    initialen = Column(String(20))  # Initials
    email = Column(String(100), unique=True, index=True)
    telefoon = Column(String(20))
    adres = Column(String(200))
    huisnummer = Column(String(10))  # House number
    huisnummer_toevoeging = Column(String(200), nullable=True)  # Addition to address
    postcode = Column(String(10))  # Postal code
    stad = Column(String(100))  # City
    geboortedatum = Column(DateTime)
    geboorteplaats = Column(String(100))  # Place of birth
    geslacht = Column(String(20))  # Gender
    burgerlijke_staat = Column(String(50))  # Marital status
    bsn = Column(String(9), unique=True)  # BSN number (9 digits)
    nationaliteit = Column(String(100))  # Nationality
    in_dienst = Column(DateTime)
    uit_dienst = Column(DateTime, nullable=True)
    pas_type = Column(String(50))
    pas_nummer = Column(String(50))
    pas_vervaldatum = Column(DateTime)
    pas_foto = Column(String(200), nullable=True)  # Passport photo
    pas_foto_voorzijde = Column(String(200), nullable=True)  # Passport photo front
    pas_foto_achterzijde = Column(String(200), nullable=True)  # Passport photo back
    contract_type = Column(String(50))
    contract_uren = Column(Integer)
    contract_vervaldatum = Column(DateTime, nullable=True)
    contract_bestand = Column(String(200), nullable=True)
    loonstroken = relationship("Loonstrook", back_populates="medewerker")
    verloningen = relationship("Verloning", back_populates="medewerker")
    user = relationship("User", back_populates="medewerker_profile")

class LocationRate(Base):
    __tablename__ = "location_rates"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    pass_type = Column(String(50))
    base_rate = Column(Float)
    evening_rate = Column(Float)
    night_rate = Column(Float)
    weekend_rate = Column(Float)
    holiday_rate = Column(Float)
    new_years_eve_rate = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    location = relationship("Location", back_populates="rates")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    opdrachtgever_id = Column(Integer, ForeignKey("opdrachtgevers.id"))
    naam = Column(String(100))
    adres = Column(String(200))
    stad = Column(String(100))
    postcode = Column(String(10))
    provincie = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    
    opdrachtgever = relationship("Opdrachtgever", back_populates="locations")
    shifts = relationship("Shift", back_populates="location")
    rates = relationship("LocationRate", back_populates="location", cascade="all, delete-orphan")

class Opdrachtgever(Base):
    __tablename__ = "opdrachtgevers"

    id = Column(Integer, primary_key=True, index=True)
    naam = Column(String(100))
    bedrijfsnaam = Column(String(100))
    kvk_nummer = Column(String(20))
    adres = Column(String(200))
    postcode = Column(String(10))
    stad = Column(String(100))
    telefoon = Column(String(20))
    email = Column(String(100), unique=True, index=True)
    status = Column(String(50), default='active')  # Add status field with default value
    diensten = relationship("Dienstaanvraag", back_populates="opdrachtgever")
    facturen = relationship("Factuur", back_populates="opdrachtgever")
    tarieven = relationship("Tarief", back_populates="opdrachtgever")
    factuursjablonen = relationship("Factuursjabloon", back_populates="opdrachtgever")
    locations = relationship("Location", back_populates="opdrachtgever")

class Dienstaanvraag(Base):
    __tablename__ = "dienstaanvragen"

    id = Column(Integer, primary_key=True, index=True)
    opdrachtgever_id = Column(Integer, ForeignKey("opdrachtgevers.id"))
    shift_id = Column(Integer, ForeignKey("shifts.id"))
    employee_id = Column(String(50), ForeignKey("users.username"))
    aanvraag_date = Column(Date)
    status = Column(String(50))
    notes = Column(Text, nullable=True)
    shift = relationship("Shift", back_populates="dienstaanvragen")
    employee = relationship("User")
    opdrachtgever = relationship("Opdrachtgever", back_populates="diensten")

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    datum = Column(Date, nullable=False)
    start_tijd = Column(String(5), nullable=False)
    eind_tijd = Column(String(5), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    locatie = Column(String(200), nullable=False)  # Keeping for backward compatibility
    status = Column(String(50), nullable=False, default="open")
    medewerker_id = Column(String(50), ForeignKey("users.username"), nullable=True)
    titel = Column(String(200), nullable=True)
    stad = Column(String(100), nullable=True)
    provincie = Column(String(100), nullable=True)
    adres = Column(String(200), nullable=True)
    required_profile = Column(String(100), nullable=True)
    factuur_id = Column(Integer, ForeignKey("facturen.id"), nullable=True)
    reiskilometers = Column(Float, nullable=True)  # Add reiskilometers field
    hour_increase_requests = relationship("ShiftHourIncreaseRequest", back_populates="shift")

    medewerker = relationship("User", back_populates="shifts")
    dienstaanvragen = relationship("Dienstaanvraag", back_populates="shift")
    location = relationship("Location", back_populates="shifts")

def update_database_schema():
    """Update the database schema to include new columns."""
    Base.metadata.create_all(bind=engine)

class Factuur(Base):
    __tablename__ = "facturen"

    id = Column(Integer, primary_key=True, index=True)
    opdrachtgever_id = Column(Integer, ForeignKey("opdrachtgevers.id"))
    opdrachtgever_naam = Column(String(100))
    factuurnummer = Column(String(50), unique=True, index=True, nullable=False)  # Format: YYYYCCCNNN-DDD
    year_client = Column(String(7), index=True)  # Generated column for YYYYCCC part
    locatie = Column(String(200))
    factuurdatum = Column(Date)
    shift_date = Column(Date)  # Start date of the shift period
    shift_date_end = Column(Date)  # End date of the shift period
    bedrag = Column(Float)
    subtotal = Column(Float)  # Added subtotal field
    vat_amount = Column(Float)  # Added VAT amount field
    status = Column(String(50))  # "open", "betaald", "herinnering14", "herinnering30"
    factuur_text = Column(Text, nullable=True)
    # Client information
    kvk_nummer = Column(String(20), nullable=True)
    adres = Column(String(200), nullable=True)
    postcode = Column(String(10), nullable=True)
    stad = Column(String(100), nullable=True)
    telefoon = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    # New fields
    client_name = Column(String(100), nullable=True)
    issue_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    total_amount = Column(Float, nullable=True)
    breakdown = Column(JSON, nullable=True)  # Store the breakdown of hours and rates
    
    # Relationships with cascade delete
    opdrachtgever = relationship("Opdrachtgever", back_populates="facturen")

    def __init__(self, **kwargs):
        # Remove any non-database fields before initialization
        kwargs.pop('model_config', None)
        super().__init__(**kwargs)
        if self.factuurnummer:
            self.year_client = self.factuurnummer[:7]  # Extract YYYYCCC part

    __table_args__ = (
        # Add index for year and client combination to help with invoice number generation
        Index('ix_facturen_year_client', 
              text('SUBSTRING(factuurnummer, 1, 7)'),  # YYYYCCC part
              unique=False),
    )

class Tarief(Base):
    __tablename__ = "tarieven"

    id = Column(Integer, primary_key=True, index=True)
    opdrachtgever_id = Column(Integer, ForeignKey("opdrachtgevers.id"))
    locatie = Column(String(200))
    pas_type = Column(String(50))
    bedrag = Column(Float)
    opdrachtgever = relationship("Opdrachtgever", back_populates="tarieven")

class Verloning(Base):
    __tablename__ = "verloningen"

    id = Column(Integer, primary_key=True, index=True)
    medewerker_id = Column(Integer, ForeignKey("medewerkers.id"))
    periode = Column(String(7))  # Format: YYYY-MM
    datum = Column(DateTime)
    basis_loon = Column(Float)
    avond_toeslag = Column(Float)
    nacht_toeslag = Column(Float)
    weekend_toeslag = Column(Float)
    feestdag_toeslag = Column(Float)
    oudjaarsavond_toeslag = Column(Float)
    totaal_bedrag = Column(Float)
    status = Column(String(50))
    breakdown = Column(JSON)  # Store detailed breakdown of hours and rates
    medewerker = relationship("Medewerker", back_populates="verloningen")

class Loonstrook(Base):
    __tablename__ = "loonstroken"

    id = Column(Integer, primary_key=True, index=True)
    medewerker_id = Column(Integer, ForeignKey("medewerkers.id"))
    periode = Column(String(7))  # Format: YYYY-MM
    bestand = Column(String(200))
    upload_date = Column(DateTime, default=datetime.utcnow)
    medewerker = relationship("Medewerker", back_populates="loonstroken")

class Notitie(Base):
    __tablename__ = "notities"

    id = Column(Integer, primary_key=True, index=True)
    titel = Column(String(200))
    inhoud = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

class Favoriet(Base):
    __tablename__ = "favorieten"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_type = Column(String(50))  # e.g., "medewerker", "opdrachtgever", "dienstaanvraag"
    item_id = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Factuursjabloon(Base):
    __tablename__ = "factuursjablonen"

    id = Column(Integer, primary_key=True, index=True)
    opdrachtgever_id = Column(Integer, ForeignKey("opdrachtgevers.id"))
    naam = Column(String(100))
    inhoud = Column(Text)
    opdrachtgever = relationship("Opdrachtgever", back_populates="factuursjablonen")

class AutoApproval(Base):
    __tablename__ = "auto_approvals"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("users.username"))
    location = Column(String(100))
    auto_approve = Column(Boolean, default=False)
    priority_hours = Column(Integer, default=3)  # Default priority window of 3 hours

    employee = relationship("User")

class AutoApprovalGlobalConfig(Base):
    __tablename__ = "auto_approval_global_config"

    id = Column(Integer, primary_key=True, index=True)
    enable_experience_based_approval = Column(Boolean, default=True)
    default_priority_window_hours = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LocationAutoApprovalConfig(Base):
    __tablename__ = "location_auto_approval_config"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), unique=True)
    enable_experience_based_approval = Column(Boolean, default=True)
    priority_window_hours = Column(Integer, nullable=True)  # If null, use global default
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    location = relationship("Location")

class LocationPydantic(BaseModel):
    id: int
    opdrachtgever_id: int
    naam: str
    adres: str
    stad: str
    postcode: str
    provincie: Optional[str] = None
    email: Optional[str] = None

    class Config:
        orm_mode = True

class LocationRateBase(BaseModel):
    location_id: int
    pass_type: str
    base_rate: float
    evening_rate: float
    night_rate: float
    weekend_rate: float
    holiday_rate: float
    new_years_eve_rate: float

class LocationRateCreate(LocationRateBase):
    pass

class LocationRatePydantic(LocationRateBase):
    id: int
    created_at: str
    updated_at: str
    location: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        } 

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String(1000), nullable=False)  # Specified length of 1000 characters
    timestamp = Column(DateTime, default=datetime.utcnow)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)
    read = Column(Boolean, default=False, nullable=False)  # Add read column

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], backref="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_messages")
    shift = relationship("Shift", backref="chat_messages") 

class ShiftHourIncreaseRequest(Base):
    __tablename__ = "shift_hour_increase_requests"

    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    employee_id = Column(String(50), ForeignKey("users.username"), nullable=False)
    requested_end_time = Column(String(5), nullable=False)  # New end time requested
    original_end_time = Column(String(5), nullable=False)  # Original end time
    status = Column(String(50), nullable=False, default="pending")  # pending, approved, rejected
    request_date = Column(DateTime, default=datetime.utcnow)
    response_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    shift = relationship("Shift", back_populates="hour_increase_requests")
    employee = relationship("User", back_populates="hour_increase_requests")

# Add relationship to Shift model
Shift.hour_increase_requests = relationship("ShiftHourIncreaseRequest", back_populates="shift")

# Add relationship to User model
User.hour_increase_requests = relationship("ShiftHourIncreaseRequest", back_populates="employee") 