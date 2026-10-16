/**
 * Developer: Meher Salim
 * File: js/utils.js
 * Description:
 * Shared helper functions: notifications, loading overlay, modals,
 * HTML escaping, and safe image URLs.
 *
 * Loaded as a plain <script> before script.js (see index.html), so everything
 * here shares one global scope with the other script files.
 */

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Show notification toast
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 */
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notificationToast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.display = 'block';
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.style.color = type === 'warning' ? '#333' : 'white';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

/**
 * Show/hide loading overlay
 * @param {boolean} show - Show or hide
 */
function showLoadingOverlay(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Close modal by ID
 * @param {string} modalId - Modal element ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(text).replace(/[&<>"']/g, ch => map[ch]);
}

/**
 * Build a small placeholder image as an inline SVG data URI.
 * No external website needed, so it never breaks.
 * @param {string} label - Short text shown in the image
 * @param {string} bg - Background color
 * @returns {string} data URI usable as an <img> src
 */
function makePlaceholderImage(label = 'No Image', bg = '#b9a7d9') {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">'
        + '<rect width="200" height="200" fill="' + bg + '"/>'
        + '<text x="100" y="108" font-family="Arial, sans-serif" font-size="18" fill="#ffffff" text-anchor="middle">'
        + escapeHtml(label) + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Shown whenever a pin has no usable image
const NO_IMAGE_URL = makePlaceholderImage('No Image');

// True for the old via.placeholder.com images and our own SVG placeholders
function isPlaceholderImage(url) {
    return !url || url.includes('via.placeholder.com') || url.startsWith('data:image/svg+xml');
}

/**
 * Make an image URL safe to put inside src="...".
 * Allows only https: URLs, base64 data:image URLs (png/jpeg/gif/webp/avif/bmp/heic/heif;
 * HEIC is what iPhone photos upload as) and our own encoded SVG placeholders.
 * Anything else (javascript:, http:, garbage) becomes the fallback image.
 * The result is already escaped, so it is safe inside an HTML attribute.
 * @param {string} url
 * @param {string} [fallback]
 * @returns {string}
 */
function safeImageUrl(url, fallback = NO_IMAGE_URL) {
    if (typeof url !== 'string') return fallback;
    const value = url.trim();
    if (/^data:image\/(png|jpe?g|gif|webp|avif|bmp|heic|heif);base64,[a-z0-9+/=]+$/i.test(value)) {
        return escapeHtml(value);
    }
    // Our own SVG placeholders: strictly URL-encoded, so no raw < > or quotes can get through
    if (/^data:image\/svg\+xml;charset=utf-8,[a-z0-9%._~!*'()-]+$/i.test(value)) {
        return escapeHtml(value);
    }
    try {
        const parsed = new URL(value);
        if (parsed.protocol === 'https:') return escapeHtml(parsed.href);
    } catch (e) {
        // not a valid URL: fall through
    }
    return fallback;
}
