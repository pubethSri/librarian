// ─── Copy text, also over plain HTTP ─────────────────────────────────────────
// `navigator.clipboard` exists only in secure contexts (HTTPS / localhost),
// so the app opened by LAN IP or a plain-HTTP deploy needs the old
// textarea + execCommand route. Returns false when neither works — the
// caller then shows the text for a manual copy.

export async function copyText(text: string): Promise<boolean> {
	try {
		if (window.isSecureContext && navigator.clipboard) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Permission refused or not focused: try the fallback
	}
	try {
		const area = document.createElement('textarea');
		area.value = text;
		area.setAttribute('readonly', '');
		area.style.position = 'fixed';
		area.style.top = '0';
		area.style.opacity = '0';
		document.body.appendChild(area);
		area.select();
		area.setSelectionRange(0, text.length);
		const ok = document.execCommand('copy');
		area.remove();
		return ok;
	} catch {
		return false;
	}
}
