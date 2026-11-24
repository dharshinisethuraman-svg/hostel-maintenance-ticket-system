import os
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
import models
import schemas
import security
from services import cloudinary_service

app = FastAPI(
    title="Hostel Maintenance Ticket System",
    description="Backend API with JWT Authentication, Role-Based Access Control, Image Upload, and Ticket Management",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure local uploads directory exists and mount for local static viewing
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Create database tables if they do not exist
Base.metadata.create_all(bind=engine)

def run_safe_migrations(target_engine=None):
    """Ensure newly introduced columns exist in SQLite database without recreating tables."""
    from sqlalchemy import inspect, text
    eng = target_engine or engine
    inspector = inspect(eng)
    if "users" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("users")]
        if "is_active" not in columns:
            with eng.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                conn.commit()

run_safe_migrations()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Security scheme for Swagger UI Authorization (Bearer <token>)
security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency to validate JWT tokens and retrieve the authenticated user.
    Enforces signature integrity, token expiration, and active status.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = security.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(allowed_roles: List[str]):
    """Role-Based Access Control (RBAC) dependency factory."""
    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# ----------------------------------------------------
# Home & Health Route
# ----------------------------------------------------
@app.get("/", tags=["System"])
def home():
    return {"message": "Hostel Ticket System Running"}


