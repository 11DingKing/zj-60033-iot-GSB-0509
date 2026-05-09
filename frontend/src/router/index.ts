import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/user";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: () => import("@/views/Login.vue"),
      meta: { title: "登录", requiresAuth: false },
    },
    {
      path: "/",
      component: () => import("@/layouts/MainLayout.vue"),
      redirect: "/dashboard",
      meta: { requiresAuth: true },
      children: [
        {
          path: "dashboard",
          name: "Dashboard",
          component: () => import("@/views/Dashboard.vue"),
          meta: { title: "实时数据看板" },
        },
        {
          path: "devices",
          name: "Devices",
          component: () => import("@/views/Devices.vue"),
          meta: { title: "设备管理" },
        },
        {
          path: "devices/:id",
          name: "DeviceDetail",
          component: () => import("@/views/DeviceDetail.vue"),
          meta: { title: "设备详情" },
        },
        {
          path: "alerts",
          name: "Alerts",
          component: () => import("@/views/Alerts.vue"),
          meta: { title: "告警中心" },
        },
        {
          path: "rules",
          name: "Rules",
          component: () => import("@/views/Rules.vue"),
          meta: { title: "告警规则" },
        },
        {
          path: "statistics",
          name: "Statistics",
          component: () => import("@/views/Statistics.vue"),
          meta: { title: "统计分析" },
        },
      ],
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next("/login");
  } else if (to.path === "/login" && isAuthenticated) {
    next("/dashboard");
  } else {
    next();
  }
});

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} - 智能设备监控平台`
    : "智能设备监控平台";
});

export default router;
