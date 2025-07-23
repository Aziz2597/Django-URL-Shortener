document.addEventListener('DOMContentLoaded', function() {
    
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const form = document.getElementById('shortenForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }

    // Auto-focus on URL input
    const urlInput = document.querySelector('input[name="original_url"]');
    if (urlInput && !urlInput.value) {
        urlInput.focus();
    }

    initializeCopyButtons();
    
    // Initialize analytics charts if on analytics page
    if (document.getElementById('clicksChart')) {
        initializeAnalytics();
    }
});

function handleFormSubmission(event) {
    const submitButton = document.getElementById('shortenBtn');
    const originalText = submitButton.innerHTML;
    
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Shortening...';
    submitButton.disabled = true;
    
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

function showSuccessToast(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'danger');
}

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
                                            <input type="text" class="form-control" 
                                                   value="${window.location.origin}/${data.short_code}" readonly>
                                            <button class="btn btn-outline-secondary" type="button"
                                                    onclick="copyToClipboard('${window.location.origin}/${data.short_code}')">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Original URL:</th>
                                    <td>
                                        <a href="${data.original_url}" target="_blank" class="text-break">
                                            ${data.original_url}
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Status:</th>
                                    <td>${statusBadge}</td>
                                </tr>
                                <tr>
                                    <th>Created:</th>
                                    <td>${new Date(data.created_at).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <th>Expires:</th>
                                    <td>${data.expires_at ? new Date(data.expires_at).toLocaleString() : 'Never'}</td>
                                </tr>
                                <tr>
                                    <th>Click Count:</th>
                                    <td>
                                        <span class="badge bg-primary">${data.click_count}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Last Accessed:</th>
                                    <td>${data.last_accessed ? new Date(data.last_accessed).toLocaleString() : 'Never'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error fetching URL info:', error);
            modalContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load URL information. Please try again.
                </div>
            `;
        });
}

// Delete URL functionality
function deleteUrl(shortCode) {
    if (!confirm('Are you sure you want to delete this URL? This action cannot be undone.')) {
        return;
    }
    
    const deleteBtn = document.querySelector(`[onclick="deleteUrl('${shortCode}')"]`);
    const originalText = deleteBtn.innerHTML;
    
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    deleteBtn.disabled = true;
    
    fetch(`/api/delete/${shortCode}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showSuccessToast('URL deleted successfully');
            // Remove the row from the table
            const row = deleteBtn.closest('tr');
            if (row) {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                }, 300);
            }
        } else {
            throw new Error(data.error || 'Failed to delete URL');
        }
    })
    .catch(error => {
        console.error('Error deleting URL:', error);
        showError('Failed to delete URL. Please try again.');
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    });
}

// Get CSRF token for Django
function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
           document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

// Toggle URL status (active/inactive)
function toggleUrlStatus(shortCode) {
    const toggleBtn = document.querySelector(`[onclick="toggleUrlStatus('${shortCode}')"]`);
    const originalText = toggleBtn.innerHTML;
    
    toggleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    toggleBtn.disabled = true;
    
    fetch(`/api/toggle/${shortCode}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Update button appearance based on new status
            const isActive = data.is_active;
            toggleBtn.className = isActive ? 
                'btn btn-sm btn-outline-warning' : 
                'btn btn-sm btn-outline-success';
            toggleBtn.innerHTML = isActive ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
            
            // Update status badge
            const statusBadge = toggleBtn.closest('tr').querySelector('.badge');
            if (statusBadge) {
                statusBadge.className = isActive ? 'badge bg-success' : 'badge bg-secondary';
                statusBadge.textContent = isActive ? 'Active' : 'Inactive';
            }
            
            showSuccessToast(`URL ${isActive ? 'activated' : 'deactivated'} successfully`);
        } else {
            throw new Error(data.error || 'Failed to toggle URL status');
        }
    })
    .catch(error => {
        console.error('Error toggling URL status:', error);
        showError('Failed to update URL status. Please try again.');
        toggleBtn.innerHTML = originalText;
    })
    .finally(() => {
        toggleBtn.disabled = false;
    });
}

// Initialize analytics charts 
function initializeAnalytics() {
    const clicksChartCanvas = document.getElementById('clicksChart');
    if (!clicksChartCanvas || typeof Chart === 'undefined') {
        return;
    }
    
    // Fetch analytics data
    fetch('/api/analytics/')
        .then(response => response.json())
        .then(data => {
            // Clicks over time chart
            const ctx = clicksChartCanvas.getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.dates || [],
                    datasets: [{
                        label: 'Clicks',
                        data: data.clicks || [],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Clicks Over Time'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
            
            const topUrlsCanvas = document.getElementById('topUrlsChart');
            if (topUrlsCanvas && data.top_urls) {
                const topCtx = topUrlsCanvas.getContext('2d');
                new Chart(topCtx, {
                    type: 'bar',
                    data: {
                        labels: data.top_urls.map(url => url.short_code),
                        datasets: [{
                            label: 'Clicks',
                            data: data.top_urls.map(url => url.click_count),
                            backgroundColor: 'rgba(54, 162, 235, 0.8)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Top 10 URLs by Clicks'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error loading analytics:', error);
            const chartsContainer = document.querySelector('.charts-container');
            if (chartsContainer) {
                chartsContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Failed to load analytics data.
                    </div>
                `;
            }
        });
}

