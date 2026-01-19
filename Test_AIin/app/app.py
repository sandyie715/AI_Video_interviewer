from flask import Flask
from routes.invite_routes import invite_bp
from routes.interview_routes import interview_bp

app = Flask(__name__)

app.register_blueprint(invite_bp)
app.register_blueprint(interview_bp)

if __name__ == "__main__":
    app.run(debug=True)
