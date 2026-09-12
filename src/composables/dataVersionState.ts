import { ref } from "vue";

/** Shared across poll instances so write responses can align without a follow-up GET. */
const latestDataVersion = ref("");

export function getLatestDataVersionRef() {
	return latestDataVersion;
}

export function applyKnownDataVersion(version: unknown) {
	const next = String(version ?? "").trim();
	if (!next) return;
	latestDataVersion.value = next;
}
