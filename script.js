/**
 * Developer: Meher Salim
 * File: script.js
 * Description:
 * Disney Pin Vault - Complete Main Application
 * This file contains ALL the application logic combining Phases 1-4:
 * 
 * PHASE 1: Basic CRUD + Local Storage
 * - Add, edit, delete pins
 * - Local storage persistence
 * - Basic display and stats
 * 
 * PHASE 2: Tags, Search, Import/Export
 * - Tag system with suggestions
 * - Search functionality
 * - JSON import/export
 * - Image preview
 * 
 * PHASE 3: Firebase Auth, Cloud Sync, Trading
 * - User authentication (email + Google)
 * - Firestore cloud database
 * - Real-time trade offers
 * - Trade matching system
 * 
 * PHASE 4: AI Scanner, Analytics, Marketplace
 * - Integration with AI recognizer
 * - Analytics dashboard charts
 * - Marketplace price checking
 * 
 * NEW FEATURE: Guest User Mode
 * - Users can explore the app without signing up
 * - Guest data is stored in localStorage (not synced to cloud)
 * - Option to convert guest account to full account
 *
 * @version 4.1.0
 * @license MIT
 */

// ============================================
// GLOBAL STATE VARIABLES
// ============================================

let currentUser = null;              // Currently logged in user
let isGuestMode = false;             // Whether user is in guest mode
let pinsDatabase = [];               // Array of all pins
let currentFilter = 'all';           // Current status filter (all/own/trade/iso)
let currentSearchTerm = '';          // Current search query
let activeTags = [];                 // Array of active tag filters
let unsubscribePins = null;          // Firestore real-time listener
let unsubscribeTrades = null;        // Firestore trades listener
let currentTradeTarget = null;       // User ID for pending trade

// ============================================
// INITIALIZATION & AUTHENTICATION
// ============================================

/**
 * Initialize the entire application
 * Called when DOM is ready and Firebase is loaded
 */
async function initializeApp() {
    console.log('🚀 Disney Pin Vault v4.1.0 starting up...');
    showLoadingOverlay(true);
    
    try {
        // Set up all event listeners
        setupEventListeners();
        
        // Set up Firebase auth state listener
        setupAuthListener();
        
        // Set up Phase 4 navigation tabs
        setupPhase4Tabs();
        
        // Set up marketplace tabs
        setupMarketplaceTabs();
        
        // Check for existing guest data
        checkForGuestData();
        
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showNotification('Failed to initialize app. Please refresh the page.', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Check if there's existing guest data in localStorage
 */
function checkForGuestData() {
    const savedGuestData = localStorage.getItem('disneyPins_guest');
    if (savedGuestData) {
        console.log('📀 Found existing guest data');
    }
}

/**
 * Set up Firebase authentication state listener
 * This runs whenever auth state changes (login/logout)
 */
function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Real user is logged in - exit guest mode if active
            if (isGuestMode) {
                await migrateGuestDataToUser(user);
            }
            
            currentUser = user;
            isGuestMode = false;
            console.log('✅ User logged in:', user.email);
            
            // Update UI with user info
            updateUserInterface(user);
            
            // Hide auth modal, show main app
            document.getElementById('authModal').style.display = 'none';
            document.getElementById('appContent').style.display = 'block';
            
            // Load user's pins from Firestore
            await loadUserPinsFromFirestore();
            
            // Set up trade offers listener
            setupTradeOffersListener();
            
            // Update sync status
            updateSyncStatus('connected');
            
            // Pre-load AI model in background
            if (pinRecognizer && !pinRecognizer.isModelReady) {
                pinRecognizer.loadModel().catch(err => {
                    console.warn('Background AI model load:', err);
                });
            }
            
        } else if (!isGuestMode) {
            // No real user and not in guest mode - show auth options with guest button
            console.log('👤 No user logged in, showing guest option');
            showAuthModalWithGuestOption();
        }
    });
}

/**
 * Show authentication modal with guest option
 */
function showAuthModalWithGuestOption() {
    const modal = document.getElementById('authModal');
    const content = document.getElementById('authForms');
    
    if (!modal || !content) return;
    
    // Add guest button if not already present
    const existingGuestBtn = document.getElementById('guestModeBtn');
    if (!existingGuestBtn) {
        const guestButton = document.createElement('button');
        guestButton.id = 'guestModeBtn';
        guestButton.className = 'btn-guest';
        guestButton.innerHTML = '🎮 Continue as Guest';
        guestButton.onclick = startGuestMode;
        
        // Insert after the auth forms
        content.parentNode.insertBefore(guestButton, content.nextSibling);
        
        // Add some spacing and separator
        const separator = document.createElement('div');
        separator.className = 'auth-separator';
        separator.innerHTML = '<span>or</span>';
        content.parentNode.insertBefore(separator, guestButton);
    }
    
    modal.style.display = 'flex';
    document.getElementById('appContent').style.display = 'none';
    
    // Clear any existing pins
    pinsDatabase = [];
    refreshAllUI();
}

/**
 * Start guest mode
 * Allows users to explore the app without signing up
 */
