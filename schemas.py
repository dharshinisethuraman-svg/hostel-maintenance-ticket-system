from typing import Optional
from pydantic import BaseModel, Field


# ----------------------------------------------------
# User Schemas
# ----------------------------------------------------
class UserRegister(BaseModel):
    """
    Public registration schema for students.
    Enforces student role by design (no role field selectable).
    """
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=100)


class AdminCreateUser(BaseModel):
    """
    Administrative schema to provision Staff or Admin accounts
    by an authenticated Administrator.
    """
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(..., description="Must be 'staff' or 'admin'")
    admin_secret_key: Optional[str] = Field(default=None, description="Optional legacy setup key")


class UserLogin(BaseModel):
    """Schema for user authentication."""
    email: str
    password: str


class UserResponse(BaseModel):
    """
    Public user representation.
    Never exposes hashed or plain passwords!
    """
    id: int
    name: str
    email: str
    role: str
    is_active: bool = True

    class Config:
        from_attributes = True


class UserAdminResponse(BaseModel):
    """Detailed user view for Admin account management."""
    id: int
    name: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class StaffMemberResponse(BaseModel):
    """Staff member profile for ticket assignment dropdowns."""
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Returned upon successful login."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ----------------------------------------------------
# Ticket & Comment Schemas (Enhanced with Stage 2 fields)
# ----------------------------------------------------
class TicketCreate(BaseModel):
    """
    Schema for creating tickets.
    Backward compatible with existing index.html and accepts new Stage 2 fields.
    """
    user_id: Optional[int] = None
    title: str = Field(..., min_length=1)
    description: Optional[str] = ""
    room_no: str = Field(..., min_length=1)
    priority: str = Field(default="Medium", description="'Low', 'Medium', or 'High'")
    category: Optional[str] = Field(default="General", description="e.g. Plumbing, Electrical, Cleaning, Furniture, General")
    image_url: Optional[str] = Field(default=None, description="Optional uploaded image URL")


class TicketAssign(BaseModel):
    """Schema for admin to assign a ticket to a staff member."""
    staff_id: int = Field(..., description="User ID of the maintenance staff member")


class TicketStatusUpdate(BaseModel):
    """Schema for staff/admin to update ticket status."""
    status: str = Field(..., description="Must be 'Open', 'In Progress', or 'Resolved'")


class TicketResponse(BaseModel):
    """Comprehensive ticket response representation."""
    id: int
    user_id: Optional[int] = None
    title: str
    description: Optional[str] = ""
    room_no: str
    priority: str
    status: str
    category: Optional[str] = "General"
    image_url: Optional[str] = None
    assigned_to: Optional[int] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    ticket_id: int
    text: str = Field(..., min_length=1)
