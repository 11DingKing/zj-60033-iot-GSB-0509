import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { ElMessage } from "element-plus";
import router from "@/router";

const service: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    const message =
      error.response?.data?.message || error.message || "请求失败";

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      ElMessage.error("登录已过期，请重新登录");
      router.push("/login");
    } else {
      ElMessage.error(message);
    }

    return Promise.reject(error);
  },
);

export default service;
