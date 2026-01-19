// ==================== NAVIGATION ====================
function showView(view) {
    // Hide all views
    document.getElementById('schedulePage').style.display = 'none';
    document.getElementById('interviewPage').style.display = 'none';
    document.getElementById('libraryPage').style.display = 'none';
    
    // Show navigation only when not in interview
    const nav = document.getElementById('navigation');
    if (view === 'interview') {
        nav.style.display = 'none';
    } else {
        nav.style.display = 'flex';
    }
    
    // Show selected view
    if (view === 'schedule') {
        document.getElementById('schedulePage').style.display = 'block';
        updateActiveTab(0);
    } else if (view === 'library') {
        document.getElementById('libraryPage').style.display = 'block';
        updateActiveTab(1);
        
        // Load library if Drive is connected
        if (accessToken) {
            refreshLibrary();
        }
    } else if (view === 'interview') {
        document.getElementById('interviewPage').style.display = 'block';
    }
    
    currentView = view;
}

function updateActiveTab(index) {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach((tab, i) => {
        if (i === index) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// Initialize on load
// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    showView('schedule');
    document.getElementById('navigation').style.display = 'flex';
    
    // Ensure upload modal is hidden on load
    hideUploadModal();
    
    // Reset state
    pendingVideoBlob = null;
    currentInterviewId = null;
});
