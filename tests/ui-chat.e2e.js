#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startPlatformServer } = require('../apps/platform/server');
const { chromium } = require('playwright');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecoach-ui-chat-'));
  const env = {
    ...process.env,
    PORT: '0',
    LIFECOACH_PLATFORM_PORT: '0',
    LIFECOACH_CONTROL_PLANE_DATA: path.join(tempRoot, 'control-plane.json'),
    LIFECOACH_CONTROL_PLANE_STATE_ROOT: path.join(tempRoot, 'state'),
  };

  const platform = await startPlatformServer({ env, gatewayPort: 0 });
  const baseUrl = `http://127.0.0.1:${platform.port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${baseUrl}/register`);
    await page.fill('input[name="email"]', 'uichat@example.com');
    await page.fill('input[name="password"]', 'pass-123456');
    await page.fill('input[name="displayName"]', 'UI Chat');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto(`${baseUrl}/chat`);
    await page.waitForSelector('#chat-window');
    await page.fill('#chat-input', '我最近一直很迷茫，不知道自己到底想要什么。');
    await page.click('#chat-form button[type="submit"]');
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('.message-row.assistant .message-bubble p');
      return rows.length >= 2;
    });

    const assistantCount = await page.locator('.message-row.assistant .message-bubble p').count();
    assert(assistantCount >= 2, 'assistant response not rendered on front-end');
    const choiceCardCount = await page.locator('.card-option').count();
    assert(choiceCardCount >= 4, 'choice card options not rendered on front-end');
    await page.locator('.card-option').first().click();
    await page.waitForFunction(() => {
      const progress = document.querySelector('.plan-progress');
      return progress ? /2\s*\/\s*3/.test(progress.textContent || '') : true;
    });

    await page.fill('#chat-input', '请生成一张柔和粉橘色调、像玻璃球一样的情绪氛围图。');
    await page.click('#chat-form button[type="submit"]');
    await page.waitForSelector('.generated-image');

    const generatedImageCount = await page.locator('.generated-image').count();
    assert(generatedImageCount >= 1, 'generated image not rendered on front-end');

    console.log(JSON.stringify({
      success: true,
      checkedAt: new Date().toISOString(),
      assertions: [
        'front-end chat message sent',
        'assistant reply rendered',
        'image generation rendered in chat stream',
      ],
    }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => platform.server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
