from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base


class Estate(Base):
    __tablename__ = "estates"

    id = Column(Integer, primary_key=True, autoincrement=False)
    name = Column(String, nullable=False)
    name_en = Column(String)
    district = Column(String)
    region = Column(String)
    nearest_mtr = Column(String)
    mtr_walk_minutes = Column(Integer)
    total_units = Column(Integer)
    building_age_years = Column(Integer)
    developer = Column(String)
    school_net = Column(String)
    avg_price_per_sqft = Column(Float)
    facilities = Column(Text)  # JSON array
    unit_layouts = Column(Text)  # JSON array
    phases = Column(Integer)

    listings = relationship("Listing", back_populates="estate")
    transactions = relationship("Transaction", back_populates="estate")
    price_history = relationship("PriceHistory", back_populates="estate")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    estate_id = Column(Integer, ForeignKey("estates.id"))
    phase = Column(String)
    block = Column(String)
    floor = Column(String)
    flat = Column(String)
    rooms = Column(String)
    area_sqft = Column(Integer)
    price = Column(Integer)
    price_per_sqft = Column(Float)
    direction = Column(String)
    source = Column(String)
    listing_url = Column(String)
    listed_date = Column(String)
    created_at = Column(String)

    estate = relationship("Estate", back_populates="listings")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    estate_id = Column(Integer, ForeignKey("estates.id"))
    date = Column(String)
    phase = Column(String)
    block = Column(String)
    floor = Column(String)
    flat = Column(String)
    rooms = Column(String)
    area_sqft = Column(Integer)
    price = Column(Integer)
    price_per_sqft = Column(Float)
    source = Column(String)

    estate = relationship("Estate", back_populates="transactions")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    estate_id = Column(Integer, ForeignKey("estates.id"))
    month = Column(String)
    avg_price_per_sqft = Column(Float)
    volume = Column(Integer)

    estate = relationship("Estate", back_populates="price_history")
