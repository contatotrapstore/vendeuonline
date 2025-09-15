# 🧪 Testing Guide - Vendeu Online

Comprehensive testing strategy for the Vendeu Online marketplace platform.

## Testing Stack

- **Unit Testing**: Vitest + @testing-library/react
- **E2E Testing**: Playwright
- **API Testing**: Vitest + MSW (Mock Service Worker)
- **Coverage**: c8 (built into Vitest)
- **Linting**: ESLint + TypeScript strict mode

## Quick Commands

```bash
# Unit Tests
npm test                    # Run all unit tests
npm run test:ui             # Open Vitest UI
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report

# E2E Tests
npm run e2e                 # Run all E2E tests
npm run e2e:ui              # Open Playwright UI
npx playwright codegen      # Generate test scripts

# Code Quality
npm run lint                # ESLint checks
npm run check               # TypeScript compilation
npm run format              # Prettier formatting
```

## Test Structure

```
tests/
├── unit/                   # Unit tests
│   ├── components/         # Component tests
│   ├── hooks/              # Custom hook tests
│   ├── utils/              # Utility function tests
│   └── stores/             # State management tests
├── integration/            # Integration tests
│   ├── api/                # API endpoint tests
│   └── flows/              # User flow tests
├── e2e/                    # End-to-end tests
│   ├── auth.spec.ts        # Authentication flows
│   ├── products.spec.ts    # Product catalog
│   ├── checkout.spec.ts    # Purchase flow
│   └── admin.spec.ts       # Admin functions
├── fixtures/               # Test data
└── utils/                  # Test utilities
```

## Unit Testing

### Component Testing

```typescript
// tests/unit/components/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCard } from '@/components/ui/ProductCard'
import { mockProduct } from '../fixtures/products'

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.getByText(mockProduct.name)).toBeInTheDocument()
    expect(screen.getByText(`R$ ${mockProduct.price}`)).toBeInTheDocument()
  })

  it('handles add to cart action', () => {
    const onAddToCart = vi.fn()
    render(
      <ProductCard
        product={mockProduct}
        onAddToCart={onAddToCart}
      />
    )

    fireEvent.click(screen.getByText('Adicionar ao Carrinho'))
    expect(onAddToCart).toHaveBeenCalledWith(mockProduct)
  })
})
```

### Store Testing

```typescript
// tests/unit/stores/authStore.test.ts
import { authStore } from '@/store/authStore'
import { mockUser } from '../fixtures/users'

describe('authStore', () => {
  beforeEach(() => {
    authStore.getState().logout()
  })

  it('handles login correctly', async () => {
    await authStore.getState().login('test@email.com', 'password')

    expect(authStore.getState().isAuthenticated).toBe(true)
    expect(authStore.getState().user).toEqual(mockUser)
  })

  it('handles logout correctly', () => {
    authStore.getState().logout()

    expect(authStore.getState().isAuthenticated).toBe(false)
    expect(authStore.getState().user).toBeNull()
  })
})
```

### Hook Testing

```typescript
// tests/unit/hooks/useProducts.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useProducts } from '@/hooks/useProducts'

describe('useProducts', () => {
  it('fetches products successfully', async () => {
    const { result } = renderHook(() => useProducts())

    await waitFor(() => {
      expect(result.current.products).toHaveLength(3)
      expect(result.current.loading).toBe(false)
    })
  })
})
```

## Integration Testing

### API Testing

```typescript
// tests/integration/api/products.test.ts
import request from 'supertest'
import { app } from '@/server'
import { setupTestDB, cleanupTestDB } from '../utils/database'

describe('Products API', () => {
  beforeAll(async () => {
    await setupTestDB()
  })

  afterAll(async () => {
    await cleanupTestDB()
  })

  it('GET /api/products returns product list', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.products).toBeDefined()
  })

  it('POST /api/products creates new product', async () => {
    const productData = {
      name: 'Test Product',
      price: 99.99,
      description: 'Test description'
    }

    const response = await request(app)
      .post('/api/products')
      .send(productData)
      .expect(201)

    expect(response.body.product.name).toBe(productData.name)
  })
})
```

## E2E Testing

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
})
```

### Authentication E2E Tests

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can log in successfully', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[data-testid="email"]', 'wrong@example.com')
    await page.fill('[data-testid="password"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Credenciais inválidas')
  })
})
```

### E2E Purchase Flow

```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Purchase Flow', () => {
  test('complete purchase process', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'buyer@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Browse products
    await page.goto('/produtos')
    await page.click('[data-testid="product-card"]:first-child')

    // Add to cart
    await page.click('[data-testid="add-to-cart"]')
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1')

    // Proceed to checkout
    await page.click('[data-testid="cart-icon"]')
    await page.click('[data-testid="checkout-button"]')

    // Fill checkout form
    await page.fill('[data-testid="address"]', 'Rua das Flores, 123')
    await page.fill('[data-testid="city"]', 'São Paulo')
    await page.fill('[data-testid="zipcode"]', '01234-567')

    // Complete payment (mock)
    await page.click('[data-testid="payment-pix"]')
    await page.click('[data-testid="complete-order"]')

    // Verify success
    await expect(page).toHaveURL(/\/pedido\/\d+/)
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible()
  })
})
```

## Test Data Management

### Fixtures

```typescript
// tests/fixtures/products.ts
export const mockProduct = {
  id: 'prod-123',
  name: 'Samsung Galaxy S23',
  description: 'Smartphone premium',
  price: 2999.99,
  comparePrice: 3299.99,
  category: 'Smartphones',
  images: [
    { url: 'https://example.com/product1.jpg' }
  ],
  rating: 4.5,
  reviewCount: 128,
  isFeatured: true,
  isActive: true
}

export const mockProducts = [mockProduct, /* ... more products */]
```

### Database Utilities

```typescript
// tests/utils/database.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.TEST_DATABASE_URL }
  }
})

export const setupTestDB = async () => {
  await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE products CASCADE`

  // Seed test data
  await prisma.user.createMany({
    data: [
      { email: 'test@example.com', password: 'hashedpassword', type: 'buyer' },
      { email: 'seller@example.com', password: 'hashedpassword', type: 'seller' }
    ]
  })
}

export const cleanupTestDB = async () => {
  await prisma.$disconnect()
}
```

## Test Configuration

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
})
```

### Test Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret'

// Mock API endpoints
global.fetch = vi.fn()

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})
```

## Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| **Overall** | 85% | 87% ✅ |
| **Components** | 90% | 92% ✅ |
| **Hooks** | 95% | 96% ✅ |
| **Utils** | 100% | 100% ✅ |
| **Stores** | 90% | 88% 🔶 |

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run check
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run e2e
```

## Best Practices

### Unit Tests
- ✅ Test components in isolation
- ✅ Mock external dependencies
- ✅ Focus on behavior, not implementation
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)

### E2E Tests
- ✅ Test critical user journeys
- ✅ Use data-testid selectors
- ✅ Handle async operations properly
- ✅ Clean up after tests
- ✅ Use page objects for reusability

### API Tests
- ✅ Test all HTTP methods
- ✅ Validate response schemas
- ✅ Test error scenarios
- ✅ Use proper test isolation
- ✅ Mock external services

---

For more testing examples, check the `tests/` directory in the project root.