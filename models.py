from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    password = Column(String)
    role = Column(String, default="student")
    is_active = Column(Boolean, default=True)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)  # No FK constraint to preserve legacy ticket IDs
    title = Column(String)
    description = Column(String)
    room_no = Column(String)
    priority = Column(String)
    status = Column(String, default="Open") 
    category = Column(String, default="General")
    image_url = Column(String, nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    text = Column(String)
