/* ============================================================
   ESP32 Partition Table UI - Application Logic
   ============================================================ */

/* ============ Constants ============ */
const OFFSET_APP_TYPE = 0x10000; // 64 KB app alignment
const OFFSET_DATA_TYPE = 0x1000; // 4 KB data alignment
const PARTITION_TABLE_SIZE = 0x1000; // 4 KB partition table
const PARTITION_TABLE_OFFSET_DEFAULT = 0x8000;
const OTADATA_OFFSET_FROM_PARTITION_TABLE = 0x6000; // otadata sits 0x6000 after partition table offset
const NVS_PARTITION_SIZE_RECOMMENDED = 0x3000;
const OTA_DATA_PARTITION_SIZE = 0x2000;
const FAT_MIN_PARTITION_SIZE = 528 * 1024;
const SPIFFS_MIN_PARTITION_SIZE = 192 * 1024;
const LITTLEFS_MIN_PARTITION_SIZE = 128 * 1024;
const COREDUMP_MIN_PARTITION_SIZE = 64 * 1024;
const PHY_MIN_PARTITION_SIZE = 4 * 1024;
const CUSTOM_DATA_PARTITION_SIZE_STEP = 0x400;

const FLASH_SIZES = [4, 8, 16, 32];
const FLASH_SIZES_MB = new Set(FLASH_SIZES);
const PARTITION_TABLE_OFFSET_OPTIONS = [
    { value: 0x8000, text: '0x8000 (Default)' },
    { value: 0x18000, text: '0x18000 (Large bootloader)' }
];

const PARTITION_TYPE_APP = 'app';
const PARTITION_TYPE_DATA = 'data';
const PARTITION_APP_SUBTYPES = [
    'factory', 'test',
    'ota_0', 'ota_1', 'ota_2', 'ota_3', 'ota_4', 'ota_5',
    'ota_6', 'ota_7', 'ota_8', 'ota_9', 'ota_10', 'ota_11',
    'ota_12', 'ota_13', 'ota_14', 'ota_15'
];
const PARTITION_DATA_SUBTYPES = [
    'ota', 'phy', 'nvs', 'nvs_keys', 'coredump', 'efuse', 'fat', 'spiffs', 'littlefs'
];

/* ============ Partition Colors ============ */
const PARTITION_SUBTYPE_COLORS = {
    factory: '#f8b26a',
    ota_0: '#7cc576',
    ota_1: '#58a55b',
    ota_2: '#499550',
    ota: '#8d6be6',
    nvs: '#4dd0e1',
    fat: '#7986cb',
    spiffs: '#64b5f6',
    littlefs: '#81d4fa',
    coredump: '#ef9a9a',
    phy: '#aed581',
    test: '#f48fb1'
};

const PARTITION_TYPE_COLORS = {
    app: '#4caf50',
    data: '#2196f3'
};

const PARTITION_COLOR_PALETTE = [
    '#ffadad', '#ffd6a5', '#fdffb6', '#caffbf',
    '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'
];

const PARTITION_FALLBACK_COLOR = '#6c757d';
const RESERVED_COLOR = '#37474f';
const FREE_COLOR = '#455a64';

function getPartitionBaseColor(partition, index = 0) {
    const subtypeColor = PARTITION_SUBTYPE_COLORS[partition.subtype];
    if (subtypeColor) return subtypeColor;
    const typeColor = PARTITION_TYPE_COLORS[partition.type];
    if (typeColor) return typeColor;
    return PARTITION_COLOR_PALETTE[index % PARTITION_COLOR_PALETTE.length] || PARTITION_FALLBACK_COLOR;
}

function hexToRgb(hex) {
    let normalized = hex.replace('#', '');
    if (normalized.length === 3) {
        normalized = normalized.split('').map(c => c + c).join('');
    }
    if (normalized.length !== 6) return { r: 108, g: 117, b: 125 };
    const n = parseInt(normalized, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
    return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

function lightenColor(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    if (amount >= 0) {
        const mix = c => Math.round(c + (255 - c) * Math.min(amount, 1));
        return rgbToHex(mix(r), mix(g), mix(b));
    }
    const factor = 1 + Math.max(amount, -1);
    return rgbToHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor));
}

function getAccessibleTextColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.6 ? '#1f2933' : '#f8f9fa';
}

/* ============ Chip Targets ============ */
const CHIP_TARGETS = [
    { value: 'esp32', text: 'ESP32', esptoolChip: 'esp32', bootloaderOffset: 0x1000 },
    { value: 'esp32s2', text: 'ESP32-S2', esptoolChip: 'esp32s2', bootloaderOffset: 0x1000 },
    { value: 'esp32s3', text: 'ESP32-S3', esptoolChip: 'esp32s3', bootloaderOffset: 0x0 },
    { value: 'esp32c3', text: 'ESP32-C3', esptoolChip: 'esp32c3', bootloaderOffset: 0x0 },
    { value: 'esp32c6', text: 'ESP32-C6', esptoolChip: 'esp32c6', bootloaderOffset: 0x0 },
    { value: 'esp32h2', text: 'ESP32-H2', esptoolChip: 'esp32h2', bootloaderOffset: 0x0 }
];

function getChipTarget(value) {
    return CHIP_TARGETS.find(c => c.value === value) || CHIP_TARGETS[0];
}

function buildFlashCommand(chipValue, partitionTableOffset, appOffset = OFFSET_APP_TYPE) {
    const target = getChipTarget(chipValue);
    return [
        'esptool', '--chip', target.esptoolChip, 'write_flash',
        formatHex(target.bootloaderOffset), 'bootloader.bin',
        formatHex(partitionTableOffset), 'partition-table.bin',
        formatHex(appOffset), 'app.bin'
    ].join('  ');
}

/* ============ Default Partition Presets ============ */
const PARTITION_PRESETS = [
    {
        name: 'Empty (no partitions)',
        partitions: []
    },
    {
        name: 'OTA With SPIFFS',
        partitions: [
            { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: '' },
            { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000, offset: 0, flags: '' },
            { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x140000, offset: 0, flags: '' },
            { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x140000, offset: 0, flags: '' },
            { name: 'spiffs', type: 'data', subtype: 'spiffs', size: 0x160000, offset: 0, flags: '' },
            { name: 'coredump', type: 'data', subtype: 'coredump', size: 0x10000, offset: 0, flags: '' },
        ]
    },
    {
        name: 'OTA With FAT',
        partitions: [
            { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: '' },
            { name: 'otadata', type: 'data', subtype: 'ota', size: 0x2000, offset: 0, flags: '' },
            { name: 'app0', type: 'app', subtype: 'ota_0', size: 0x140000, offset: 0, flags: '' },
            { name: 'app1', type: 'app', subtype: 'ota_1', size: 0x140000, offset: 0, flags: '' },
            { name: 'fat', type: 'data', subtype: 'fat', size: 0x160000, offset: 0, flags: '' },
            { name: 'coredump', type: 'data', subtype: 'coredump', size: 0x10000, offset: 0, flags: '' },
        ]
    },
    {
        name: 'Single factory app, no OTA',
        partitions: [
            { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: '' },
            { name: 'factory', type: 'app', subtype: 'factory', size: 0x3F0000, offset: 0, flags: '' },
        ]
    },
    {
        name: 'Zigbee ESP-IDF',
        partitions: [
            { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x6000, offset: 0, flags: '' },
            { name: 'phy_init', type: 'data', subtype: 'phy', size: 0x1000, offset: 0, flags: '' },
            { name: 'factory', type: 'app', subtype: 'factory', size: 0x12C000, offset: 0, flags: '' },
            { name: 'zb_storage', type: 'data', subtype: 'nvs', size: 0x4000, offset: 0, flags: '' },
            { name: 'zb_fct', type: 'data', subtype: 'fat', size: 0x400, offset: 0, flags: '', custom: true },
        ]
    },
    {
        name: 'Minimal SPIFFS',
        partitions: [
            { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: '' },
            { name: 'factory', type: 'app', subtype: 'factory', size: 0x1E0000, offset: 0, flags: '' },
            { name: 'spiffs', type: 'data', subtype: 'spiffs', size: 0x1C0000, offset: 0, flags: '' },
        ]
    },
    {
        name: 'Minimal LittleFS',
        partitions: [
            { name: 'nvs', type: 'data', subtype: 'nvs', size: 0x5000, offset: 0, flags: '' },
            { name: 'factory', type: 'app', subtype: 'factory', size: 0x1E0000, offset: 0, flags: '' },
            { name: 'littlefs', type: 'data', subtype: 'littlefs', size: 0x1C0000, offset: 0, flags: '' },
        ]
    }
];

