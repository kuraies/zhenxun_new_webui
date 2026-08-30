import type { Component } from "vue";

export type Trend = "up" | "down" | "stable";

export type NetworkReachability = boolean | "checking";

export interface DashboardSystemInfo {
    version: string;
    system: string;
    cpuBrand: string;
    cpuCores: number;
    cpuFreq: number;
    memoryTotal: number;
    diskTotal: number;
}

export interface DashboardNetworkStatus {
    google: NetworkReachability;
    baidu: NetworkReachability;
}

export interface DashboardStatCard {
    id: string;
    title: string;
    value: number;
    icon: Component;
    bgClass?: string;
    colorClass: string;
    filled?: boolean;
    strokeWidth?: number;
    change?: number | null;
    trend: Trend;
}
