# Contributing to ESP32 Partition Table UI

First off, thank you for considering contributing to ESP32 Partition Table UI! 🎉

This document outlines the process for contributing to this project.

---

## 📑 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [How to Contribute](#how-to-contribute)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Style Guidelines](#style-guidelines)

---

## Code of Conduct

Be respectful and constructive in all interactions. We're all here to build something useful for the ESP32 community.

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- Git
- Python 3 (for local server, optional)
- A text editor or IDE (VS Code recommended)

### Development Setup

1. **Fork & Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/esp32-partition-table-ui.git
   cd esp32-partition-table-ui
   ```

2. **Start a local server:**
   ```bash
   python3 -m http.server 8000
   ```

3. **Open in browser:**
   Navigate to [http://localhost:8000](http://localhost:8000)

4. **Start editing:**
   - `index.html` - HTML structure
   - `style.css` - Styling
   - `app.js` - Application logic

---

## Project Architecture

### File Overview

```
├── index.html      - Main HTML structure with all UI elements
├── style.css       - Dark theme stylesheet (1700+ lines)
├── app.js          - Application logic (1600+ lines)
├── manifest.json   - PWA manifest
├── sw.js           - Service worker for offline caching
└── package.json    - Project metadata
```

### Code Structure (`app.js`)

The application is organized into these sections:

1. **Constants** (lines 1-130)
   - Alignment values, flash sizes, partition table offsets
   - Partition type/subtype definitions
   - Color definitions for partition visualization
   - Chip target configurations

2. **PartitionTable Class** (lines 195-618)
   - Core engine for partition management
   - Offset calculation and alignment
   - Overlap detection
   - OTA slot management
   - Memory calculation

3. **CSV Helpers** (lines 620-756)
   - CSV generation and parsing
   - Size format parsing (hex, K, M suffixes)
   - Partition import from CSV

4. **State Management** (lines 758-767)
   - Global state object
   - PartitionTable instance

5. **Rendering** (lines 830-1016)
   - Visualizer rendering
   - Stats display
   - Table info
   - Legend
   - Partition cards

6. **Event Handling** (lines 1502-1653)
   - Flash size selection
   - Preset application
   - Quick add buttons
   - CSV actions
   - Paste modal
   - Copy commands

### Key Classes

#### `PartitionTable`

The core engine class that manages all partition logic:

```javascript
class PartitionTable {
    constructor(flashSizeMB, partitionTableOffset)
    
    // Offset Management
    getPartitionTableBaseOffset()
    getOtadataRequiredOffset()
    alignOffset(offset, alignment)
    recalculateOffsets()
    
    // Partition Management
    addPartition(name, type, subtype, sizeInBytes, flags, offset, fixedOffset, custom)
    removePartition(name)
    clearPartitions()
    
    // Memory Calculation
    getRequiredFlashSize()
    getAvailableMemory()
    getUnallocatedMemory()
    getUsedMemory()
    getTotalMemory()
    
    // Validation
    hasOverlappingPartitions()
    hasSubtype(subtype)
    hasOTAPartitions()
    hasFixedOffsets()
    
    // OTA Management
    setAllowUnequalOtaSlots(allow)
    hasUnequalOtaSlots()
    makeOtaSlotsEqual()
    isCoupledOtaSlot(partition)
    
