// ==================== SPEECH ====================
    function initSpeech() {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
            isListening = true;
            document.getElementById("captionText").classList.add("listening");
            updateStatus("Listening... speak now");
        };
        recognition.onresult = async (event) => {
    if (!isListening) return;

    const transcript = event.results[0][0].transcript;
    const normalized = transcript.toLowerCase().trim();

    isListening = false;
    document.getElementById("captionText").classList.remove("listening");

    document.getElementById("captionText").innerText = `You: "${transcript}"`;

    // ===== REPEAT QUESTION LOGIC =====
    if (isRepeatRequest(normalized)) {
        repeatCount++;

        if (repeatCount > MAX_REPEATS) {
            updateStatus("Moving to next question");

            setTimeout(() => {
                repeatCount = 0;
                askNextQuestion();
            }, 1500);

            return;
        } else {
            updateStatus("Repeating question...");
            setTimeout(() => {
                speakQuestion(currentQuestion);
            }, 800);
            return;
        }
        }


    // ===== VALID ANSWER =====
    repeatCount = 0;
    updateStatus("Processing...");

    try {
        await fetch("/submit-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: currentQuestion,
                answer: transcript
            })
        });
    } catch (error) {
        console.error("Error submitting answer:", error);
    }

    setTimeout(() => {
        askNextQuestion();
    }, 2000);
};
        
        recognition.onerror = (event) => {
            console.error("Speech error:", event.error);
            isListening = false;
            updateStatus("Error: " + event.error);
            
            // Retry listening
            setTimeout(() => {
                if (!isAISpeaking) {
                    recognition.start();
                }
            }, 1000);
        };
    }
    
    
    
    function speakQuestion(text) {
        isAISpeaking = true;
        isListening = false;
        
        // Update caption
        document.getElementById("captionText").innerText = text;
        updateStatus("AI speaking...");
        
        // Use speech synthesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            isAISpeaking = false;
            updateStatus("Your turn to speak");
            
            // Start listening
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (error) {
                    console.log("Recognition already running");
                }
            }, 500);
        };
        
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            isAISpeaking = false;
            setTimeout(() => {
                recognition.start();
            }, 500);
        };
        
        speechSynthesis.cancel(); // Cancel any ongoing speech
        speechSynthesis.speak(utterance);
    }