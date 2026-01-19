// ==================== STATE ====================
let recognition;
let isListening = false;
let isAISpeaking = false;
let currentQuestion = "";
let questionCount = 0;
let mediaRecorder;
let recordedChunks = [];

// Question repeat prevention
let repeatCount = 0;
const MAX_REPEATS = 2;

// Camera metrics
let totalFrames = 0;
let noFaceFrames = 0;
let lookAwayFrames = 0;

// ==================== GOOGLE DRIVE STATE ====================
const DRIVE_CONFIG = {
    CLIENT_ID: '1066311652026-vndvdrqgvf18epoe2rlodhkesubn0u4p.apps.googleusercontent.com',
    API_KEY: 'AIzaSyAAwh9oVNej8flePAOZTkzO3_BqKuuuock',
    SCOPES: 'https://www.googleapis.com/auth/drive.file'
};

let tokenClient;
let accessToken = null;
let pendingVideoBlob = null;
let currentInterviewId = null;

// ==================== CURRENT VIEW ====================
let currentView = 'schedule'; // 'schedule', 'interview', 'library'
