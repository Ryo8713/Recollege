<template>
	<div class="space-y-4">
		<StudentBorrowForm />
	</div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import StudentBorrowForm from "../components/StudentBorrowForm.vue";
import { useAssetsStore } from "../stores/assets";
import { useRentalStore } from "../stores/rental";

const assetsStore = useAssetsStore();
const rentalStore = useRentalStore();

onMounted(() => {
  	void Promise.all([assetsStore.loadAssets(), rentalStore.loadRecords()]);
});
</script>
