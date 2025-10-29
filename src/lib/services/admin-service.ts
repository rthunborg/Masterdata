import type { User, CreateUserRequest, CreateUserResponse } from "@/lib/types/user";

export interface UserListResponse {
  data: User[];
}

export const adminService = {
  async getUsers(): Promise<User[]> {
    const response = await fetch("/api/admin/users");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch users");
    }

    const json: UserListResponse = await response.json();
    return json.data;
  },

  async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to create user");
    }

    const json = await response.json();
    return json.data;
  },

  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to update user status");
    }

    const json = await response.json();
    return json.data;
  },
};