async function startGuestMode() {
    console.log('🎮 Starting guest mode...');
    showLoadingOverlay(true);
    
    try {
        isGuestMode = true;
        currentUser = null;
        
        // Hide auth modal, show app
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('appContent').style.display = 'block';
        
        // Update UI for guest mode
        updateGuestModeUI();
        
        // Load guest data from localStorage
        await loadGuestPins();
        
        // Update sync status for guest mode
        updateSyncStatus('guest');
        
        // Pre-load AI model in background
        if (pinRecognizer && !pinRecognizer.isModelReady) {
            pinRecognizer.loadModel().catch(err => console.warn(err));
        }
        
        showNotification('🎮 You are in Guest Mode. Create an account to save your collection to the cloud!', 'info');
        
    } catch (error) {
        console.error('Guest mode error:', error);
        showNotification('Failed to start guest mode', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Update UI for guest mode
 */
function updateGuestModeUI() {
    // Update user info display
    document.getElementById('userName').textContent = 'Guest User';
    document.getElementById('userAvatar').src = 'https://via.placeholder.com/40?text=👤';
    
    // Add guest indicator badge
    const headerRight = document.querySelector('.header-right');
    let guestBadge = document.getElementById('guestBadge');
    
    if (!guestBadge) {
        guestBadge = document.createElement('div');
        guestBadge.id = 'guestBadge';
        guestBadge.className = 'guest-badge';
        guestBadge.innerHTML = '🎮 Guest Mode';
        headerRight.insertBefore(guestBadge, headerRight.firstChild);
    }
    
    // Add upgrade button to sidebar
    addUpgradePrompt();
    
    // Disable trade features (require account)
    disableTradeFeaturesForGuest();
}

/**
 * Add upgrade prompt to sidebar for guest users
 */
function addUpgradePrompt() {
    const sidebar = document.querySelector('.add-pin-form');
    let upgradePrompt = document.getElementById('guestUpgradePrompt');
    
    if (upgradePrompt) return;
    
    upgradePrompt = document.createElement('div');
    upgradePrompt.id = 'guestUpgradePrompt';
    upgradePrompt.className = 'guest-upgrade-prompt';
    upgradePrompt.innerHTML = `
        <div class="upgrade-card">
            <span class="upgrade-icon">☁️</span>
            <h4>Save Your Collection to the Cloud!</h4>
            <p>Create a free account to sync across devices, trade with others, and never lose your pins.</p>
            <button id="upgradeFromGuestBtn" class="btn-upgrade">Create Free Account →</button>
            <button id="dismissUpgradeBtn" class="btn-dismiss">Remind Me Later</button>
        </div>
    `;
    
    // Insert at the top of the sidebar
    sidebar.insertBefore(upgradePrompt, sidebar.firstChild);
    
    document.getElementById('upgradeFromGuestBtn')?.addEventListener('click', () => {
        showAuthModalWithGuestOption();
    });
    
    document.getElementById('dismissUpgradeBtn')?.addEventListener('click', () => {
        upgradePrompt.style.display = 'none';
        localStorage.setItem('guestUpgradeDismissed', Date.now());
    });
}

/**
 * Disable trade features for guest users
 */
function disableTradeFeaturesForGuest() {
    // Disable trade tabs
    const tradeTab = document.querySelector('[data-tab="trade"]');
    const offersTab = document.querySelector('[data-tab="offers"]');
    
    if (tradeTab) {
        tradeTab.style.opacity = '0.5';
        tradeTab.style.cursor = 'not-allowed';
        tradeTab.title = 'Create an account to use trading features';
        tradeTab.disabled = true;
    }
    
    if (offersTab) {
        offersTab.style.opacity = '0.5';
        offersTab.style.cursor = 'not-allowed';
        offersTab.title = 'Create an account to use trading features';
        offersTab.disabled = true;
    }
    
    // Update trade content to show upgrade message
    const tradeContent = document.getElementById('tradeTab');
    const offersContent = document.getElementById('offersTab');
    
    if (tradeContent && !tradeContent.querySelector('.guest-trade-message')) {
        tradeContent.innerHTML = `
            <div class="guest-feature-message">
                <span class="feature-lock-icon">🔒</span>
                <h3>Trading Features Require an Account</h3>
                <p>Create a free account to:</p>
                <ul>
                    <li>🤝 Trade with other collectors</li>
                    <li>📨 Send and receive trade offers</li>
                    <li>🔍 Find matches for your ISO pins</li>
                </ul>
                <button onclick="showAuthModalWithGuestOption()" class="btn-primary">Create Free Account</button>
            </div>
        `;
    }
    
    if (offersContent && !offersContent.querySelector('.guest-trade-message')) {
        offersContent.innerHTML = `
            <div class="guest-feature-message">
                <span class="feature-lock-icon">🔒</span>
                <h3>Trade Offers Require an Account</h3>
                <p>Sign up to see and respond to trade offers!</p>
                <button onclick="showAuthModalWithGuestOption()" class="btn-primary">Create Free Account</button>
            </div>
        `;
    }
}

/**
 * Load guest pins from localStorage
 */
async function loadGuestPins() {
    const savedPins = localStorage.getItem('disneyPins_guest');
    
    if (savedPins) {
        try {
            pinsDatabase = JSON.parse(savedPins);
            console.log(`📀 Loaded ${pinsDatabase.length} pins from guest storage`);
        } catch (e) {
            console.error('Failed to parse guest data:', e);
            pinsDatabase = [];
        }
    } else {
        // Create sample data for new guest users
        pinsDatabase = getSampleGuestData();
        saveGuestPins();
        console.log('✨ Created sample data for guest user');
    }
    
    refreshAllUI();
}

/**
 * Save guest pins to localStorage
 */
function saveGuestPins() {
    if (isGuestMode) {
        localStorage.setItem('disneyPins_guest', JSON.stringify(pinsDatabase));
        console.log('💾 Guest pins saved to localStorage');
    }
}

/**
 * Get sample data for guest users
 */
function getSampleGuestData() {
    return [
        {
            id: Date.now() + 1,
            name: "Stitch Surfing Hawaii (Sample)",
            collection: "Stitch's Aloha Adventure",
            series: "Beach Break Series",
            pinNumber: 3,
            totalInSeries: 6,
            editionSize: "LE 1500",
            releaseDate: "2023-07-10",
            origin: "Aulani Resort",
            originalPrice: 16.99,
            currentValue: 72.50,
            rarity: "Rare",
            status: "own",
            purchasePrice: 45.00,
            conditionNotes: "Mint condition, original backing card",
            tags: ["Stitch", "Hawaii", "Surf", "Summer", "LE"],
            imageUrl: "https://via.placeholder.com/200x200/764ba2/white?text=Stitch+Sample",
            confirmedFakes: false,
            fakeNotes: "",
            dateAdded: new Date().toISOString()
        },
        {
            id: Date.now() + 2,
            name: "Halloween Mickey (Sample)",
            collection: "Seasonal Series",
            series: "Halloween 2024",
            pinNumber: 1,
            totalInSeries: 4,
            editionSize: "Open Edition",
            releaseDate: "2024-09-01",
            origin: "Disneyland California",
            originalPrice: 12.99,
            currentValue: 15.00,
            rarity: "Common",
            status: "own",
            purchasePrice: 12.99,
            conditionNotes: "New in package",
            tags: ["Mickey", "Halloween", "Holiday", "Pumpkin"],
            imageUrl: "https://via.placeholder.com/200x200/ff6b6b/white?text=Mickey+Sample",
            confirmedFakes: false,
            fakeNotes: "",
            dateAdded: new Date().toISOString()
        },
        {
            id: Date.now() + 3,
            name: "Princess Jasmine Chaser (Sample)",
            collection: "Princess Carousel",
            series: "Chaser Series",
            pinNumber: 5,
            totalInSeries: 8,
            editionSize: "LE 500",
            releaseDate: "2024-03-15",
            origin: "ShopDisney",
            originalPrice: 19.99,
            currentValue: 125.00,
            rarity: "Super Rare",
            status: "iso",
            purchasePrice: 0,
            conditionNotes: "",
            tags: ["Jasmine", "Princess", "Chaser", "Grail", "LE500"],
            imageUrl: "https://via.placeholder.com/200x200/ffd700/white?text=Jasmine+Sample",
            confirmedFakes: true,
            fakeNotes: "Many fakes on eBay - check for glitter eyes",
            dateAdded: new Date().toISOString()
        }
    ];
}

/**
 * Migrate guest data to a real user account
 * @param {firebase.User} user - The authenticated user
 */
async function migrateGuestDataToUser(user) {
    if (!user || pinsDatabase.length === 0) return;
    
    console.log(`🔄 Migrating ${pinsDatabase.length} pins from guest to user ${user.uid}`);
    showLoadingOverlay(true);
    
    let successCount = 0;
    
    for (const pin of pinsDatabase) {
        try {
            const pinData = { ...pin };
            delete pinData.id;
            pinData.userId = user.uid;
            pinData.migratedFromGuest = true;
            
            await db.collection('users')
                .doc(user.uid)
                .collection('pins')
                .doc(pin.id.toString())
                .set(pinData);
            
            successCount++;
        } catch (error) {
            console.error('Migration error for pin:', pin.name, error);
        }
    }
    
    // Clear guest data after successful migration
    if (successCount > 0) {
        localStorage.removeItem('disneyPins_guest');
        showNotification(`✅ Migrated ${successCount} pins to your account!`, 'success');
    }
    
    showLoadingOverlay(false);
}

/**
 * Update UI with user information
 * @param {firebase.User} user - The authenticated user
 */
function updateUserInterface(user) {
    const userName = user.displayName || user.email.split('@')[0];
    document.getElementById('userName').textContent = userName;
    
    if (user.photoURL) {
        document.getElementById('userAvatar').src = user.photoURL;
    } else {
        document.getElementById('userAvatar').src = 'https://via.placeholder.com/40?text=' + userName.charAt(0).toUpperCase();
    }
    
    // Remove guest badge if exists
    const guestBadge = document.getElementById('guestBadge');
    if (guestBadge) guestBadge.remove();
    
    // Remove upgrade prompt if exists
    const upgradePrompt = document.getElementById('guestUpgradePrompt');
    if (upgradePrompt) upgradePrompt.remove();
    
    // Re-enable trade features
    enableTradeFeatures();
}

/**
 * Enable trade features for authenticated users
 */
function enableTradeFeatures() {
    const tradeTab = document.querySelector('[data-tab="trade"]');
    const offersTab = document.querySelector('[data-tab="offers"]');
    
    if (tradeTab) {
        tradeTab.style.opacity = '1';
        tradeTab.style.cursor = 'pointer';
        tradeTab.disabled = false;
        tradeTab.title = '';
    }
    
    if (offersTab) {
        offersTab.style.opacity = '1';
        offersTab.style.cursor = 'pointer';
        offersTab.disabled = false;
        offersTab.title = '';
    }
    
    // Restore original trade content
    const tradeContent = document.getElementById('tradeTab');
    const offersContent = document.getElementById('offersTab');
    
    if (tradeContent && tradeContent.querySelector('.guest-feature-message')) {
        tradeContent.innerHTML = `
            <h2>🤝 Find Trade Matches</h2>
            <div class="trade-matching-section">
                <h3>Your ISO Pins (Wanted)</h3>
                <div id="userISOPins" class="trade-pins-list">
                    <p>Loading your ISO pins...</p>
                </div>
                
                <h3>Collectors Who Have These Pins</h3>
                <div id="tradeMatches" class="trade-matches-list">
                    <p>Looking for matches...</p>
                </div>
            </div>
        `;
    }
    
    if (offersContent && offersContent.querySelector('.guest-feature-message')) {
        offersContent.innerHTML = `
            <h2>💌 Trade Offers</h2>
            
            <div class="offers-section">
                <h3>📨 Incoming Offers</h3>
                <div id="incomingOffers" class="offers-list">
                    <p>No incoming offers</p>
                </div>
            </div>
            
            <div class="offers-section">
                <h3>📤 Outgoing Offers</h3>
                <div id="outgoingOffers" class="offers-list">
                    <p>No outgoing offers</p>
                </div>
            </div>
        `;
    }
}

/**
 * Update cloud sync status indicator
 * @param {string} status - 'connected', 'syncing', 'disconnected', 'guest'
 */
function updateSyncStatus(status) {
    const syncStatus = document.getElementById('syncStatus');
    if (!syncStatus) return;
    
    switch(status) {
        case 'connected':
            syncStatus.innerHTML = '<span class="sync-icon">☁️</span> Synced';
            syncStatus.style.color = '#28a745';
            break;
        case 'syncing':
            syncStatus.innerHTML = '<span class="sync-icon">🔄</span> Syncing...';
            syncStatus.style.color = '#ffc107';
            break;
        case 'disconnected':
            syncStatus.innerHTML = '<span class="sync-icon">⚠️</span> Offline';
            syncStatus.style.color = '#dc3545';
            break;
        case 'guest':
            syncStatus.innerHTML = '<span class="sync-icon">🎮</span> Guest Mode (Local)';
            syncStatus.style.color = '#17a2b8';
            break;
    }
}

// ============================================
// FIRESTORE DATA OPERATIONS (Modified for Guest)
// ============================================

/**
 * Load user's pins from Firestore with real-time listener
 */
async function loadUserPinsFromFirestore() {
    if (!currentUser) return;
    
    showLoadingOverlay(true);
    updateSyncStatus('syncing');
    
    // Clean up existing listener
    if (unsubscribePins) {
        unsubscribePins();
    }
    
    try {
        // Set up real-time listener for pins collection
        unsubscribePins = db.collection('users')
            .doc(currentUser.uid)
            .collection('pins')
            .onSnapshot((snapshot) => {
                pinsDatabase = [];
                
                snapshot.forEach(doc => {
                    const pinData = doc.data();
                    pinsDatabase.push({
                        id: parseInt(doc.id),
                        ...pinData
                    });
                });
                
                // Sort by date added (newest first)
                pinsDatabase.sort((a, b) => {
                    const dateA = a.dateAdded ? new Date(a.dateAdded) : new Date(0);
                    const dateB = b.dateAdded ? new Date(b.dateAdded) : new Date(0);
                    return dateB - dateA;
                });
                
                console.log(`📀 Loaded ${pinsDatabase.length} pins from cloud`);
                
                // Update all UI components
                refreshAllUI();
                updateSyncStatus('connected');
                
            }, (error) => {
                console.error('Firestore error:', error);
                updateSyncStatus('disconnected');
                showNotification('Connection issue. Changes will sync when online.', 'warning');
            });
            
    } catch (error) {
        console.error('Failed to load pins:', error);
        showNotification('Failed to load your collection. Please refresh.', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Save a pin to Firestore (add or update)
 * @param {Object} pin - The pin object to save
 * @returns {Promise<boolean>} Success status
 */
async function savePinToFirestore(pin) {
    if (isGuestMode) {
        // Guest mode - save to localStorage
        const existingIndex = pinsDatabase.findIndex(p => p.id === pin.id);
        if (existingIndex !== -1) {
            pinsDatabase[existingIndex] = pin;
        } else {
            pinsDatabase.push(pin);
        }
        saveGuestPins();
        refreshAllUI();
        return true;
    }
    
    if (!currentUser) return false;
    
    updateSyncStatus('syncing');
    
    try {
        const pinData = { ...pin };
        delete pinData.id;
        
        pinData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('pins')
            .doc(pin.id.toString())
            .set(pinData, { merge: true });
        
        console.log('💾 Pin saved to cloud:', pin.name);
        return true;
        
    } catch (error) {
        console.error('Error saving pin:', error);
        showNotification('Failed to save pin. Check your connection.', 'error');
        updateSyncStatus('disconnected');
        return false;
    }
}

/**
 * Delete a pin from Firestore
 * @param {number} pinId - ID of pin to delete
 * @returns {Promise<boolean>} Success status
 */
async function deletePinFromFirestore(pinId) {
    if (isGuestMode) {
        // Guest mode - remove from localStorage
        pinsDatabase = pinsDatabase.filter(p => p.id !== pinId);
        saveGuestPins();
        refreshAllUI();
        return true;
    }
    
    if (!currentUser) return false;
    
    updateSyncStatus('syncing');
    
    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('pins')
            .doc(pinId.toString())
            .delete();
        
        console.log('🗑️ Pin deleted from cloud');
        
        // Clear from AI cache if exists
        if (pinRecognizer && pinRecognizer.featureCache) {
            pinRecognizer.featureCache.delete(pinId);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error deleting pin:', error);
        showNotification('Failed to delete pin', 'error');
        updateSyncStatus('disconnected');
        return false;
    }
}

// ============================================
// CRUD OPERATIONS (Create, Read, Update, Delete)
// ============================================

/**
 * Add or update a pin from the form
 * @param {Event} event - Form submit event
 */
async function addPinFromForm(event) {
    event.preventDefault();
    
    const imageFile = document.getElementById('imageUpload').files[0];
    const editingId = document.getElementById('editingPinId').value;
    
    // Helper function to process and save after image is ready
    const processAndSave = async (imageUrl) => {
        // Get form values
        const tagsString = document.getElementById('pinTags').value;
        const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t) : [];
        
        const pinData = {
            name: document.getElementById('pinName').value.trim(),
            collection: document.getElementById('pinCollection').value.trim(),
            series: document.getElementById('pinSeries').value.trim(),
            pinNumber: parseInt(document.getElementById('pinNumber').value) || 0,
            totalInSeries: parseInt(document.getElementById('totalInSeries').value) || 0,
            editionSize: document.getElementById('editionSize').value.trim(),
            releaseDate: document.getElementById('releaseDate').value,
            origin: document.getElementById('origin').value,
            originalPrice: parseFloat(document.getElementById('originalPrice').value) || 0,
            currentValue: parseFloat(document.getElementById('currentValue').value) || 0,
            rarity: document.getElementById('rarity').value,
            status: document.getElementById('pinStatus').value,
            purchasePrice: parseFloat(document.getElementById('purchasePrice').value) || 0,
            conditionNotes: document.getElementById('conditionNotes').value,
            tags: tags,
            imageUrl: imageUrl || 'https://via.placeholder.com/200x200?text=No+Image',
            confirmedFakes: document.getElementById('confirmedFakes').checked,
            fakeNotes: document.getElementById('fakeNotes').value,
            dateAdded: new Date().toISOString()
        };
        
        let success;
        
        if (editingId) {
            // UPDATE existing pin
            pinData.id = parseInt(editingId);
            
            // Preserve original date added
            const originalPin = pinsDatabase.find(p => p.id === parseInt(editingId));
            if (originalPin) {
                pinData.dateAdded = originalPin.dateAdded;
            }
            
            success = await savePinToFirestore(pinData);
            if (success) {
                showNotification(`✏️ "${pinData.name}" updated!`, 'success');
                cancelEdit();
            }
        } else {
            // ADD new pin
            pinData.id = Date.now();
            success = await savePinToFirestore(pinData);
            if (success) {
                showNotification(`✨ Added "${pinData.name}" to your collection!`, 'success');
                clearForm();
            }
        }
        
        if (success) {
            // Clear AI cache for this pin if it existed
            if (pinRecognizer && pinRecognizer.featureCache) {
                pinRecognizer.featureCache.delete(pinData.id);
            }
            
            // Refresh marketplace pin selector if open
            if (document.getElementById('marketplacePinSelect') && 
                document.getElementById('marketplaceSection').style.display !== 'none') {
                await loadMarketplacePinSelector();
            }
        }
    };
    
    // Handle image upload if present
    if (imageFile) {
        if (isGuestMode) {
            // Guest mode - handle locally
            const reader = new FileReader();
            reader.onload = async (e) => {
                await processAndSave(e.target.result);
            };
            reader.readAsDataURL(imageFile);
        } else if (currentUser) {
            showLoadingOverlay(true);
            
            try {
                const storageRef = storage.ref();
                const fileExtension = imageFile.name.split('.').pop();
                const fileName = `pins/${currentUser.uid}/${Date.now()}.${fileExtension}`;
                const imageRef = storageRef.child(fileName);
                
                await imageRef.put(imageFile);
                const downloadURL = await imageRef.getDownloadURL();
                
                await processAndSave(downloadURL);
            } catch (error) {
                console.error('Image upload failed:', error);
                showNotification('Failed to upload image. Please try again.', 'error');
            } finally {
                showLoadingOverlay(false);
            }
        }
    } else {
        // No image file, use URL or placeholder
        const imageUrl = document.getElementById('imageUrl').value.trim();
        await processAndSave(imageUrl);
    }
}

/**
 * Clear the add/edit form
 */
function clearForm() {
    document.getElementById('pinForm').reset();
    document.getElementById('pinStatus').value = 'own';
    document.getElementById('rarity').value = 'Common';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImg').src = '';
    document.getElementById('imageUpload').value = '';
    document.getElementById('editingPinId').value = '';
    document.getElementById('formTitle').innerHTML = '➕ Add New Pin';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('submitBtn').innerHTML = '✨ Add Pin to Collection ✨';
}

/**
 * Cancel editing mode
 */
function cancelEdit() {
    clearForm();
    showNotification('Edit cancelled', 'info');
}

/**
 * Load pin data into form for editing
 * @param {number} id - Pin ID to edit
 */
function editPinById(id) {
    const pin = pinsDatabase.find(p => p.id === id);
    if (!pin) {
        showNotification('Pin not found', 'error');
        return;
    }
    
    // Fill form with pin data
    document.getElementById('pinName').value = pin.name;
    document.getElementById('pinCollection').value = pin.collection || '';
    document.getElementById('pinSeries').value = pin.series || '';
    document.getElementById('pinNumber').value = pin.pinNumber || '';
    document.getElementById('totalInSeries').value = pin.totalInSeries || '';
    document.getElementById('editionSize').value = pin.editionSize || '';
    document.getElementById('releaseDate').value = pin.releaseDate || '';
    document.getElementById('origin').value = pin.origin || '';
    document.getElementById('originalPrice').value = pin.originalPrice || '';
    document.getElementById('currentValue').value = pin.currentValue || '';
    document.getElementById('rarity').value = pin.rarity || 'Common';
    document.getElementById('pinStatus').value = pin.status;
    document.getElementById('purchasePrice').value = pin.purchasePrice || '';
    document.getElementById('conditionNotes').value = pin.conditionNotes || '';
    document.getElementById('pinTags').value = (pin.tags || []).join(', ');
    document.getElementById('imageUrl').value = pin.imageUrl || '';
    document.getElementById('confirmedFakes').checked = pin.confirmedFakes || false;
    document.getElementById('fakeNotes').value = pin.fakeNotes || '';
    
    // Show image preview
    if (pin.imageUrl && pin.imageUrl !== 'https://via.placeholder.com/200x200?text=No+Image') {
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('previewImg').src = pin.imageUrl;
    }
    
    // Switch to edit mode
    document.getElementById('formTitle').innerHTML = '✏️ Edit Pin';
    document.getElementById('editingPinId').value = pin.id;
    document.getElementById('cancelEditBtn').style.display = 'block';
    document.getElementById('submitBtn').innerHTML = '💾 Save Changes';
    
    // Scroll to form
    document.querySelector('.add-pin-form').scrollIntoView({ behavior: 'smooth' });
    
    // Switch to add pin tab if not already
    const addTab = document.querySelector('[data-tab="add"]');
    if (addTab && !addTab.classList.contains('active')) {
        addTab.click();
    }
}

/**
 * Delete a pin by ID
 * @param {number} id - Pin ID to delete
 */
async function deletePinById(id) {
    const pinToDelete = pinsDatabase.find(pin => pin.id === id);
    if (!pinToDelete) return;
    
    const confirmDelete = confirm(`Are you sure you want to remove "${pinToDelete.name}"?`);
    
    if (confirmDelete) {
        const success = await deletePinFromFirestore(id);
        if (success) {
            showNotification(`🗑️ Removed "${pinToDelete.name}"`, 'success');
        }
    }
}

// ============================================
// UI RENDERING FUNCTIONS
// ============================================

/**
 * Refresh all UI components
 * Called after data changes
 */
function refreshAllUI() {
    renderAllPins();
    updateStats();
    updateAllTagsList();
    
    // Refresh analytics if visible
    if (document.getElementById('analyticsSection').style.display !== 'none') {
        calculateAnalytics();
    }
    
    // Refresh marketplace selector if visible
    if (document.getElementById('marketplaceSection').style.display !== 'none') {
        loadMarketplacePinSelector();
    }
}

/**
 * Render all pins based on current filters
 */
function renderAllPins() {
    // Apply all filters
    let filteredPins = [...pinsDatabase];
    
    // Filter by status
    if (currentFilter !== 'all') {
        filteredPins = filteredPins.filter(pin => pin.status === currentFilter);
    }
    
    // Filter by search term
    if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        filteredPins = filteredPins.filter(pin => 
            pin.name.toLowerCase().includes(searchLower) ||
            (pin.collection && pin.collection.toLowerCase().includes(searchLower)) ||
            (pin.series && pin.series.toLowerCase().includes(searchLower)) ||
            (pin.tags && pin.tags.some(tag => tag.toLowerCase().includes(searchLower)))
        );
    }
    
    // Filter by active tags
    if (activeTags.length > 0) {
        filteredPins = filteredPins.filter(pin => 
            pin.tags && activeTags.every(activeTag => pin.tags.includes(activeTag))
        );
    }
    
    const pinsGrid = document.getElementById('pinsGrid');
    
    if (filteredPins.length === 0) {
        pinsGrid.innerHTML = '<p class="placeholder-text">✨ No matching pins found. Try adjusting your filters! ✨</p>';
        return;
    }
    
    pinsGrid.innerHTML = '';
    filteredPins.forEach(pin => {
        const pinCard = createPinCard(pin);
        pinsGrid.appendChild(pinCard);
    });
}

/**
 * Create HTML for a single pin card
 * @param {Object} pin - Pin object
 * @returns {HTMLElement} Card element
 */
function createPinCard(pin) {
    const card = document.createElement('div');
    card.className = 'pin-card';
    card.setAttribute('data-pin-id', pin.id);
    
    // Determine status badge styling
    let statusText = '';
    let statusClass = '';
    
    switch(pin.status) {
        case 'own':
            statusText = '✅ I Own This';
            statusClass = 'status-own';
            break;
        case 'trade':
            statusText = '🔄 For Trade';
            statusClass = 'status-trade';
            break;
        case 'iso':
            statusText = '🎯 ISO (Want)';
            statusClass = 'status-iso';
            break;
    }
    
    // Series text
    let seriesText = '';
    if (pin.pinNumber && pin.totalInSeries) {
        seriesText = `${pin.pinNumber} of ${pin.totalInSeries}`;
    }
    
    // Tags HTML
    let tagsHtml = '';
    if (pin.tags && pin.tags.length > 0) {
        tagsHtml = '<div class="pin-tags">' + 
            pin.tags.slice(0, 5).map(tag => `<span class="pin-tag">${escapeHtml(tag)}</span>`).join('') +
            (pin.tags.length > 5 ? `<span class="pin-tag">+${pin.tags.length - 5}</span>` : '') +
            '</div>';
    }
    
    // Fake warning
    let fakeWarning = '';
    if (pin.confirmedFakes) {
        fakeWarning = '<div class="fake-warning" style="color:#dc3545; font-size:10px; margin-top:5px;">⚠️ Fakes reported</div>';
    }
    
    // Value display
    const displayValue = pin.currentValue || pin.purchasePrice || 0;
    const valueHtml = displayValue > 0 ? `<div class="pin-details">💰 $${displayValue.toFixed(2)}</div>` : '';
    
    card.innerHTML = `
        <div class="pin-image-container">
            <img class="pin-image" src="${pin.imageUrl}" alt="${escapeHtml(pin.name)}" 
                 onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">
        </div>
        <div class="pin-info">
            <div class="pin-name">${escapeHtml(pin.name)}</div>
            ${pin.collection ? `<div class="pin-details">📁 ${escapeHtml(pin.collection)}</div>` : ''}
            ${pin.series ? `<div class="pin-details">📚 ${escapeHtml(pin.series)} ${seriesText}</div>` : ''}
            ${pin.editionSize ? `<div class="pin-details">🔢 ${escapeHtml(pin.editionSize)}</div>` : ''}
            ${pin.rarity !== 'Common' ? `<div class="pin-details">⭐ ${pin.rarity}</div>` : ''}
            ${valueHtml}
            ${fakeWarning}
            ${tagsHtml}
            <div class="pin-status-badge ${statusClass}">${statusText}</div>
            <div class="card-buttons">
                <button class="edit-pin-btn" data-id="${pin.id}">✏️ Edit</button>
                <button class="delete-pin-btn" data-id="${pin.id}">🗑️ Remove</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const editBtn = card.querySelector('.edit-pin-btn');
    const deleteBtn = card.querySelector('.delete-pin-btn');
    
    editBtn.addEventListener('click', () => editPinById(pin.id));
    deleteBtn.addEventListener('click', () => deletePinById(pin.id));
    
    return card;
}

/**
 * Update statistics display
 */
function updateStats() {
    // Apply current filters for stats
    let displayedPins = [...pinsDatabase];
    
    if (currentFilter !== 'all') {
        displayedPins = displayedPins.filter(pin => pin.status === currentFilter);
    }
    
    if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        displayedPins = displayedPins.filter(pin => 
            pin.name.toLowerCase().includes(searchLower) ||
            (pin.collection && pin.collection.toLowerCase().includes(searchLower))
        );
    }
    
    const ownedPins = displayedPins.filter(pin => pin.status === 'own');
    const tradePins = displayedPins.filter(pin => pin.status === 'trade');
    const isoPins = displayedPins.filter(pin => pin.status === 'iso');
    
    // Calculate total value
    let totalValue = 0;
    ownedPins.forEach(pin => {
        const value = pin.currentValue || pin.purchasePrice || 0;
        totalValue += value;
    });
    
    // Update stat displays
    const statTotal = document.getElementById('statTotal');
    const statOwn = document.getElementById('statOwn');
    const statTrade = document.getElementById('statTrade');
    const statISO = document.getElementById('statISO');
    const statValue = document.getElementById('statValue');
    
    if (statTotal) statTotal.textContent = displayedPins.length;
    if (statOwn) statOwn.textContent = ownedPins.length;
    if (statTrade) statTrade.textContent = tradePins.length;
    if (statISO) statISO.textContent = isoPins.length;
    if (statValue) statValue.textContent = `$${totalValue.toFixed(0)}`;
}

// ============================================
// TAGS SYSTEM
// ============================================

/**
 * Update the list of all tags for filtering
 */
function updateAllTagsList() {
    // Collect all unique tags
    const allTagsSet = new Set();
    pinsDatabase.forEach(pin => {
        if (pin.tags && pin.tags.length) {
            pin.tags.forEach(tag => allTagsSet.add(tag));
        }
    });
    
    const allTags = Array.from(allTagsSet).sort();
    const container = document.getElementById('allTagsList');
    
    if (!container) return;
    
    if (allTags.length === 0) {
        container.innerHTML = '<small>No tags yet. Add tags to your pins!</small>';
        return;
    }
    
    container.innerHTML = allTags.map(tag => `
        <span class="tag-filter-btn ${activeTags.includes(tag) ? 'active' : ''}" data-tag="${escapeHtml(tag)}">
            ${escapeHtml(tag)} (${getTagCount(tag)})
        </span>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.tag-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            toggleTagFilter(tag);
        });
    });
    
    updateActiveTagsDisplay();
}

