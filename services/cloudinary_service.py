import io
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Tuple
from dotenv import load_dotenv
from PIL import Image
import cloudinary
import cloudinary.uploader

# Load environment variables
load_dotenv()

# Limits and allowed configurations
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
FORMAT_EXTENSIONS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}

# Environment Configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip()
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip()

# Initialize Cloudinary if credentials are provided
_is_cloudinary_configured = bool(
    CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
)

if _is_cloudinary_configured:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )


def validate_image_file(file_bytes: bytes, filename: str = "") -> Tuple[str, str]:
    """
    Validates image file content, size, and real MIME/binary structure.
    Returns (format_name, safe_extension) on success.
    Raises ValueError if validation fails.
    """
    # 1. Check file size
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty.")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
        actual_mb = round(len(file_bytes) / (1024 * 1024), 2)
        raise ValueError(
            f"File size exceeds the {max_mb:.0f}MB limit (actual size: {actual_mb}MB)."
        )

    # 2. Inspect real image content using PIL
    try:
        # Load image stream
        image_stream = io.BytesIO(file_bytes)
        img = Image.open(image_stream)
        img.verify()  # Verifies file integrity, parser validity, and format
        format_name = (img.format or "").upper()
    except Exception as e:
        raise ValueError("Invalid or corrupted image file. Content is not a readable image.") from e

    # 3. Check allowed format
    if format_name not in ALLOWED_FORMATS:
        allowed_list = ", ".join(ALLOWED_FORMATS)
        raise ValueError(
            f"Unsupported image format: '{format_name}'. Allowed formats are: {allowed_list}."
        )

    extension = FORMAT_EXTENSIONS.get(format_name, ".jpg")
    return format_name, extension


def upload_ticket_image(
    file_bytes: bytes,
    original_filename: str = "",
    override_env: str = None
) -> str:
    """
    Validates and uploads a ticket complaint image.
    - Generates a collision-proof unique filename.
    - In production: strictly uploads to Cloudinary; fails if Cloudinary is not configured.
    - In development: uploads to Cloudinary if configured, otherwise stores locally in uploads/.
    Returns the resulting image URL or path.
    """
    # Validate the file content and format
    format_name, extension = validate_image_file(file_bytes, original_filename)

    # Generate unique filename to prevent collisions
    unique_id = uuid.uuid4().hex
    timestamp = int(datetime.now().timestamp())
    unique_filename = f"ticket_{timestamp}_{unique_id}{extension}"

    current_env = (override_env or os.getenv("ENVIRONMENT", "development")).strip().lower()
    has_credentials = bool(
        os.getenv("CLOUDINARY_CLOUD_NAME")
        and os.getenv("CLOUDINARY_API_KEY")
        and os.getenv("CLOUDINARY_API_SECRET")
    )

    # Production Mode Enforcement (Rule 7: No silent fallback to local storage)
    if current_env == "production":
        if not has_credentials:
            raise RuntimeError(
                "Production mode requires Cloudinary configuration (CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Local storage fallback is disabled in production."
            )
        # Upload to Cloudinary in production
        upload_result = cloudinary.uploader.upload(
            file_bytes,
            folder="hostel_tickets",
            public_id=f"ticket_{timestamp}_{unique_id}",
            resource_type="image",
            overwrite=False,
        )
        return upload_result.get("secure_url")

    # Development Mode
    if has_credentials:
        try:
            upload_result = cloudinary.uploader.upload(
                file_bytes,
                folder="hostel_tickets_dev",
                public_id=f"ticket_{timestamp}_{unique_id}",
                resource_type="image",
                overwrite=False,
            )
            return upload_result.get("secure_url")
        except Exception:
            pass  # If network/credentials fail in dev mode, fallback to local uploads

    # Local storage for development mode
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    destination = uploads_dir / unique_filename
    destination.write_bytes(file_bytes)

    return f"/uploads/{unique_filename}"
