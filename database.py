from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import datetime

# This creates a local file named trueplate.db in your folder
DATABASE_URL = "sqlite:///./trueplate.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    meals = relationship("Meal", back_populates="owner")

class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scan_date = Column(DateTime, default=datetime.datetime.utcnow)
    owner = relationship("User", back_populates="meals")
    dimensions = relationship("Dimension", back_populates="meal", uselist=False)

class Dimension(Base):
    __tablename__ = "dimensions"
    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"))
    height_cm = Column(Float)
    width_cm = Column(Float)
    length_cm = Column(Float)
    meal = relationship("Meal", back_populates="dimensions")

Base.metadata.create_all(bind=engine)