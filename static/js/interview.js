 // ==================== STAGE 1: SUBMIT JD ====================
    async function submitJD() {
        const jd = document.getElementById("jdInput").value.trim();
        
        if (!jd) {
            alert("Please paste a job description");
            return;
        }
        
        const btn = document.getElementById("startBtn");
        btn.disabled = true;
        btn.textContent = "Generating questions...";
        
        try {
            const res = await fetch("/upload-jd", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jd })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                alert("Error: " + (data.error || "Failed to generate questions"));
                btn.disabled = false;
                btn.textContent = "Start Interview";
                return;
            }
            
            // Switch to interview page
            document.getElementById("jdPage").style.display = "none";
            document.getElementById("interviewPage").style.display = "block";
            
            // Initialize systems
            await initCamera();
            initSpeech();
            
            // Start interview after a short delay
            setTimeout(() => {
                askNextQuestion();
            }, 1000);
            
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to start interview");
            btn.disabled = false;
            btn.textContent = "Start Interview";
        }
    }
// ==================== INTERVIEW FLOW ====================
    async function askNextQuestion() {
        updateStatus("Getting next question...");
        
        try {
            const res = await fetch("/next-question");
            const data = await res.json();
            
            if (data.done) {
                document.getElementById("captionText").innerText = 
                    "Interview completed! Thank you. Evaluating results...";
                updateStatus("Evaluation in progress");
                
                // Get final evaluation
                setTimeout(() => {
                    getFinalEvaluation();
                }, 2000);
                
                return;
            }
            
            currentQuestion = data.question;
            repeatCount = 0;
            questionCount++;
            console.log(`Question ${questionCount}:`, currentQuestion);
            
            speakQuestion(data.question);
            
        } catch (error) {
            console.error("Error getting question:", error);
            updateStatus("Error getting question");
        }
    }
// ==================== END CALL ====================
    async function endCall() {
        if (!confirm("Are you sure you want to end the interview?")) {
            return;
        }
        
        document.getElementById("captionText").innerText = "Ending interview... Please wait";
        updateStatus("Saving recording and data...");
        
        // Stop recording
        await stopVideoRecording();
        
        // Small delay to ensure everything is saved
        setTimeout(async () => {
            await getFinalEvaluation();
        }, 1000);
    }
    
    // ==================== FINAL EVALUATION ====================
    async function getFinalEvaluation() {
        try {
            // Send camera metrics
            await fetch("/camera-metrics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    totalFrames,
                    noFaceFrames,
                    lookAwayFrames,
                    face_presence: ((totalFrames - noFaceFrames) / totalFrames).toFixed(2),
                    focus_quality: ((totalFrames - lookAwayFrames) / totalFrames).toFixed(2)
                })
            });
            
            // Get evaluation
            const res = await fetch("/final-evaluation");
            const evaluation = await res.json();
            
            displayFinalResults(evaluation);
            
        } catch (error) {
            console.error("Error getting evaluation:", error);
            document.getElementById("captionText").innerText = 
                "Interview complete. Results could not be evaluated.";
        }
    }
    
    function displayFinalResults(evaluation) {
        let resultText = "Interview Results:\n\n";
        
        if (evaluation.error) {
            resultText = "Evaluation could not be completed.";
        } else {
            resultText += `Technical Score: ${evaluation.technical_score || evaluation.technical_score}/10\n`;
            resultText += `Communication: ${evaluation.communication_score || evaluation.communication_score}/10\n`;
            resultText += `Overall Score: ${evaluation.overall_score || evaluation.overall_score}/10\n`;
            resultText += `Recommendation: ${evaluation.recommendation}\n\n`;
            resultText += `Feedback: ${evaluation.feedback || ""}`;
        }
        
        document.getElementById("captionText").innerText = resultText;
        updateStatus("Interview finished");
        
        // Allow reload after showing results
        setTimeout(() => {
            if (confirm("Interview saved! Click OK to return to home.")) {
                location.reload();
            }
        }, 5000);
    }