    // Size Management
    updatePartitionSize(partition, newSize)
    getMaxPartitionSize(partition)
    getReclaimableMemory(partition)
    getRecommendedSize(subtype)
}
```

---

## Coding Standards

### JavaScript

- Use ES6+ features (const/let, arrow functions, template literals)
- Use 4-space indentation
- Use camelCase for variables and functions
- Use PascalCase for classes
- Add JSDoc comments for complex functions
- No external dependencies (vanilla JS only)

### CSS

- Use 4-space indentation
- Use CSS custom properties (variables) for colors and values
- Follow BEM-like naming for component classes (e.g., `partition-card__header`)
- Group related styles with comments
- Use logical property names (e.g., `flex-direction`, not `float`)

### HTML

- Use semantic HTML5 elements (`<section>`, `<header>`, `<footer>`, `<nav>`)
- Add ARIA labels for accessibility
- Use proper indentation (4 spaces)
- Include `aria-hidden="true"` on decorative icons

---

## How to Contribute

### Adding a New Preset

1. Add the preset to the `PARTITION_PRESETS` array in `app.js`:

```javascript
{
    name: 'My Custom Preset',
    partitions: [
        { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: '' },
        { name: 'factory', type: 'app', subtype: 'factory', size: 0x100000, offset: 0, flags: '' },
        // ... more partitions
    ]
}
```

2. Test the preset by selecting it in the UI
3. Verify all partitions fit within the selected flash size
4. Update the README with the new preset in the "Built-in Presets" table

### Adding a New Chip Target

1. Add the chip to the `CHIP_TARGETS` array in `app.js`:

```javascript
{ value: 'esp32p4', text: 'ESP32-P4', esptoolChip: 'esp32p4', bootloaderOffset: 0x0 }
```

2. Add the chip option to the `chip-select` dropdown in `index.html`
3. Test the flash command generation
4. Update the README with the new chip in the "Flash Command Generation" table

### Adding a New Partition Subtype

1. Add the subtype to the appropriate array (`PARTITION_APP_SUBTYPES` or `PARTITION_DATA_SUBTYPES`)
2. Add a color mapping in `PARTITION_SUBTYPE_COLORS`
3. Add the subtype to the legend rendering in `renderLegend()`
4. Add a quick-add button if appropriate
5. Update the README documentation

### Fixing Bugs

1. Check if the bug is already reported in [Issues](https://github.com/nimish-nirmal/esp32-partition-table-ui/issues)
2. If not, create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS information
   - Screenshots if applicable

---

## Submitting Changes

1. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the coding standards above

3. **Test thoroughly:**
   - Test in multiple browsers (Chrome, Firefox, Safari)
   - Test with different flash sizes
   - Test with different presets
   - Test CSV import/export
   - Test on mobile viewport

4. **Commit with a clear message:**
   ```bash
   git commit -m "feat: add ESP32-P4 chip support"
   # or
   git commit -m "fix: resolve OTA slot resize issue"
   ```

   Use conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `style:` - Styling
   - `refactor:` - Code refactoring
   - `test:` - Tests
   - `chore:` - Maintenance

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request:**
   - Use a clear, descriptive title
   - Reference any related issues
   - Include screenshots for UI changes
   - Describe what you changed and why

---

## Reporting Bugs

Before creating a bug report:

1. Check the [existing issues](https://github.com/nimish-nirmal/esp32-partition-table-ui/issues)
2. Try to reproduce on the [live site](https://nimish-nirmal.github.io/esp32-partition-table-ui/)
3. Try in a different browser

When reporting, include:

- **Description**: Clear description of the issue
- **Steps to reproduce**: Detailed steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable
- **Environment**:
  - Browser and version
  - OS
  - Flash size selected
  - Preset or partitions used

---

## Suggesting Enhancements

Enhancement suggestions are welcome! Please:

1. Check if the suggestion already exists in issues
2. Describe the feature and its use case
3. Explain why it would be useful
4. Suggest an implementation approach if possible

---

## Style Guidelines

### Git Commit Messages

- Use the imperative mood ("Add feature" not "Added feature")
- Limit the first line to 72 characters
- Reference issues and pull requests liberally
- Consider starting with a conventional commit type

### Pull Request Titles

- Use clear, descriptive titles
- Reference the issue number if applicable
- Use conventional commit prefixes when possible

---

## Questions?

Feel free to [open an issue](https://github.com/nimish-nirmal/esp32-partition-table-ui/issues) with the `question` label if you have any questions about contributing.

Thank you for contributing! 🚀