/* ============ PartitionTable Engine ============ */
class PartitionTable {
    constructor(flashSizeMB, partitionTableOffset = PARTITION_TABLE_OFFSET_DEFAULT) {
        this.partitions = [];
        this.flashSize = flashSizeMB * 1024 * 1024;
        this.partitionTableOffset = partitionTableOffset;
        this.allowUnequalOtaSlots = false;
    }

    getPartitionTableBaseOffset() {
        return this.partitionTableOffset + PARTITION_TABLE_SIZE;
    }

    getOtadataRequiredOffset() {
        return this.partitionTableOffset + OTADATA_OFFSET_FROM_PARTITION_TABLE;
    }

    alignOffset(offset, alignment) {
        return Math.ceil(offset / alignment) * alignment;
    }

    setFlashSize(newFlashSizeMB) {
        this.flashSize = newFlashSizeMB * 1024 * 1024;
        while (this.getRequiredFlashSize() > this.flashSize) {
            const removed = this.partitions.pop();
            if (!removed) {
                throw new Error('Cannot remove any more partitions. Partitions cannot fit within this flash size.');
            }
        }
        this.recalculateOffsets();
    }

    getRequiredFlashSize() {
        const baseOffset = this.getPartitionTableBaseOffset();
        return this.partitions.reduce((max, p) => Math.max(max, p.offset + p.size), baseOffset);
    }

    setPartitionTableOffset(newOffset) {
        if (newOffset % OFFSET_DATA_TYPE !== 0) {
            throw new Error('Partition table offset must be aligned to 0x1000.');
        }
        this.partitionTableOffset = newOffset;
        const baseOffset = this.getPartitionTableBaseOffset();
        const violating = this.partitions.find(p => p.fixedOffset && p.offset < baseOffset);
        if (violating) {
            throw new Error(`Partition ${violating.name} is before the partition table base ${baseOffset.toString(16)}`);
        }
        this.recalculateOffsets();
        while (this.getAvailableMemory() < 0) {
            const removed = this.partitions.pop();
            if (!removed) {
                throw new Error('Cannot remove any more partitions.');
            }
            this.recalculateOffsets();
        }
    }

    addPartition(name, type, subtype, sizeInBytes, flags, offset, fixedOffset = false, custom = false) {
        const partition = {
            name, type, subtype,
            offset: offset !== undefined && offset !== null ? offset : this.getCurrentOffset(type),
            size: sizeInBytes,
            flags: flags || '',
            fixedOffset,
            custom: Boolean(custom)
        };
        this.partitions.push(partition);
        this.ensureNamedUnique(partition);
        this.recalculateOffsets();
        return partition;
    }

    ensureNamedUnique(partition) {
        const existing = this.partitions.filter(p => p !== partition && p.name === partition.name);
        if (existing.length > 0) {
            let base = partition.name.replace(/_\d+$/, '');
            let counter = 1;
            const used = new Set(this.partitions.filter(p => p !== partition).map(p => p.name));
            let candidate = `${base}_${counter}`;
            while (used.has(candidate)) {
                counter++;
                candidate = `${base}_${counter}`;
            }
            partition.name = candidate;
        }
    }

    getCurrentOffset(type) {
        const base = this.getPartitionTableBaseOffset();
        const maxEnd = this.partitions.reduce((max, p) => Math.max(max, p.offset + p.size), base);
        let currentOffset = maxEnd;
        if (type === PARTITION_TYPE_APP) {
            currentOffset = Math.max(currentOffset, OFFSET_APP_TYPE, base);
            return this.alignOffset(currentOffset, OFFSET_APP_TYPE);
        }
        currentOffset = Math.max(currentOffset, base);
        return this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
    }

    removePartition(name) {
        const index = this.partitions.findIndex(p => p.name === name);
        if (index === -1) {
            throw new Error(`Partition ${name} not found.`);
        }
        this.partitions.splice(index, 1);
        this.recalculateOffsets();
    }

    clearPartitions() {
        this.partitions = [];
    }

    getTotalMemory() {
        const baseOffset = this.getPartitionTableBaseOffset();
        const firstPartition = this.partitions[0];
        if (firstPartition && firstPartition.type === PARTITION_TYPE_APP) {
            const appStart = this.alignOffset(Math.max(baseOffset, OFFSET_APP_TYPE), OFFSET_APP_TYPE);
            return this.flashSize - appStart;
        }
        return this.flashSize - Math.max(baseOffset, OFFSET_DATA_TYPE);
    }

    getAvailableMemory() {
        const base = this.getPartitionTableBaseOffset();
        const maxEnd = this.partitions.reduce((max, p) => Math.max(max, p.offset + p.size), base);
        const currentOffset = Math.max(maxEnd, base);
        const alignedCurrentOffset = this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
        return this.flashSize - alignedCurrentOffset;
    }

    getUnallocatedMemory() {
        const baseOffset = this.getPartitionTableBaseOffset();
        const partitions = [...this.partitions].sort((a, b) => a.offset - b.offset);
        let cursor = baseOffset;
        let available = 0;
        for (const partition of partitions) {
            if (partition.offset > cursor) {
                available += partition.offset - cursor;
            }
            cursor = Math.max(cursor, partition.offset + partition.size);
        }
        return available + Math.max(0, this.flashSize - cursor);
    }

    getUsedMemory() {
        return this.partitions.reduce((total, p) => total + p.size, 0);
    }

    getPartitionAlignment(partition) {
        if (partition.custom && partition.type !== PARTITION_TYPE_APP) {
            return CUSTOM_DATA_PARTITION_SIZE_STEP;
        }
        return OFFSET_DATA_TYPE;
    }

    getNextPartitionByOffset(partition) {
        const sorted = [...this.partitions].sort((a, b) => a.offset - b.offset);
        const index = sorted.indexOf(partition);
        if (index === -1) return undefined;
        return sorted[index + 1];
    }

    getMaxPartitionSize(partition) {
        const alignment = this.getPartitionAlignment(partition);
        const nextFixedPartition = this.hasFixedOffsets() ? this.getNextPartitionByOffset(partition) : undefined;
        const maxEndOffset = nextFixedPartition ? nextFixedPartition.offset : this.flashSize;
        const maxSize = Math.floor((maxEndOffset - partition.offset) / alignment) * alignment;
        return Math.max(alignment, maxSize);
    }

    getReclaimableMemory(partition) {
        const partitions = [...this.partitions].sort((a, b) => a.offset - b.offset);
        const index = partitions.indexOf(partition);
        if (index === -1) return 0;
        const nextPartition = partitions[index + 1];
        const boundary = nextPartition ? nextPartition.offset : this.flashSize;
        return Math.max(0, boundary - (partition.offset + partition.size));
    }

    hasOverlappingPartitions() {
        const partitions = [...this.partitions].sort((a, b) => a.offset - b.offset);
        let endOffset = this.getPartitionTableBaseOffset();
        for (const partition of partitions) {
            if (partition.offset < endOffset) return true;
            endOffset = partition.offset + partition.size;
        }
        return false;
    }

    hasSubtype(subtype) {
        return this.partitions.some(p => p.subtype === subtype);
    }

    hasOTAPartitions() {
        const hasOTAData = this.partitions.some(p => p.type === 'data' && p.subtype === 'ota');
        const hasOTA0 = this.partitions.some(p => p.type === 'app' && p.subtype === 'ota_0');
        const hasOTA1 = this.partitions.some(p => p.type === 'app' && p.subtype === 'ota_1');
        return hasOTAData && hasOTA0 && hasOTA1;
    }

