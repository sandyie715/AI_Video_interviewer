from datetime import datetime, timezone
import uuid
from mail.email_service import send_invite
from utils.time_utils import parse_to_utc
import os
import re
from dotenv import load_dotenv

# Load environment variables from .env file
# Reason: Keeps secrets like BASE_URL out of source code
load_dotenv()

invites = {}

def create_invite(data:dict) ->dict:
    """
    Business rule:
    - validate input presence
    - convert time to UTC
    - validate time window
    - create invite
    - send email
    """
    
    email = data.get("email") 
    start_time = data.get("start_time")
    end_time = data.get("end_time")

    # Email validation using regex
    # Reason: Prevent invalid email formats before sending invite
    def is_valid_email(email):
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        return re.match(pattern, email) is not None 
    
    # Validate presence of required fields
    if not email or not start_time or not end_time:
        raise ValueError("Missing required fields")
    
    #convert ISO datetime string (assumed IST) to UTC
    start_utc = parse_to_utc(start_time)
    end_utc = parse_to_utc(end_time)
    
    #validate time sent by frontend
     # Reason: End time must be after start time
    if start_utc >= end_utc:
        raise ValueError("Invalid time window")
    
    # Generate unique interview ID
    interview_id = str(uuid.uuid4())

    # Construct interview access link
    interview_link = f"{os.getenv('BASE_URL')}/{interview_id}"

    # Store invite details in memory
    invites[interview_id] = { 
        "email": email,
        "start_time": start_utc,
        "end_time": end_utc,
        "used": False,
        "completed_at": None,
        "created_at": datetime.now(),
    }
   
    # Attempt to send interview invite email
    try:
        send_invite(email, interview_link)
    except Exception as e:
        # Handle email sending failure
        return {
            "error": "Failed to send email",
            "details": str(e)
        }, 500

    # Success response
    return {
        "interview_id": interview_id
    }



