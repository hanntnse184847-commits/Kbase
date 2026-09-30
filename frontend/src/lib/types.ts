export type Role = "USER" | "OWNER" | "ADMIN";

export interface LoginResponse {
  token: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: Role;
  enabled: boolean;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  ownerEmail: string;
  createdAt: string;
}

export interface ProjectMemberResponse {
  userId: number;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface DocumentResponse {
  id: number;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  fileCategory: "DOCUMENT" | "IMAGE" | "VIDEO";
  uploadedById: number;
  uploadedByName: string;
  createdAt: string;
}

export interface ApiErrorBody {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
}

// --- Admin ---

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export interface ProjectDetailResponse {
  project: ProjectResponse;
  members: ProjectMemberResponse[];
}

export interface AdminDocumentResponse {
  id: number;
  projectId: number;
  projectName: string;
  ownerEmail: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  fileCategory: "DOCUMENT" | "IMAGE" | "VIDEO";
  uploadedById: number;
  uploadedByName: string;
  createdAt: string;
}