from flask import Blueprint
from services.interview_service import validate_interview_access

interview_bp = Blueprint("interview", __name__)

@interview_bp.route("/interview/<interview_id>")
def interview_route(interview_id):
    result = validate_interview_access(interview_id)

    if not result["allowed"]:
        return result["error"], 403

    invite = result["invite"]
    return f"Interview started for {invite['email']}"
