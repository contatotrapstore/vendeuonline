import { vi, beforeEach, afterEach } from "vitest";
import { useAuthStore, User, RegisterData } from "@/store/authStore";
import * as apiClient from "@/lib/api-client";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  post: vi.fn(),
  get: vi.fn(),
  apiRequest: vi.fn(),
}));

// Mock localStorage for Zustand persist
const localStorageData: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);
  }),
  get length() {
    return Object.keys(localStorageData).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageData)[index] || null),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("AuthStore", () => {
  const mockUser: User = {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    phone: "11999999999",
    city: "São Paulo",
    state: "SP",
    userType: "buyer",
    type: "buyer", // Added normalized field
    avatar: "avatar.jpg",
    isVerified: true,
    createdAt: "2023-01-01T00:00:00Z",
    buyer: {
      id: "1",
      wishlistCount: 5,
      orderCount: 3,
    },
  };

  const mockToken = "mock-jwt-token";

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage data
    Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);

    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clear localStorage after each test
    Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);
  });

  describe("login", () => {
    it("should successfully login with user type", async () => {
      const mockResponse = { user: mockUser, token: mockToken };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const { login } = useAuthStore.getState();
      await login("test@example.com", "password", "buyer");

      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "test@example.com",
        password: "password",
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(mockToken);
      expect(state.error).toBe(null);
    });

    it("should successfully login without user type", async () => {
      const mockResponse = { user: mockUser, token: mockToken };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const { login } = useAuthStore.getState();
      await login("test@example.com", "password");

      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "test@example.com",
        password: "password",
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(mockToken);
    });

    it("should handle login failure", async () => {
      const errorMessage = "Invalid credentials";
      vi.mocked(apiClient.post).mockRejectedValue(new Error(errorMessage));

      const { login } = useAuthStore.getState();

      await expect(login("test@example.com", "wrong-password")).rejects.toThrow(errorMessage);

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.token).toBe(null);
    });
  });

  describe("register", () => {
    it("should successfully register user", async () => {
      const mockResponse = { user: mockUser, token: mockToken };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const registerData: RegisterData = {
        name: "Test User",
        email: "test@example.com",
        phone: "11999999999",
        password: "password123",
        userType: "buyer",
        city: "São Paulo",
        state: "SP",
      };

      const { register } = useAuthStore.getState();
      await register(registerData);

      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/register", registerData);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(mockToken);
    });

    it("should handle registration failure", async () => {
      const errorMessage = "Email already exists";
      vi.mocked(apiClient.post).mockRejectedValue(new Error(errorMessage));

      const registerData: RegisterData = {
        name: "Test User",
        email: "test@example.com",
        phone: "11999999999",
        password: "password123",
        userType: "buyer",
        city: "São Paulo",
        state: "SP",
      };

      const { register } = useAuthStore.getState();

      await expect(register(registerData)).rejects.toThrow(errorMessage);

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe("logout", () => {
    it("should clear user data and token", () => {
      // Set authenticated state
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        token: mockToken,
      });

      const { logout } = useAuthStore.getState();
      logout();

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBe(null);
      // Zustand persist handles storage automatically
    });
  });

  describe("updateUser", () => {
    it("should update user data", () => {
      useAuthStore.setState({ user: mockUser });

      const { updateUser } = useAuthStore.getState();
      updateUser({ name: "Updated Name" });

      const state = useAuthStore.getState();
      expect(state.user?.name).toBe("Updated Name");
      expect(state.user?.email).toBe(mockUser.email); // Other fields preserved
    });

    it("should not update if no user is logged in", () => {
      useAuthStore.setState({ user: null });

      const { updateUser } = useAuthStore.getState();
      updateUser({ name: "Updated Name" });

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
    });
  });

  describe("checkAuth", () => {
    it("should validate existing token and set user data", async () => {
      // Set token in store state (Zustand persist)
      useAuthStore.setState({ token: mockToken });
      const mockResponse = { user: mockUser };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { checkAuth } = useAuthStore.getState();
      await checkAuth();

      expect(apiClient.get).toHaveBeenCalledWith("/api/auth/me");

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(mockToken);
    });

    it("should handle invalid token", async () => {
      // Set token in store state
      useAuthStore.setState({ token: mockToken });
      vi.mocked(apiClient.get).mockRejectedValue(new Error("Invalid token"));

      const { checkAuth } = useAuthStore.getState();
      await checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBe(null);
    });

    it("should handle no token", async () => {
      // No token in state
      useAuthStore.setState({ token: null });

      const { checkAuth } = useAuthStore.getState();
      await checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBe(null);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe("utility functions", () => {
    it("should set and clear loading state", () => {
      const { setLoading } = useAuthStore.getState();

      setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("should clear error state", () => {
      useAuthStore.setState({ error: "Some error" });

      const { clearError } = useAuthStore.getState();
      clearError();

      expect(useAuthStore.getState().error).toBe(null);
    });
  });
});
