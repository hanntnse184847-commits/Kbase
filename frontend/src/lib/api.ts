import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach "Authorization: Bearer <token>" to every request, if we have one stored.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("kbase_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * Pulls the "message" field out of GlobalExceptionHandler's JSON body
 * ({ timestamp, status, error, message }), falling back to a generic
 * message if the response isn't in that shape (e.g. network error, 404
 * from a route that doesn't exist at all).
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const backendMessage = axiosError.response?.data?.message;
    if (backendMessage) {
      return backendMessage;
    }
    if (axiosError.response) {
      return `Lỗi ${axiosError.response.status}: ${axiosError.response.statusText}`;
    }
    return "Không thể kết nối tới server. Backend có đang chạy ở localhost:8080 không?";
  }
  return "Đã xảy ra lỗi không xác định.";
}