    hasFixedOffsets() {
        return this.partitions.some(p => p.fixedOffset);
    }

    releaseFixedOffsets() {
        let hadFixedOffsets = false;
        for (const partition of this.partitions) {
            if (partition.fixedOffset) {
                partition.fixedOffset = false;
                hadFixedOffsets = true;
            }
        }
        if (hadFixedOffsets) this.recalculateOffsets();
    }

    setAllowUnequalOtaSlots(allow) {
        this.allowUnequalOtaSlots = allow;
        if (!allow) this.makeOtaSlotsEqual();
    }

    allowsUnequalOtaSlots() {
        return this.allowUnequalOtaSlots;
    }

    hasUnequalOtaSlots() {
        const ota0 = this.partitions.find(p => p.subtype === 'ota_0');
        const ota1 = this.partitions.find(p => p.subtype === 'ota_1');
        return Boolean(ota0 && ota1 && ota0.size !== ota1.size);
    }

    makeOtaSlotsEqual() {
        const ota0 = this.partitions.find(p => p.subtype === 'ota_0');
        const ota1 = this.partitions.find(p => p.subtype === 'ota_1');
        if (!ota0 || !ota1) return;
        const size = Math.min(ota0.size, ota1.size);
        ota0.size = size;
        ota1.size = size;
        this.recalculateOffsets();
    }

    isCoupledOtaSlot(partition) {
        if (this.allowUnequalOtaSlots) return false;
        return partition.subtype === 'ota_0' || partition.subtype === 'ota_1';
    }

    updatePartitionSize(partition, newSize) {
        const alignment = this.getPartitionAlignment(partition);
        const minSize = alignment;
        const ota0Index = this.partitions.findIndex(p => p.subtype === 'ota_0');
        const ota1Index = this.partitions.findIndex(p => p.subtype === 'ota_1');
        const isOtaPair = !this.allowUnequalOtaSlots &&
            (partition.subtype === 'ota_0' || partition.subtype === 'ota_1') &&
            ota0Index !== -1 && ota1Index !== -1;
        const resizeTargets = isOtaPair
            ? [this.partitions[ota0Index], this.partitions[ota1Index]]
            : [partition];
        const maxPossible = Math.max(minSize, Math.min(...resizeTargets.map(t => t ? this.getMaxPartitionSize(t) : minSize)));
        let target = Math.min(Math.max(newSize, minSize), maxPossible);
        target = Math.floor(target / alignment) * alignment;
        if (target < minSize) target = minSize;

        const originalPartitions = [...this.partitions];
        const originalSizes = new Map(this.partitions.map(p => [p, p.size]));

        const attemptResize = (candidateSize) => {
            this.partitions.splice(0, this.partitions.length, ...originalPartitions);
            for (const originalPartition of originalPartitions) {
                originalPartition.size = originalSizes.get(originalPartition);
            }
            if (isOtaPair) {
                const p0 = this.partitions[ota0Index];
                const p1 = this.partitions[ota1Index];
                if (!p0 || !p1) return false;
                p0.size = candidateSize;
                p1.size = candidateSize;
            } else {
                partition.size = candidateSize;
            }
            this.recalculateOffsets();
            return this.getAvailableMemory() >= 0 && !this.hasOverlappingPartitions();
        };

        let candidate = target;
        while (candidate >= minSize) {
            if (attemptResize(candidate)) return;
            candidate -= alignment;
        }

        // Revert if no candidate fits
        this.partitions.splice(0, this.partitions.length, ...originalPartitions);
        for (const originalPartition of originalPartitions) {
            originalPartition.size = originalSizes.get(originalPartition);
        }
        this.recalculateOffsets();
    }

    getRecommendedSize(subtype) {
        switch (subtype) {
            case 'nvs': return NVS_PARTITION_SIZE_RECOMMENDED;
            case 'ota': return OTA_DATA_PARTITION_SIZE;
            case 'coredump': return COREDUMP_MIN_PARTITION_SIZE;
            case 'phy': return PHY_MIN_PARTITION_SIZE;
            default: return OFFSET_DATA_TYPE;
        }
    }

    isCustomPartition(partition) {
        if (partition.flags) return true;
        if (partition.type === PARTITION_TYPE_APP) {
            return !PARTITION_APP_SUBTYPES.includes(partition.subtype);
        }
        if (partition.type === PARTITION_TYPE_DATA) {
            const known = PARTITION_DATA_SUBTYPES.includes(partition.subtype);
            return !known || (partition.subtype === 'fat' && partition.size < FAT_MIN_PARTITION_SIZE);
        }
        return true;
    }

    recalculateOffsets() {
        const baseOffset = this.getPartitionTableBaseOffset();
        const otadataRequiredOffset = this.getOtadataRequiredOffset();

        if (this.hasFixedOffsets()) {
            this.partitions.sort((a, b) => a.offset - b.offset);
            return;
        }

        const otadataIndex = this.partitions.findIndex(p => p.subtype === 'ota');
        if (otadataIndex !== -1) {
            const [otadataPartition] = this.partitions.splice(otadataIndex, 1);
            const before = this.partitions.filter(p => p.offset <= otadataRequiredOffset || p.type === PARTITION_TYPE_APP);
            const after = this.partitions.filter(p => p !== otadataPartition && !before.includes(p));

            const beforeKeep = [];
            const movedPartitions = [];
            let previewOffset = baseOffset;

            for (const partition of before) {
                const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
                previewOffset = this.alignOffset(Math.max(previewOffset, baseOffset), alignment);
                const endOffset = previewOffset + partition.size;
                if (endOffset <= otadataRequiredOffset) {
                    beforeKeep.push(partition);
                    previewOffset = endOffset;
                } else {
                    movedPartitions.push(partition);
                }
            }

            const isOtaAppPartition = p => p.type === PARTITION_TYPE_APP && typeof p.subtype === 'string' && p.subtype.startsWith('ota_');
            const otaAppPartitions = after.filter(isOtaAppPartition);
            const otherAfterPartitions = after.filter(p => !isOtaAppPartition(p));

            const newOrder = [...beforeKeep, otadataPartition, ...otaAppPartitions, ...otherAfterPartitions, ...movedPartitions];
            const orderChanged = newOrder.length !== this.partitions.length ||
                newOrder.some((p, i) => p !== this.partitions[i]);
            if (orderChanged) {
                this.partitions.splice(0, this.partitions.length, ...newOrder);
            }
        }

        // Move non-app partitions that would sit before the app boundary
        const firstAppIndex = this.partitions.findIndex(p => p.type === PARTITION_TYPE_APP);
        if (firstAppIndex > 0) {
            const beforeApp = this.partitions.slice(0, firstAppIndex);
            const afterApp = this.partitions.slice(firstAppIndex);
            const beforeKeep = [];
            const movedBeforeApp = [];
            let previewOffset = baseOffset;

            for (const partition of beforeApp) {
                if (partition.subtype === 'ota') {
                    beforeKeep.push(partition);
                    previewOffset = otadataRequiredOffset + partition.size;
                    continue;
                }
                const isAppPartition = partition.type === PARTITION_TYPE_APP;
                const alignment = isAppPartition ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
                const baseline = isAppPartition
                    ? Math.max(previewOffset, OFFSET_APP_TYPE, baseOffset)
                    : Math.max(previewOffset, baseOffset);
                const alignedOffset = this.alignOffset(baseline, alignment);
                const endOffset = alignedOffset + partition.size;
                const appBoundary = Math.max(OFFSET_APP_TYPE, baseOffset);

                if (isAppPartition || partition.type !== PARTITION_TYPE_DATA || endOffset <= appBoundary) {
                    beforeKeep.push(partition);
                    previewOffset = endOffset;
                } else {
                    movedBeforeApp.push(partition);
                }
            }

            const firstNonAppIndex = afterApp.findIndex(p => p.type !== PARTITION_TYPE_APP);
            const afterWithMoved = firstNonAppIndex === -1
                ? [...afterApp, ...movedBeforeApp]
                : [...afterApp.slice(0, firstNonAppIndex), ...movedBeforeApp, ...afterApp.slice(firstNonAppIndex)];

            const newOrder = [...beforeKeep, ...afterWithMoved];
            const orderChanged = newOrder.length !== this.partitions.length ||
                newOrder.some((p, i) => p !== this.partitions[i]);
            if (orderChanged) {
                this.partitions.splice(0, this.partitions.length, ...newOrder);
            }
        }

        let currentOffset = baseOffset;
        this.partitions.forEach(partition => {
            if (partition.subtype === 'ota') {
                partition.offset = otadataRequiredOffset;
                currentOffset = partition.offset + partition.size;
                return;
            }
            if (partition.type === PARTITION_TYPE_APP) {
                currentOffset = Math.max(currentOffset, OFFSET_APP_TYPE, baseOffset);
                currentOffset = this.alignOffset(currentOffset, OFFSET_APP_TYPE);
            } else {
                currentOffset = Math.max(currentOffset, baseOffset);
                currentOffset = this.alignOffset(currentOffset, OFFSET_DATA_TYPE);
            }
            partition.offset = currentOffset;
            currentOffset += partition.size;
        });
    }
}

