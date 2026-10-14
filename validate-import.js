/**
 * Developer: Meher Salim
 * File: validate-import.js
 * Description:
 * Checks and cleans a backup file before pins are imported.
 * Never trusts the file: every pin is rebuilt from known fields only,
 * so unexpected data (extra keys, wrong types, huge lists) can't get into the app.
 */

const IMPORT_LIMITS = {
    maxPins: 1000,
    maxNameLength: 200,
    maxTextLength: 2000,
    maxImageUrlLength: 8000000, // photos are stored as long base64 strings
    maxTags: 30,
    maxTagLength: 50
};

const IMPORT_STATUSES = ['own', 'trade', 'iso'];
const IMPORT_RARITIES = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Grail'];

function cleanText(value, maxLength = IMPORT_LIMITS.maxTextLength) {
    return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function cleanNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Rebuild one pin from known fields only.
 * @param {*} raw - One item from the imported file
 * @returns {{pin: Object|null, reason: string|null}}
 */
function cleanImportedPin(raw) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { pin: null, reason: 'not a pin object' };
    }
    if (!Number.isInteger(raw.id) || raw.id < 0) {
        return { pin: null, reason: 'missing or invalid id' };
    }
    if (typeof raw.name !== 'string' || raw.name.trim() === '') {
        return { pin: null, reason: 'missing name' };
    }

    const tags = Array.isArray(raw.tags)
        ? raw.tags
            .filter(tag => typeof tag === 'string' && tag.trim() !== '')
            .map(tag => tag.trim().slice(0, IMPORT_LIMITS.maxTagLength))
            .slice(0, IMPORT_LIMITS.maxTags)
        : [];

    return {
        pin: {
            id: raw.id,
            name: raw.name.trim().slice(0, IMPORT_LIMITS.maxNameLength),
            collection: cleanText(raw.collection),
            series: cleanText(raw.series),
            pinNumber: cleanNumber(raw.pinNumber),
            totalInSeries: cleanNumber(raw.totalInSeries),
            editionSize: cleanText(raw.editionSize),
            releaseDate: cleanText(raw.releaseDate),
            origin: cleanText(raw.origin),
            originalPrice: cleanNumber(raw.originalPrice),
            currentValue: cleanNumber(raw.currentValue),
            rarity: IMPORT_RARITIES.includes(raw.rarity) ? raw.rarity : 'Common',
            status: IMPORT_STATUSES.includes(raw.status) ? raw.status : 'own',
            purchasePrice: cleanNumber(raw.purchasePrice),
            conditionNotes: cleanText(raw.conditionNotes),
            tags: tags,
            imageUrl: cleanText(raw.imageUrl, IMPORT_LIMITS.maxImageUrlLength),
            confirmedFakes: raw.confirmedFakes === true,
            fakeNotes: cleanText(raw.fakeNotes),
            dateAdded: typeof raw.dateAdded === 'string' && !Number.isNaN(Date.parse(raw.dateAdded))
                ? raw.dateAdded
                : new Date().toISOString()
        },
        reason: null
    };
}

/**
 * Validate and clean the text of an imported backup file.
 * @param {string} text - Raw file contents
 * @returns {{ok: boolean, pins: Array, skipped: Array<{index: number, reason: string}>, errors: string[]}}
 */
function validateImport(text) {
    const fail = (message) => ({ ok: false, pins: [], skipped: [], errors: [message] });

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        return fail('File is not valid JSON.');
    }

    if (!Array.isArray(parsed)) {
        return fail('Expected a list of pins.');
    }
    if (parsed.length > IMPORT_LIMITS.maxPins) {
        return fail(`Too many pins (limit is ${IMPORT_LIMITS.maxPins}).`);
    }

    const pins = [];
    const skipped = [];
    parsed.forEach((raw, index) => {
        const result = cleanImportedPin(raw);
        if (result.pin) {
            pins.push(result.pin);
        } else {
            skipped.push({ index, reason: result.reason });
        }
    });

    if (pins.length === 0) {
        return fail('No valid pins found in file.');
    }

    return { ok: true, pins, skipped, errors: [] };
}

// Lets tests import this in Node. In the browser `module` doesn't exist, so this is skipped.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateImport, IMPORT_LIMITS };
}
