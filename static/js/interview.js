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
        
        // Generate interview ID
        currentInterviewId = Date.now();
        
        // Switch to interview view
        showView('interview');
        
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
// ==================== INTERVIEW FLOW ====================
async function askNextQuestion() {
    updateStatus("Getting next question...");
    
    try {
        const res = await fetch("/next-question");
        const data = await res.json();
        
        // CASE: MEETING ENDS AUTOMATICALLY (No more questions)
        if (data.done) {
            document.getElementById("captionText").innerText = 
                "Interview completed! Thank you. Finalizing recording...";
            
            // IMPORTANT: Stop the camera and wait for the blob BEFORE evaluation
            await stopVideoRecording(); 
            
            updateStatus("Evaluation in progress");
            setTimeout(() => {
                getFinalEvaluation();
            }, 1000);
            
            return;
        }
        
        currentQuestion = data.question;
        repeatCount = 0;
        questionCount++;
        speakQuestion(data.question);
        
    } catch (error) {
        console.error("Error getting question:", error);
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
        // ... (your existing fetch calls for metrics and evaluation) ...
        const res = await fetch("/final-evaluation");
        const evaluation = await res.json();
        
        displayFinalResults(evaluation);
        
        // TRIGGER UPLOAD HERE (This handles both Manual and Automatic end)
        if (pendingVideoBlob && pendingVideoBlob.size > 0) {
            console.log('Initiating Drive upload from evaluation handler...');
            await uploadToDrive(pendingVideoBlob);
        }
        
    } catch (error) {
        console.error("Error in final processing:", error);
    }
}


function displayFinalResults(evaluation) {
    let resultText = "Interview Results:\n\n";
    
    if (evaluation.error) {
        resultText = "Evaluation could not be completed.";
    } else {
        resultText += `Technical Score: ${evaluation.technical_score}/10\n`;
        resultText += `Communication: ${evaluation.communication_score}/10\n`;
        resultText += `Overall Score: ${evaluation.overall_score}/10\n`;
        resultText += `Recommendation: ${evaluation.recommendation}\n\n`;
        resultText += `Feedback: ${evaluation.feedback || ""}`;
    }
    
    document.getElementById("captionText").innerText = resultText;
    updateStatus("Interview finished");
    
    // Return to schedule page after results
    setTimeout(() => {
        if (confirm("Interview complete! View your recording in the library?")) {
            showView('library');
        } else {
            showView('schedule');
        }
        
        // Reset state
        document.getElementById("jdInput").value = '';
        document.getElementById("startBtn").disabled = false;
        document.getElementById("startBtn").textContent = "Start Interview";
    }, 5000);
}
