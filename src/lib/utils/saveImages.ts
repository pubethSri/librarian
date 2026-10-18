// ─── Save images from the browser ────────────────────────────────────────────
// PNGs to the phone's gallery: the share sheet where the browser offers it
// (HTTPS — "Save image", Instagram…), else a download per file (Android →
// Downloads; iPhone → Files / long-press). Used by the Hitlist image and the
// pile stories.

export type ImageFile = { blob: Blob; fileName: string };

/** A canvas as a PNG blob */
export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
	const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
	if (!blob) throw new Error("Couldn't create the image");
	return blob;
}

/** Share the files together, else download each; returns how they were saved */
export async function saveImages(
	images: readonly ImageFile[],
	title: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
	const files = images.map((i) => new File([i.blob], i.fileName, { type: 'image/png' }));
	try {
		if (navigator.canShare?.({ files })) {
			await navigator.share({ files, title });
			return 'shared';
		}
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
		// Share refused (not a user gesture, no permission): fall back to a download
	}
	for (const image of images) {
		const url = URL.createObjectURL(image.blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = image.fileName;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}
	return 'downloaded';
}
