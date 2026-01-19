// ==================== LIBRARY FUNCTIONS ====================

async function refreshLibrary() {
    if (!accessToken) {
        document.getElementById('videoList').innerHTML = `
            <p style="text-align: center; color: #ff6b6b; padding: 40px 20px;">
                Please connect to Google Drive first
            </p>
        `;
        return;
    }
    
    document.getElementById('videoList').innerHTML = `
        <div style="text-align: center; padding: 40px 0;">
            <div style="width: 40px; height: 40px; border: 4px solid #667eea; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            <p style="color: #888; margin-top: 15px;">Loading recordings...</p>
        </div>
    `;
    
    try {
        const query = encodeURIComponent("mimeType='video/webm' and trashed=false");
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`,
            {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch files');
        }
        
        const data = await response.json();
        displayVideoList(data.files || []);
        
    } catch (error) {
        console.error('Error loading library:', error);
        document.getElementById('videoList').innerHTML = `
            <p style="text-align: center; color: #ff6b6b; padding: 40px 20px;">
                Failed to load recordings<br>
                <button onclick="refreshLibrary()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Try Again
                </button>
            </p>
        `;
    }
}

function displayVideoList(files) {
    const container = document.getElementById('videoList');
    
    if (files.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: #888; padding: 40px 20px;">
                No recordings found.<br>
                Complete an interview to see it here!
            </p>
        `;
        return;
    }
    
    container.innerHTML = files.map(file => `
        <div class="video-item" onclick="playFromDrive('${file.id}', '${escapeHtml(file.name)}', '${file.createdTime}')">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="font-size: 20px;">▶️</span>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; color: white; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(file.name)}
                    </div>
                    <div style="color: #888; font-size: 11px; margin-top: 3px;">
                        ${formatDate(file.createdTime)} • ${formatSize(file.size)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function playFromDrive(fileId, fileName, createdTime) {
    const player = document.getElementById('libraryPlayer');
    const items = document.querySelectorAll('.video-item');
    
    // Highlight selected
    items.forEach(item => item.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    
    // Update info
    document.getElementById('playingTitle').innerText = fileName;
    document.getElementById('playingDate').innerText = formatDate(createdTime);
    
    try {
        player.src = '';
        player.poster = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y="50" x="50" text-anchor="middle" fill="%23888" font-size="12"%3ELoading...%3C/text%3E%3C/svg%3E';
        
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            }
        );
        
        if (!response.ok) throw new Error('Failed to fetch video');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        player.src = url;
        player.play();
        
    } catch (error) {
        console.error('Playback error:', error);
        alert('Failed to load video. It may still be processing.');
    }
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes) {
    if (!bytes) return 'Unknown size';
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${mb} MB`;
}
