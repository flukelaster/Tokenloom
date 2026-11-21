import { expect, test } from '@playwright/test';

test.describe('DS Forge Plugin UI (Browser E2E)', () => {
  test('renders 840x680 two-column layout and collapses cleanly at 480x680 without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 840, height: 680 });
    await page.goto('/');

    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('footer-estimates')).toContainText('21 Pages');
    await expect(page.getByTestId('footer-estimates')).toContainText('15 Families');
    await expect(page.getByTestId('footer-estimates')).toContainText('113 Variables');

    // Verify all 10 library inline SVG brand logos render cleanly offline
    for (const libId of [
      'shadcn',
      'antd',
      'mui',
      'carbon',
      'chakra',
      'mantine',
      'heroui',
      'radix-themes',
      'fluent-web',
      'material-web',
    ]) {
      const logo = page.getByTestId(`lib-card-${libId}`).getByTestId(`lib-logo-${libId}`);
      await expect(logo).toBeVisible();
      await expect(logo.locator('svg')).toBeVisible();
    }

    // Ensure Live Preview & Brand Customizer appear above the fold at 840x680
    const previewBox = await page.getByTestId('library-preview-panel').boundingBox();
    expect(previewBox).not.toBeNull();
    expect(previewBox!.y).toBeLessThan(420);

    const navDirDesktop = await page
      .locator('.dsf-nav')
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(navDirDesktop).toBe('column');

    // Resize down to minimum 480px width requirement (Section 4.1)
    await page.setViewportSize({ width: 480, height: 680 });

    const navDirCompact = await page
      .locator('.dsf-nav')
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(navDirCompact).toBe('row');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('gates controls by library capabilities and disables generation for Coming Soon packages', async ({
    page,
  }) => {
    await page.goto('/');

    // Default shadcn/ui has radius control, no density control
    await expect(page.getByTestId('control-radius-preset')).toBeVisible();
    await page.getByTestId('advanced-settings-toggle').click();
    await expect(page.getByTestId('control-density')).toHaveCount(0);

    // Ant Design exposes Density algorithm control
    await page.getByTestId('lib-card-antd').click();
    await expect(page.getByTestId('control-density')).toBeVisible();

    // Search catalog for Apache-2.0 libraries -> Carbon & Material Web
    await page.getByTestId('catalog-search-input').fill('Apache');
    await expect(page.getByTestId('lib-card-carbon')).toBeVisible();
    await expect(page.getByTestId('lib-card-shadcn')).toHaveCount(0);

    // Carbon hides radius customization per capability flags
    await page.getByTestId('lib-card-carbon').click();
    await expect(page.getByTestId('control-radius-preset')).toHaveCount(0);
    await expect(page.getByTestId('generate-system-btn')).toBeEnabled();

    // Clear search and select Coming Soon library (Chakra UI) -> Generate & Export buttons lock
    await page.getByTestId('catalog-search-input').fill('');
    await page.getByTestId('lib-card-chakra').click();
    await expect(page.getByTestId('generate-system-btn')).toBeDisabled();
    await expect(page.getByTestId('footer-export-btn')).toBeDisabled();
    await expect(page.getByTestId('footer-estimates')).toContainText('Roadmap QA');
  });

  test('separates Figma Editor UI theme from Library Preview theme and supports Thai localization', async ({
    page,
  }) => {
    await page.goto('/');

    const previewStage = page.getByTestId('preview-stage');
    await expect(previewStage).toHaveAttribute('data-preview-mode', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-editor-theme', 'light');

    // Switch Library Preview to Dark -> Editor UI stays Light
    await page.getByTestId('preview-theme-dark').click();
    await expect(previewStage).toHaveAttribute('data-preview-mode', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-editor-theme', 'light');

    // Switch Editor UI to Dark -> Preview stays Dark independently, then switch Preview back to Light
    await page.getByTestId('editor-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-editor-theme', 'dark');
    await page.getByTestId('preview-theme-light').click();
    await expect(previewStage).toHaveAttribute('data-preview-mode', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-editor-theme', 'dark');

    // Switch documentation locale to Thai (TH) and verify live preview localization
    await page.getByTestId('locale-select').selectOption('th');
    await expect(previewStage).toContainText('สถานะชุดตัวแปรระบบออกแบบ');
    await expect(previewStage).toContainText('เผยแพร่การแก้ไข');
  });

  test('completes full Generate -> Validate -> Keyboard Nav -> Manage Diff -> Export JSON -> Delete flow', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Trigger Generation
    await page.getByTestId('generate-system-btn').click();
    const jobModal = page.getByTestId('job-status-modal');
    await expect(jobModal).toBeVisible();
    await expect(jobModal).toContainText('Design System Ready');

    // 2. Jump directly to Validate tab from completion modal
    await jobModal.getByRole('button', { name: 'View validation report' }).click();
    await expect(page.getByTestId('validation-report-card')).toContainText('Quality Gate Passed');

    // 3. Use keyboard ArrowUp on Validate tab to navigate to Manage tab
    const validateTab = page.getByTestId('nav-tab-validate');
    await validateTab.focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByTestId('nav-tab-manage')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('installed-system-shadcn')).toBeVisible();

    // 4. Preview Three-Way Diff
    await page.getByTestId('preview-diff-btn').click();
    await expect(page.getByTestId('diff-report-panel')).toBeVisible();
    await expect(page.getByTestId('diff-report-panel')).toContainText('Unchanged:');

    // 5. Open Canonical JSON Token Export modal and verify independent resolver badge
    await page.getByRole('button', { name: 'Export Tokens' }).click();
    const exportModal = page.getByTestId('export-tokens-modal');
    await expect(exportModal).toBeVisible();
    await expect(exportModal).toContainText('Verified (226 Light/Dark resolutions)');
    await page.getByTestId('close-export-btn').click();
    await expect(exportModal).toHaveCount(0);

    // 6. Safely delete installed system via two-step confirmation
    await page.getByRole('button', { name: 'Delete System…' }).click();
    await page.getByTestId('confirm-delete-system-btn').click();
    await expect(page.getByTestId('manage-empty-state')).toBeVisible();
  });
});