/**
 * Get count of pins with a specific tag
 * @param {string} tag - Tag name
 * @returns {number} Count
 */
function getTagCount(tag) {
    return pinsDatabase.filter(pin => pin.tags && pin.tags.includes(tag)).length;
}

/**
 * Toggle a tag filter on/off
 * @param {string} tag - Tag to toggle
 */
function toggleTagFilter(tag) {
    if (activeTags.includes(tag)) {
        activeTags = activeTags.filter(t => t !== tag);
    } else {
        activeTags.push(tag);
    }
    
    renderAllPins();
    updateAllTagsList();
    
    const clearBtn = document.getElementById('clearAllTagsBtn');
    if (clearBtn) {
        clearBtn.style.display = activeTags.length > 0 ? 'block' : 'none';
    }
}

/**
 * Update the display of active tags
 */
function updateActiveTagsDisplay() {
    const container = document.getElementById('activeTagsContainer');
    if (!container) return;
    
    if (activeTags.length === 0) {
        container.innerHTML = '<small>No active tag filters. Click tags below to filter.</small>';
        return;
    }
    
    container.innerHTML = activeTags.map(tag => `
        <span class="active-tag">
            ${escapeHtml(tag)}
            <span class="remove-tag" data-tag="${escapeHtml(tag)}">✖</span>
        </span>
    `).join('');
    
    // Add remove listeners
    document.querySelectorAll('.remove-tag').forEach(removeBtn => {
        removeBtn.addEventListener('click', () => {
            const tag = removeBtn.getAttribute('data-tag');
            toggleTagFilter(tag);
        });
    });
}

