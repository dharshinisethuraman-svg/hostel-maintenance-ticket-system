from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
import models
from pydantic import BaseModel

app = FastAPI()

# Create database tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------
# Pydantic Schema
# ---------------------------
class TicketCreate(BaseModel):
    user_id: int
    title: str
    description: str
    room_no: str
    priority: str

# ---------------------------
# Home Route
# ---------------------------
@app.get("/")
def home():
    return {"message": "Hostel Ticket System Running"}

# ---------------------------
# Create Ticket
# ---------------------------
@app.post("/tickets")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):

    valid_priority = ["Low", "Medium", "High"]

    if ticket.priority not in valid_priority:
        return {"error": "Invalid priority"}

    new_ticket = models.Ticket(
        user_id=ticket.user_id,
        title=ticket.title,
        description=ticket.description,
        room_no=ticket.room_no,
        priority=ticket.priority,
        status="Open"
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    return {
        "message": "Ticket created successfully",
        "data": {
            "id": new_ticket.id,
            "title": new_ticket.title
        }
    }

# ---------------------------
# Get All Tickets
# ---------------------------
@app.get("/tickets")
def get_tickets(db: Session = Depends(get_db)):
    return db.query(models.Ticket).all()

# ---------------------------
# Update Ticket Status
# ---------------------------
@app.put("/tickets/{ticket_id}")
def update_ticket(ticket_id: int, status: str, db: Session = Depends(get_db)):
    
    valid_status = ["Open", "In Progress", "Resolved"]

    if status not in valid_status:
        return {"error": "Invalid status"}

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()

    if not ticket:
        return {"error": "Ticket not found"}

    ticket.status = status
    db.commit()

    return {"message": "Ticket updated successfully"}

# ---------------------------
# Delete Ticket
# ---------------------------
@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()

    if not ticket:
        return {"error": "Ticket not found"}

    db.delete(ticket)
    db.commit()

    return {"message": "Ticket deleted successfully"}

# ---------------------------
# Filter Tickets
# ---------------------------
@app.get("/tickets/filter/")
def filter_tickets(status: str, db: Session = Depends(get_db)):
    return db.query(models.Ticket).filter(models.Ticket.status == status).all()

# ---------------------------
# Dashboard
# ---------------------------
@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total = db.query(models.Ticket).count()
    open_tickets = db.query(models.Ticket).filter(models.Ticket.status == "Open").count()
    resolved = db.query(models.Ticket).filter(models.Ticket.status == "Resolved").count()

    return {
        "total_tickets": total,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved
    }
# ---------------------------
# Add Comment
# ---------------------------
@app.post("/comments")
def add_comment(comment: dict, db: Session = Depends(get_db)):
    new_comment = models.Comment(
        ticket_id=comment.get("ticket_id"),
        text=comment.get("text")
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return {"message": "Comment added successfully"}

# ---------------------------
# Get Comments
# ---------------------------
@app.get("/comments/{ticket_id}")
def get_comments(ticket_id: int, db: Session = Depends(get_db)):
    comments = db.query(models.Comment).filter(models.Comment.ticket_id == ticket_id).all()
    return comments


    # cd C:\Users\dhars_k0iux1h\hostel-ticket-system
    #python -m uvicorn main:app --reload