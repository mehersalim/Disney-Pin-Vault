/**
 * Developer: Meher Salim
 * File: js/storage.js
 * Description:
 * Backup and restore: export the collection to a JSON file and import it back.
 *
 * Loaded as a plain <script> before script.js (see index.html), so everything
 * here shares one global scope with the other script files.
 */

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
            // Check and clean the file first (see validate-import.js)
            const result = validateImport(e.target.result);
            if (!result.ok) {
                throw new Error(result.errors[0]);
            }
            const validPins = result.pins;
            if (result.skipped.length > 0) {
                console.warn(`Skipped ${result.skipped.length} invalid pins:`, result.skipped);
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
            
            const skippedNote = result.skipped.length > 0 ? ` (${result.skipped.length} invalid skipped)` : '';
            showNotification(`📤 Imported ${successCount} new pins!${skippedNote}`, 'success');
            
        } catch (error) {
            console.error('Import error:', error);
            showNotification(`Import failed: ${error.message}`, 'error');
        }
    };
    
    reader.readAsText(file);
}