/**
 * Clear all active tag filters
 */
function clearAllTags() {
    activeTags = [];
    renderAllPins();
    updateAllTagsList();
    const clearBtn = document.getElementById('clearAllTagsBtn');
    if (clearBtn) clearBtn.style.display = 'none';
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

/**
 * Set up search input event listeners
 */
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        renderAllPins();
        updateStats();
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchTerm = '';
            renderAllPins();
            updateStats();
        });
    }
}

/**
 * Set up filter button event listeners
 */
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterValue = button.getAttribute('data-filter');
            currentFilter = filterValue;
            
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            renderAllPins();
            updateStats();
        });
    });
}

// ============================================
// IMAGE PREVIEW
// ============================================

/**
 * Set up image preview for file uploads and URLs
 */
function setupImagePreview() {
    const imageUpload = document.getElementById('imageUpload');
    const imageUrl = document.getElementById('imageUrl');
    const previewDiv = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const clearBtn = document.getElementById('clearImageBtn');
    
    if (!imageUpload || !imageUrl) return;
    
    imageUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewDiv.style.display = 'block';
                imageUrl.value = '';
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
    
    imageUrl.addEventListener('input', (e) => {
        if (e.target.value) {
            previewImg.src = e.target.value;
            previewDiv.style.display = 'block';
            imageUpload.value = '';
        }
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            previewDiv.style.display = 'none';
            previewImg.src = '';
            imageUpload.value = '';
            imageUrl.value = '';
        });
    }
}

/**
 * Set up tag suggestion clicks
 */
function setupTagSuggestions() {
    const suggestions = document.querySelectorAll('.suggestion-tag');
    const tagsInput = document.getElementById('pinTags');
    
    if (!suggestions.length || !tagsInput) return;
    
    suggestions.forEach(tag => {
        tag.addEventListener('click', () => {
            const tagName = tag.getAttribute('data-tag');
            const currentTags = tagsInput.value;
            
            if (currentTags) {
                const tagsArray = currentTags.split(',').map(t => t.trim());
                if (!tagsArray.includes(tagName)) {
                    tagsInput.value = currentTags + ', ' + tagName;
                }
            } else {
                tagsInput.value = tagName;
            }
        });
    });
}

// ============================================
// IMPORT/EXPORT
// ============================================

/**
 * Export collection to JSON file
 */
