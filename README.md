# ⚡ ESP32 Partition Table UI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/nimish-nirmal/esp32-partition-table-ui)](https://github.com/nimish-nirmal/esp32-partition-table-ui/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/nimish-nirmal/esp32-partition-table-ui)](https://github.com/nimish-nirmal/esp32-partition-table-ui/issues)
[![Deploy to GitHub Pages](https://github.com/nimish-nirmal/esp32-partition-table-ui/actions/workflows/deploy.yml/badge.svg)](https://github.com/nimish-nirmal/esp32-partition-table-ui/actions/workflows/deploy.yml)
[![PWA](https://img.shields.io/badge/PWA-ready-orange.svg)](manifest.json)

A browser-based, interactive tool to design, visualize, and export ESP32 partition table CSV files. Built with vanilla JavaScript and styled with a dark GitHub-inspired theme.

**🔗 Live Demo:** [https://nimish-nirmal.github.io/esp32-partition-table-ui/](https://nimish-nirmal.github.io/esp32-partition-table-ui/)

---

## 📑 Table of Contents

- [Features](#-features)
- [File Structure](#-file-structure)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
  - [Flash Size Selection](#flash-size-selection)
  - [Partition Table Offset](#partition-table-offset)
  - [Built-in Presets](#built-in-presets)
  - [Quick Add Partitions](#quick-add-partitions)
  - [Partition Types & Subtypes](#partition-types--subtypes)
  - [Alignment Rules](#alignment-rules)
  - [OTA Configuration](#ota-configuration)
  - [CSV Import & Export](#csv-import--export)
  - [Flash Command Generation](#flash-command-generation)
  - [Color Legend](#color-legend)
- [Deployment](#-deployment-github-pages)
- [Tech Stack](#-tech-stack)
- [Browser Support](#-browser-support)
- [Contributing](#-contributing)
- [Changelog](#-changelog)
- [License](#-license)
- [Credits](#-credits)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Visual Flash Memory Map** | Interactive horizontal bar showing partitions, reserved space, free space, and unused flash in real time |
| ⚙️ **Built-In Presets** | 7 ready-to-use partition layouts (OTA, Factory, Zigbee, Minimal, etc.) |
| 🔄 **Automatic Offset Alignment** | Auto-aligns per ESP-IDF rules (`0x1000` for data, `0x10000` for app) |
| 📁 **CSV Import & Export** | Load from file, paste from clipboard, copy to clipboard, or download `partitions.csv` |
| 🛠️ **Flash Size Controls** | 4/8/16/32 MB flash sizes with auto-truncation |
| 🛡️ **Validation** | Enforces alignment, prevents overlaps, auto-truncates when flash size changes |
| 🎯 **Flash Command Generation** | Generates `esptool` commands for ESP32, S2, S3, C3, C6, H2 |
| 🟢 **Dark Theme UI** | Clean, responsive layout modeled after GitHub-style dashboards |
| 📱 **PWA Ready** | Install as a standalone app, works offline with service worker caching |
| ♿ **Accessible** | ARIA labels, keyboard navigation, screen reader friendly |
| 🗃️ **Custom Partitions** | Add custom partitions with editable type, subtype, offset, and flags |

---

## 📁 File Structure

```
esp32-partition-table-ui/
├── index.html              - Main HTML structure
├── style.css               - Dark theme stylesheet (1700+ lines)
├── app.js                  - Application logic (1600+ lines)
├── manifest.json           - PWA manifest
├── sw.js                   - Service worker for offline caching
├── package.json            - Project metadata and scripts
├── README.md               - This file
├── CONTRIBUTING.md         - Contribution guidelines
├── CHANGELOG.md            - Version history
├── LICENSE                 - MIT License
├── .gitignore              - Git ignore rules
└── .github/
    └── workflows/
        └── deploy.yml      - GitHub Actions CI/CD for Pages deployment
```

---

## 🚀 Getting Started

### Prerequisites

* A modern web browser (Chrome, Firefox, Edge, Safari)

### Option 1: Open directly (simplest)

Open `index.html` in any modern web browser:

```bash
xdg-open index.html    # Linux
open index.html        # macOS
start index.html       # Windows
```

### Option 2: Using a local server (recommended)

```bash
# Clone the repository
git clone https://github.com/nimish-nirmal/esp32-partition-table-ui.git
cd esp32-partition-table-ui

# Using Python 3
python3 -m http.server 8000

# Or using npm
npm start
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 📖 Usage Guide

### Flash Size Selection

Select your board's flash size from the top bar:

| Flash Size | Typical Use Case |
|------------|-----------------|
| **4 MB** | ESP32 DevKit, most standard boards |
| **8 MB** | ESP32 with larger flash, custom boards |
| **16 MB** | ESP32-S3 with octal PSRAM, advanced boards |
| **32 MB** | Maximum flash size, specialized applications |

> **Note:** When you reduce the flash size, partitions are automatically truncated from the end to fit.

### Partition Table Offset

The partition table offset determines where the partition table is stored in flash:

| Offset | Use Case |
|--------|----------|
| **0x8000** | Default (standard bootloader) |
| **0x18000** | Large bootloader (factory bootloaders > 28 KB) |
| **Custom** | Enter any hex value aligned to 0x1000 |

The partition table base (where partitions start) is `offset + 0x1000`.

### Built-in Presets

| Preset | Partitions | Description |
|--------|------------|-------------|
| **Empty** | 0 | Start from scratch |
| **OTA With SPIFFS** | 6 | NVS, otadata, ota_0, ota_1, SPIFFS, coredump |
| **OTA With FAT** | 6 | NVS, otadata, ota_0, ota_1, FAT, coredump |
| **Single factory app, no OTA** | 2 | NVS, factory app |
| **Zigbee ESP-IDF** | 5 | NVS, PHY, factory, Zigbee storage, Zigbee factory |
| **Minimal SPIFFS** | 3 | NVS, factory, SPIFFS |
| **Minimal LittleFS** | 3 | NVS, factory, LittleFS |

### Quick Add Partitions

Use the quick-add buttons to add individual partitions:

| Button | Type | Subtype | Default Size | Notes |
|--------|------|---------|--------------|-------|
| **NVS** | data | nvs | 0x3000 (12 KB) | Required for Wi-Fi, BLE, Preferences API |
| **OTA** | data + app | ota + ota_0 + ota_1 | 0x2000 + 0x140000 × 2 | Adds otadata + two OTA slots |
| **Factory** | app | factory | 0x1E0000 (1.875 MB) | Single factory app |
| **SPIFFS** | data | spiffs | 0x60000 (384 KB) | SPIFFS filesystem |
| **LittleFS** | data | littlefs | 0x40000 (256 KB) | LittleFS filesystem |
| **FAT** | data | fat | 528 KB | FAT filesystem (min 528 KB) |
| **Core Dump** | data | coredump | 0x10000 (64 KB) | Crash dump storage |
| **PHY** | data | phy | 0x1000 (4 KB) | PHY initialization data |
| **Custom** | data | custom | 0x1000 (4 KB) | Fully editable partition |

### Partition Types & Subtypes

#### App Partitions (type: `app`)

| Subtype | Description |
|---------|-------------|
| `factory` | Factory app (default) |
| `test` | Test app |
| `ota_0` - `ota_15` | OTA slots (up to 16) |

#### Data Partitions (type: `data`)

| Subtype | Description |
|---------|-------------|
| `ota` | OTA data (selection info) |
| `phy` | PHY init data |
| `nvs` | Non-volatile storage |
| `nvs_keys` | NVS encryption keys |
| `coredump` | Core dump storage |
| `efuse` | eFuse emulation |
| `fat` | FAT filesystem |
| `spiffs` | SPIFFS filesystem |
| `littlefs` | LittleFS filesystem |

### Alignment Rules

The app enforces ESP-IDF alignment rules:

| Partition Type | Alignment | Example Offsets |
|----------------|-----------|-----------------|
| **App** (`app`) | 0x10000 (64 KB) | 0x10000, 0x20000, 0x30000... |
| **Data** (`data`) | 0x1000 (4 KB) | 0x9000, 0xA000, 0xB000... |
| **Custom Data** | 0x400 (1 KB) | 0x9000, 0x9400, 0x9800... |

> **Note:** App partitions must start at or after `0x10000`.

### OTA Configuration

For OTA updates, you need:
1. **NVS** partition (for storing OTA selection)
2. **otadata** partition (subtype: `ota`)
3. **ota_0** app partition
4. **ota_1** app partition

The OTA status indicator shows:
- 🟢 **Ready (OTA + NVS)** - All required partitions present
- 🟡 **Missing NVS** - OTA configured but NVS missing
- 🔴 **Not Configured** - No OTA partitions

#### Unequal OTA Slots

By default, OTA slots (`ota_0` and `ota_1`) are kept equal in size. Enable "Allow unequal OTA slots" for:
- Staging-firmware workflows
- Keeping a small OTA image in one slot
- Reserving a larger slot for main firmware

### CSV Import & Export

#### Export Options
- **Copy** - Copy CSV to clipboard
- **Download** - Download as `partitions.csv`
- **Load** - Load a CSV file from disk
- **Paste** - Paste CSV content via modal

#### CSV Format

```csv
# Name,Type,SubType,Offset,Size,Flags
nvs,data,nvs,0x9000,0x5000,
otadata,data,ota,0xE000,0x2000,
app0,app,ota_0,0x10000,0x140000,
app1,app,ota_1,0x150000,0x140000,
spiffs,data,spiffs,0x290000,0x160000,
coredump,data,coredump,0x3F0000,0x10000,
```

- **Offset** can be left blank for auto-alignment
- **Size** accepts hex (`0x10000`) or decimal with K/M suffix (`64K`, `1M`)
- **Flags** is optional (e.g., `encrypted`)

### Flash Command Generation

The app generates `esptool` flash commands based on the selected target chip:

| Chip | Bootloader Offset | Command Example |
|------|-------------------|-----------------|
| **ESP32** | 0x1000 | `esptool --chip esp32 write_flash 0x1000 bootloader.bin 0x8000 partition-table.bin 0x10000 app.bin` |
| **ESP32-S2** | 0x1000 | `esptool --chip esp32s2 write_flash 0x1000 bootloader.bin 0x8000 partition-table.bin 0x10000 app.bin` |
| **ESP32-S3** | 0x0 | `esptool --chip esp32s3 write_flash 0x0 bootloader.bin 0x8000 partition-table.bin 0x10000 app.bin` |
| **ESP32-C3** | 0x0 | `esptool --chip esp32c3 write_flash 0x0 bootloader.bin 0x8000 partition-table.bin 0x10000 app.bin` |
| **ESP32-C6** | 0x0 | `esptool --chip esp32c6 write_flash 0x0 bootloader.bin 0x8000 partition-table.bin 0x10000 app.bin` |
| **ESP32-H2** | 0x0 | `esptool --chip esp32h2 write_flash 0x0 bootloader.bin 0x8000 partition-table.bin 0x10000 app.bin` |

### Color Legend

| Color | Partition Type |
|-------|----------------|
| 🟠 Orange | Factory |
| 🟢 Light Green | OTA 0 |
| 🟢 Dark Green | OTA 1 |
| 🟣 Purple | OTA Data |
| 🔵 Cyan | NVS |
| 🔵 Indigo | FAT |
| 🔵 Blue | SPIFFS |
| 🔵 Light Blue | LittleFS |
| 🔴 Red | Core Dump |
| 🟢 Light Green | PHY |
| 🩷 Pink | Test |
| ⬜ Gray | Reserved / Free Space |

---

## 🚀 Deployment (GitHub Pages)

This project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to GitHub Pages on every push to `main`.

### Setup Instructions

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Production ready: PWA, CI/CD, docs"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository **Settings** → **Pages**
   - Under **Build and deployment**, set **Source** to **GitHub Actions**
   - The workflow will automatically deploy on the next push

3. **Access your site:**
   - Your site will be available at: `https://<username>.github.io/esp32-partition-table-ui/`
   - Check the **Actions** tab for deployment status

### Manual Deployment

You can also trigger the workflow manually:
- Go to the **Actions** tab in your repository
- Select **Deploy to GitHub Pages**
- Click **Run workflow**

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Structure |
| **CSS3** | Dark theme styling (1700+ lines) |
| **Vanilla JavaScript** | Application logic (1600+ lines, no frameworks) |
| **Font Awesome 6** | Icons |
| **PWA** | Manifest + Service Worker for offline support |
| **GitHub Actions** | CI/CD for automatic deployment |
| **Python 3** | Local development server |

---

## 🌐 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 80+ |
| Firefox | 80+ |
| Safari | 14+ |
| Edge | 80+ |
| Opera | 67+ |

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Start

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

- **Data Source:** [Espressif Systems](https://www.espressif.com/) official documentation
- **Built with:** Vanilla JavaScript, CSS, and HTML
- **Icons:** [Font Awesome](https://fontawesome.com/)
- **Inspiration:** [ESP-IDF Partition Tables](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/partition_tables.html)