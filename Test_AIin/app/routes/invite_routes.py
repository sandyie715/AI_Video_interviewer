from flask import Blueprint, request, jsonify
from services.invite_service import create_invite

invite_bp = Blueprint("invite", __name__)

@invite_bp.route("/send-invite", methods=["POST"])
def send_invite_route():
    try:
        result = create_invite(request.json)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
