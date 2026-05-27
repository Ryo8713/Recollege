import { createRouter, createWebHashHistory } from "vue-router";
import StudentView from "../views/StudentView.vue";
import StaffView from "../views/StaffView.vue";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
        path: "/",
        name: "register",
        component: StudentView,
        meta: { public: true },
        },
        {
        path: "/staff",
        name: "staff",
        component: StaffView,
        meta: { requiresStaff: true },
        },
    ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresStaff && !authStore.isStaffLoggedIn) {
    authStore.openStaffLoginModal();
    return { name: "register" };
  }

  return true;
});

export default router;
