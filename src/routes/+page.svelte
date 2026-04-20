<script lang="ts">
	import { BookOpen } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Librarian — Personal Book Collection Tracker</title>
	<meta name="description" content="Track your light novel and manga collection, reading progress, and bookfair hauls." />
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-background px-4">
	<div class="space-y-6 text-center">
		<div class="flex items-center justify-center gap-3">
			<BookOpen class="h-10 w-10 text-foreground" />
			<h1 class="text-4xl font-bold tracking-tight text-foreground">Librarian</h1>
		</div>
		<p class="max-w-md text-muted-foreground">
			Your personal book collection tracker. Manage your light novels, manga, reading progress,
			and bookfair hauls — all in one place.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-3">
			<a
				href="/series"
				class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
			>
				View Collection
			</a>
			<a
				href="/books"
				class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
			>
				Browse Books
			</a>
		</div>
	</div>
</div>
