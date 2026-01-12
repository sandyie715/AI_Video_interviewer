async function initCamera() {
        const video = document.getElementById("video");
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            
            video.srcObject = stream;
            
            // Setup video recording
            startVideoRecording(stream);
            
            // Load face detection models
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(
                    "https://justadudewhohacks.github.io/face-api.js/models"
                ),
                faceapi.nets.faceLandmark68Net.loadFromUri(
                    "https://justadudewhohacks.github.io/face-api.js/models"
                )
            ]);
            
            video.onloadedmetadata = () => {
                video.play();
            };
            
            // Start camera analysis
            analyzeCamera(video);
            updateStatus("Camera ready");
            
        } catch (error) {
            console.error("Camera error:", error);
            updateStatus("Camera access denied");
        }
    }
    
    function startVideoRecording(stream) {
        recordedChunks = [];
        
        try {
            // Use video/webm with both audio and video
            const options = { 
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 2500000
            };
            
            // Fallback mime types
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
            
            mediaRecorder = new MediaRecorder(stream, options);
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstart = () => {
                console.log("Recording started");
                document.getElementById("recordingIndicator").classList.add("recording");
            };
            
            mediaRecorder.onstop = () => {
                console.log("Recording stopped");
                document.getElementById("recordingIndicator").classList.remove("recording");
            };
            
            mediaRecorder.start();
            
        } catch (error) {
            console.error("Recording setup error:", error);
        }
    }
    
    function stopVideoRecording() {
        return new Promise((resolve) => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    
                    // Send video to backend
                    await saveRecordedVideo(blob);
                    resolve();
                };
                
                mediaRecorder.stop();
            } else {
                resolve();
            }
        });
    }
    
    async function saveRecordedVideo(blob) {
        try {
            const formData = new FormData();
            formData.append('video', blob, `interview_${Date.now()}.webm`);
            
            const res = await fetch('/save-video', {
                method: 'POST',
                body: formData
            });
            
            const data = await res.json();
            console.log("Video saved:", data);
            
        } catch (error) {
            console.error("Error saving video:", error);
        }
    }
    
    async function analyzeCamera(video) {
        setInterval(async () => {
            try {
                totalFrames++;
                
                const detections = await faceapi
                    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks();
                
                if (detections.length === 0) {
                    noFaceFrames++;
                }
                
                if (detections.length === 1) {
                    const lm = detections[0].landmarks;
                    const nose = lm.getNose()[0];
                    const leftEye = lm.getLeftEye()[0];
                    const rightEye = lm.getRightEye()[3];
                    
                    // Check if looking away (horizontal deviation > 25px)
                    if (Math.abs(nose.x - (leftEye.x + rightEye.x) / 2) > 25) {
                        lookAwayFrames++;
                    }
                }
            } catch (error) {
                // Silent fail for analysis
            }
        }, 1000);
    }
