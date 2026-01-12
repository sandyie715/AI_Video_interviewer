 // ==================== STATE ====================
    let recognition;
    let isListening = false;
    let isAISpeaking = false;
    let currentQuestion = "";
    let questionCount = 0;
    let mediaRecorder;
    let recordedChunks = [];

    //================== for question repeat prevention ==================
    let repeatCount = 0;
    const MAX_REPEATS = 2; // Maximum allowed repeats for the same question

    // Camera metrics
    let totalFrames = 0;
    let noFaceFrames = 0;
    let lookAwayFrames = 0;