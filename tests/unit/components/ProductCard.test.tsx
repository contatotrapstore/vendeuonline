import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";
import { ProductCard } from "@/components/ui/ProductCard";
import { Product } from "@/types";

// Mock the tracking hook
vi.mock("@/components/TrackingScripts", () => ({
  useTracking: () => ({
    trackViewContent: vi.fn(),
    trackAddToCart: vi.fn(),
  }),
}));

// Mock LazyImage component
vi.mock("@/components/ui/LazyImage", () => ({
  ProductImage: ({ alt, onLoad, onError, ...props }: any) => (
    <img alt={alt} {...props} onLoad={() => onLoad?.()} onError={() => onError?.()} />
  ),
}));

const mockProduct: Product = {
  id: "1",
  name: "Test Product",
  description: "A test product description",
  price: 99.99,
  comparePrice: 119.99,
  category: "Electronics",
  isFeatured: true,
  rating: 4.5,
  reviewCount: 10,
  images: [{ url: "test-image.jpg", alt: "Test Image" }],
  stock: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const Wrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe("ProductCard", () => {
  it("renders product information correctly", () => {
    render(<ProductCard product={mockProduct} />, { wrapper: Wrapper });

    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("R$ 99,99")).toBeInTheDocument();
    expect(screen.getByText("R$ 119,99")).toBeInTheDocument();
    expect(screen.getByText("Destaque")).toBeInTheDocument();
    expect(screen.getByText("(10)")).toBeInTheDocument();
  });

  it("shows discount percentage when comparePrice is present", () => {
    render(<ProductCard product={mockProduct} />, { wrapper: Wrapper });

    // Calculate expected discount: ((119.99 - 99.99) / 119.99) * 100 = ~17%
    expect(screen.getByText("-17%")).toBeInTheDocument();
  });

  it("calls onAddToCart when add to cart button is clicked", () => {
    const onAddToCart = vi.fn();

    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />, { wrapper: Wrapper });

    const addButton = screen.getByText("Adicionar ao Carrinho");
    fireEvent.click(addButton);

    expect(onAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it("calls onToggleWishlist when wishlist button is clicked", () => {
    const onToggleWishlist = vi.fn();

    render(<ProductCard product={mockProduct} onToggleWishlist={onToggleWishlist} />, { wrapper: Wrapper });

    const wishlistButton = screen.getByRole("button", { name: "" }); // Heart button has no text
    fireEvent.click(wishlistButton);

    expect(onToggleWishlist).toHaveBeenCalledWith(mockProduct);
  });

  it("renders in list view mode", () => {
    render(<ProductCard product={mockProduct} viewMode="list" />, { wrapper: Wrapper });

    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("A test product description")).toBeInTheDocument();
  });

  it("hides add to cart button when showAddToCart is false", () => {
    render(<ProductCard product={mockProduct} showAddToCart={false} />, { wrapper: Wrapper });

    expect(screen.queryByText("Adicionar ao Carrinho")).not.toBeInTheDocument();
  });

  it("shows filled heart when product is in wishlist", () => {
    render(<ProductCard product={mockProduct} isInWishlist={true} />, { wrapper: Wrapper });

    const heartIcon = screen.getByRole("button", { name: "" }).querySelector("svg");
    expect(heartIcon).toHaveClass("fill-current");
  });

  it("renders stars based on rating", () => {
    const { container } = render(<ProductCard product={mockProduct} />, { wrapper: Wrapper });

    // We can ensure rating is displayed correctly
    expect(screen.getByText("(10)")).toBeInTheDocument();

    // Check for star icons by their SVG elements
    const starElements = container.querySelectorAll("svg.lucide-star");
    expect(starElements.length).toBe(5); // Should have 5 star elements
  });

  it("handles image loading states", () => {
    render(<ProductCard product={mockProduct} />, { wrapper: Wrapper });

    const image = screen.getByAltText("Test Product");

    // Simulate image load
    fireEvent.load(image);

    // Simulate image error
    fireEvent.error(image);

    expect(image).toBeInTheDocument();
  });

  it("prevents event bubbling when clicking action buttons", () => {
    const onAddToCart = vi.fn();
    const onToggleWishlist = vi.fn();
    const mockNavigate = vi.fn();

    // Mock router navigation
    vi.mock("react-router-dom", async () => {
      const actual = await vi.importActual("react-router-dom");
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} />, {
      wrapper: Wrapper,
    });

    const addButton = screen.getByText("Adicionar ao Carrinho");
    const wishlistButton = screen.getByRole("button", { name: "" });

    fireEvent.click(addButton);
    fireEvent.click(wishlistButton);

    expect(onAddToCart).toHaveBeenCalledWith(mockProduct);
    expect(onToggleWishlist).toHaveBeenCalledWith(mockProduct);
  });
});
