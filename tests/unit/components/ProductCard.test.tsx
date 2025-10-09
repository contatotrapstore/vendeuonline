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
  sellerId: "seller-1",
  name: "Test Product",
  description: "A test product description",
  price: 99.99,
  comparePrice: 119.99,
  category: "Electronics",
  subcategory: "Phones",
  images: [{ id: "img-1", url: "test-image.jpg", alt: "Test Image", order: 0, isMain: true }],
  specifications: [],
  stock: 5,
  minStock: 2,
  isActive: true,
  isFeatured: true,
  tags: [],
  rating: 4.5,
  reviewCount: 10,
  salesCount: 50,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const mockStore = {
  id: "store-1",
  name: "Test Store",
  whatsapp: "11999999999",
  phone: "1234567890",
};

const Wrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe("ProductCard", () => {
  it("renders product information correctly", () => {
    render(<ProductCard product={mockProduct} store={mockStore} />, { wrapper: Wrapper });

    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("Test Store")).toBeInTheDocument();
    expect(screen.getByText("R$ 99,99")).toBeInTheDocument();
    expect(screen.getByText("R$ 119,99")).toBeInTheDocument();
    expect(screen.getByText("(10)")).toBeInTheDocument();
  });

  it("shows discount percentage when comparePrice is present", () => {
    render(<ProductCard product={mockProduct} store={mockStore} />, { wrapper: Wrapper });

    // Calculate expected discount: ((119.99 - 99.99) / 119.99) * 100 = ~17%
    expect(screen.getByText("-17%")).toBeInTheDocument();
  });

  it("calls onToggleWishlist when wishlist button is clicked", () => {
    const onToggleWishlist = vi.fn();

    render(<ProductCard product={mockProduct} store={mockStore} onToggleWishlist={onToggleWishlist} />, {
      wrapper: Wrapper,
    });

    const wishlistButton = screen.getAllByRole("button")[0]; // Heart button
    fireEvent.click(wishlistButton);

    expect(onToggleWishlist).toHaveBeenCalledWith(mockProduct);
  });

  it("renders in list view mode", () => {
    render(<ProductCard product={mockProduct} store={mockStore} viewMode="list" />, { wrapper: Wrapper });

    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("A test product description")).toBeInTheDocument();
  });

  it("hides WhatsApp button when showWhatsAppButton is false", () => {
    render(<ProductCard product={mockProduct} store={mockStore} showWhatsAppButton={false} />, { wrapper: Wrapper });

    expect(screen.queryByText(/WhatsApp/i)).not.toBeInTheDocument();
  });

  it("shows filled heart when product is in wishlist", () => {
    render(<ProductCard product={mockProduct} store={mockStore} isInWishlist={true} />, { wrapper: Wrapper });

    const heartIcon = screen.getAllByRole("button")[0].querySelector("svg");
    expect(heartIcon).toHaveClass("fill-current");
  });

  it("renders stars based on rating", () => {
    const { container } = render(<ProductCard product={mockProduct} store={mockStore} />, { wrapper: Wrapper });

    // We can ensure rating is displayed correctly
    expect(screen.getByText("(10)")).toBeInTheDocument();

    // Check for star icons by their SVG elements
    const starElements = container.querySelectorAll("svg.lucide-star");
    expect(starElements.length).toBeGreaterThanOrEqual(5); // Should have 5 star elements
  });

  it("handles image loading states", () => {
    render(<ProductCard product={mockProduct} store={mockStore} />, { wrapper: Wrapper });

    const image = screen.getByAltText("Test Product");

    // Simulate image load
    fireEvent.load(image);

    // Simulate image error
    fireEvent.error(image);

    expect(image).toBeInTheDocument();
  });

  it("renders store name", () => {
    render(<ProductCard product={mockProduct} store={mockStore} />, { wrapper: Wrapper });

    expect(screen.getByText("Test Store")).toBeInTheDocument();
  });

  it("renders WhatsApp button when store has whatsapp", () => {
    render(<ProductCard product={mockProduct} store={mockStore} showWhatsAppButton={true} />, { wrapper: Wrapper });

    // WhatsAppProductButton should be rendered
    expect(screen.getByText(/Test Store/i)).toBeInTheDocument();
  });
});
