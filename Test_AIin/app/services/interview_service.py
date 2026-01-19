from datetime import datetime, timezone
from services.invite_service import invites

def validate_interview_access(interview_id: str) -> dict:
    """
    Business rule:
    - invite must exist
    - interview must not be completed
    - current time must be within window
    """

    invite = invites.get(interview_id)

    if not invite:
        return {
            "allowed": False,
            "error": "Invalid interview link"
        }

    if invite["completed_at"] is not None:
        return {
            "allowed": False,
            "error": "Interview already completed"
        }

    now = datetime.now(timezone.utc)

    if now < invite["start_time"]:
        return {
            "allowed": False,
            "error": "Interview has not started yet"
        }

    if now > invite["end_time"]:
        return {
            "allowed": False,
            "error": "Interview window has ended"
        }

    return {
        "allowed": True,
        "invite": invite
    }