// Bulk actions functionality
function handleBulkAction(action) {
    const checkboxes = document.querySelectorAll('input[name="selected_urls"]:checked');
    if (checkboxes.length === 0) {
        showError('Please select at least one URL');
        return;
    }
    
    const shortCodes = Array.from(checkboxes).map(cb => cb.value);
    let confirmMessage = '';
    
    switch (action) {
        case 'delete':
            confirmMessage = `Are you sure you want to delete ${shortCodes.length} URL(s)? This action cannot be undone.`;
            break;
        case 'activate':
            confirmMessage = `Are you sure you want to activate ${shortCodes.length} URL(s)?`;
            break;
        case 'deactivate':
            confirmMessage = `Are you sure you want to deactivate ${shortCodes.length} URL(s)?`;
            break;
        default:
            showError('Invalid action');
            return;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    const bulkBtn = document.getElementById('bulkActionBtn');
    const originalText = bulkBtn.innerHTML;
    
    bulkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    bulkBtn.disabled = true;
    
    fetch('/api/bulk-action/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: action,
            short_codes: shortCodes
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessToast(`${data.count} URL(s) ${action}d successfully`);
            // Refresh the page to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error(data.error || `Failed to ${action} URLs`);
        }
    })
    .catch(error => {
        console.error(`Error ${action}ing URLs:`, error);
        showError(`Failed to ${action} URLs. Please try again.`);
    })
    .finally(() => {
        bulkBtn.innerHTML = originalText;
        bulkBtn.disabled = false;
    });
}

// Select/deselect all checkboxes
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const urlCheckboxes = document.querySelectorAll('input[name="selected_urls"]');
    
    urlCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkActionButton();
}

// Update bulk action button state
function updateBulkActionButton() {
    const selectedCheckboxes = document.querySelectorAll('input[name="selected_urls"]:checked');
    const bulkActionSelect = document.getElementById('bulkAction');
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    
    if (bulkActionSelect && bulkActionBtn) {
        const hasSelection = selectedCheckboxes.length > 0;
        bulkActionSelect.disabled = !hasSelection;
        bulkActionBtn.disabled = !hasSelection || bulkActionSelect.value === '';
        
        if (hasSelection) {
            bulkActionBtn.textContent = `Apply to ${selectedCheckboxes.length} URL(s)`;
        } else {
            bulkActionBtn.textContent = 'Apply Action';
        }
    }
}

// Initialize bulk actions if on the right page
document.addEventListener('DOMContentLoaded', function() {
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleSelectAll);
    }
    
    const urlCheckboxes = document.querySelectorAll('input[name="selected_urls"]');
    urlCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActionButton);
    });
    
    const bulkActionSelect = document.getElementById('bulkAction');
    if (bulkActionSelect) {
        bulkActionSelect.addEventListener('change', updateBulkActionButton);
    }
    
    const bulkActionBtn = document.getElementById('bulkActionBtn');
    if (bulkActionBtn) {
        bulkActionBtn.addEventListener('click', function() {
            const action = document.getElementById('bulkAction').value;
            if (action) {
                handleBulkAction(action);
            }
        });
    }
});

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        // Debounce search to avoid too many requests
        searchTimeout = setTimeout(() => {
            if (query.length >= 2 || query.length === 0) {
                performSearch(query);
            }
        }, 300);
    });
}

function performSearch(query) {
    const tableBody = document.querySelector('#urlsTable tbody');
    if (!tableBody) return;
    
    const params = new URLSearchParams(window.location.search);
    params.set('search', query);
    params.delete('page'); 
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    
    fetch(newUrl, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.text())
    .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newTableBody = doc.querySelector('#urlsTable tbody');
        const newPagination = doc.querySelector('.pagination');
        
        if (newTableBody) {
            tableBody.innerHTML = newTableBody.innerHTML;
            initializeCopyButtons(); 
        }
        
        const currentPagination = document.querySelector('.pagination');
        if (currentPagination && newPagination) {
            currentPagination.outerHTML = newPagination.outerHTML;
        }
        
        // Update URL without refreshing page
        history.pushState(null, '', newUrl);
    })
    .catch(error => {
        console.error('Search error:', error);
        showError('Search failed. Please try again.');
    });
}

document.addEventListener('DOMContentLoaded', initializeSearch);