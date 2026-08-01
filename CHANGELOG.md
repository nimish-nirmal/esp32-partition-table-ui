# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Additional chip support (ESP32-P4, ESP32-C5)
- Dark/light theme toggle
- Partition table validation against ESP-IDF constraints
- Export to binary partition table format
- Undo/redo functionality

---

## [1.0.0] - 2026-08-01

### Added
- 🎨 **Visual Flash Memory Map** - Interactive horizontal bar showing partitions, reserved space, free space, and unused flash in real time
- ⚙️ **7 Built-in Presets**:
  - Empty (no partitions)
  - OTA With SPIFFS
  - OTA With FAT
  - Single factory app, no OTA
  - Zigbee ESP-IDF
  - Minimal SPIFFS
  - Minimal LittleFS
- 🔄 **Automatic Offset Alignment** - Auto-aligns per ESP-IDF rules (`0x1000` for data, `0x10000` for app)
- 📁 **CSV Import & Export**:
  - Load from file
  - Paste from clipboard via modal
  - Copy to clipboard
  - Download as `partitions.csv`
- 🛠️ **Flash Size Controls** - 4/8/16/32 MB flash sizes with auto-truncation
- 🛡️ **Partition Table Offset** - 0x8000 (default), 0x18000 (large bootloader), or custom hex offset
- 🎯 **Flash Command Generation** - Generates `esptool` commands for:
  - ESP32
  - ESP32-S2
  - ESP32-S3
  - ESP32-C3
  - ESP32-C6
  - ESP32-H2
- 🗃️ **Quick Add Partitions** - NVS, OTA, Factory, SPIFFS, LittleFS, FAT, Core Dump, PHY, Custom
- 📱 **PWA Support**:
  - Web App Manifest (`manifest.json`)
  - Service Worker for offline caching (`sw.js`)
  - Installable as standalone app
- 🚀 **CI/CD Pipeline** - GitHub Actions workflow for automatic deployment to GitHub Pages
- ♿ **Accessibility** - ARIA labels, keyboard navigation, screen reader friendly
- 🟢 **Dark Theme UI** - GitHub-inspired dark theme with responsive layout
- 📊 **Memory Statistics** - Unallocated flash, used by partitions, with byte-level hints
- 🏷️ **Partition Legend** - Color-coded legend for all partition types
- 🔧 **Custom Partitions** - Add custom partitions with editable type, subtype, offset, and flags
- ⚖️ **Unequal OTA Slots** - Option to allow unequal OTA slot sizes for staging workflows
- 📐 **Alignment Validation** - Enforces ESP-IDF alignment rules and prevents overlaps
- 🔄 **Auto-truncation** - Automatically truncates partitions when flash size is reduced
- 📋 **Copy Flash Command** - Copy esptool command to clipboard
- 🎨 **Color-coded Partitions** - Each partition type has a distinct color in the visualizer
- 📱 **Responsive Design** - Optimized for desktop and mobile devices

### Fixed
- Fixed empty space under Flash Command card by adding flex column layout
- Fixed Flash Command text overflow by enabling word wrapping (`white-space: pre-wrap`)

### Documentation
- Comprehensive README with usage guide, features table, and deployment instructions
- CONTRIBUTING.md with development setup, coding standards, and contribution guidelines
- CHANGELOG.md for version tracking
- Inline code documentation

### Infrastructure
- `.gitignore` for OS files, editor files, and build artifacts
- `package.json` with project metadata and serve scripts
- GitHub Actions workflow (`.github/workflows/deploy.yml`) for Pages deployment
- PWA manifest with app metadata and SVG icon
- Service Worker with offline caching strategy

---

## Version History Summary

| Version | Date | Key Changes |
|---------|------|-------------|
| 1.0.0 | 2026-08-01 | Initial production release with PWA, CI/CD, and comprehensive docs |

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backward-compatible manner
- **PATCH** version for backward-compatible bug fixes