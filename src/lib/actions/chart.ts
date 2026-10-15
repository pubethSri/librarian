// ─── use:chart ──────────────────────────────────────────────────────────────
// A thin Svelte action around Chart.js (svelte-chartjs predates runes):
// <canvas use:chart={config}></canvas>. A new config object updates the chart
// in place; a change of chart type rebuilds it.

import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	Filler,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	Tooltip,
	type ChartConfiguration
} from 'chart.js';
import type { Action } from 'svelte/action';

Chart.register(
	BarController,
	BarElement,
	LineController,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
	Filler,
	Legend,
	Tooltip
);

// Chart.js's config type is generic per chart type; the action accepts any of them
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChartConfig = ChartConfiguration<any>;

export const chart: Action<HTMLCanvasElement, AnyChartConfig> = (node, config) => {
	// Charts speak the app's typeface (a canvas can't inherit it)
	Chart.defaults.font.family = getComputedStyle(node).fontFamily;
	let instance = new Chart(node, config);
	let type = config.type;

	return {
		update(next: AnyChartConfig) {
			if (next.type !== type) {
				instance.destroy();
				instance = new Chart(node, next);
				type = next.type;
				return;
			}
			instance.data = next.data;
			instance.options = next.options ?? {};
			instance.update();
		},
		destroy() {
			instance.destroy();
		}
	};
};
