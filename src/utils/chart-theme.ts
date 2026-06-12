import type { ChartOptions } from "chart.js";
import { getActiveTheme, type ThemeColorName } from "@/theme";

type ChartKind = "line" | "bar" | "pie";

export const chartColors = getActiveTheme().charts;

export const getChartColors = () => getActiveTheme().charts;

const paletteOrder: ThemeColorName[] = [
    "blue",
    "green",
    "pink",
    "amber",
    "violet",
    "cyan",
    "rose",
    "slate",
];

export const getChartPalette = () => {
    const colors = getChartColors();

    return paletteOrder.map((name) => colors[name]);
};

export const pieBackgroundColors = getChartPalette().map(
    (color) => color.soft,
);
export const pieBorderColors = getChartPalette().map((color) => color.solid);

const cssToken = (name: string, fallback: string) => {
    if (typeof window === "undefined") {
        return fallback;
    }

    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();

    return value || fallback;
};

export const themeChartTextColor = cssToken(
    "--zx-color-text-muted",
    "#64748b",
);

const basePluginOptions = {
    legend: {
        labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: "circle" as const,
            color: themeChartTextColor,
            padding: 14,
            font: {
                size: 11,
                weight: 500,
            },
        },
    },
    tooltip: {
        backgroundColor: cssToken(
            "--zx-chart-tooltip",
            "rgba(255, 255, 255, 0.96)",
        ),
        titleColor: cssToken("--zx-color-text-strong", "#0f172a"),
        bodyColor: cssToken("--zx-color-text-muted", "#475569"),
        borderColor: cssToken("--zx-color-border", "#e2e8f0"),
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        boxPadding: 6,
        displayColors: true,
    },
};

const baseScaleOptions = {
    border: {
        display: false,
    },
    grid: {
        color: cssToken("--zx-chart-grid", "rgba(226, 232, 240, 0.72)"),
        drawTicks: false,
    },
    ticks: {
        color: cssToken("--zx-color-text-subtle", "#94a3b8"),
        padding: 8,
        font: {
            size: 11,
        },
    },
};

export const createLineOptions = (
    overrides: ChartOptions<"line"> = {},
): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: "index",
        intersect: false,
    },
    animation: {
        duration: 650,
        easing: "easeOutQuart",
    },
    elements: {
        line: {
            borderWidth: 2,
            tension: 0.38,
            capBezierPoints: true,
        },
        point: {
            radius: 2,
            hoverRadius: 5,
            borderWidth: 2,
            hitRadius: 8,
        },
    },
    plugins: {
        ...basePluginOptions,
        legend: {
            position: "top",
            align: "end",
            labels: basePluginOptions.legend.labels,
        },
    },
    scales: {
        x: {
            ...baseScaleOptions,
            grid: {
                display: false,
            },
        },
        y: {
            ...baseScaleOptions,
            beginAtZero: true,
        },
    },
    ...overrides,
});

export const createBarOptions = (
    overrides: ChartOptions<"bar"> = {},
): ChartOptions<"bar"> => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 650,
        easing: "easeOutQuart",
    },
    plugins: {
        ...basePluginOptions,
        legend: {
            display: false,
        },
    },
    scales: {
        x: {
            ...baseScaleOptions,
            grid: {
                display: false,
            },
            ticks: {
                ...baseScaleOptions.ticks,
                maxRotation: 35,
                minRotation: 0,
            },
        },
        y: {
            ...baseScaleOptions,
            beginAtZero: true,
            ticks: {
                ...baseScaleOptions.ticks,
                precision: 0,
            },
        },
    },
    ...overrides,
});

export const createPieOptions = (
    overrides: ChartOptions<"pie"> = {},
): ChartOptions<"pie"> => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 650,
        animateScale: true,
        animateRotate: true,
        easing: "easeOutQuart",
    },
    plugins: {
        ...basePluginOptions,
        legend: {
            position: "right",
            labels: {
                ...basePluginOptions.legend.labels,
                padding: 12,
            },
        },
    },
    ...overrides,
});

export const createDatasetStyle = (
    color: ThemeColorName,
    kind: ChartKind,
) => {
    const item = getChartColors()[color];

    if (kind === "bar") {
        return {
            backgroundColor: item.soft,
            borderColor: item.solid,
            borderWidth: 1,
            borderRadius: 8,
            hoverBackgroundColor: item.solid,
        };
    }

    if (kind === "pie") {
        return {
            backgroundColor: getChartPalette().map((color) => color.soft),
            borderColor: "#ffffff",
            hoverBorderColor: getChartPalette().map((color) => color.solid),
            borderWidth: 2,
            hoverOffset: 6,
        };
    }

    return {
        backgroundColor: item.fill,
        borderColor: item.solid,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: item.solid,
        pointHoverBackgroundColor: item.solid,
        pointHoverBorderColor: "#ffffff",
        fill: true,
        tension: 0.38,
    };
};

export const createLineDatasetStyle = (color: ThemeColorName) => {
    const item = getChartColors()[color];

    return {
        backgroundColor: item.fill,
        borderColor: item.solid,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: item.solid,
        pointHoverBackgroundColor: item.solid,
        pointHoverBorderColor: "#ffffff",
        fill: true,
        tension: 0.38,
    };
};

export const createBarDatasetStyle = (color: ThemeColorName) => {
    const item = getChartColors()[color];

    return {
        backgroundColor: item.soft,
        borderColor: item.solid,
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: item.solid,
    };
};

export const createPieDatasetStyle = () => ({
    backgroundColor: getChartPalette().map((color) => color.soft),
    borderColor: "#ffffff",
    hoverBorderColor: getChartPalette().map((color) => color.solid),
    borderWidth: 2,
    hoverOffset: 6,
});