# ----------------------------------------------------
# Authentication Endpoints
# ----------------------------------------------------
@app.post(
    "/auth/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
    summary="Register a new student account"
)
def register_student(user: schemas.UserRegister, db: Session = Depends(get_db)):
    normalized_email = user.email.strip().lower()
    existing_user = db.query(models.User).filter(models.User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    hashed_pwd = security.hash_password(user.password)
    new_user = models.User(
        name=user.name.strip(),
        email=normalized_email,
        password=hashed_pwd,
        role=security.ROLE_STUDENT
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post(
    "/auth/login",
    response_model=schemas.TokenResponse,
    tags=["Authentication"],
    summary="Log in to receive a JWT access token"
)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    normalized_email = login_data.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == normalized_email).first()
    if not user or not security.verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Reject inactive accounts with HTTP 403 (Stage 5.3A)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact an administrator."
        )

    access_token = security.create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.post(
    "/auth/admin/create-user",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
    summary="Create Staff or Admin accounts (Admin only)"
)
def create_privileged_user(
    data: schemas.AdminCreateUser,
    admin_user: models.User = Depends(require_roles([security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Authenticated Admin provisions a new Staff or Admin user account.
    Requires a valid JWT Bearer token with role 'admin'.
    Rejects student and staff users with HTTP 403.
    Rejects unauthenticated requests with HTTP 401.
    Role must be strictly 'staff' or 'admin'.
    """
    allowed_roles = [security.ROLE_STAFF, security.ROLE_ADMIN]
    if data.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. This endpoint can only create 'staff' or 'admin' accounts. Allowed: {allowed_roles}"
        )

    normalized_email = data.email.strip().lower()
    existing_user = db.query(models.User).filter(models.User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    hashed_pwd = security.hash_password(data.password)
    new_user = models.User(
        name=data.name.strip(),
        email=normalized_email,
        password=hashed_pwd,
        role=data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.get(
    "/auth/me",
    response_model=schemas.UserResponse,
    tags=["Authentication"],
    summary="Get current logged-in user profile from JWT token"
)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


# ----------------------------------------------------
# Staff Management Endpoints (Admin Only)
# ----------------------------------------------------
@app.get(
    "/staff",
    response_model=List[schemas.StaffMemberResponse],
    tags=["Staff"],
    summary="List all maintenance staff members (Admin only)"
)
def list_staff_members(
    admin_user: models.User = Depends(require_roles([security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    """Returns all active users with the 'staff' role for ticket assignment."""
    staff_members = db.query(models.User).filter(
        models.User.role == security.ROLE_STAFF,
        models.User.is_active == True
    ).all()
    return staff_members


# ----------------------------------------------------
# User Account Management Endpoints (Admin Only)
# ----------------------------------------------------
@app.get(
    "/admin/users",
    response_model=List[schemas.UserAdminResponse],
    tags=["Admin Management"],
    summary="List all user accounts with status and roles (Admin only)"
)
def list_all_users(
    admin_user: models.User = Depends(require_roles([security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    """Returns all accounts (students, staff, admins) with active status."""
    return db.query(models.User).all()


@app.put(
    "/admin/users/{user_id}/deactivate",
    tags=["Admin Management"],
    summary="Deactivate a user account (Admin only)"
)
def deactivate_user(
    user_id: int,
    admin_user: models.User = Depends(require_roles([security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Deactivates a user account.
    - Prevents admins from deactivating themselves.
    - Never allows deactivating the last remaining active administrator.
    - When deactivating staff: unassigns their currently assigned tickets.
      Sets those tickets to 'Open' only if they are not already 'Resolved'.
      Preserves all tickets and comments.
    """
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if target user is already deactivated
    if not target_user.is_active:
        return {
            "message": f"User '{target_user.name}' is already deactivated.",
            "user": {
                "id": target_user.id,
                "name": target_user.name,
                "email": target_user.email,
                "role": target_user.role,
                "is_active": target_user.is_active
            }
        }

    # Rule 8: Never allow deactivation of the last remaining active administrator
    if target_user.role == security.ROLE_ADMIN:
        active_admin_count = db.query(models.User).filter(
            models.User.role == security.ROLE_ADMIN,
            models.User.is_active == True
        ).count()
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Action prohibited: Cannot deactivate the last remaining active administrator."
            )

    # Rule 7: Prevent admins from deactivating themselves
    if target_user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account."
        )

    target_user.is_active = False

    # Rule 9: When deactivating staff, unassign their currently assigned tickets.
    # Set those tickets to Open only if they are not already Resolved.
    # Preserve all ticket records and comments.
    unassigned_count = 0
    if target_user.role == security.ROLE_STAFF:
        assigned_tickets = db.query(models.Ticket).filter(models.Ticket.assigned_to == target_user.id).all()
        for ticket in assigned_tickets:
            ticket.assigned_to = None
            if ticket.status != "Resolved":
                ticket.status = "Open"
            unassigned_count += 1

    db.commit()
    db.refresh(target_user)

    return {
        "message": f"User '{target_user.name}' successfully deactivated.",
        "unassigned_tickets": unassigned_count,
        "user": {
            "id": target_user.id,
            "name": target_user.name,
            "email": target_user.email,
            "role": target_user.role,
            "is_active": target_user.is_active
        }
    }


@app.put(
    "/admin/users/{user_id}/reactivate",
    tags=["Admin Management"],
    summary="Reactivate a user account (Admin only)"
)
def reactivate_user(
    user_id: int,
    admin_user: models.User = Depends(require_roles([security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Reactivates a user account.
    Restores login access and operational capability.
    """
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    target_user.is_active = True
    db.commit()
    db.refresh(target_user)

    return {
        "message": f"User '{target_user.name}' successfully reactivated.",
        "user": {
            "id": target_user.id,
            "name": target_user.name,
            "email": target_user.email,
            "role": target_user.role,
            "is_active": target_user.is_active
        }
    }


# ----------------------------------------------------
# Image Upload Endpoint
# ----------------------------------------------------
@app.post(
    "/tickets/upload-image",
    tags=["Tickets"],
    summary="Upload a complaint photo (JPEG, PNG, WebP up to 5MB)"
)
async def upload_complaint_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    """
    Validates binary content and size, then uploads via Cloudinary service.
    Requires authentication.
    """
    try:
        file_bytes = await file.read()
        image_url = cloudinary_service.upload_ticket_image(
            file_bytes=file_bytes,
            original_filename=file.filename or "complaint.jpg"
        )
        return {
            "message": "Image uploaded successfully",
            "image_url": image_url
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(re)
        )


# ----------------------------------------------------
# Ticket Endpoints with Role-Based Access Control
# ----------------------------------------------------
@app.post(
    "/tickets",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    tags=["Tickets"],
    summary="Submit a new maintenance complaint (Requires authentication)"
)
def create_ticket(
    ticket: schemas.TicketCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a new maintenance ticket.
    user_id is automatically assigned to current_user.id.
    """
    valid_priorities = ["Low", "Medium", "High"]
    if ticket.priority not in valid_priorities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid priority. Allowed priorities: Low, Medium, High"
        )

    new_ticket = models.Ticket(
        user_id=current_user.id,
        title=ticket.title.strip(),
        description=ticket.description or "",
        room_no=ticket.room_no.strip(),
        priority=ticket.priority,
        status="Open",
        category=ticket.category or "General",
        image_url=ticket.image_url
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    return {
        "message": "Ticket created successfully",
        "data": {
            "id": new_ticket.id,
            "title": new_ticket.title,
            "category": new_ticket.category,
            "image_url": new_ticket.image_url,
            "status": new_ticket.status
        }
    }


@app.get(
    "/tickets",
    response_model=List[schemas.TicketResponse],
    tags=["Tickets"],
    summary="List tickets according to user role (Admin: all, Staff: assigned, Student: own)"
)
def get_tickets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Role-based ticket listing:
    - Admin: All tickets
    - Staff: Only tickets assigned to this staff member
    - Student: Only tickets submitted by this student
    """
    if current_user.role == security.ROLE_ADMIN:
        return db.query(models.Ticket).all()
    elif current_user.role == security.ROLE_STAFF:
        return db.query(models.Ticket).filter(models.Ticket.assigned_to == current_user.id).all()
    else:  # Student
        return db.query(models.Ticket).filter(models.Ticket.user_id == current_user.id).all()


@app.get(
    "/tickets/{ticket_id}",
    response_model=schemas.TicketResponse,
    tags=["Tickets"],
    summary="Get single ticket by ID with role-based permission checks"
)
def get_ticket_by_id(
    ticket_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    # Permission check
    if current_user.role == security.ROLE_STUDENT and ticket.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view your own tickets."
        )
    elif current_user.role == security.ROLE_STAFF and ticket.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view tickets assigned to you."
        )

    return ticket


@app.put(
    "/tickets/{ticket_id}/assign",
    tags=["Tickets"],
    summary="Assign ticket to a maintenance staff member (Admin only)"
)
def assign_ticket_to_staff(
    ticket_id: int,
    data: schemas.TicketAssign,
    admin_user: models.User = Depends(require_roles([security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Admin assigns ticket to a staff member.
    Validates that the target user has role 'staff'.
    Automatically transitions Open tickets to 'In Progress'.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    staff_user = db.query(models.User).filter(models.User.id == data.staff_id).first()
    if not staff_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff user not found"
        )

    if staff_user.role != security.ROLE_STAFF:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {data.staff_id} ({staff_user.name}) does not have the 'staff' role (current role: {staff_user.role})."
        )

    if not staff_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign ticket to deactivated staff member '{staff_user.name}'."
        )

    ticket.assigned_to = staff_user.id
    if ticket.status == "Open":
        ticket.status = "In Progress"

    db.commit()
    db.refresh(ticket)

    return {
        "message": f"Ticket #{ticket.id} successfully assigned to {staff_user.name}",
        "ticket": {
            "id": ticket.id,
            "status": ticket.status,
            "assigned_to": ticket.assigned_to,
            "staff_name": staff_user.name
        }
    }


@app.put(
    "/tickets/{ticket_id}/status",
    tags=["Tickets"],
    summary="Update ticket status (Staff for assigned tickets, Admin for any)"
)
def update_ticket_status(
    ticket_id: int,
    data: schemas.TicketStatusUpdate,
    current_user: models.User = Depends(require_roles([security.ROLE_STAFF, security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Staff can update status ONLY for tickets assigned to them.
    Admins can update status for any ticket.
    Staff cannot modify ownership, category, or assignment.
    """
    valid_statuses = ["Open", "In Progress", "Resolved"]
    if data.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Allowed statuses: {', '.join(valid_statuses)}"
        )

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    # Enforce Rule 7: Staff can only update tickets assigned to them
    if current_user.role == security.ROLE_STAFF and ticket.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are only allowed to update tickets assigned to you."
        )

    # Strictly update status only (Rule 8)
    ticket.status = data.status
    db.commit()
    db.refresh(ticket)

    return {
        "message": "Ticket status updated successfully",
        "ticket": {
            "id": ticket.id,
            "status": ticket.status,
            "assigned_to": ticket.assigned_to
        }
    }


# Backward-compatible status update route
@app.put("/tickets/{ticket_id}", tags=["Tickets"], summary="Legacy status update route")
def update_ticket_legacy(
    ticket_id: int,
    status: str,
    current_user: models.User = Depends(require_roles([security.ROLE_STAFF, security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    update_data = schemas.TicketStatusUpdate(status=status)
    return update_ticket_status(ticket_id, update_data, current_user, db)


@app.delete(
    "/tickets/{ticket_id}",
    tags=["Tickets"],
    summary="Delete a ticket (Admin only)"
)
def delete_ticket(
    ticket_id: int,
    admin_user: models.User = Depends(require_roles([security.ROLE_ADMIN])),
    db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    db.delete(ticket)
    db.commit()
    return {"message": "Ticket deleted successfully"}


@app.get(
    "/tickets/filter/",
    response_model=List[schemas.TicketResponse],
    tags=["Tickets"],
    summary="Filter tickets by status within user's permitted scope"
)
def filter_tickets(
    status: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_statuses = ["Open", "In Progress", "Resolved"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status filter. Allowed values: {', '.join(valid_statuses)}"
        )

    if current_user.role == security.ROLE_ADMIN:
        return db.query(models.Ticket).filter(models.Ticket.status == status).all()
    elif current_user.role == security.ROLE_STAFF:
        return db.query(models.Ticket).filter(
            models.Ticket.assigned_to == current_user.id,
            models.Ticket.status == status
        ).all()
    else:  # Student
        return db.query(models.Ticket).filter(
            models.Ticket.user_id == current_user.id,
            models.Ticket.status == status
        ).all()


# ----------------------------------------------------
# Dashboard Endpoint (Role-scoped)
# ----------------------------------------------------
@app.get(
    "/dashboard",
    tags=["Dashboard"],
    summary="Retrieve ticket metrics scoped to the user's role without exposing private student info"
)
def dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns total, open, and resolved counts without revealing private user details:
    - Admin: All hostel tickets
    - Staff: Tickets assigned to this staff member
    - Student: Complaints filed by this student
    """
    if current_user.role == security.ROLE_ADMIN:
        base_query = db.query(models.Ticket)
    elif current_user.role == security.ROLE_STAFF:
        base_query = db.query(models.Ticket).filter(models.Ticket.assigned_to == current_user.id)
    else:  # Student
        base_query = db.query(models.Ticket).filter(models.Ticket.user_id == current_user.id)

    total = base_query.count()
    open_tickets = base_query.filter(models.Ticket.status == "Open").count()
    in_progress = base_query.filter(models.Ticket.status == "In Progress").count()
    resolved = base_query.filter(models.Ticket.status == "Resolved").count()

    return {
        "role": current_user.role,
        "total_tickets": total,
        "open_tickets": open_tickets,
        "in_progress_tickets": in_progress,
        "resolved_tickets": resolved
    }


# ----------------------------------------------------
# Comment Endpoints (Role-Scoped & Validated)
# ----------------------------------------------------
@app.post(
    "/comments",
    tags=["Comments"],
    summary="Add a comment to a ticket"
)
def add_comment(
    comment: schemas.CommentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == comment.ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    # Permission check: Student can only comment on own ticket, Staff on assigned ticket, Admin on any
    if current_user.role == security.ROLE_STUDENT and ticket.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only comment on your own tickets."
        )
    elif current_user.role == security.ROLE_STAFF and ticket.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only comment on tickets assigned to you."
        )

    new_comment = models.Comment(
        ticket_id=comment.ticket_id,
        text=comment.text.strip()
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return {"message": "Comment added successfully", "comment_id": new_comment.id}


@app.get(
    "/comments/{ticket_id}",
    tags=["Comments"],
    summary="Get comments for a ticket"
)
def get_comments(
    ticket_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if current_user.role == security.ROLE_STUDENT and ticket.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    elif current_user.role == security.ROLE_STAFF and ticket.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    comments = db.query(models.Comment).filter(models.Comment.ticket_id == ticket_id).all()
    return comments