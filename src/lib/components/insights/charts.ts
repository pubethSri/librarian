// ─── Insights: chart configs ────────────────────────────────────────────────
// Builders for the few chart forms the Insights page uses, so every chart
// shares one look: thin bars (≤ 24px, 4px rounded end, square at the
// baseline), a 2px surface gap between stacked segments, hairline grid,
// muted axis text, a legend only for two or more series, never two y-axes.
//
// Colours (validated with the dataviz palette checker on the white surface):
// - Read states use one set everywhere — Read blue, Reading aqua, Dropped
//   orange — and Unread is a deliberate neutral grey: the pile is "not yet",
//   so it recedes. Legends + the data table carry identity, not colour alone.
// - Series types use a second, separate pair (violet / yellow) so no hue
//   means two things on one page.

import type { ChartConfiguration, TooltipItem } from 'chart.js';
import type { ReadState, SeriesType } from '$lib/types';

export const INK = '#0a0a0a';
export const MUTED = '#737373';
export const GRID = '#ececec';
export const SURFACE = '#ffffff';
/** A single series with nothing to tell apart */
export const NEUTRAL = '#3f3f46';

export const READ_STATE_COLORS: Record<ReadState, string> = {
	read: '#2a78d6',
	reading: '#1baf7a',
	unread: '#d4d4d8',
	dropped: '#eb6834'
};

export const TYPE_COLORS: Record<SeriesType, string> = {
	light_novel: '#4a3aa7',
	manga: '#eda100'
};

export type ChartSeries = { label: string; data: number[]; color: string };

type Format = (value: number) => string;

const plain: Format = (v) => v.toLocaleString('en-US');

type BarOptions = {
	labels: string[];
	series: ChartSeries[];
	stacked?: boolean;
	/** Bars grow left → right, labels on the y-axis */
	horizontal?: boolean;
	/** Axis ticks + tooltip values */
	format?: Format;
	/** Fix the value axis (e.g. 100 for percentages) */
	max?: number;
	/** Hide the value axis ticks (money hidden) */
	hideValueAxis?: boolean;
};

function legend(count: number) {
	return {
		display: count >= 2,
		position: 'top' as const,
		align: 'start' as const,
		labels: {
			color: INK,
			boxWidth: 10,
			boxHeight: 10,
			usePointStyle: true,
			pointStyle: 'rectRounded'
		}
	};
}

function tooltip(format: Format) {
	return {
		backgroundColor: INK,
		titleColor: '#ffffff',
		bodyColor: '#ffffff',
		padding: 8,
		cornerRadius: 6,
		boxPadding: 4,
		callbacks: {
			label: (item: TooltipItem<'bar' | 'line'>) =>
				` ${item.dataset.label}: ${format(Number(item.raw))}`
		}
	};
}

const categoryAxis = {
	grid: { display: false },
	border: { color: '#d4d4d4' },
	ticks: { color: MUTED, font: { size: 11 }, autoSkipPadding: 12, maxRotation: 0 }
};

function valueAxis(format: Format, max: number | undefined, hidden: boolean) {
	return {
		beginAtZero: true,
		max,
		grid: { color: GRID, lineWidth: 1 },
		border: { display: false },
		ticks: {
			color: MUTED,
			font: { size: 11 },
			maxTicksLimit: 5,
			precision: 0,
			callback: (value: string | number) => (hidden ? '' : format(Number(value)))
		}
	};
}

export function barChart(opts: BarOptions): ChartConfiguration<'bar'> {
	const format = opts.format ?? plain;
	const horizontal = opts.horizontal ?? false;
	const stacked = opts.stacked ?? false;
	const last = opts.series.length - 1;
	// The gap sits at each segment's far end, so stacked segments never touch
	const gapSide = horizontal ? 'right' : 'top';

	return {
		type: 'bar',
		data: {
			labels: opts.labels,
			datasets: opts.series.map((s, i) => ({
				label: s.label,
				data: s.data,
				backgroundColor: s.color,
				hoverBackgroundColor: s.color,
				maxBarThickness: 24,
				borderRadius: !stacked || i === last ? 4 : 0,
				borderSkipped: 'start' as const,
				borderColor: SURFACE,
				borderWidth: stacked ? { [gapSide]: 2 } : 0,
				categoryPercentage: 0.8,
				barPercentage: stacked ? 0.9 : 0.85
			}))
		},
		options: {
			indexAxis: horizontal ? 'y' : 'x',
			responsive: true,
			maintainAspectRatio: false,
			animation: { duration: 250 },
			interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
			plugins: { legend: legend(opts.series.length), tooltip: tooltip(format) },
			scales: horizontal
				? {
						x: { stacked, ...valueAxis(format, opts.max, opts.hideValueAxis ?? false) },
						y: { stacked, ...categoryAxis, ticks: { ...categoryAxis.ticks, autoSkip: false } }
					}
				: {
						x: { stacked, ...categoryAxis },
						y: { stacked, ...valueAxis(format, opts.max, opts.hideValueAxis ?? false) }
					}
		}
	};
}

export function lineChart(opts: {
	labels: string[];
	series: ChartSeries[];
	format?: Format;
}): ChartConfiguration<'line'> {
	const format = opts.format ?? plain;
	return {
		type: 'line',
		data: {
			labels: opts.labels,
			datasets: opts.series.map((s) => ({
				label: s.label,
				data: s.data,
				borderColor: s.color,
				backgroundColor: `${s.color}1a`, // ~10% wash
				fill: true,
				borderWidth: 2,
				borderCapStyle: 'round' as const,
				borderJoinStyle: 'round' as const,
				tension: 0.25,
				pointRadius: 0,
				pointHoverRadius: 5,
				pointHoverBorderWidth: 2,
				pointHoverBorderColor: SURFACE,
				pointHoverBackgroundColor: s.color
			}))
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: { duration: 250 },
			interaction: { mode: 'index', intersect: false },
			plugins: { legend: legend(opts.series.length), tooltip: tooltip(format) },
			scales: { x: categoryAxis, y: valueAxis(format, undefined, false) }
		}
	};
}
