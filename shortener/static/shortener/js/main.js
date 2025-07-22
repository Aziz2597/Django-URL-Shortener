// Main JavaScript file for URL Shortener

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Form validation and submission
    const form = document.getElementById('shortenForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }

    // Auto-focus on URL input
    const urlInput = document.querySelector('input[name="original_url"]');
    if (urlInput && !urlInput.value) {
        urlInput.focus();
    }

    // Initialize copy buttons
    initializeCopyButtons();
});

// Handle form submission
function handleFormSubmission(event) {
    const submitButton = document.getElementById('shortenBtn');
    const originalText = submitButton.innerHTML;
    
    // Show loading state
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Shortening...';
    submitButton.disabled = true;
    
    // Add loading class
    submitButton.classList.add('btn-loading');
    
    // Validate form before submission
    const form = event.target;
    const urlInput = form.querySelector('input[name="original_url"]');
    
    if (!isValidUrl(urlInput.value)) {
        event.preventDefault();
        showError('Please enter a valid URL');
        resetButton(submitButton, originalText);
        return false;
    }
    
    // Reset button state after a delay (for non-AJAX submissions)
    setTimeout(() => {
        resetButton(submitButton, originalText);
    }, 3000);
}

// Reset button to original state
function resetButton(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
    button.classList.remove('btn-loading');
}

// URL validation
function isValidUrl(string) {
    try {
        // Add protocol if missing
        if (!string.match(/^https?:\/\//i)) {
            string = 'https://' + string;
        }
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Copy to clipboard functionality
function copyToClipboard(text = null) {
    // Get text from input if not provided
    const textToCopy = text || document.getElementById('shortUrl')?.value;
    
    if (!textToCopy) {
        showError('Nothing to copy');
        return;
    }
    
    // Use modern clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showSuccessToast('URL copied to clipboard!');
            updateCopyButton();
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyToClipboard(textToCopy);
        });
    } else {
        fallbackCopyToClipboard(textToCopy);
    }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showSuccessToast('URL copied to clipboard!');
            updateCopyButton();
        } else {
            showError('Failed to copy URL');
        }
    } catch (err) {
        console.error('Fallback copy failed: ', err);
        showError('Copy not supported in this browser');
    } finally {
        document.body.removeChild(textArea);
    }
}

// Update copy button appearance
function updateCopyButton() {
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        const originalClass = copyBtn.className;
        
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.classList.remove('btn-outline-primary');
        copyBtn.classList.add('btn-success');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.className = originalClass;
        }, 2000);
    }
}

// Show success toast notification
function showSuccessToast(message) {
    showToast(message, 'success');
}

// Show error message
function showError(message) {
    showToast(message, 'danger');
}

// Generic toast notification function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const icon = type === 'success' ? 'check-circle' : 'exclamation-triangle';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${icon} me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                    data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: type === 'danger' ? 5000 : 3000
    });
    
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    });
}

// Initialize copy buttons for tables
function initializeCopyButtons() {
    const copyButtons = document.querySelectorAll('[data-copy-text]');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-copy-text');
            copyToClipboard(textToCopy);
        });
    });
}

// URL info modal functionality
function showUrlInfo(shortCode) {
    const modal = document.getElementById('urlInfoModal');
    const modalContent = document.getElementById('urlInfoContent');
    
    // Show loading state
    modalContent.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading URL information...</p>
        </div>
    `;
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Fetch URL info
    fetch(`/api/info/${shortCode}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
            const statusBadge = isExpired ? 
                '<span class="badge bg-danger">Expired</span>' : 
                data.is_active ? 
                    '<span class="badge bg-success">Active</span>' : 
                    '<span class="badge bg-secondary">Inactive</span>';
            
            modalContent.innerHTML = `
                <div class="row">
                    <div class="col-12">
                        <div class="table-responsive">
                            <table class="table table-borderless">
                                <tr>
                                    <th width="30%">Short Code:</th>
                                    <td><code>${data.short_code}</code></td>
                                </tr>
                                <tr>
                                    <th>Short URL:</th>
                                    <td>
                                        <div class="input-group">
                                            <input type="text" class