# Test info

- Name: Homepage >> should display welcome message
- Location: /Users/st.pauli./Documents/GitHub/Wedding App/e2e/homepage.spec.ts:4:7

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toHaveText(expected)

Locator: locator('h1')
Expected pattern: /welcome/i
Received: <element(s) not found>
Call log:
  - expect.toHaveText with timeout 5000ms
  - waiting for locator('h1')

    at /Users/st.pauli./Documents/GitHub/Wedding App/e2e/homepage.spec.ts:6:38
```

# Page snapshot

```yaml
- text: Internal Server Error
```

# Test source

```ts
  1 | import { test, expect } from '@playwright/test';
  2 |
  3 | test.describe('Homepage', () => {
  4 |   test('should display welcome message', async ({ page }) => {
  5 |     await page.goto('/');
> 6 |     await expect(page.locator('h1')).toHaveText(/welcome/i);
    |                                      ^ Error: Timed out 5000ms waiting for expect(locator).toHaveText(expected)
  7 |   });
  8 | });
  9 |
```