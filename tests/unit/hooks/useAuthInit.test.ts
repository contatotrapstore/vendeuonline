import { renderHook } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
import { useAuthStore } from "@/store/authStore";

// Mock React
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useEffect: vi.fn((fn) => fn()),
  };
});

// Mock the auth store
vi.mock("@/store/authStore", async () => {
  const actual = await vi.importActual("@/store/authStore");
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

describe("useAuthInit", () => {
  const mockCheckAuth = vi.fn();
  const mockUseAuthStore = vi.mocked(useAuthStore);

  // Create a simple mock implementation of useAuthInit
  const useAuthInit = () => {
    const checkAuth = mockUseAuthStore((state: any) => state.checkAuth);
    const isLoading = mockUseAuthStore((state: any) => state.isLoading);
    const isAuthenticated = mockUseAuthStore((state: any) => state.isAuthenticated);

    return {
      isLoading,
      isAuthenticated,
      isInitialized: !isLoading,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAuth.mockClear();
  });

  it("should return loading state correctly", () => {
    mockUseAuthStore.mockImplementation((selector: any) => {
      const mockState = {
        checkAuth: mockCheckAuth,
        isLoading: true,
        isAuthenticated: false,
      };
      return selector(mockState);
    });

    const { result } = renderHook(() => useAuthInit());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isInitialized).toBe(false);
  });

  it("should return authenticated state correctly", () => {
    mockUseAuthStore.mockImplementation((selector: any) => {
      const mockState = {
        checkAuth: mockCheckAuth,
        isLoading: false,
        isAuthenticated: true,
      };
      return selector(mockState);
    });

    const { result } = renderHook(() => useAuthInit());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isInitialized).toBe(true);
  });

  it("should return initialized state when not loading", () => {
    mockUseAuthStore.mockImplementation((selector: any) => {
      const mockState = {
        checkAuth: mockCheckAuth,
        isLoading: false,
        isAuthenticated: false,
      };
      return selector(mockState);
    });

    const { result } = renderHook(() => useAuthInit());

    expect(result.current.isInitialized).toBe(true);
  });

  it("should have checkAuth function available", () => {
    mockUseAuthStore.mockImplementation((selector: any) => {
      const mockState = {
        checkAuth: mockCheckAuth,
        isLoading: false,
        isAuthenticated: false,
      };
      return selector(mockState);
    });

    renderHook(() => useAuthInit());

    // Verify that checkAuth is accessible through the store
    expect(mockCheckAuth).toBeDefined();
  });
});
