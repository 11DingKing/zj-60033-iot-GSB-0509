import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authApi } from "@/api/auth";
import type { User, LoginResponse } from "@/types";

export const useUserStore = defineStore("user", () => {
  const token = ref<string | null>(localStorage.getItem("token"));
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const username = computed(() => user.value?.username || "");

  function setToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem("token", newToken);
  }

  function setUser(newUser: User) {
    user.value = newUser;
    localStorage.setItem("user", JSON.stringify(newUser));
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async function login(
    username: string,
    password: string,
  ): Promise<LoginResponse> {
    const result = await authApi.login(username, password);
    setToken(result.access_token);
    setUser(result.user);
    return result;
  }

  function logout() {
    clearAuth();
  }

  function initFromStorage() {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser);
      } catch {
        user.value = null;
      }
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    username,
    setToken,
    setUser,
    clearAuth,
    login,
    logout,
    initFromStorage,
  };
});
