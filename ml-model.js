/**
 * Developer: Meher salim
 * File: ml-model.js
 * Description:
 * ML Model - AI Pin Recognition
 * This file handles AI-powered pin identification using TensorFlow.js
 * and the MobileNet pre-trained model.
 * 
 * HOW IT WORKS:
 * 1. Loads MobileNet (lightweight image classification model)
 * 2. Extracts a 1024-number embedding (feature vector) from each pin image
 * 3. Compares the scanned image to the pins in YOUR collection using cosine similarity
 * 4. Returns matches ranked by similarity score
 *
 * NOTE: MobileNet was trained on generic ImageNet photos, not Disney pins.
 * Scores are a similarity ranking within your own collection, not a guarantee
 * of identification. See README for measured accuracy.
 *
 * REQUIREMENTS:
 * - TensorFlow.js library loaded in HTML
 * - MobileNet model (loaded automatically from CDN)
 */

class PinRecognizer {
    constructor() {
        this.model = null;
        this.isModelLoading = false;
        this.isModelReady = false;
        this.featureCache = new Map(); // Cache pin features for faster matching
        this.modelLoadPromise = null;
    }
    
    /**
     * Load the MobileNet model
     * Called once when the app starts or when first needed
     * @returns {Promise<boolean>} True if loaded successfully
     */
    async loadModel() {
        // If already ready, return immediately
        if (this.isModelReady) return true;
        
        // If already loading, wait for that promise
        if (this.modelLoadPromise) return this.modelLoadPromise;
        
        this.isModelLoading = true;
        
        // Create promise so multiple calls can wait
        this.modelLoadPromise = this._loadModelInternal();
        
        return this.modelLoadPromise;
    }
    
    async _loadModelInternal() {
        console.log('🤖 Loading AI model (MobileNet)...');
        
        try {
            // Check if mobilenet is available
            if (typeof mobilenet === 'undefined') {
                throw new Error('MobileNet library not loaded. Check script tags.');
            }
            
            // Load the model (this downloads ~5MB file)
            this.model = await mobilenet.load({
                version: 2,
                alpha: 1.0
            });
            
            this.isModelReady = true;
            console.log('✅ AI model loaded successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load AI model:', error);
            this.isModelReady = false;
            throw error;
            
        } finally {
            this.isModelLoading = false;
            this.modelLoadPromise = null;
        }
    }
    
    /**
     * Extract an embedding (1024 numbers) from an image.
     * Passing `true` to infer() returns the embedding layer instead of
     * the 1000 ImageNet class probabilities.
     * @param {HTMLImageElement|HTMLVideoElement} imageElement
     * @returns {Promise<Float32Array>} Embedding vector
     */
    async extractFeatures(imageElement) {
        if (!this.isModelReady) {
            await this.loadModel();
        }

        let embedding;
        try {
            embedding = this.model.infer(imageElement, true);
            // Copy the values out, then free the tensor to avoid a memory leak
            return await embedding.data();
        } catch (error) {
            console.error('Feature extraction failed:', error);
            throw error;
        } finally {
            if (embedding) embedding.dispose();
        }
    }

    /**
     * Preprocess image for model input
     * Resizes to 224x224 and center crops to maintain aspect ratio
     * @param {HTMLImageElement|HTMLVideoElement} input 
     * @returns {HTMLImageElement} Processed image
     */
    preprocessImage(input) {
        // Create hidden canvas for processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // MobileNet expects 224x224 input
        const targetSize = 224;
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        // Get source dimensions
        let sourceWidth = input.width || input.videoWidth;
        let sourceHeight = input.height || input.videoHeight;
        
        if (sourceWidth === 0 || sourceHeight === 0) {
            throw new Error('Invalid image dimensions');
        }
        
        // Calculate center crop
        const cropSize = Math.min(sourceWidth, sourceHeight);
        const cropX = (sourceWidth - cropSize) / 2;
        const cropY = (sourceHeight - cropSize) / 2;
        
        // Draw and scale to target size
        ctx.drawImage(
            input, 
            cropX, cropY, cropSize, cropSize,  // Source crop
            0, 0, targetSize, targetSize       // Destination size
        );
        
        // Create new image from canvas data
        const processedImage = new Image();
        processedImage.src = canvas.toDataURL('image/jpeg', 0.9);
        
        return processedImage;
    }
    
    /**
     * Calculate cosine similarity between two feature vectors
     * Range: -1 (opposite) to 1 (identical). MobileNet embeddings are
     * non-negative, so scores here land between 0 and 1.
     * @param {Float32Array|Array} features1 
     * @param {Float32Array|Array} features2 
     * @returns {number} Raw cosine similarity
     */
    cosineSimilarity(features1, features2) {
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        
        for (let i = 0; i < features1.length; i++) {
            dotProduct += features1[i] * features2[i];
            magnitude1 += features1[i] * features1[i];
            magnitude2 += features2[i] * features2[i];
        }
        
        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        
        return dotProduct / (magnitude1 * magnitude2);
    }
    
