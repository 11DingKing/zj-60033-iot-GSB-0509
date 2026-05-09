import request from "./request";
import type { LoginResponse, User } from "@/types";

export const authApi = {
  login(username: string, password: string) {
    return request.post<any, LoginResponse>("/auth/login", {
      username,
      password,
    });
  },

  getProfile() {
    return request.get<any, User>("/auth/profile");
  },
};
