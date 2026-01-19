from flask import Flask, request, jsonify
from dotenv import load_dotenv
import uuid
import os
import re
from datetime import datetime, timedelta, timezone
import zoneinfo

# Define Indian Standard Time (IST) timezone
# Reason: Interview times are expected to be provided in IST
IST = zoneinfo.ZoneInfo("Asia/Kolkata")

# In-memory store for interview invites
# Reason: Temporary storage for interview sessions (NOT suitable for production scaling)
invites = {}

from email_service import send_invite   

# Load environment variables from .env file
# Reason: Keeps secrets like BASE_URL out of source code
load_dotenv()

# Initialize Flask application
app = Flask(__name__)

@app.route("/send-invite", methods=["POST"])
def send_email_invite():
    # Parse incoming JSON request body
    data = request.json

    # Extract email field from request
    email = data.get("email") 

    # Email validation using regex
    # Reason: Prevent invalid email formats before sending invite
    def is_valid_email(email):
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        return re.match(pattern, email) is not None
    
    # Convert ISO datetime string (assumed IST) to UTC
    # Reason: Store all timestamps in UTC for consistency
    def parse_datetime(dt_str):
        local_dt = datetime.fromisoformat(dt_str)
        local_dt = local_dt.replace(tzinfo=IST)
        return local_dt.astimezone(timezone.utc)

    # Validate email existence and format
    if not email or not is_valid_email(email):
        return jsonify({"error": "Invalid email address"}), 400

    # Generate unique interview ID
    interview_id = str(uuid.uuid4())

    # Construct interview access link
    interview_link = f"{os.getenv('BASE_URL')}/{interview_id}"
    
    # Parse interview start and end times
    start_time = parse_datetime(data["start_time"])
    end_time = parse_datetime(data["end_time"])

    # Validate interview time window
    # Reason: End time must be after start time
    if start_time >= end_time:
        return jsonify({"error": "Invalid time window"}), 400

    # Store invite details in memory
    invites[interview_id] = {
        "email": email,
        "start_time": start_time,
        "end_time": end_time,
        "used": False
    }

    # Attempt to send interview invite email
    try:
        send_invite(email, interview_link)
    except Exception as e:
        # Handle email sending failure
        return jsonify({
            "error": "Failed to send email",
            "details": str(e)
        }), 500

    # Success response
    return jsonify({
        "message": "Invitation sent",
        "interview_id": interview_id
    })

@app.route("/interview/<interview_id>")
def interview_page(interview_id):
    # Retrieve invite details using interview ID
    invite = invites.get(interview_id)

    # Check if interview ID exists
    if not invite:
        return "Invalid interview link", 404

    # Prevent reuse of interview link
    if invite["used"]:
        return "Interview already completed", 403

    # Get current UTC time
    now = datetime.now(timezone.utc)

    # Ensure interview has started
    if now < invite["start_time"]:
        return "Interview has not started yet", 403

    # Ensure interview has not expired
    if now > invite["end_time"]:
        return "Interview window has ended", 403

    # Mark interview as used
    invite["used"] = True

    # Start interview session
    return f"Interview started for {invite['email']}"

if __name__ == "__main__":
    # Run Flask development server
    # Reason: Debug enabled for development visibility
    app.run(debug=True)