/* ============ CSV Helpers ============ */
function formatHex(value) {
    return `0x${value.toString(16).toUpperCase()}`;
}

function parseSize(sizeStr) {
    const hexRegex = /^0x[0-9a-fA-F]+$/;
    if (hexRegex.test(sizeStr)) return parseInt(sizeStr, 16);
    const match = sizeStr.match(/^(\d+)([KMB]?)$/);
    if (!match) throw new Error(`Invalid size format: ${sizeStr}`);
    const value = parseInt(match[1], 10);
    switch (match[2]) {
        case 'K': return value * 1024;
        case 'M': return value * 1024 * 1024;
        case 'B': return value;
        default: return value;
    }
}

function generateCSV(partitions) {
    const lines = ['# Name,Type,SubType,Offset,Size,Flags'];
    for (const p of partitions) {
        lines.push(`${p.name},${p.type},${p.subtype},${formatHex(p.offset)},${formatHex(p.size)},${p.flags || ''}`);
    }
    return lines.join('\n') + '\n';
}

function loadPartitionsFromCsv(csv, partitionTable) {
    const validHeader = /#+Name,Type,SubType,Offset,Size(,Flags)?/;
    const rows = csv
        .replace(/[ \t\r]+/g, '')
        .split('\n')
        .filter(row => validHeader.test(row) || (row !== '' && !row.startsWith('#')));
    const header = rows.shift() || '';
    if (!validHeader.test(header) || rows.length === 0) {
        throw new Error('The CSV file format is incorrect. Please use the correct format.');
    }

    const alignOffset = (offset, alignment) => Math.ceil(offset / alignment) * alignment;
    const alignDown = (offset, alignment) => Math.floor(offset / alignment) * alignment;
    const suggestPartitionTableOffset = parts => {
        const minOffset = Math.min(...parts.map(p => p.offset));
        const maxSafeOffset = Math.max(OFFSET_DATA_TYPE, alignDown(minOffset - PARTITION_TABLE_SIZE, OFFSET_DATA_TYPE));
        const appOffsets = parts.filter(p => p.type === PARTITION_TYPE_APP).map(p => p.offset);
        if (appOffsets.length > 0) {
            const minApp = Math.min(...appOffsets);
            if (minApp >= OFFSET_APP_TYPE) {
                const candidate = minApp - OFFSET_APP_TYPE / 2;
                return Math.min(maxSafeOffset, Math.max(OFFSET_DATA_TYPE, alignDown(candidate, OFFSET_DATA_TYPE)));
            }
        }
        return maxSafeOffset;
    };

    const partitions = [];
    let requiredFlashSize = 0;
    const baseOffset = partitionTable.getPartitionTableBaseOffset();
    let nextOffset = baseOffset;

    for (const row of rows) {
        const [name, type, subtype, offsetHex, sizeStr, flags] = row.split(',');
        if (!name || !type || !subtype || !sizeStr) {
            throw new Error('The CSV file contains invalid data. Please check the file and try again.');
        }
        let size;
        try {
            size = parseSize(sizeStr);
        } catch {
            throw new Error('The CSV file contains invalid data. Please check the file and try again.');
        }

        const isAppPartition = type === PARTITION_TYPE_APP;
        const alignment = isAppPartition ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
        let offset;

        if (offsetHex) {
            const parsedOffset = parseInt(offsetHex, 16);
            if (Number.isNaN(parsedOffset)) {
                throw new Error('The CSV file contains invalid data. Please check the file and try again.');
            }
            offset = parsedOffset;
            if (offset < baseOffset) {
                throw new Error(`Partition offsets must start at or after ${formatHex(baseOffset)}.`);
            }
            if (offset % alignment !== 0) {
                throw new Error(`Partition offsets must align to ${formatHex(alignment)}.`);
            }
            if (isAppPartition && (offset < OFFSET_APP_TYPE || offset % OFFSET_APP_TYPE !== 0)) {
                throw new Error(`App partitions must start at ${formatHex(OFFSET_APP_TYPE)} or higher and use ${formatHex(OFFSET_APP_TYPE)} alignment.`);
            }
            nextOffset = offset + size;
        } else {
            if (isAppPartition) nextOffset = Math.max(nextOffset, OFFSET_APP_TYPE);
            nextOffset = Math.max(nextOffset, baseOffset);
            nextOffset = alignOffset(nextOffset, alignment);
            offset = nextOffset;
            nextOffset += size;
        }

        partitions.push({
            name, type, subtype, size, offset,
            flags: flags || '',
            fixedOffset: Boolean(offsetHex),
            custom: isCustomCsvPartition(type, subtype, size, flags || '')
        });
        requiredFlashSize = Math.max(requiredFlashSize, offset + size);
    }

    partitionTable.clearPartitions();
    const suggestedOffset = suggestPartitionTableOffset(partitions);
    partitionTable.setPartitionTableOffset(suggestedOffset);
    partitions.forEach(p => {
        partitionTable.addPartition(
            p.name, p.type, p.subtype, p.size, p.flags,
            p.offset, p.fixedOffset, p.custom
        );
    });

    let flashSizeMB = null;
    for (const size of FLASH_SIZES) {
        if (requiredFlashSize <= size * 1024 * 1024) {
            flashSizeMB = size;
            break;
        }
    }
    return { flashSizeMB, suggestedOffset };
}

function isCustomCsvPartition(type, subtype, size, flags) {
    if (flags) return true;
    if (type === PARTITION_TYPE_APP) return !PARTITION_APP_SUBTYPES.includes(subtype);
    if (type === PARTITION_TYPE_DATA) {
        const known = PARTITION_DATA_SUBTYPES.includes(subtype);
        return !known || (subtype === 'fat' && size < FAT_MIN_PARTITION_SIZE);
    }
    return true;
}

/* ============ State ============ */
const state = {
    flashSizeMB: 4,
    partitionTableOffset: PARTITION_TABLE_OFFSET_DEFAULT,
    displaySizeUnit: 1024,
    selectedChip: 'esp32',
    selectedPresetIndex: 0,
    allowUnequalOtaSlots: false,
    partitionTable: new PartitionTable(4, PARTITION_TABLE_OFFSET_DEFAULT)
};

/* ============ Display Helpers ============ */
function formatHintSize(size) {
    if (state.displaySizeUnit === 1024 * 1024) {
        return `${parseFloat((size / (1024 * 1024)).toFixed(4))} MB`;
    }
    return `${parseFloat((size / 1024).toFixed(2))} KB`;
}

function formatBytes(size) {
    if (size >= 1024 * 1024) {
        return `${parseFloat((size / (1024 * 1024)).toFixed(2))} MB`;
    }
    if (size >= 1024) {
        return `${parseFloat((size / 1024).toFixed(2))} KB`;
    }
    return `${size} B`;
}

