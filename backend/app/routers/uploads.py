from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import uuid

router = APIRouter(prefix="/api/upload", tags=["Uploads"])

THUMBNAIL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "thumbnail")
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/thumbnail", response_model=dict)
async def upload_thumbnail(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 5MB.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    random_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(THUMBNAIL_DIR, random_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    url = f"/thumbnail/{random_name}"
    return {"url": url, "filename": random_name}