function exportCollection() {
    if (!pinsDatabase.length) {
        showNotification('No pins to export', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(pinsDatabase, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `disney-pins-backup-${date}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification(`📥 Exported ${pinsDatabase.length} pins!`, 'success');
}

/**
 * Import collection from JSON file
 * @param {File} file - JSON file to import
 */
async function importCollection(file) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const importedPins = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedPins)) {
                throw new Error('Invalid format: expected array');
            }
            
            // Validate each pin has required fields
            const validPins = importedPins.filter(pin => pin.name && pin.id);
            
            if (validPins.length === 0) {
                throw new Error('No valid pins found in file');
            }
            
            // Check for duplicates by ID
            const existingIds = new Set(pinsDatabase.map(p => p.id));
            const newPins = validPins.filter(p => !existingIds.has(p.id));
            
            if (newPins.length === 0) {
                showNotification('All pins already exist in your collection', 'info');
                return;
            }
            
            // Save each new pin to Firestore or localStorage
            let successCount = 0;
            for (const pin of newPins) {
                const success = await savePinToFirestore(pin);
                if (success) successCount++;
            }
            
            showNotification(`📤 Imported ${successCount} new pins!`, 'success');
            
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Invalid JSON file. Please check the format.', 'error');
        }
    };
    
    reader.readAsText(file);
}

// ============================================
// TRADING SYSTEM (Phase 3)
// ============================================

/**
 * Set up trade offers real-time listener
 */
function setupTradeOffersListener() {
    if (!currentUser) return;
    
    if (unsubscribeTrades) {
        unsubscribeTrades();
    }
    
    // Listen for incoming offers
    unsubscribeTrades = db.collection('trades')
        .where('toUserId', '==', currentUser.uid)
        .where('status', 'in', ['pending', 'countered'])
        .onSnapshot((snapshot) => {
            displayIncomingOffers(snapshot);
        }, (error) => {
            console.error('Trade listener error:', error);
        });
}

/**
 * Find trade matches for user's ISO pins
 */
async function findTradeMatches() {
    if (!currentUser || !pinsDatabase.length) return;
    
    const isoPins = pinsDatabase.filter(pin => pin.status === 'iso');
    const container = document.getElementById('tradeMatches');
    const isoContainer = document.getElementById('userISOPins');
    
    if (!container || !isoContainer) return;
    
    if (isoPins.length === 0) {
        isoContainer.innerHTML = '<p>No ISO pins yet. Add pins with status "ISO" to find trades!</p>';
        container.innerHTML = '<p>Add some ISO pins to see matches</p>';
        return;
    }
    
    // Display user's ISO pins
    isoContainer.innerHTML = isoPins.map(pin => `
        <div class="pin-select-item">
            <img src="${pin.imageUrl}" alt="${escapeHtml(pin.name)}" onerror="this.src='https://via.placeholder.com/40'">
            <div>
                <strong>${escapeHtml(pin.name)}</strong>
                <small>${escapeHtml(pin.collection || '')}</small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = '<p>🔍 Searching for collectors with these pins...</p>';
    
    try {
        // Query for users who have these pins for trade
        const isoPinNames = isoPins.map(p => p.name.toLowerCase());
        const matches = [];
        
        // Get other users (limit to 20 for performance)
        const usersSnapshot = await db.collection('users').limit(20).get();
        
        for (const userDoc of usersSnapshot.docs) {
            if (userDoc.id === currentUser.uid) continue;
            
            const userData = userDoc.data();
            
            // Get user's for-trade pins
            const userPinsSnapshot = await db.collection('users')
                .doc(userDoc.id)
                .collection('pins')
                .where('status', '==', 'trade')
                .get();
            
            const matchingPins = [];
            userPinsSnapshot.forEach(pinDoc => {
                const pin = pinDoc.data();
                if (isoPinNames.includes(pin.name.toLowerCase())) {
                    matchingPins.push(pin);
                }
            });
            
            if (matchingPins.length > 0) {
                matches.push({
                    userId: userDoc.id,
                    userName: userData.displayName || 'Anonymous Collector',
                    pins: matchingPins,
                    yourISO: isoPins.filter(p => 
                        matchingPins.some(mp => mp.name.toLowerCase() === p.name.toLowerCase())
                    )
                });
            }
        }
        
        if (matches.length === 0) {
            container.innerHTML = '<p>No matches found yet. Check back later or add more ISO pins!</p>';
            return;
        }
        
        container.innerHTML = matches.map(match => `
            <div class="trade-match-card">
                <div class="trade-match-header">
                    <span class="trade-user">👤 ${escapeHtml(match.userName)}</span>
                    <button class="btn-propose-trade" data-userid="${match.userId}">💌 Propose Trade</button>
                </div>
                <div class="match-details">
                    <strong>Has for trade:</strong>
                    ${match.pins.map(p => `<span class="pin-tag">${escapeHtml(p.name)}</span>`).join('')}
                </div>
                <div class="match-details">
                    <strong>You want:</strong>
                    ${match.yourISO.map(p => `<span class="pin-tag">${escapeHtml(p.name)}</span>`).join('')}
                </div>
            </div>
        `).join('');
        
        // Add event listeners to propose buttons
        document.querySelectorAll('.btn-propose-trade').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetUserId = btn.getAttribute('data-userid');
                openTradeProposalModal(targetUserId);
            });
        });
        
    } catch (error) {
        console.error('Error finding trades:', error);
        container.innerHTML = '<p>Error finding matches. Please try again.</p>';
    }
}

/**
 * Display incoming trade offers
 * @param {firebase.firestore.QuerySnapshot} snapshot - Firestore snapshot
 */
