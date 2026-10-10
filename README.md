# 🏰 Disney Pin Vault - Complete Disney Pin Collection Manager

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Firebase](https://img.shields.io/badge/firebase-ready-orange.svg)](https://firebase.google.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow.js-AI-purple.svg)](https://www.tensorflow.org/js)

A full-featured web application for Disney pin collectors to track, trade, and treasure their collection. Built with vanilla JavaScript, Firebase, and TensorFlow.js.

## Features

> **Status:** Collection management, search, trading and cloud sync are working features. The Marketplace panel and the "Value Over Time" chart currently run on **simulated demo data** (labeled in the app). Live eBay/Mercari integration is planned.

### Collection Management
- Add, edit, and delete pins with detailed information
- Track pins by status: Own, For Trade, or ISO (In Search Of)
- Upload images (local files or URLs)
- Tag system with auto-suggestions

### Search & Filter
- Search by name, collection, series, or tags
- Filter by status (Own/Trade/ISO)
- Filter by custom tags
- Sort and organize your collection

### AI Pin Scanner
- Take photos or upload images to identify pins
- TensorFlow.js MobileNet for image recognition
- Confidence scores for matches
- QR/Barcode scanning for pin packaging

### Analytics Dashboard
- Total collection value (from the values you enter)
- Rarity distribution charts
- Origin breakdown
- Most valuable pins ranking
- Series completion tracking
- Collection insights generated from your data
- *Demo data:* the "Value Over Time" chart uses simulated history (real snapshots planned)

### Marketplace Preview (Demo mode: simulated data)
- Simulated eBay and Mercari listings, sold comps, and price history to demonstrate the UI
- Trend analysis and a simple linear-regression projection, run on the simulated data (not financial advice)
- Live marketplace integration is planned; it needs a server-side API key
- Controlled by `USE_MOCK_DATA` in `price-api.js`

### Trading System
- Find collectors with your ISO pins
- Propose and respond to trade offers
- Real-time trade notifications
- Offer management dashboard

### Cloud Sync
- Firebase authentication (Email/Google)
- Cross-device synchronization
- Offline support with auto-sync
- Backup and restore (JSON import/export)

## Live Demo

https://mehersalim.github.io/Disney-Pin-Vault/

## Screenshots

| Collection View | AI Scanner | Analytics |
|----------------|------------|-----------|
| (Add screenshot) | (Add screenshot) | (Add screenshot) |

## Technologies Used

| Technology | Purpose |
|------------|---------|
| HTML5/CSS3 | Structure & styling |
| JavaScript (ES6+) | Application logic |
| Firebase | Auth, Firestore DB, Storage |
| TensorFlow.js | AI image recognition |
| Chart.js | Data visualization |
| day.js | Date manipulation |
| html5-qrcode | QR/Barcode scanning |

## Prerequisites

- Node.js (optional, for local server)
- Modern web browser (Chrome, Firefox, Safari)
- Firebase account (free tier works)

## Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/disney-pin-vault.git
cd disney-pin-vault