/* ============ DOM References ============ */
const $ = id => document.getElementById(id);
const visualizerEl = $('flash-visualizer');
const visualizationScaleEl = $('visualizer-scale');
const statUnallocated = $('stat-unallocated');
const statUnallocatedHint = $('stat-unallocated-hint');
const statUsed = $('stat-used');
const statUsedHint = $('stat-used-hint');
const infoPtOffset = $('info-pt-offset');
const infoPtBase = $('info-pt-base');
const infoPartitionCount = $('info-partition-count');
const infoFixedOffsets = $('info-fixed-offsets');
const infoOta = $('info-ota');
const infoNvs = $('info-nvs');
const legendItemsEl = $('legend-items');
const partitionsListEl = $('partitions-list');
const emptyPartitionsEl = $('empty-partitions');
const csvPreviewEl = $('csv-preview');
const flashCommandEl = $('flash-command');
const flashSizeBadge = $('flash-size-badge');
const presetSelectEl = $('preset-select');
const chipSelectEl = $('chip-select');
const displaySizeSelectEl = $('display-size-select');
const ptOffsetSelectEl = $('pt-offset-select');
const ptOffsetCustomRow = $('custom-offset-row');
const ptOffsetCustomInput = $('pt-offset-custom');
const ptOffsetApplyBtn = $('pt-offset-apply');
const unequalOtaToggle = $('unequal-ota-toggle');
const toastContainer = $('toast-container');

/* ============ Toast ============ */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ============ Rendering ============ */
function renderAll() {
    renderVisualizer();
    renderStats();
    renderTableInfo();
    renderLegend();
    renderPartitions();
    renderCSV();
    renderFlashCommand();
    updateFlashSizeButtons();
}

function renderVisualizer() {
    const partitions = [...state.partitionTable.partitions].sort((a, b) => a.offset - b.offset);
    const flashSize = state.partitionTable.flashSize;
    if (!flashSize || flashSize <= 0) {
        visualizerEl.innerHTML = '';
        return;
    }

    const MIN_VISIBLE_PERCENTAGE = 1.4;
    const segments = [];
    let cursor = 0;

    const addGapSegment = (length, startOffset, label, kind) => {
        if (length <= 0) return;
        const percentage = (length / flashSize) * 100;
        const baseColor = kind === 'reserved' ? RESERVED_COLOR : FREE_COLOR;
        segments.push({
            id: `${kind}-${startOffset}`,
            name: label,
            meta: formatHintSize(length),
            title: `${label}\nOffset: ${formatHex(startOffset)} - ${formatHex(startOffset + length)} (${formatBytes(length)})`,
            kind,
            showMeta: percentage > 9,
            baseColor,
            percentage
        });
    };

    if (partitions.length === 0) {
        addGapSegment(flashSize, 0, 'Unallocated Flash', 'free');
    } else {
        partitions.forEach((partition, index) => {
            if (partition.offset > cursor) {
                const gapKind = cursor === 0 ? 'reserved' : 'free';
                const label = cursor === 0 ? 'Reserved' : 'Free Space';
                addGapSegment(partition.offset - cursor, cursor, label, gapKind);
                cursor = partition.offset;
            }
            const length = partition.size;
            const percentage = (length / flashSize) * 100;
            const baseColor = getPartitionBaseColor(partition, index);
            const start = partition.offset;
            const end = start + length;
            segments.push({
                id: `partition-${partition.name}-${index}`,
                name: partition.name || 'Unnamed',
                meta: formatHintSize(length),
                title: `${partition.name || 'Partition'} (${partition.type}/${partition.subtype})\nSize: ${formatBytes(length)} (${formatHex(length)})\nOffset: ${formatHex(start)} - ${formatHex(end)}`,
                kind: 'partition',
                showMeta: percentage > 8,
                baseColor,
                percentage
            });
            cursor = end;
        });
        if (cursor < flashSize) {
            addGapSegment(flashSize - cursor, cursor, 'Unused Flash', 'free');
        }
    }

    const widths = calculateBalancedWidths(segments.map(s => s.percentage));

    visualizerEl.innerHTML = segments.map((segment, index) => {
        const width = widths[index] || 0;
        const textColor = segment.kind === 'partition' ? getAccessibleTextColor(segment.baseColor) : '#8b949e';
        const label = segment.showMeta ? `${segment.name} • ${segment.meta}` : segment.name;
        return `<div class="flash-segment" style="width:${width}%;background:${segment.baseColor};color:${textColor};" data-kind="${segment.kind}">
            <span class="seg-label">${escapeHtml(label)}</span>
            <span class="seg-tooltip">${escapeHtml(segment.title)}</span>
        </div>`;
    }).join('');

    // Render scale labels
    const total = flashSize;
    const ticks = [
        { offset: 0, label: `0x0` },
        { offset: Math.floor(total / 4), label: formatHex(Math.floor(total / 4)) },
        { offset: Math.floor(total / 2), label: formatHex(Math.floor(total / 2)) },
        { offset: Math.floor(total * 3 / 4), label: formatHex(Math.floor(total * 3 / 4)) },
        { offset: total, label: formatHex(total) }
    ];
    const partitionsMin = Math.min(...partitions.map(p => p.offset), state.partitionTable.getPartitionTableBaseOffset());
    const partitionsMax = Math.max(...partitions.map(p => p.offset + p.size), state.partitionTable.getPartitionTableBaseOffset());
    const labelStart = Math.min(ticks[0].offset, partitionsMin) === partitionsMin && partitions.length > 0
        ? `${formatHex(partitionsMin)}` : '0x0';
    visualizationScaleEl.innerHTML = ticks.map((tick, i) =>
        `<span>${escapeHtml(i === 0 ? labelStart : tick.label)}</span>`
    ).join('');
}

