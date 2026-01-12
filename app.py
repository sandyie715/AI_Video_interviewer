import os
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from openai import OpenAI
import json
from datetime import datetime
from pathlib import Path

load_dotenv()

app = Flask(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Create videos directory if it doesn't exist
VIDEOS_DIR = "interview_videos"
Path(VIDEOS_DIR).mkdir(exist_ok=True)

# Global state
questions = []
current_q_index = 0
interview_qna = []
camera_analysis = {}
current_interview_id = None

INTERVIEW_FILE = "interview_data.json"

SYSTEM_PROMPT = """
You are an expert technical interviewer.
Generate clear, concise interview questions.
Ask only one question at a time.
Make questions specific to the job description provided.
"""

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/upload-jd", methods=["POST"])
def upload_jd():
    global questions, current_q_index, interview_qna, current_interview_id
    
    jd_text = request.json.get("jd")
    
    if not jd_text or not jd_text.strip():
        return jsonify({"error": "No JD provided"}), 400
    
    # Create unique interview ID
    current_interview_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Reset state for new interview
    questions = []
    current_q_index = 0
    interview_qna = []
    
    prompt = f"""
Based on the following Job Description, generate exactly 2 interview questions.
Questions should be technical and role-specific.
Make them clear and conversational.

Job Description:
{jd_text}

Return ONLY the numbered questions, one per line. Example format:
1. What experience do you have with...
2. How would you approach...
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4
        )
        
        raw_text = response.choices[0].message.content
        
        # Parse questions - remove numbering
        raw_questions = raw_text.split("\n")
        questions = []
        
        for q in raw_questions:
            q = q.strip()
            if q:
                # Remove numbering like "1.", "1)", etc.
                for i in range(len(q)):
                    if q[i].isdigit():
                        continue
                    if q[i] in '.):- ':
                        q = q[i+1:].strip()
                        break
                if q:
                    questions.append(q)
        
        print(f"Generated {len(questions)} questions for interview {current_interview_id}")
        return jsonify({"message": "Questions generated", "total": len(questions), "questions": questions})
    
    except Exception as e:
        print(f"Error generating questions: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/next-question", methods=["GET"])
def next_question():
    global current_q_index
    
    if current_q_index >= len(questions):
        return jsonify({"done": True, "question": ""})
    
    q = questions[current_q_index]
    current_q_index += 1
    
    print(f"Question {current_q_index}: {q}")
    return jsonify({"done": False, "question": q})

@app.route("/submit-answer", methods=["POST"])
def submit_answer():
    data = request.json
    interview_qna.append({
        "question": data.get("question"),
        "answer": data.get("answer")
    })
    print(f"Answer saved: {data.get('answer')[:50]}...")
    return jsonify({"status": "saved"})

@app.route("/camera-metrics", methods=["POST"])
def camera_metrics():
    global camera_analysis
    camera_analysis = request.json
    print("Camera metrics received:", camera_analysis)
    return jsonify({"status": "received"})

@app.route("/save-video", methods=["POST"])
def save_video():
    """Save the recorded interview video"""
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
        
        video_file = request.files['video']
        
        if video_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        # Create interview-specific folder
        interview_folder = os.path.join(VIDEOS_DIR, current_interview_id or datetime.now().strftime("%Y%m%d_%H%M%S"))
        Path(interview_folder).mkdir(parents=True, exist_ok=True)
        
        # Save video with timestamp
        filename = f"interview_{datetime.now().strftime('%Y%m%d_%H%M%S')}.webm"
        filepath = os.path.join(interview_folder, filename)
        
        video_file.save(filepath)
        
        print(f"Video saved: {filepath}")
        return jsonify({
            "status": "saved",
            "filename": filename,
            "path": filepath,
            "interview_id": current_interview_id
        })
    
    except Exception as e:
        print(f"Error saving video: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/final-evaluation", methods=["GET"])
def final_evaluation():
    if not interview_qna:
        return jsonify({"error": "No interview data"}), 400
    
    combined_text = ""
    for idx, qa in enumerate(interview_qna, start=1):
        combined_text += f"""
Q{idx}: {qa['question']}
A{idx}: {qa['answer']}
"""

    prompt = f"""
You are a senior technical interview evaluator.
Evaluate the candidate based on their answers.

STRICT RULES:
- Return ONLY valid JSON (no markdown, no extra text)
- All scores MUST be integers 0-10
- Recommendation MUST be: "Yes", "Maybe", or "No"

Interview:
{combined_text}

Return this JSON format exactly:
{{
  "technical_score": 0,
  "communication_score": 0,
  "overall_score": 0,
  "recommendation": "Yes",
  "feedback": "Brief evaluation"
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a strict evaluator. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Try to extract JSON if wrapped in markdown
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(result_text)
        
        # Save interview data with video reference
        interview_data = {
            "interview_id": current_interview_id,
            "timestamp": datetime.now().isoformat(),
            "qna": interview_qna,
            "camera_metrics": camera_analysis,
            "evaluation": result,
            "video_folder": os.path.join(VIDEOS_DIR, current_interview_id or "")
        }
        
        try:
            with open(INTERVIEW_FILE, "r") as f:
                existing = json.load(f)
        except:
            existing = []
        
        existing.append(interview_data)
        
        with open(INTERVIEW_FILE, "w") as f:
            json.dump(existing, f, indent=4)
        
        print(f"Interview {current_interview_id} evaluation saved")
        return jsonify(result)
    
    except Exception as e:
        print(f"Evaluation error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)