    /**
     * Find matching pins for an uploaded image
     * @param {string} imageUrl - URL or dataURL of the image to identify
     * @param {Array} pinsDatabase - List of pins to search against
     * @returns {Promise<Array>} Matches sorted by confidence (highest first)
     */
    async findMatchingPins(imageUrl, pinsDatabase) {
        if (!this.isModelReady) {
            await this.loadModel();
        }
        
        if (!pinsDatabase || pinsDatabase.length === 0) {
            return [];
        }
        
        console.log(`🔍 Analyzing image against ${pinsDatabase.length} pins...`);
        
        // Load and process query image
        const img = await this.loadImage(imageUrl);
        const processedImg = this.preprocessImage(img);
        
        // Wait for image to load completely
        await new Promise((resolve, reject) => {
            if (processedImg.complete && processedImg.naturalWidth > 0) {
                resolve();
            } else {
                processedImg.onload = resolve;
                processedImg.onerror = reject;
            }
        });
        
        // Extract query features
        const queryFeatures = await this.extractFeatures(processedImg);
        
        // Compare with each pin in database
        const matches = [];
        let processedCount = 0;
        
        for (const pin of pinsDatabase) {
            processedCount++;
            
            // Show progress every 10 pins
            if (processedCount % 10 === 0) {
                console.log(`Progress: ${processedCount}/${pinsDatabase.length}`);
            }
            
            // Check if we have cached features for this pin
            let pinFeatures = this.featureCache.get(pin.id);
            
            if (!pinFeatures && pin.imageUrl && pin.imageUrl !== 'https://via.placeholder.com/200x200?text=No+Image') {
                try {
                    // Load and extract pin image features
                    const pinImg = await this.loadImage(pin.imageUrl);
                    const processedPinImg = this.preprocessImage(pinImg);
                    
                    await new Promise((resolve, reject) => {
                        if (processedPinImg.complete && processedPinImg.naturalWidth > 0) {
                            resolve();
                        } else {
                            processedPinImg.onload = resolve;
                            processedPinImg.onerror = reject;
                        }
                    });
                    
                    pinFeatures = await this.extractFeatures(processedPinImg);
                    this.featureCache.set(pin.id, pinFeatures);
                    
                } catch (error) {
                    console.warn(`Could not process pin ${pin.id} (${pin.name}):`, error.message);
                    continue;
                }
            }
            
            if (pinFeatures) {
                const similarity = this.cosineSimilarity(queryFeatures, pinFeatures);
                matches.push({
                    pin: pin,
                    confidence: similarity,
                    confidencePercent: Math.max(0, Math.round(similarity * 100))
                });
            }
        }
        
        // Sort by confidence (highest first)
        matches.sort((a, b) => b.confidence - a.confidence);
        
        console.log(`✅ Found ${matches.length} matches. Top confidence: ${matches[0]?.confidencePercent || 0}%`);

        // Debug view: see the top 5 raw scores (used to tune the thresholds)
        console.table(matches.slice(0, 5).map(m => ({
            pin: m.pin.name,
            similarity: m.confidence.toFixed(3)
        })));
        
        return matches;
    }
    
    /**
     * Load image from URL
     * @param {string} url - Image URL or data URL
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Required for cross-origin images
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Failed to load image: ${url.substring(0, 50)}...`));
            img.src = url;
        });
    }
    
    /**
     * Get human-readable confidence label and color
     * @param {number} confidence - Confidence score (0-1)
     * @returns {Object} { text, color }
     */
    getConfidenceLabel(confidence) {
        // Provisional thresholds from a small test: the exact same photo scored
        // 1.00, while different pins and a new photo of the same pin scored ~0.59-0.67.
        // To be re-tuned after the larger accuracy evaluation.
        if (confidence > 0.90) {
            return { text: '🎯 Very High Match', color: '#28a745' };
        }
        if (confidence > 0.80) {
            return { text: '✅ Good Match', color: '#17a2b8' };
        }
        if (confidence > 0.70) {
            return { text: '🤔 Possible Match', color: '#ffc107' };
        }
        if (confidence > 0.50) {
            return { text: '⚠️ Low Confidence', color: '#fd7e14' };
        }
        return { text: '❌ No Match Found', color: '#dc3545' };
    }
    
    /**
     * Clear the feature cache (useful after adding/updating pins)
     */
    clearCache() {
        const cacheSize = this.featureCache.size;
        this.featureCache.clear();
        console.log(`🧹 Cleared feature cache (${cacheSize} entries)`);
    }
    
    /**
     * Get model status for UI
     * @returns {Object} Model status info
     */
    getModelStatus() {
        return {
            isReady: this.isModelReady,
            isLoading: this.isModelLoading,
            cachedFeatures: this.featureCache.size
        };
    }
}

// Create global instance for use throughout the app
const pinRecognizer = new PinRecognizer();

// Auto-load model in background (don't block UI)
pinRecognizer.loadModel().catch(err => {
    console.warn('Background model load failed:', err);
});
