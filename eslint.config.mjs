import js from '@eslint/js';
import globals from 'globals';

// Names that one script file defines and another file uses.
// (The files are plain <script> tags, so they all share one global scope.)
const sharedGlobals = {
    // loaded from CDN <script> tags in index.html
    firebase: 'readonly',
    tf: 'readonly',
    mobilenet: 'readonly',
    Chart: 'readonly',
    Html5Qrcode: 'readonly',
    dayjs: 'readonly',
    // defined in our own files
    auth: 'readonly',
    db: 'readonly',
    storage: 'readonly',
    priceAPI: 'readonly',
    pinRecognizer: 'readonly',
    analyticsCharts: 'readonly',
    validateImport: 'readonly',
    // helpers in js/utils.js
    escapeHtml: 'readonly',
    showNotification: 'readonly',
    showLoadingOverlay: 'readonly',
    closeModal: 'readonly',
    makePlaceholderImage: 'readonly',
    isPlaceholderImage: 'readonly',
    safeImageUrl: 'readonly',
    NO_IMAGE_URL: 'readonly',
    // backup and restore in js/storage.js
    exportCollection: 'readonly',
    importCollection: 'readonly',
    // defined in script.js, used by js/storage.js
    pinsDatabase: 'writable',
    savePinToFirestore: 'readonly'
};

export default [
    { ignores: ['node_modules/**', 'docs/**'] },
    js.configs.recommended,
    {
        // Browser scripts
        files: ['*.js', 'js/**/*.js'],
        languageOptions: {
            sourceType: 'script',
            globals: { ...globals.browser, ...sharedGlobals, module: 'writable' }
        },
        rules: {
            // Top-level functions are shared between files, so only check unused variables inside functions
            'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
            // Style rules: warnings only, so they never fail the build
            'eqeqeq': ['warn', 'always'],
            'prefer-const': 'warn',
            'no-var': 'warn',
            // The file that defines a shared name would otherwise clash with the list above
            'no-redeclare': ['error', { builtinGlobals: false }]
        }
    },
    {
        // Tests run in Node and use import statements
        files: ['tests/**/*.js'],
        languageOptions: { sourceType: 'module', globals: globals.node }
    }
];
