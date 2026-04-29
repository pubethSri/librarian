<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';

	type Props = {
		open: boolean;
		title?: string;
		description: string;
		loading?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	};

	let {
		open = $bindable(false),
		title = 'Are you sure?',
		description,
		loading = false,
		onconfirm,
		oncancel
	}: Props = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={oncancel} disabled={loading}>Cancel</AlertDialog.Cancel>
			<Button variant="destructive" onclick={onconfirm} disabled={loading}>
				{#if loading}
					Deleting...
				{:else}
					Delete
				{/if}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
