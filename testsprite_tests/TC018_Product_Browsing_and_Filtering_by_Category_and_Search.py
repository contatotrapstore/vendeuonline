import asyncio
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:4174", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # Click on 'Produtos' link to browse product categories.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/nav/div/div/div[2]/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Open the category dropdown to check available active categories.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[2]/div/div[2]/select').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Input a search term in the search box to test product search with filtering.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[2]/div/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('smartphone')
        

        # Clear the search input to reset filters and test pagination with a broader product list.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Send GET request to /categories to retrieve active categories from backend API.
        await page.goto('http://localhost:4002/categories', timeout=10000)
        

        # Check if there is an alternative endpoint or method to retrieve active categories or verify the correct API base URL and route.
        await page.goto('http://localhost:4002', timeout=10000)
        

        # Return to the frontend at localhost:4174 to continue frontend validation of browsing active categories and product search with filtering and pagination using UI interactions.
        await page.goto('http://localhost:4174/products', timeout=10000)
        

        # Assert that the categories dropdown contains the expected active categories.
        expected_categories = ["Todos", "Eletrônicos", "Imóveis", "Veículos", "Roupas", "Comida", "Serviços", "Emprego", "Móveis"]
        frame = context.pages[-1]
        category_dropdown = frame.locator('xpath=html/body/div/div/main/div/div/div[2]/div/div[2]/select').nth(0)
        categories_options = await category_dropdown.locator('option').all_text_contents()
        assert set(expected_categories).issubset(set(categories_options)), f"Categories dropdown options {categories_options} do not include all expected categories {expected_categories}"
          
        # Assert that the search input is present and can be filled with a search term.
        search_input = frame.locator('xpath=html/body/div/div/main/div/div/div[2]/div/div/div/input').nth(0)
        await search_input.fill('smartphone')
        filled_value = await search_input.input_value()
        assert filled_value == 'smartphone', f"Search input value {filled_value} does not match expected 'smartphone'"
          
        # Assert that the products displayed count is updated after search/filtering.
        products_displayed_text = await frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div/div[1]/div/span').text_content()
        assert products_displayed_text is not None and products_displayed_text != '0', f"Products displayed count is {products_displayed_text}, expected non-zero after filtering"
          
        # Assert that pagination controls are present and enabled after clearing search input.
        clear_search_button = frame.locator('xpath=html/body/div/div/main/div/div/div[3]/div/div[2]/div/button').nth(0)
        assert await clear_search_button.is_enabled(), "Clear search button should be enabled"
        pagination_controls = frame.locator('xpath=html/body/div/div/main/div/div/div[4]/div/nav/ul/li')
        pagination_count = await pagination_controls.count()
        assert pagination_count > 0, "Pagination controls should be present"
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    