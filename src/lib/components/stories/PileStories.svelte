<script lang="ts">
	// The pile-height stories, full screen like Instagram: ① the unread pile now,
	// ② what a fair added (when there is one with books). Tap the right half for
	// the next story, the left for the previous; ← → and Esc on a keyboard.
	// "Save both" sends both PNGs to the share sheet in one go. Numbers in
	// $lib/stories/pile, drawing in $lib/stories/pileImage.
	import { X, Download, LoaderCircle } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { formatDay } from '$lib/console/logic';
	import { fairAdd, pileFileName, pileOf } from '$lib/stories/pile';
	import { drawStory, fairStory, pileStory } from '$lib/stories/pileImage';
	import { canvasToPng, saveImages, type ImageFile } from '$lib/utils/saveImages';
	import type { BookListItem, SeriesListItem, SeriesType } from '$lib/types';

	let {
		open = $bindable(false),
		books,
		series,
		fair = null,
		today
	}: {
		open?: boolean;
		books: readonly BookListItem[];
		series: readonly SeriesListItem[];
		/** The fair story ② is about; null = story ① only */
		fair?: { id: number; name: string } | null;
		/** `YYYY-MM-DD`, this device's day */
		today: string;
	} = $props();

	type Rendered = ImageFile & { url: string; alt: string };

	let images = $state<Rendered[]>([]);
	let index = $state(0);
	let rendering = $state(false);
	let saving = $state(false);

	async function render(): Promise<Rendered[]> {
		// The canvas only draws in Google Sans once the font has loaded
		await document.fonts?.ready;
		const typeOf = new Map<number, SeriesType>(series.map((s) => [s.id, s.type]));
		const dateLabel = formatDay(today);
		const pile = pileOf(books, typeOf);
		const out: Rendered[] = [];
		const first = pileStory(pile, dateLabel);
		const blob1 = await canvasToPng(drawStory(first, pile.cm));
		out.push({
			blob: blob1,
			fileName: pileFileName(today),
			url: URL.createObjectURL(blob1),
			alt: `${first.kicker}: ${first.big}. ${first.line}. ${first.sub}.`
		});
		if (fair) {
			const add = fairAdd(books, typeOf, fair.id);
			if (add.books > 0) {
				const withFair = pileOf(books, typeOf, fair.id);
				const second = fairStory(withFair, add, fair.name, dateLabel);
				const blob2 = await canvasToPng(drawStory(second, withFair.cm));
				out.push({
					blob: blob2,
					fileName: pileFileName(today, fair.id),
					url: URL.createObjectURL(blob2),
					alt: `${second.kicker}: ${second.big}. ${second.line}. ${second.sub}.`
				});
			}
		}
		return out;
	}

	function release() {
		for (const i of images) URL.revokeObjectURL(i.url);
		images = [];
	}

	// Draw when opened (the data may have changed since last time), free when closed
	$effect(() => {
		if (!open) {
			untrack(release);
			return;
		}
		let cancelled = false;
		index = 0;
		rendering = true;
		render()
			.then((out) => {
				if (cancelled) out.forEach((i) => URL.revokeObjectURL(i.url));
				else images = out;
			})
			.catch((err) => {
				toast.error(err instanceof Error ? err.message : "Couldn't draw the stories");
				open = false;
			})
			.finally(() => {
				if (!cancelled) rendering = false;
			});
		return () => {
			cancelled = true;
		};
	});

	function next() {
		if (index < images.length - 1) index++;
		else open = false;
	}

	function previous() {
		if (index > 0) index--;
	}

	async function save(which: Rendered[]) {
		if (saving || which.length === 0) return;
		saving = true;
		try {
			const how = await saveImages(which, 'Unread pile');
			if (how === 'downloaded') toast.success(`Saved ${which.map((i) => i.fileName).join(', ')}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Couldn't save the image");
		} finally {
			saving = false;
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') open = false;
		else if (e.key === 'ArrowRight') next();
		else if (e.key === 'ArrowLeft') previous();
	}
</script>

<svelte:window {onkeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex flex-col bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
		role="dialog"
		aria-modal="true"
		aria-label="Unread pile stories"
	>
		<div class="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
			<div class="flex items-center gap-1.5 px-3 pt-3">
				{#each images as image, i (image.fileName)}
					<div class="h-1 flex-1 rounded-full {i <= index ? 'bg-white' : 'bg-white/30'}"></div>
				{/each}
				<button
					type="button"
					onclick={() => (open = false)}
					aria-label="Close"
					class="ml-2 flex h-11 w-11 items-center justify-center rounded-full text-white active:bg-white/10"
				>
					<X class="h-6 w-6" />
				</button>
			</div>

			<div class="relative flex min-h-0 flex-1 items-center justify-center px-3 py-2">
				{#if rendering || images.length === 0}
					<LoaderCircle class="h-8 w-8 animate-spin text-white/70" />
				{:else}
					<img
						src={images[index].url}
						alt={images[index].alt}
						class="max-h-full max-w-full rounded-xl object-contain select-none"
						draggable="false"
					/>
					<button
						type="button"
						class="absolute inset-y-0 left-0 w-1/3"
						aria-label="Previous story"
						onclick={previous}
					></button>
					<button
						type="button"
						class="absolute inset-y-0 right-0 w-2/3"
						aria-label="Next story"
						onclick={next}
					></button>
				{/if}
			</div>

			<div class="flex gap-2 px-3 pt-1 pb-3">
				{#if images.length > 1}
					<button
						type="button"
						disabled={saving || rendering}
						onclick={() => save(images)}
						class="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-base font-medium text-zinc-950 active:bg-zinc-200 disabled:opacity-60"
					>
						<Download class="h-5 w-5" /> Save both
					</button>
					<button
						type="button"
						disabled={saving || rendering}
						onclick={() => save([images[index]])}
						class="min-h-12 rounded-xl border border-white/40 bg-transparent px-4 text-base font-medium text-white active:bg-white/10 disabled:opacity-60"
					>
						This one
					</button>
				{:else}
					<button
						type="button"
						disabled={saving || rendering || images.length === 0}
						onclick={() => save(images)}
						class="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-base font-medium text-zinc-950 active:bg-zinc-200 disabled:opacity-60"
					>
						<Download class="h-5 w-5" /> Save image
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
