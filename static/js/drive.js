// ==================== GOOGLE DRIVE INTEGRATION ====================

function initGoogleDrive() {
    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: DRIVE_CONFIG.CLIENT_ID,
            scope: DRIVE_CONFIG.SCOPES,
            callback: (response) => {
                if (response.error) {
                    console.error('Auth error:', response.error);
                    updateDriveStatus('❌ Drive connection failed', 'red');
                    return;
                }
                
                accessToken = response.access_token;
                updateDriveStatus('✅ Connected to Google Drive', 'green');
                
                // If there's a pending upload, do it now
                if (pendingVideoBlob) {
                    uploadToDrive(pendingVideoBlob);
                }
            }
        });
    }
    
    tokenClient.requestAccessToken({ prompt: '' });
}

function updateDriveStatus(message, color = '#888') {
    const statusEl = document.getElementById('driveStatus');
    if (statusEl) {
        statusEl.innerText = message;
        statusEl.style.color = color;
    }
}

async function uploadToDrive(blob) {
    if (!accessToken) return;

    // Show the progress window
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'flex';
    document.getElementById('uploadStatus').innerText = 'Preparing video...';

    const filename = `Interview_${Date.now()}.webm`;

    // Helper to convert binary video to a format Google can read via Fetch
    const getBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });

    try {
        const base64Data = await getBase64(blob);
        const metadata = { name: filename, mimeType: 'video/webm' };
        const boundary = 'foo_bar_baz';

        // Constructing the body manually is more reliable for videos
        const body = 
            `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
            `\r\n--${boundary}\r\nContent-Type: video/webm\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Data}` +
            `\r\n--${boundary}--`;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: body
        });

        if (response.ok) {
            document.getElementById('uploadBar').style.width = '100%';
            document.getElementById('uploadStatus').innerText = '✅ Upload complete!';
            setTimeout(() => { modal.style.display = 'none'; }, 2000);
        }
    } catch (e) {
        console.error("Upload failed", e);
        document.getElementById('uploadStatus').innerText = '❌ Upload failed';
    }
}

// Ensure this function actually works to clear the modal
function hideUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.style.setProperty('display', 'none', 'important');
}