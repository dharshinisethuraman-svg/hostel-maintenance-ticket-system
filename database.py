import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables from .env
load_dotenv()

# Read DATABASE_URL with sqlite fallback for local development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# For SQLite, check_same_thread=False is required. For other databases, connect_args should be empty.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()
