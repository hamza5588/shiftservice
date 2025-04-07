from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Date, Float, Text, JSON, Table
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

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
    roles = relationship("Role", secondary=user_roles, back_populates="users")

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
    naam = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    telefoon = Column(String(20))
    adres = Column(String(200))
    geboortedatum = Column(DateTime)
    in_dienst = Column(DateTime)
    uit_dienst = Column(DateTime, nullable=True)
    pas_type = Column(String(50))
    pas_nummer = Column(String(50))
    pas_vervaldatum = Column(DateTime)
    pas_foto = Column(String(200), nullable=True)
    contract_type = Column(String(50))
    contract_uren = Column(Integer)
    contract_vervaldatum = Column(DateTime, nullable=True)
    contract_bestand = Column(String(200), nullable=True)
    loonstroken = relationship("Loonstrook", back_populates="medewerker")
    shifts = relationship("Shift", back_populates="medewerker")
    verloningen = relationship("Verloning", back_populates="medewerker")

class Opdrachtgever(Base):
    __tablename__ = "opdrachtgevers"

    id = Column(Integer, primary_key=True, index=True)
    naam = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    telefoon = Column(String(20))
    adres = Column(String(200))
    diensten = relationship("Dienstaanvraag", back_populates="opdrachtgever")
    facturen = relationship("Factuur", back_populates="opdrachtgever")
    tarieven = relationship("Tarief", back_populates="opdrachtgever")
    factuursjablonen = relationship("Factuursjabloon", back_populates="opdrachtgever")

class Dienstaanvraag(Base):
    __tablename__ = "dienstaanvragen"

    id = Column(Integer, primary_key=True, index=True)
    opdrachtgever_id = Column(Integer, ForeignKey("opdrachtgevers.id"))
    shift_id = Column(Integer, ForeignKey("shifts.id"))
    employee_id = Column(String(50), ForeignKey("users.username"))
    aanvraag_date = Column(Date)
    status = Column(String(50))
    shift = relationship("Shift", back_populates="dienstaanvragen")
    employee = relationship("User")
    opdrachtgever = relationship("Opdrachtgever", back_populates="diensten")

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    medewerker_id = Column(Integer, ForeignKey("medewerkers.id"))
    datum = Column(DateTime)
    start_tijd = Column(String(5))
    eind_tijd = Column(String(5))
    locatie = Column(String(200))
    status = Column(String(50))
    medewerker = relationship("Medewerker", back_populates="shifts")
    dienstaanvragen = relationship("Dienstaanvraag", back_populates="shift")

class Factuur(Base):
    __tablename__ = "facturen"

    id = Column(Integer, primary_key=True, index=True)
    opdrachtgever_id = Column(Integer, ForeignKey("opdrachtgevers.id"))
    factuurnummer = Column(String(50), unique=True, index=True)
    datum = Column(DateTime)
    vervaldatum = Column(DateTime)
    bedrag = Column(Float)
    status = Column(String(50))
    bestand = Column(String(200), nullable=True)
    opdrachtgever = relationship("Opdrachtgever", back_populates="facturen")

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
    datum = Column(DateTime)
    bedrag = Column(Float)
    status = Column(String(50))
    medewerker = relationship("Medewerker", back_populates="verloningen")

class Loonstrook(Base):
    __tablename__ = "loonstroken"

    id = Column(Integer, primary_key=True, index=True)
    medewerker_id = Column(Integer, ForeignKey("medewerkers.id"))
    periode = Column(String(7))  # Format: YYYY-MM
    bestand = Column(String(200))
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

    employee = relationship("User") 