async function displayIncomingOffers(snapshot) {
    const container = document.getElementById('incomingOffers');
    if (!container) return;
    
    if (snapshot.empty) {
        container.innerHTML = '<p>No incoming trade offers</p>';
        return;
    }
    
    const offers = [];
    
    for (const doc of snapshot.docs) {
        const offer = doc.data();
        offer.id = doc.id;
        
        try {
            // Get sender info
            const senderDoc = await db.collection('users').doc(offer.fromUserId).get();
            const senderData = senderDoc.data();
            
            // Get offered pin details
            const offeredPins = await Promise.all((offer.offeredPinIds || []).map(async (pinId) => {
                const pinDoc = await db.collection('users')
                    .doc(offer.fromUserId)
                    .collection('pins')
                    .doc(pinId.toString())
                    .get();
                return { id: pinId, ...pinDoc.data() };
            }));
            
            // Get requested pin details
            const requestedPins = await Promise.all((offer.requestedPinIds || []).map(async (pinId) => {
                const pinDoc = await db.collection('users')
                    .doc(currentUser.uid)
                    .collection('pins')
                    .doc(pinId.toString())
                    .get();
                return { id: pinId, ...pinDoc.data() };
            }));
            
            offers.push({
                ...offer,
                senderName: senderData?.displayName || offer.fromUserId,
                offeredPins: offeredPins.filter(p => p.name),
                requestedPins: requestedPins.filter(p => p.name)
            });
            
        } catch (err) {
            console.warn('Error loading offer details:', err);
        }
    }
    
    container.innerHTML = offers.map(offer => `
        <div class="offer-card">
            <div class="trade-match-header">
                <span class="trade-user">From: ${escapeHtml(offer.senderName)}</span>
                <div class="offer-buttons">
                    <button class="btn-accept-offer" data-offerid="${offer.id}">✅ Accept</button>
                    <button class="btn-decline-offer" data-offerid="${offer.id}">❌ Decline</button>
                </div>
            </div>
            <div><strong>They offer:</strong> ${offer.offeredPins.map(p => `<span class="pin-tag">${escapeHtml(p.name)}</span>`).join('')}</div>
            <div><strong>They want:</strong> ${offer.requestedPins.map(p => `<span class="pin-tag">${escapeHtml(p.name)}</span>`).join('')}</div>
            <div><small>Status: ${offer.status}</small></div>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.btn-accept-offer').forEach(btn => {
        btn.addEventListener('click', () => respondToTrade(btn.getAttribute('data-offerid'), 'accepted'));
    });
    document.querySelectorAll('.btn-decline-offer').forEach(btn => {
        btn.addEventListener('click', () => respondToTrade(btn.getAttribute('data-offerid'), 'declined'));
    });
}

/**
 * Respond to a trade offer
 * @param {string} tradeId - Trade document ID
 * @param {string} response - 'accepted' or 'declined'
 */
async function respondToTrade(tradeId, response) {
    if (!currentUser) return;
    
    try {
        await db.collection('trades').doc(tradeId).update({
            status: response,
            respondedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`Trade ${response}!`, 'success');
        
        if (response === 'accepted') {
            showNotification('Contact the trader to arrange shipping!', 'info');
        }
        
    } catch (error) {
        console.error('Error responding to trade:', error);
        showNotification('Failed to respond to trade', 'error');
    }
}

/**
 * Open trade proposal modal
 * @param {string} targetUserId - User ID to propose trade with
 */
function openTradeProposalModal(targetUserId) {
    currentTradeTarget = targetUserId;
    const modal = document.getElementById('tradeModal');
    const content = document.getElementById('tradeModalContent');
    
    if (!modal || !content) return;
    
    const tradePins = pinsDatabase.filter(pin => pin.status === 'trade');
    
    content.innerHTML = `
        <div class="trade-proposal-container">
            <div class="trade-pins-section">
                <h4>Your pins (for trade)</h4>
                <div id="myTradePins" class="trade-pins-list">
                    ${tradePins.length === 0 ? '<p>You have no pins marked "For Trade"</p>' : 
                        tradePins.map(pin => `
                            <div class="pin-select-item" data-pinid="${pin.id}" data-type="my">
                                <img src="${pin.imageUrl}" onerror="this.src='https://via.placeholder.com/40'">
                                <div>
                                    <strong>${escapeHtml(pin.name)}</strong>
                                    <small>${escapeHtml(pin.collection || '')}</small>
                                </div>
                                <span class="select-indicator"></span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
            <div class="trade-pins-section">
                <h4>Pins you want (select from their collection)</h4>
                <div id="theirTradePins" class="trade-pins-list">
                    <p>Loading their for-trade pins...</p>
                </div>
            </div>
            <button id="sendTradeProposalBtn" class="btn-primary" disabled>Send Trade Proposal</button>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Load target user's trade pins
    loadUserTradePins(targetUserId);
    
    // Track selections
    let selectedMyPins = [];
    let selectedTheirPins = [];
    
    // Wait for DOM to update then add selection logic
    setTimeout(() => {
        const myPinsContainer = document.getElementById('myTradePins');
        const theirPinsContainer = document.getElementById('theirTradePins');
        const sendBtn = document.getElementById('sendTradeProposalBtn');
        
        const updateSendButton = () => {
            sendBtn.disabled = selectedMyPins.length === 0 || selectedTheirPins.length === 0;
        };
        
        if (myPinsContainer) {
            myPinsContainer.querySelectorAll('.pin-select-item').forEach(item => {
                item.addEventListener('click', () => {
                    const pinId = item.getAttribute('data-pinid');
                    if (selectedMyPins.includes(pinId)) {
                        selectedMyPins = selectedMyPins.filter(id => id !== pinId);
                        item.classList.remove('selected');
                    } else {
                        selectedMyPins.push(pinId);
                        item.classList.add('selected');
                    }
                    updateSendButton();
                });
            });
        }
        
        // Delegate for their pins (loaded async)
        const checkTheirPinsInterval = setInterval(() => {
            if (theirPinsContainer && theirPinsContainer.querySelectorAll('.pin-select-item').length > 0) {
                clearInterval(checkTheirPinsInterval);
                theirPinsContainer.querySelectorAll('.pin-select-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const pinId = item.getAttribute('data-pinid');
                        if (selectedTheirPins.includes(pinId)) {
                            selectedTheirPins = selectedTheirPins.filter(id => id !== pinId);
                            item.classList.remove('selected');
                        } else {
                            selectedTheirPins.push(pinId);
                            item.classList.add('selected');
                        }
                        updateSendButton();
                    });
                });
            }
        }, 100);
        
        sendBtn.addEventListener('click', async () => {
            await proposeTrade(targetUserId, selectedMyPins, selectedTheirPins);
        });
    }, 100);
}

/**
 * Load another user's trade pins
 * @param {string} userId - User ID to load pins for
 */
async function loadUserTradePins(userId) {
    const container = document.getElementById('theirTradePins');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('users')
            .doc(userId)
            .collection('pins')
            .where('status', '==', 'trade')
            .get();
        
        const pins = [];
        snapshot.forEach(doc => {
            pins.push({ id: doc.id, ...doc.data() });
        });
        
        if (pins.length === 0) {
            container.innerHTML = '<p>This collector has no pins marked "For Trade"</p>';
        } else {
            container.innerHTML = pins.map(pin => `
                <div class="pin-select-item" data-pinid="${pin.id}" data-type="their">
                    <img src="${pin.imageUrl}" onerror="this.src='https://via.placeholder.com/40'">
                    <div>
                        <strong>${escapeHtml(pin.name)}</strong>
                        <small>${escapeHtml(pin.collection || '')}</small>
                    </div>
                    <span class="select-indicator"></span>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error loading user pins:', error);
        container.innerHTML = '<p>Error loading pins</p>';
    }
}

/**
 * Propose a trade to another user
 * @param {string} toUserId - Recipient user ID
 * @param {Array} offeredPinIds - Pins offered by current user
 * @param {Array} requestedPinIds - Pins requested from recipient
 */
async function proposeTrade(toUserId, offeredPinIds, requestedPinIds) {
    if (!currentUser) return;
    
    showLoadingOverlay(true);
    
    try {
        const tradeData = {
            fromUserId: currentUser.uid,
            toUserId: toUserId,
            offeredPinIds: offeredPinIds,
            requestedPinIds: requestedPinIds,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('trades').add(tradeData);
        
        showNotification('Trade proposal sent! The other collector will be notified.', 'success');
        closeModal('tradeModal');
        
        // Switch to offers tab
        const offersTab = document.querySelector('[data-tab="offers"]');
        if (offersTab) offersTab.click();
        
    } catch (error) {
        console.error('Error proposing trade:', error);
        showNotification('Failed to send trade proposal', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// ============================================
// PHASE 4: ANALYTICS DASHBOARD
// ============================================

/**
 * Calculate and display analytics
 */
function calculateAnalytics() {
    if (!pinsDatabase.length) {
        document.getElementById('totalValue').innerHTML = '$0';
        document.getElementById('avgValue').innerHTML = '$0';
        document.getElementById('rarestPin').innerHTML = 'None';
        document.getElementById('completionRate').innerHTML = '0%';
        return;
    }
    
    const ownedPins = pinsDatabase.filter(p => p.status === 'own');
    
    // Total value
    const totalValue = ownedPins.reduce((sum, pin) => {
        return sum + (pin.currentValue || pin.purchasePrice || 0);
    }, 0);
    document.getElementById('totalValue').innerHTML = `$${totalValue.toFixed(2)}`;
    document.getElementById('avgValue').innerHTML = `$${(totalValue / (ownedPins.length || 1)).toFixed(2)}`;
    
    // Rarest pin
    const rarityOrder = { 'Grail': 5, 'Super Rare': 4, 'Rare': 3, 'Uncommon': 2, 'Common': 1 };
    const rarestPin = [...ownedPins].sort((a, b) => 
        (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0)
    )[0];
    document.getElementById('rarestPin').innerHTML = rarestPin ? rarestPin.name : 'None';
    
    // Collection completion (series-based)
    const seriesMap = new Map();
    ownedPins.forEach(pin => {
        if (pin.series && pin.totalInSeries && pin.pinNumber) {
            const key = `${pin.series}|${pin.collection || ''}`;
            if (!seriesMap.has(key)) {
                seriesMap.set(key, { total: pin.totalInSeries, owned: new Set() });
            }
            seriesMap.get(key).owned.add(pin.pinNumber);
        }
    });
    
    let totalCompletion = 0;
    seriesMap.forEach(series => {
        totalCompletion += (series.owned.size / series.total) * 100;
    });
    const avgCompletion = seriesMap.size ? totalCompletion / seriesMap.size : 0;
    document.getElementById('completionRate').innerHTML = `${Math.round(avgCompletion)}%`;
    const completionBar = document.getElementById('completionBar');
    if (completionBar) completionBar.style.width = `${avgCompletion}%`;
    
    // Rarity distribution
    const rarityCounts = { 'Common': 0, 'Uncommon': 0, 'Rare': 0, 'Super Rare': 0, 'Grail': 0 };
    ownedPins.forEach(pin => {
        const rarity = pin.rarity || 'Common';
        if (rarityCounts[rarity] !== undefined) {
            rarityCounts[rarity]++;
        } else {
            rarityCounts['Common']++;
        }
    });
    if (analyticsCharts) analyticsCharts.createRarityChart(rarityCounts);
    
    // Origin distribution
    const originCounts = {};
    ownedPins.forEach(pin => {
        const origin = pin.origin || 'Unknown';
        originCounts[origin] = (originCounts[origin] || 0) + 1;
    });
    if (analyticsCharts) analyticsCharts.createOriginChart(originCounts);
    
    // Tags distribution (top 10)
    const tagCounts = {};
    ownedPins.forEach(pin => {
        if (pin.tags) {
            pin.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });
    if (analyticsCharts) analyticsCharts.createTagsChart(tagCounts);
    
    // Value history (simulated for demo)
    const valueHistory = generateValueHistory(ownedPins);
    if (analyticsCharts) analyticsCharts.createValueHistoryChart(valueHistory);
    
    // Generate insights
    generateInsights(ownedPins, totalValue);
    
    // Most valuable pins
    displayMostValuablePins(ownedPins);
    
    // Completion recommendations
    displayCompletionRecommendations(seriesMap);
}

/**
 * Generate simulated value history
 * @param {Array} ownedPins - Owned pins array
 * @returns {Object} History data
 */
function generateValueHistory(ownedPins) {
    const months = [];
    const values = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        months.push(date.toLocaleDateString('default', { month: 'short', year: 'numeric' }));
        
        let total = 0;
        ownedPins.forEach(pin => {
            let value = pin.currentValue || pin.purchasePrice || 0;
            // Simulate slight variation for demo
            const variance = 0.95 + (Math.random() * 0.1);
            total += value * variance;
        });
        values.push(total);
    }
    
    return { dates: months, values: values };
}

/**
 * Generate AI insights about collection
 * @param {Array} ownedPins - Owned pins
 * @param {number} totalValue - Total collection value
 */
function generateInsights(ownedPins, totalValue) {
    const insights = [];
    const insightsDiv = document.getElementById('insightsList');
    if (!insightsDiv) return;
    
    // Most common tag
    const tagCounts = {};
    ownedPins.forEach(pin => {
        if (pin.tags) {
            pin.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];
    if (topTag) {
        insights.push(`🏷️ Your most common tag is "${topTag[0]}" (${topTag[1]} pins)`);
    }
    
    // Most collected origin
    const originCounts = {};
    ownedPins.forEach(pin => {
        const origin = pin.origin || 'Unknown';
        originCounts[origin] = (originCounts[origin] || 0) + 1;
    });
    const topOrigin = Object.entries(originCounts).sort((a, b) => b[1] - a[1])[0];
    if (topOrigin && topOrigin[0] !== 'Unknown') {
        insights.push(`📍 Most pins from: ${topOrigin[0]} (${topOrigin[1]} pins)`);
    }
    
    // Recent growth
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const recentPins = ownedPins.filter(pin => {
        if (!pin.dateAdded) return false;
        return new Date(pin.dateAdded) > monthAgo;
    }).length;
    insights.push(`📈 Added ${recentPins} pins in the last month!`);
    
    // High value pins
    const highValuePins = ownedPins.filter(p => (p.currentValue || 0) > 100);
    if (highValuePins.length > 0) {
        insights.push(`💰 You have ${highValuePins.length} pin${highValuePins.length > 1 ? 's' : ''} worth over $100!`);
    }
    
    // Average value
    const avgValue = totalValue / (ownedPins.length || 1);
    if (avgValue > 50) {
        insights.push(`✨ Your pins average $${avgValue.toFixed(0)} each - impressive collection!`);
    }
    
    insightsDiv.innerHTML = insights.map(insight => `<div class="insight-item">${insight}</div>`).join('');
}

/**
 * Display most valuable pins
 * @param {Array} ownedPins - Owned pins array
 */
function displayMostValuablePins(ownedPins) {
    const container = document.getElementById('mostValuablePins');
    if (!container) return;
    
    const valuable = [...ownedPins]
        .sort((a, b) => (b.currentValue || b.purchasePrice || 0) - (a.currentValue || a.purchasePrice || 0))
        .slice(0, 5);
    
    container.innerHTML = valuable.map((pin, index) => `
        <div class="valuable-pin-item">
            <div class="rank">#${index + 1}</div>
            <img src="${pin.imageUrl}" alt="${escapeHtml(pin.name)}" onerror="this.src='https://via.placeholder.com/50'">
            <div class="valuable-info">
                <strong>${escapeHtml(pin.name)}</strong>
                <small>${escapeHtml(pin.collection || '')}</small>
            </div>
            <div class="valuable-price">$${(pin.currentValue || pin.purchasePrice || 0).toFixed(2)}</div>
        </div>
    `).join('');
}

/**
 * Display series completion recommendations
 * @param {Map} seriesMap - Map of series data
 */
function displayCompletionRecommendations(seriesMap) {
    const container = document.getElementById('completionRecommendations');
    if (!container) return;
    
    const recommendations = [];
    
    for (const [key, data] of seriesMap.entries()) {
        const missing = data.total - data.owned.size;
        if (missing > 0 && missing <= 3) {
            const seriesName = key.split('|')[0];
            recommendations.push(`
                <div class="recommendation-item">
                    🎯 You're missing ${missing} pin${missing > 1 ? 's' : ''} from "${escapeHtml(seriesName)}" series
                </div>
            `);
        }
    }
    
    if (recommendations.length === 0) {
        container.innerHTML = '<p>Great job! You\'ve completed all your series!</p>';
    } else {
        container.innerHTML = recommendations.join('');
    }
}

// ============================================
// PHASE 4: AI SCANNER
// ============================================

let currentStream = null;
let html5QrCode = null;

/**
 * Start camera for AI scanning
 */
async function startCamera() {
    const preview = document.getElementById('scannerPreview');
    const video = document.getElementById('cameraVideo');
    
    if (!preview || !video) return;
    
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = currentStream;
        preview.style.display = 'block';
        
        // Hide QR scanner if visible
        const qrContainer = document.getElementById('qrScannerContainer');
        if (qrContainer) qrContainer.style.display = 'none';
        
    } catch (error) {
        console.error('Camera error:', error);
        showNotification('Could not access camera. Please check permissions.', 'error');
    }
}

/**
 * Stop the camera
 */
function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    const preview = document.getElementById('scannerPreview');
    if (preview) preview.style.display = 'none';
    const video = document.getElementById('cameraVideo');
    if (video) video.srcObject = null;
}

/**
 * Capture photo from camera for AI identification
 */
async function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('scannerCanvas');
    
    if (!video || !canvas) return;
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    await identifyPinFromImage(imageDataUrl);
    
    stopCamera();
}

/**
 * Handle uploaded image file for AI identification
 * @param {File} file - Image file
 */
async function handleImageUpload(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        await identifyPinFromImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

/**
 * Identify pin from image using AI
 * @param {string} imageDataUrl - Base64 image data
 */
async function identifyPinFromImage(imageDataUrl) {
    if (!pinRecognizer) {
        showNotification('AI model not loaded. Please wait.', 'warning');
        return;
    }
    
    if (!pinRecognizer.isModelReady) {
        showNotification('Loading AI model... Please wait.', 'info');
        await pinRecognizer.loadModel();
    }
    
    showNotification('🔍 Analyzing image...', 'info');
    
    try {
        const matches = await pinRecognizer.findMatchingPins(imageDataUrl, pinsDatabase);
        displayAIResults(matches);
    } catch (error) {
        console.error('AI identification error:', error);
        showNotification('Failed to identify pin. Try a clearer image with better lighting.', 'error');
    }
}

/**
 * Display AI identification results
 * @param {Array} matches - Array of matches from AI
 */
function displayAIResults(matches) {
    const resultsDiv = document.getElementById('aiResults');
    const matchedPinsDiv = document.getElementById('matchedPins');
    const warningDiv = document.getElementById('confidenceWarning');
    
    if (!resultsDiv || !matchedPinsDiv || !warningDiv) return;
    
    if (!matches || matches.length === 0) {
        matchedPinsDiv.innerHTML = '<p>No matching pins found in your collection.</p>';
        warningDiv.innerHTML = '<p>💡 Tip: Add this pin to your collection first, then try scanning again!</p>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    const topMatches = matches.slice(0, 3);
    
    matchedPinsDiv.innerHTML = topMatches.map(match => {
        const confidenceLabel = pinRecognizer.getConfidenceLabel(match.confidence);
        return `
            <div class="match-card" style="border-left: 4px solid ${confidenceLabel.color}">
                <img src="${match.pin.imageUrl}" alt="${match.pin.name}" onerror="this.src='https://via.placeholder.com/80'">
                <div class="match-info">
                    <strong>${escapeHtml(match.pin.name)}</strong>
                    <div>Confidence: ${match.confidencePercent}%</div>
                    <div style="color: ${confidenceLabel.color}">${confidenceLabel.text}</div>
                    <div class="match-actions">
                        <button onclick="viewPinDetails(${match.pin.id})">📖 View Pin</button>
                        ${match.pin.status !== 'own' ? `<button onclick="quickAddToCollection(${match.pin.id})">➕ Add to Collection</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (matches[0].confidence < 0.6) {
        warningDiv.innerHTML = '<p>⚠️ Low confidence match. Try taking a clearer photo with better lighting.</p>';
    } else {
        warningDiv.innerHTML = '';
    }
    
    resultsDiv.style.display = 'block';
}

/**
 * View pin details (scroll to pin in collection)
 * @param {number} pinId - Pin ID
 */
function viewPinDetails(pinId) {
    // Switch to collection tab
    const collectionTab = document.querySelector('[data-phase4="collection"]');
    if (collectionTab) collectionTab.click();
    
    setTimeout(() => {
        const pinCard = document.querySelector(`.pin-card[data-pin-id="${pinId}"]`);
        if (pinCard) {
            pinCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            pinCard.style.animation = 'highlight 1s';
            setTimeout(() => {
                pinCard.style.animation = '';
            }, 1000);
        }
    }, 500);
}

/**
 * Quick add a pin to collection from AI match
 * @param {number} pinId - Pin ID to copy
 */
function quickAddToCollection(pinId) {
    const existingPin = pinsDatabase.find(p => p.id === pinId);
    if (existingPin) {
        editPinById(pinId);
        document.getElementById('pinStatus').value = 'own';
        document.getElementById('purchasePrice').value = '';
        document.getElementById('formTitle').innerHTML = '➕ Add Pin (Copy from AI Match)';
        document.getElementById('submitBtn').innerHTML = '✨ Add to My Collection ✨';
        showNotification('Pin data loaded. Adjust status if needed, then click Add.', 'info');
        
        // Switch to add pin tab
        const addTab = document.querySelector('[data-tab="add"]');
        if (addTab) addTab.click();
    }
}

/**
 * Start QR code scanner
 */
async function startQRScanner() {
    const container = document.getElementById('qrScannerContainer');
    if (!container) return;
    
    container.style.display = 'block';
    
    try {
        html5QrCode = new Html5Qrcode("qrReader");
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onQRCodeScanned,
            (error) => { /* Silent fail */ }
        );
    } catch (error) {
        console.error('QR Scanner error:', error);
        showNotification('Could not start QR scanner', 'error');
        container.style.display = 'none';
    }
}

/**
 * Handle QR code scan result
 * @param {string} decodedText - Scanned text
 */
function onQRCodeScanned(decodedText) {
    console.log('QR Scanned:', decodedText);
    
    // Try to parse as pin ID
    const pinId = parseInt(decodedText);
    if (!isNaN(pinId)) {
        const pin = pinsDatabase.find(p => p.id === pinId);
        if (pin) {
            viewPinDetails(pinId);
            showNotification(`Found: ${pin.name}`, 'success');
            stopQRScanner();
            return;
        }
    }
    
    // Search by text
    showNotification(`Searching for: ${decodedText}`, 'info');
    document.getElementById('searchInput').value = decodedText;
    currentSearchTerm = decodedText;
    renderAllPins();
    
    stopQRScanner();
    
    // Switch to collection tab
    const collectionTab = document.querySelector('[data-phase4="collection"]');
    if (collectionTab) collectionTab.click();
}

/**
 * Stop QR scanner
 */
async function stopQRScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        await html5QrCode.stop();
        html5QrCode = null;
    }
    const container = document.getElementById('qrScannerContainer');
    if (container) container.style.display = 'none';
}

// ============================================
// PHASE 4: MARKETPLACE INTEGRATION
// ============================================

/**
 * Load pin selector dropdown for marketplace
 */
async function loadMarketplacePinSelector() {
    const select = document.getElementById('marketplacePinSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select a pin from your collection --</option>';
    
    pinsDatabase.forEach(pin => {
        const option = document.createElement('option');
        option.value = pin.id;
        option.textContent = pin.name.length > 50 ? pin.name.substring(0, 47) + '...' : pin.name;
        select.appendChild(option);
    });
}

/**
 * Search marketplace listings for selected pin
 */
async function searchMarketplaceListings() {
    const select = document.getElementById('marketplacePinSelect');
    const pinId = parseInt(select.value);
    
    if (!pinId) {
        showNotification('Please select a pin first', 'warning');
        return;
    }
    
    const pin = pinsDatabase.find(p => p.id === pinId);
    if (!pin) return;
    
    showNotification(`🔍 Searching for "${pin.name}"...`, 'info');
    showLoadingOverlay(true);
    
    try {
        // Search eBay
        const ebayListings = await priceAPI.searchEBay(pin.name);
        displayEBayListings(ebayListings);
        
        // Search Mercari
        const mercariListings = await priceAPI.searchMercari(pin.name);
        displayMercariListings(mercariListings);
        
        // Get sold comps
        const soldComps = await priceAPI.getSoldComps(pin.name);
        displaySoldComps(soldComps, pin);
        
        // Generate price history
        const priceTrend = priceAPI.analyzePriceTrend(soldComps);
        displayPriceHistory(soldComps, priceTrend);
        
    } catch (error) {
        console.error('Marketplace search error:', error);
        showNotification('Error searching marketplace', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Display eBay listings
 * @param {Array} listings - eBay listings
 */
function displayEBayListings(listings) {
    const container = document.getElementById('ebayListingsGrid');
    if (!container) return;
    
    if (!listings || listings.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No active eBay listings found</p>';
        return;
    }
    
    container.innerHTML = listings.map(listing => `
        <div class="listing-card">
            <img src="${listing.imageUrl}" alt="${listing.title}" onerror="this.src='https://via.placeholder.com/80'">
            <div class="listing-info">
                <h4>${escapeHtml(listing.title)}</h4>
                <div class="listing-price">$${listing.price}</div>
                <div class="listing-details">
                    <span>${listing.condition}</span>
                    <span>Shipping: $${listing.shipping}</span>
                    <span>Seller: ${listing.seller}</span>
                </div>
                <a href="${listing.url}" target="_blank" class="btn-view" rel="noopener noreferrer">View on eBay →</a>
            </div>
        </div>
    `).join('');
}

/**
 * Display Mercari listings
 * @param {Array} listings - Mercari listings
 */
function displayMercariListings(listings) {
    const container = document.getElementById('mercariListingsGrid');
    if (!container) return;
    
    if (!listings || listings.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No active Mercari listings found</p>';
        return;
    }
    
    container.innerHTML = listings.map(listing => `
        <div class="listing-card">
            <div class="listing-info">
                <h4>${escapeHtml(listing.title)}</h4>
                <div class="listing-price">$${listing.price}</div>
                <div class="listing-details">
                    <span>${listing.condition}</span>
                    <span>❤️ ${listing.likes} likes</span>
                    <span>${listing.location}</span>
                </div>
                <a href="${listing.url}" target="_blank" class="btn-view" rel="noopener noreferrer">View on Mercari →</a>
            </div>
        </div>
    `).join('');
}

/**
 * Display sold comps for a pin
 * @param {Array} comps - Sold comps data
 * @param {Object} pin - Pin object
 */
function displaySoldComps(comps, pin) {
    const container = document.getElementById('soldCompsList');
    if (!container) return;
    
    if (!comps || comps.length === 0) {
        container.innerHTML = '<p>No sold comps available</p>';
        return;
    }
    
    const trend = priceAPI.analyzePriceTrend(comps);
    
    // Create chart
    if (analyticsCharts) analyticsCharts.createSoldCompsChart(comps);
    
    // Display list
    container.innerHTML = `
        <div class="trend-summary ${trend.trend.includes('Rising') ? 'trend-up' : trend.trend.includes('Falling') ? 'trend-down' : ''}">
            <div class="trend-indicator">${trend.trend}</div>
            <div>Average price: $${trend.averagePrice}</div>
            <div>3-month change: ${trend.percentChange > 0 ? '+' : ''}${trend.percentChange}%</div>
            <div>${trend.message}</div>
        </div>
        <div class="comps-list">
            <div class="comp-header">
                <span>Date</span><span>Price</span><span>Condition</span><span>Platform</span>
            </div>
            ${comps.slice().reverse().slice(0, 10).map(comp => `
                <div class="comp-item">
                    <span>${comp.date}</span>
                    <span>$${comp.price}</span>
                    <span>${comp.condition}</span>
                    <span>${comp.platform}</span>
                </div>
            `).join('')}
        </div>
        <button id="updateValueFromComps" class="btn-secondary">Update Pin Value to $${trend.averagePrice}</button>
    `;
    
    const updateBtn = document.getElementById('updateValueFromComps');
    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            pin.currentValue = parseFloat(trend.averagePrice);
            await savePinToFirestore(pin);
            showNotification(`Updated ${pin.name} value to $${trend.averagePrice}`, 'success');
            refreshAllUI();
        });
    }
}

/**
 * Display price history and predictions
 * @param {Array} comps - Historical comps
 * @param {Object} trend - Trend analysis
 */
function displayPriceHistory(comps, trend) {
    const prediction = priceAPI.predictFutureValue(comps);
    
    const historyData = {
        dates: comps.map(c => c.date),
        prices: comps.map(c => parseFloat(c.price)),
        trendLine: comps.map((_, i) => {
            const prices = comps.map(c => parseFloat(c.price));
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            return avg;
        })
    };
    
    if (analyticsCharts) analyticsCharts.createPriceHistoryChart(historyData);
    
    const predictionDiv = document.getElementById('pricePrediction');
    if (!predictionDiv) return;
    
    if (prediction) {
        predictionDiv.innerHTML = `
            <div class="prediction-card">
                <h4>📊 Price Prediction (Next 3 Months)</h4>
                <div class="prediction-trend">Trend: ${prediction.trend}</div>
                <div class="prediction-values">
                    ${prediction.predictions.map(p => `
                        <div class="prediction-month">
                            <strong>${p.month} month${p.month > 1 ? 's' : ''}</strong>
                            <div>$${p.price}</div>
                            <small>${p.date}</small>
                        </div>
                    `).join('')}
                </div>
                <div class="confidence">Confidence: ${prediction.confidence}%</div>
                <div class="recommendation">${prediction.recommendation}</div>
                <small>Based on historical data. Past performance doesn't guarantee future results.</small>
            </div>
        `;
    } else {
        predictionDiv.innerHTML = '<p class="placeholder-text">Insufficient data for prediction. Need at least 6 months of sales history.</p>';
    }
}

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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Auth buttons
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    
    if (loginBtn) loginBtn.addEventListener('click', loginWithEmail);
    if (signupBtn) signupBtn.addEventListener('click', signUpWithEmail);
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', loginWithGoogle);
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
    
    if (showSignup) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'block';
        });
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
        });
    }
    
    // Form submission
    const pinForm = document.getElementById('pinForm');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');
    const clearAllTagsBtn = document.getElementById('clearAllTagsBtn');
    
    if (pinForm) pinForm.addEventListener('submit', addPinFromForm);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);
    if (exportBtn) exportBtn.addEventListener('click', exportCollection);
    if (clearAllTagsBtn) clearAllTagsBtn.addEventListener('click', clearAllTags);
    
    if (importFile) {
        importFile.addEventListener('change', (e) => {
            if (e.target.files[0]) importCollection(e.target.files[0]);
        });
    }
    
    // Import trigger button
    const importLabel = document.querySelector('label[for="importFile"]');
    if (importLabel) {
        importLabel.addEventListener('click', () => {
            if (importFile) importFile.click();
        });
    }
    
    // Form tabs
    const formTabs = document.querySelectorAll('.form-tab');
    formTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            formTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const addPinTab = document.getElementById('addPinTab');
            const tradeTab = document.getElementById('tradeTab');
            const offersTab = document.getElementById('offersTab');
            
            if (addPinTab) addPinTab.style.display = tabName === 'add' ? 'block' : 'none';
            if (tradeTab) tradeTab.style.display = tabName === 'trade' ? 'block' : 'none';
            if (offersTab) offersTab.style.display = tabName === 'offers' ? 'block' : 'none';
            
            if (tabName === 'trade' && !isGuestMode) {
                findTradeMatches();
            }
        });
    });
    
    // Search and filters
    setupSearch();
    setupFilters();
    setupImagePreview();
    setupTagSuggestions();
    
    // Scanner buttons
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    const capturePhotoBtn = document.getElementById('capturePhotoBtn');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const imageUploadScanner = document.getElementById('imageUploadScanner');
    const scanQRBtn = document.getElementById('scanQRBtn');
    const stopQRScannerBtn = document.getElementById('stopQRScanner');
    
    if (startCameraBtn) startCameraBtn.addEventListener('click', startCamera);
    if (stopCameraBtn) stopCameraBtn.addEventListener('click', stopCamera);
    if (capturePhotoBtn) capturePhotoBtn.addEventListener('click', capturePhoto);
    if (scanQRBtn) scanQRBtn.addEventListener('click', startQRScanner);
    if (stopQRScannerBtn) stopQRScannerBtn.addEventListener('click', stopQRScanner);
    
    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', () => {
            if (imageUploadScanner) imageUploadScanner.click();
        });
    }
    
    if (imageUploadScanner) {
        imageUploadScanner.addEventListener('change', (e) => {
            if (e.target.files[0]) handleImageUpload(e.target.files[0]);
        });
    }
    
    // Marketplace buttons
    const searchMarketplaceBtn = document.getElementById('searchMarketplaceBtn');
    if (searchMarketplaceBtn) searchMarketplaceBtn.addEventListener('click', searchMarketplaceListings);
    
    // Modal close
    const closeTradeModal = document.getElementById('closeTradeModal');
    if (closeTradeModal) {
        closeTradeModal.addEventListener('click', () => closeModal('tradeModal'));
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ============================================
// PHASE 4 TAB SETUP
// ============================================

/**
 * Set up Phase 4 navigation tabs
 */
function setupPhase4Tabs() {
    const tabs = document.querySelectorAll('.phase4-tab');
    const sections = {
        collection: document.getElementById('collectionSection'),
        scanner: document.getElementById('scannerSection'),
        analytics: document.getElementById('analyticsSection'),
        marketplace: document.getElementById('marketplaceSection')
    };
    
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            const sectionName = tab.getAttribute('data-phase4');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Hide all sections
            Object.values(sections).forEach(section => {
                if (section) section.style.display = 'none';
            });
            
            // Show selected section
            if (sections[sectionName]) {
                sections[sectionName].style.display = 'block';
                
                // Load data when tab is opened
                if (sectionName === 'analytics') {
                    calculateAnalytics();
                } else if (sectionName === 'marketplace') {
                    await loadMarketplacePinSelector();
                } else if (sectionName === 'scanner') {
                    // Pre-load AI model
                    if (pinRecognizer && !pinRecognizer.isModelReady) {
                        pinRecognizer.loadModel().catch(err => console.warn(err));
                    }
                }
            }
        });
    });
}

