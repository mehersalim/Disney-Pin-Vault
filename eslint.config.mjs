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
    validateImport: 'readonly'
};

export default [
    { ignores: ['node_modules/**', 'docs/**'] },
    js.configs.recommended,
    {
        // Browser scripts
        files: ['*.js'],
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
