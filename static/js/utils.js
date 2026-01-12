 function updateStatus(msg) {
        document.getElementById("statusText").innerText = msg;
    }

    //==============Repeat question==================
    function isRepeatRequest(text) {
    const normalized = text.toLowerCase().trim();

    const repeatPatterns = [
        "repeat",
        "repeat the question",
        "say it again",
        "can you repeat",
        "once again",
        "please repeat",
        "i didn't hear",
        "didn't hear",
        "say that again",
        "what was the question"
    ];

    return repeatPatterns.some(p => normalized.includes(p));
} 