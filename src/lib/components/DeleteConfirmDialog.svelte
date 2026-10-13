<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	type Props = {
		open: boolean;
		title?: string;
		description: string;
		loading?: boolean;
		/** If set, user must type this exact text to enable the delete button */
		confirmText?: string;
		/** Confirm button text, and its in-progress text — for non-delete confirms */
		confirmLabel?: string;
		loadingLabel?: string;
		/** Red destructive styling for the confirm button (default true) */
		destructive?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	};

	let {
		open = $bindable(false),
		title = 'Are you sure?',
		description,
		loading = false,
		confirmText,
		confirmLabel = 'Delete',
		loadingLabel = 'Deleting...',
		destructive = true,
		onconfirm,
		oncancel
	}: Props = $props();

	let typedConfirmation = $state('');

	const canConfirm = $derived(confirmText ? typedConfirmation === confirmText : true);

	// Reset typed confirmation when dialog opens/closes
	$effect(() => {
		if (!open) typedConfirmation = '';
	});
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{description}</AlertDialog.Description>
		</AlertDialog.Header>

		{#if confirmText}
			<div class="space-y-2 py-2">
				<Label for="confirm-input" class="text-sm text-muted-foreground">
					Type <span class="font-mono font-semibold text-foreground">{confirmText}</span> to confirm
				</Label>
				<Input
					id="confirm-input"
					bind:value={typedConfirmation}
					placeholder={confirmText}
					class="font-mono"
					autocomplete="off"
				/>
			</div>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={oncancel} disabled={loading}>Cancel</AlertDialog.Cancel>
			<Button
				variant={destructive ? 'destructive' : 'default'}
				onclick={onconfirm}
				disabled={loading || !canConfirm}
			>
				{loading ? loadingLabel : confirmLabel}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