/**
 * Set up marketplace sub-tabs
 */
function setupMarketplaceTabs() {
    const tabs = document.querySelectorAll('.marketplace-tab');
    const contents = {
        ebay: document.getElementById('ebayListings'),
        mercari: document.getElementById('mercariListings'),
        sold: document.getElementById('soldComps'),
        priceHistory: document.getElementById('priceHistory')
    };
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-marketplace');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            Object.values(contents).forEach(content => {
                if (content) content.style.display = 'none';
            });
            
            if (contents[tabName]) {
                contents[tabName].style.display = 'block';
            }
        });
    });
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Login with email/password
 */
async function loginWithEmail() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Please enter email and password', 'warning');
        return;
    }
    
    showLoadingOverlay(true);
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showNotification('Welcome back!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        let message = 'Login failed. ';
        if (error.code === 'auth/user-not-found') message += 'User not found.';
        else if (error.code === 'auth/wrong-password') message += 'Wrong password.';
        else if (error.code === 'auth/invalid-email') message += 'Invalid email format.';
        else message += error.message;
        showNotification(message, 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Sign up with email/password
 */
async function signUpWithEmail() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!name || !email || !password) {
        showNotification('Please fill all fields', 'warning');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'warning');
        return;
    }
    
    showLoadingOverlay(true);
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        showNotification('Account created! Welcome to Disney Pin Vault!', 'success');
    } catch (error) {
        console.error('Signup error:', error);
        let message = 'Signup failed. ';
        if (error.code === 'auth/email-already-in-use') message += 'Email already in use.';
        else if (error.code === 'auth/weak-password') message += 'Password too weak.';
        else message += error.message;
        showNotification(message, 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Login with Google
 */
async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    showLoadingOverlay(true);
    
    try {
        await auth.signInWithPopup(provider);
        showNotification('Signed in with Google!', 'success');
    } catch (error) {
        console.error('Google login error:', error);
        showNotification('Google sign-in failed. Please try again.', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Logout user
 */
async function logoutUser() {
    try {
        await auth.signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// ============================================
// START THE APPLICATION
// ============================================

// Make functions available globally for HTML onclick handlers
window.viewPinDetails = viewPinDetails;
window.quickAddToCollection = quickAddToCollection;
window.showAuthModalWithGuestOption = showAuthModalWithGuestOption;
window.startGuestMode = startGuestMode;

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', initializeApp);
