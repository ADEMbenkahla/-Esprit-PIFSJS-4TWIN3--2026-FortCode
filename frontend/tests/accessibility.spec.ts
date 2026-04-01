import { test, expect } from '@playwright/test';

test('accessibility menu should be draggable and togglable', async ({ page }) => {
    // Go to home page
    await page.goto('/');

    // Check if accessibility button is present
    const accessibilityButton = page.locator('button[title="Hold to drag, click to open"]');
    await expect(accessibilityButton).toBeVisible();

    // Get initial position
    const initialBox = await accessibilityButton.boundingBox();

    // Click to open menu
    await accessibilityButton.click();
    const fontSizeButton = page.locator('button[title^="Text Size"]');
    await expect(fontSizeButton).toBeVisible();

    // Drag the button (move 100px right and 100px up)
    if (initialBox) {
        await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(initialBox.x + initialBox.width / 2 + 100, initialBox.y + initialBox.height / 2 - 100);
        await page.mouse.up();

        // Verify position changed
        const newBox = await accessibilityButton.boundingBox();
        expect(newBox?.x).not.toBe(initialBox.x);
        expect(newBox?.y).not.toBe(initialBox.y);
    }
});