function calculateBalancedWidths(percentages) {
    const positiveIndexes = percentages
        .map((percentage, index) => ({ percentage, index }))
        .filter(s => s.percentage > 0);
    if (positiveIndexes.length === 0) return percentages.map(() => 0);

    const MIN_VISIBLE_PERCENTAGE = 1.4;
    const minimum = Math.min(MIN_VISIBLE_PERCENTAGE, 100 / positiveIndexes.length);
    const smallIndexes = new Set(
        positiveIndexes.filter(s => s.percentage < minimum).map(s => s.index)
    );
    const reservedForSmall = smallIndexes.size * minimum;
    const largeTotal = positiveIndexes.reduce((total, s) => {
        return smallIndexes.has(s.index) ? total : total + s.percentage;
    }, 0);

    if (largeTotal <= 0 || reservedForSmall >= 100) {
        const equalWidth = 100 / positiveIndexes.length;
        return percentages.map(p => (p > 0 ? equalWidth : 0));
    }

    const availableForLarge = 100 - reservedForSmall;
    return percentages.map((percentage, index) => {
        if (percentage <= 0) return 0;
        if (smallIndexes.has(index)) return minimum;
        return (percentage / largeTotal) * availableForLarge;
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function renderStats() {
    const unallocated = state.partitionTable.getUnallocatedMemory();
    const used = state.partitionTable.getUsedMemory();
    statUnallocated.textContent = unallocated >= 0 ? formatBytes(unallocated) : '0 B';
    statUnallocatedHint.textContent = `${unallocated >= 0 ? unallocated : 0} bytes`;
    statUsed.textContent = formatBytes(used);
    statUsedHint.textContent = `${used} bytes (${formatHex(used)})`;
}

function renderTableInfo() {
    infoPtOffset.textContent = formatHex(state.partitionTableOffset);
    infoPtBase.textContent = formatHex(state.partitionTable.getPartitionTableBaseOffset());
    infoPartitionCount.textContent = state.partitionTable.partitions.length;
    infoFixedOffsets.textContent = state.partitionTable.hasFixedOffsets() ? 'Yes (Keep)' : 'No (Auto)';
    infoFixedOffsets.style.color = state.partitionTable.hasFixedOffsets() ? 'var(--status-caution)' : '';

    const hasOTA = state.partitionTable.hasOTAPartitions();
    const hasNVS = state.partitionTable.hasSubtype('nvs');
    if (hasOTA && hasNVS) {
        infoOta.innerHTML = `<span class="status-dot status-safe"></span> Ready (OTA + NVS)`;
    } else if (hasOTA) {
        infoOta.innerHTML = `<span class="status-dot status-caution"></span> Missing NVS`;
    } else {
        infoOta.innerHTML = `<span class="status-dot status-avoid"></span> Not Configured`;
    }
    infoNvs.textContent = hasNVS ? 'Yes' : 'No';
    infoNvs.style.color = hasNVS ? 'var(--status-safe)' : '';
}

function renderLegend() {
    const subtypes = [
        { key: 'nvs', label: 'NVS' },
        { key: 'ota', label: 'OTA Data' },
        { key: 'ota_0', label: 'OTA 0' },
        { key: 'ota_1', label: 'OTA 1' },
        { key: 'factory', label: 'Factory' },
        { key: 'spiffs', label: 'SPIFFS' },
        { key: 'littlefs', label: 'LittleFS' },
        { key: 'fat', label: 'FAT' },
        { key: 'coredump', label: 'Core Dump' },
        { key: 'phy', label: 'PHY' },
        { key: 'test', label: 'Test' }
    ];
    legendItemsEl.innerHTML = subtypes.map(s => `
        <span class="legend-item">
            <span class="legend-swatch" style="background:${PARTITION_SUBTYPE_COLORS[s.key] || PARTITION_TYPE_COLORS[s.key] || PARTITION_FALLBACK_COLOR};"></span>
            ${escapeHtml(s.label)}
        </span>
    `).join('');
}

/* ============ Partition Cards ============ */
function renderPartitions() {
    const partitions = state.partitionTable.partitions;
    emptyPartitionsEl.style.display = partitions.length === 0 ? 'block' : 'none';
    partitionsListEl.innerHTML = partitions.map((partition, index) =>
        partitionCardHTML(partition, index)
    ).join('');

    // Bind card events
    partitions.forEach((partition, index) => {
        bindPartitionCardEvents(partition, index);
    });

    $('clear-partitions-btn').disabled = partitions.length === 0;
    $('copy-csv-btn').disabled = partitions.length === 0;
    $('download-csv-btn').disabled = partitions.length === 0;
}

function partitionCardHTML(partition, index) {
    const isCustom = state.partitionTable.isCustomPartition(partition);
    const baseColor = getPartitionBaseColor(partition, index);
    const headerBg = lightenColor(baseColor, 0.28);
    const textColor = '#1f2933';
    const sliderMax = getSliderMaxForPartition(partition);
    const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
    const sliderMin = partition.custom && partition.type !== PARTITION_TYPE_APP ? CUSTOM_DATA_PARTITION_SIZE_STEP : alignment;
    const isCoupledOta = state.partitionTable.isCoupledOtaSlot(partition);
    const recommended = state.partitionTable.getRecommendedSize(partition.subtype);
    const showRecommendedButton = hasRecommendedSize(partition.subtype) && partition.size !== recommended;

    let offsetField;
    if (isCustom) {
        offsetField = `
            <div class="field-group">
                <label for="offset-${index}">Offset (optional)</label>
                <input type="text" id="offset-${index}" data-field="offset" placeholder="auto" value="${partition.fixedOffset ? formatHex(partition.offset) : ''}">
                <span class="field-hint">Blank = auto align</span>
            </div>`;
    } else {
        offsetField = `
            <div class="field-group">
                <label for="offset-display-${index}">Offset</label>
                <input type="text" id="offset-display-${index}" value="${formatHex(partition.offset)}" readonly disabled>
                <span class="field-hint">${partition.type === 'app' ? '0x10000 align' : '0x1000 align'}</span>
            </div>`;
    }

    let typeSubtypeField;
    if (isCustom) {
        typeSubtypeField = `
            <div class="field-group">
                <label for="type-${index}">Type / Subtype</label>
                <div style="display:flex;gap:6px;">
                    <input type="text" id="type-${index}" data-field="type" value="${escapeHtml(partition.type)}" style="width:45%;">
                    <input type="text" id="subtype-${index}" data-field="subtype" value="${escapeHtml(partition.subtype)}" style="width:55%;">
                </div>
            </div>`;
    } else {
        const subtypes = partition.type === PARTITION_TYPE_APP ? PARTITION_APP_SUBTYPES : PARTITION_DATA_SUBTYPES;
        typeSubtypeField = `
            <div class="field-group">
                <label for="type-${index}">Type</label>
                <select id="type-${index}" data-field="type-select">
                    <option value="app" ${partition.type === 'app' ? 'selected' : ''}>app</option>
                    <option value="data" ${partition.type === 'data' ? 'selected' : ''}>data</option>
                </select>
            </div>
            <div class="field-group">
                <label for="subtype-${index}">Subtype</label>
                <select id="subtype-${index}" data-field="subtype-select">
                    ${subtypes.map(s => `<option value="${s}" ${partition.subtype === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>`;
    }

    return `
    <div class="partition-card" data-idx="${index}" data-name="${escapeHtml(partition.name)}">
        <div class="partition-card__header" style="background:${headerBg};">
            <div class="partition-card__label">
                <span class="partition-dot" style="background:${baseColor};"></span>
                <span class="partition-card__type">${escapeHtml(partition.type)} / ${escapeHtml(partition.subtype)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="partition-card__size">${formatHintSize(partition.size)} (${formatHex(partition.size)})</span>
                ${isCustom ? '<span class="legend-item" style="font-size:0.6rem;">Custom</span>' : ''}
            </div>
        </div>
        <div class="partition-card__body">
            <div class="partition-fields">
                <div class="field-group">
                    <label for="name-${index}">Name</label>
                    <input type="text" id="name-${index}" data-field="name" value="${escapeHtml(partition.name)}">
                </div>
                <div class="field-group">
                    <label for="size-input-${index}">Size (bytes)</label>
                    <input type="number" id="size-input-${index}" data-field="size" value="${partition.size}" min="${sliderMin}" step="${alignment}">
                    <span class="field-hint" id="size-hint-${index}">${formatHintSize(partition.size)}</span>
                </div>
                ${typeSubtypeField}
                ${offsetField}
                ${isCustom ? `
                <div class="field-group">
                    <label for="flags-${index}">Flags</label>
                    <input type="text" id="flags-${index}" data-field="flags" value="${escapeHtml(partition.flags || '')}" placeholder="e.g. encrypted">
                </div>` : ''}
            </div>
        </div>
        <div class="partition-card__footer">
            <div class="size-slider">
                <input type="range" class="slider-input" id="slider-${index}" data-field="slider"
                    min="${sliderMin}" max="${sliderMax}" step="${sliderMin}" value="${partition.size}"
                    ${isCoupledOta ? 'disabled title="Toggle \'Allow unequal OTA slots\' to resize individual OTA slots"' : ''}>
                <div class="slider-labels">
                    <span class="slider-min">${formatHintSize(sliderMin)}</span>
                    <span class="slider-max">${formatHintSize(sliderMax)}</span>
                </div>
            </div>
            <div class="partition-actions">
                <button class="icon-btn" data-action="recommended" title="Size to recommended value" ${showRecommendedButton ? '' : 'disabled'}>
                    <i class="fa-solid fa-check-double"></i>
                </button>
                <button class="icon-btn" data-action="reclaim" title="Reclaim next free block" ${state.partitionTable.getReclaimableMemory(partition) <= 0 ? 'disabled' : ''}>
                    <i class="fa-solid fa-angles-right"></i>
                </button>
                <button class="icon-btn" data-action="release-offset" title="Auto-align offset" ${!partition.fixedOffset ? 'disabled' : ''}>
                    <i class="fa-solid fa-link-slash"></i>
                </button>
                <button class="icon-btn danger" data-action="remove" title="Delete partition">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    </div>`;
}

function getSliderMaxForPartition(partition) {
    try {
        return state.partitionTable.getMaxPartitionSize(partition);
    } catch {
        return state.partitionTable.getTotalMemory();
    }
}

function hasRecommendedSize(subtype) {
    return ['nvs', 'ota', 'coredump', 'phy'].includes(subtype);
}

function bindPartitionCardEvents(partition, index) {
    const card = partitionsListEl.querySelector(`.partition-card[data-idx="${index}"]`);
    if (!card) return;

    card.addEventListener('input', e => {
        const field = e.target.dataset.field;
        if (!field) return;
        if (field === 'name') {
            partition.name = e.target.value;
        } else if (field === 'size') {
            const val = parseInt(e.target.value, 10);
            if (!Number.isNaN(val) && val > 0) {
                handleLiveSizeChange(partition, val, index);
            }
        }
    });

    card.addEventListener('change', e => {
        const field = e.target.dataset.field;
        if (!field) return;
        const value = e.target.value;

        if (field === 'name') {
            partition.name = value || partition.name;
            state.partitionTable.ensureNamedUnique(partition);
            renderPartitions();
        } else if (field === 'type' || field === 'subtype') {
            if (field === 'type') {
                partition.type = value;
                partition.subtype = partition.type === 'app' ? 'factory' : 'nvs';
            } else {
                partition.subtype = value;
                if (partition.subtype === 'ota') {
                    partition.size = state.partitionTable.getRecommendedSize('ota');
                }
            }
            state.partitionTable.recalculateOffsets();
            renderPartitions();
        } else if (field === 'type-select') {
            partition.type = value;
            partition.subtype = partition.type === 'app' ? 'factory' : 'nvs';
            partition.custom = state.partitionTable.isCustomPartition(partition);
            state.partitionTable.recalculateOffsets();
            renderPartitions();
        } else if (field === 'subtype-select') {
            partition.subtype = value;
            if (partition.subtype === 'ota') {
                partition.size = state.partitionTable.getRecommendedSize('ota');
            }
            partition.custom = state.partitionTable.isCustomPartition(partition);
            state.partitionTable.recalculateOffsets();
            renderPartitions();
        } else if (field === 'size') {
            const val = parseInt(value, 10);
            if (!Number.isNaN(val) && val > 0) {
                state.partitionTable.updatePartitionSize(partition, val);
                renderAll();
            }
        } else if (field === 'offset') {
            updateCustomOffset(partition, value);
        } else if (field === 'flags') {
            partition.flags = value;
            state.partitionTable.recalculateOffsets();
            renderPartitions();
        }
    });

    const slider = card.querySelector(`#slider-${index}`);
    if (slider && !slider.disabled) {
        slider.addEventListener('input', e => {
            handleLiveSizeChange(partition, parseInt(e.target.value, 10), index);
        });
        slider.addEventListener('change', e => {
            const val = parseInt(e.target.value, 10);
            state.partitionTable.updatePartitionSize(partition, val);
            renderAll();
        });
    }

    card.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'remove') {
                state.partitionTable.removePartition(partition.name);
                renderAll();
            } else if (action === 'recommended') {
                const recommended = state.partitionTable.getRecommendedSize(partition.subtype);
                state.partitionTable.updatePartitionSize(partition, recommended);
                renderAll();
            } else if (action === 'reclaim') {
                const reclaimable = state.partitionTable.getReclaimableMemory(partition);
                if (reclaimable > 0) {
                    state.partitionTable.updatePartitionSize(partition, partition.size + reclaimable);
                    renderAll();
                }
            } else if (action === 'release-offset') {
                partition.fixedOffset = false;
                state.partitionTable.recalculateOffsets();
                renderAll();
            }
        });
    });
}

function handleLiveSizeChange(partition, newSize, index) {
    const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
    let clamped = Math.max(alignment, newSize);
    const sliderMax = getSliderMaxForPartition(partition);
    if (partition.custom && partition.type !== PARTITION_TYPE_APP) {
        clamped = Math.max(CUSTOM_DATA_PARTITION_SIZE_STEP, clamped);
        clamped = Math.floor(clamped / CUSTOM_DATA_PARTITION_SIZE_STEP) * CUSTOM_DATA_PARTITION_SIZE_STEP;
    } else {
        clamped = Math.floor(clamped / alignment) * alignment;
    }
    clamped = Math.min(clamped, sliderMax);

    // Coupled OTA slots
    if (state.partitionTable.isCoupledOtaSlot(partition)) {
        const other = state.partitionTable.partitions.find(p =>
            p !== partition && (p.subtype === 'ota_0' || p.subtype === 'ota_1')
        );
        partition.size = clamped;
        if (other) other.size = clamped;
    } else {
        partition.size = clamped;
    }

    // Update the size input + hint live without full re-render (keeps slider smooth)
    const sizeInput = partitionsListEl.querySelector(`#size-input-${index}`);
    if (sizeInput) sizeInput.value = clamped;
    const sizeHint = partitionsListEl.querySelector(`#size-hint-${index}`);
    if (sizeHint) sizeHint.textContent = formatHintSize(clamped);
    const sizeLabel = partitionsListEl.querySelector(`.partition-card[data-idx="${index}"] .partition-card__size`);
    if (sizeLabel) sizeLabel.textContent = `${formatHintSize(clamped)} (${formatHex(clamped)})`;

    state.partitionTable.recalculateOffsets();
    renderVisualizer();
    renderStats();
    renderTableInfo();
    renderCSV();
}

function updateCustomOffset(partition, value) {
    const trimmed = value.trim();
    if (!trimmed) {
        partition.fixedOffset = false;
        state.partitionTable.recalculateOffsets();
        renderAll();
        return;
    }
    let parsed;
    try {
        parsed = parseInt(trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed : `0x${trimmed}`, 16);
    } catch {
        showToast('Invalid offset format. Use hex like 0x10000.', 'error');
        return;
    }
    if (Number.isNaN(parsed)) {
        showToast('Invalid offset format. Use hex like 0x10000.', 'error');
        return;
    }
    const alignment = partition.type === PARTITION_TYPE_APP ? OFFSET_APP_TYPE : OFFSET_DATA_TYPE;
    if (parsed % alignment !== 0) {
        showToast(`Offset must align to ${formatHex(alignment)}.`, 'error');
        return;
    }
    const baseOffset = state.partitionTable.getPartitionTableBaseOffset();
    if (parsed < baseOffset) {
        showToast(`Offset must be at or after ${formatHex(baseOffset)}.`, 'error');
        return;
    }
    partition.offset = parsed;
    partition.fixedOffset = true;
    state.partitionTable.recalculateOffsets();
    renderAll();
}

/* ============ Presets & Quick Add ============ */
function populatePresets() {
    presetSelectEl.innerHTML = PARTITION_PRESETS.map((preset, i) =>
        `<option value="${i}">${escapeHtml(preset.name)}</option>`
    ).join('');
    presetSelectEl.value = state.selectedPresetIndex;
}

function applyPreset(index) {
    const preset = PARTITION_PRESETS[index];
    if (!preset) return;
    state.partitionTable.clearPartitions();
    state.partitionTable.allowUnequalOtaSlots = false;
    unequalOtaToggle.checked = false;
    preset.partitions.forEach(p => {
        state.partitionTable.addPartition(
            p.name, p.type, p.subtype, p.size, p.flags || '',
            undefined, false, p.custom || false
        );
    });
    state.selectedPresetIndex = index;
    flashSizeBadge.textContent = `${state.flashSizeMB} MB`;
    renderAll();
    showToast(`Loaded preset: ${preset.name}`);
}

function addQuickPartition(kind) {
    const pt = state.partitionTable;
    try {
        switch (kind) {
            case 'nvs':
                if (pt.hasSubtype('nvs')) {
                    showToast('An NVS partition already exists.', 'warning');
                    return;
                }
                pt.addPartition('nvs', 'data', 'nvs', NVS_PARTITION_SIZE_RECOMMENDED, '');
                break;
            case 'ota':
                if (pt.hasSubtype('ota') || pt.hasSubtype('ota_0')) {
                    showToast('OTA partitions already exist.', 'warning');
                    return;
                }
                pt.addPartition('otadata', 'data', 'ota', OTA_DATA_PARTITION_SIZE, '');
                pt.addPartition('app0', 'app', 'ota_0', 0x140000, '');
                pt.addPartition('app1', 'app', 'ota_1', 0x140000, '');
                break;
            case 'factory':
                pt.addPartition('factory', 'app', 'factory', 0x1E0000, '');
                break;
            case 'spiffs':
                pt.addPartition('spiffs', 'data', 'spiffs', SPIFFS_MIN_PARTITION_SIZE * 2, '');
                break;
            case 'littlefs':
                pt.addPartition('littlefs', 'data', 'littlefs', LITTLEFS_MIN_PARTITION_SIZE * 2, '');
                break;
            case 'fat':
                pt.addPartition('storage', 'data', 'fat', FAT_MIN_PARTITION_SIZE, '');
                break;
            case 'coredump':
                pt.addPartition('coredump', 'data', 'coredump', COREDUMP_MIN_PARTITION_SIZE, '');
                break;
            case 'phy':
                pt.addPartition('phy_init', 'data', 'phy', PHY_MIN_PARTITION_SIZE, '');
                break;
            case 'custom':
                pt.addPartition('custom_1', 'data', 'custom', OFFSET_DATA_TYPE, '', undefined, false, true);
                break;
        }
        pt.recalculateOffsets();
        renderAll();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/* ============ CSV Actions ============ */
function renderCSV() {
    csvPreviewEl.value = state.partitionTable.partitions.length === 0
        ? '# Name,Type,SubType,Offset,Size,Flags'
        : generateCSV(state.partitionTable.partitions);
}

function copyCSV() {
    const csv = generateCSV(state.partitionTable.partitions);
    navigator.clipboard.writeText(csv).then(() => {
        showToast('CSV copied to clipboard.');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = csv;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        showToast('CSV copied to clipboard.');
    });
}

function downloadCSV() {
    const csv = generateCSV(state.partitionTable.partitions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partitions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('partitions.csv downloaded.');
}

function applyCsvText(csv) {
    try {
        const result = loadPartitionsFromCsv(csv, state.partitionTable);
        if (result.flashSizeMB) {
            state.flashSizeMB = result.flashSizeMB;
            state.partitionTable.setFlashSize(result.flashSizeMB);
        }
        state.partitionTableOffset = state.partitionTable.partitionTableOffset;
        syncControlsFromState();
        renderAll();
        showToast(`Imported ${state.partitionTable.partitions.length} partition(s).`);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/* ============ Flash Command ============ */
function renderFlashCommand() {
    const target = getChipTarget(state.selectedChip);
    const cmd = buildFlashCommand(state.selectedChip, state.partitionTableOffset);
    flashCommandEl.textContent = cmd;
}

/* ============ UI Sync ============ */
function syncControlsFromState() {
    flashSizeBadge.textContent = `${state.flashSizeMB} MB`;
    document.querySelectorAll('.filter-btn[data-flash]').forEach(btn => {
        const flash = parseInt(btn.dataset.flash, 10);
        const active = flash === state.flashSizeMB;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
    ptOffsetSelectEl.value = PARTITION_TABLE_OFFSET_OPTIONS.some(o => o.value === state.partitionTableOffset)
        ? `0x${state.partitionTableOffset.toString(16)}`
        : 'custom';
    if (ptOffsetSelectEl.value === 'custom') {
        ptOffsetCustomRow.style.display = '';
        ptOffsetCustomInput.value = formatHex(state.partitionTableOffset);
    } else {
        ptOffsetCustomRow.style.display = 'none';
    }
    displaySizeSelectEl.value = String(state.displaySizeUnit);
}

function updateFlashSizeButtons() {
    syncControlsFromState();
}

/* ============ Event Wiring ============ */
function init() {
    populatePresets();

    // Flash size filter buttons
    document.querySelectorAll('.filter-btn[data-flash]').forEach(btn => {
        btn.addEventListener('click', () => {
            const flashMB = parseInt(btn.dataset.flash, 10);
            if (!FLASH_SIZES_MB.has(flashMB)) return;
            state.flashSizeMB = flashMB;
            try {
                state.partitionTable.setFlashSize(flashMB);
            } catch (err) {
                showToast(err.message, 'error');
            }
            flashSizeBadge.textContent = `${flashMB} MB`;
            syncControlsFromState();
            renderAll();
        });
    });

    // Partition table offset select
    ptOffsetSelectEl.addEventListener('change', () => {
        const value = ptOffsetSelectEl.value;
        if (value === 'custom') {
            ptOffsetCustomRow.style.display = '';
            return;
        }
        const offset = parseInt(value, 16);
        applyPartitionTableOffset(offset);
    });

    ptOffsetApplyBtn.addEventListener('click', () => {
        const raw = ptOffsetCustomInput.value.trim();
        let parsed;
        try {
            parsed = parseInt(raw.startsWith('0x') || raw.startsWith('0X') ? raw : `0x${raw}`, 16);
        } catch {
            showToast('Invalid offset. Use hex like 0x18000.', 'error');
            return;
        }
        if (Number.isNaN(parsed)) {
            showToast('Invalid offset. Use hex like 0x18000.', 'error');
            return;
        }
        applyPartitionTableOffset(parsed);
    });

    ptOffsetCustomInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') ptOffsetApplyBtn.click();
    });

    function applyPartitionTableOffset(offset) {
        try {
            state.partitionTable.setPartitionTableOffset(offset);
            state.partitionTableOffset = offset;
            syncControlsFromState();
            renderAll();
            showToast(`Partition table offset set to ${formatHex(offset)}.`);
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    // Preset select
    presetSelectEl.addEventListener('change', () => {
        applyPreset(parseInt(presetSelectEl.value, 10));
    });

    // Chip select
    chipSelectEl.addEventListener('change', () => {
        state.selectedChip = chipSelectEl.value;
        renderFlashCommand();
    });

    // Display size unit
    displaySizeSelectEl.addEventListener('change', () => {
        state.displaySizeUnit = parseInt(displaySizeSelectEl.value, 10);
        renderAll();
    });

    // Unequal OTA toggle
    unequalOtaToggle.addEventListener('change', () => {
        state.allowUnequalOtaSlots = unequalOtaToggle.checked;
        state.partitionTable.setAllowUnequalOtaSlots(unequalOtaToggle.checked);
        renderAll();
    });

    // Quick add buttons
    document.querySelectorAll('.tag-btn[data-add]').forEach(btn => {
        btn.addEventListener('click', () => addQuickPartition(btn.dataset.add));
    });

    // Clear partitions
    $('clear-partitions-btn').addEventListener('click', () => {
        state.partitionTable.clearPartitions();
        renderAll();
        showToast('All partitions cleared.');
    });

    // CSV actions
    $('copy-csv-btn').addEventListener('click', copyCSV);
    $('download-csv-btn').addEventListener('click', downloadCSV);

    $('load-csv-btn').addEventListener('click', () => $('csv-file-input').click());
    $('csv-file-input').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            applyCsvText(ev.target.result);
            e.target.value = '';
        };
        reader.readAsText(file);
    });

    // Paste modal
    const pasteModal = $('paste-modal');
    $('paste-csv-btn').addEventListener('click', () => {
        $('paste-csv-input').value = '';
        pasteModal.style.display = 'flex';
        setTimeout(() => $('paste-csv-input').focus(), 50);
    });
    $('paste-modal-close').addEventListener('click', () => pasteModal.style.display = 'none');
    $('paste-csv-cancel').addEventListener('click', () => pasteModal.style.display = 'none');
    $('paste-csv-confirm').addEventListener('click', () => {
        const csv = $('paste-csv-input').value;
        if (!csv.trim()) {
            showToast('Please paste some CSV content.', 'warning');
            return;
        }
        applyCsvText(csv);
        pasteModal.style.display = 'none';
    });
    pasteModal.addEventListener('click', e => {
        if (e.target === pasteModal) pasteModal.style.display = 'none';
    });

    // Copy flash command
    $('copy-command-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(flashCommandEl.textContent).then(() => {
            showToast('Flash command copied.');
        }).catch(() => showToast('Failed to copy command.', 'error'));
    });

    // Load default preset
    applyPreset(1); // "OTA With SPIFFS" as a useful default layout
    syncControlsFromState();
    renderAll();
}

document.addEventListener('DOMContentLoaded', init);
