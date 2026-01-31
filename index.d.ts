export as namespace BLEAdvertiser;

export interface ScanOptions {
    numberOfMatches?: number;
    matchMode?: number;
    scanMode?: number;
    reportDelay?: number;
}

export interface BroadcastOptions {
    txPowerLevel?: number;
    advertiseMode?: number;
    includeDeviceName?: boolean;
    includeTxPowerLevel?: boolean;
    connectable?: boolean;
}

// CONST
export const ADVERTISE_MODE_BALANCED: number;
export const ADVERTISE_MODE_LOW_LATENCY: number;
export const ADVERTISE_MODE_LOW_POWER: number;
export const ADVERTISE_TX_POWER_HIGH: number;
export const ADVERTISE_TX_POWER_LOW: number;
export const ADVERTISE_TX_POWER_MEDIUM: number;
export const ADVERTISE_TX_POWER_ULTRA_LOW: number;
export const SCAN_MODE_BALANCED: number;
export const SCAN_MODE_LOW_LATENCY: number;
export const SCAN_MODE_LOW_POWER: number;
export const SCAN_MODE_OPPORTUNISTIC: number;
export const MATCH_MODE_AGGRESSIVE: number;
export const MATCH_MODE_STICKY: number;
export const MATCH_NUM_FEW_ADVERTISEMENT: number;
export const MATCH_NUM_MAX_ADVERTISEMENT: number;
export const MATCH_NUM_ONE_ADVERTISEMENT: number;


export function setCompanyId(companyId: number): void;
export function broadcast(uid: String, manufData: number[], options?: BroadcastOptions): Promise<string>;
export function stopBroadcast(): Promise<string>;
export function scan(manufDataFilter: number[], options?: ScanOptions): Promise<string>;
export function scanByService(uidFilter: String, options?: ScanOptions): Promise<string>;
export function stopScan(): Promise<string>;
export function enableAdapter(): void;
export function disableAdapter(): void;
export function getAdapterState(): Promise<string>;
export function isActive(): Promise<boolean>;