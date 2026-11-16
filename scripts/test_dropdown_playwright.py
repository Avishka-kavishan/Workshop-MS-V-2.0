import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Login
        await page.goto('http://localhost:3000/login')
        await page.fill('input[type="text"], input[name="username"]', 'ict')
        await page.fill('input[type="password"]', '123')
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(1000)

        # Go to annual-plan
        await page.goto('http://localhost:3000/annual-plan')
        await page.wait_for_timeout(1500)

        # Check select elements
        selects = await page.locator('select').all()
        print(f"Total selects on annual-plan: {len(selects)}")

        # Click the first select (Year select or Plan Revision select)
        first_select = page.locator('select').first()
        box = await first_select.bounding_box()
        print("First select bounding box:", box)

        # Dispatch mousedown or click
        print("Clicking first select...")
        await first_select.click()
        await page.wait_for_timeout(500)

        # Check if popover appeared
        popover = page.locator('div[role="dialog"][aria-label="Searchable Dropdown Options"]')
        count = await popover.count()
        print(f"Popover count after click: {count}")

        if count > 0:
            print("Popover text:", await popover.inner_text())
            await page.screenshot(path='annual_plan_popover_open.png')
            print("Saved annual_plan_popover_open.png")

            # Try typing in search input
            search_input = popover.locator('input[type="text"]')
            await search_input.fill('2026')
            await page.wait_for_timeout(300)
            print("Filtered options count:", await popover.locator('div[role="dialog"] div[style*="cursor"]').count())
            await page.screenshot(path='annual_plan_popover_filtered.png')
            print("Saved annual_plan_popover_filtered.png")
        else:
            # Let's inspect console errors or why mousedown didn't open
            print("Popover did not open. Let's test dispatching mousedown directly:")
            res = await page.evaluate('''() => {
                const s = document.querySelector('select');
                if (!s) return 'no select';
                const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
                s.dispatchEvent(event);
                const pop = document.querySelector('[aria-label="Searchable Dropdown Options"]');
                return pop ? 'popover created!' : 'popover null';
            }''')
            print("Evaluate result:", res)
            await page.screenshot(path='annual_plan_click_debug.png')

        await browser.close()

asyncio.run(run())
