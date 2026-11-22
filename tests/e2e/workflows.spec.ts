import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('home demo and the text communication workflow', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Har bir insonning ovozi bor.' })).toBeVisible()
  await page.getByRole('button', { name: 'Keyingi suhbat namunasi' }).click()
  await expect(page.getByText('Ha, iltimos. Rahmat!')).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'Muloqotni boshlash' }).click()
  await page.getByRole('button', { name: 'Assalomu alaykum', exact: true }).click()
  const editor = page.getByRole('textbox', { name: 'Xabar matni' })
  await expect(editor).toHaveValue('Assalomu alaykum')
  await editor.fill('Assalomu alaykum, Nozima!')
  await editor.press('Control+Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Assalomu alaykum, Nozima!')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(editor).toBeFocused()
  await page.getByRole('button', { name: 'Tarixga qo‘shish' }).click()
  await expect(page.getByRole('list').getByText('Assalomu alaykum, Nozima!')).toBeVisible()
  await page.getByRole('button', { name: 'Tozalash', exact: true }).click()
  await expect(editor).toHaveValue('')
  await page.getByRole('button', { name: 'Qoralamaga qo‘shish' }).click()
  await expect(editor).toHaveValue('Assalomu alaykum, Nozima!')
  await page.reload()
  await expect(page.getByText('Hozircha tarix bo‘sh.', { exact: false })).toBeVisible()
})

test('phrase search, favorites, emergency selection and persistent theme', async ({ page }) => {
  await page.goto('/muloqot')
  await page.getByRole('link', { name: 'Barcha iboralarni ko‘rish' }).click()
  await expect(page).toHaveURL('/iboralar')
  await page.getByRole('searchbox').fill("yo'q")
  const card = page.getByRole('article').filter({ hasText: 'Yo‘q' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Saralangan ibora' }).click()
  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: 'Saralanganlar', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('button', { name: 'SOS iboralarini ochish' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Xabarga qo‘shish' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Menga zudlik bilan yordam kerak.' }).click()
  await dialog.getByRole('button', { name: 'Xabarga qo‘shish' }).click()
  await expect(page.getByRole('textbox', { name: 'Xabar matni' })).toHaveValue('Menga zudlik bilan yordam kerak.')
  await page.goto('/sozlamalar')
  await page.getByRole('combobox', { name: 'Rang mavzusi' }).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Rang mavzusi' })).toHaveValue('dark')
})

test('camera is opt-in and explicit permission denial has a fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.set(window, 'cameraStarts', 0)
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      Reflect.set(window, 'cameraStarts', Number(Reflect.get(window, 'cameraStarts')) + 1)
      throw new DOMException('Denied', 'NotAllowedError')
    } })
  })
  await page.goto('/kamera')
  await expect(page.getByText('Kamera o‘chiq')).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, 'cameraStarts'))).toBe(0)
  await page.getByRole('button', { name: 'Kamerani yoqish' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Kameraga ruxsat berilmadi.' })).toBeVisible()
})

test('manual partner input works when recognition is unsupported', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.set(window, 'SpeechRecognition', undefined)
    Reflect.set(window, 'webkitSpeechRecognition', undefined)
  })
  await page.goto('/muloqot')
  await page.getByRole('button', { name: 'Suhbatdosh javobi' }).click()
  await expect(page.getByText('Bu brauzer ovozni matnga aylantirishni qo‘llamaydi.', { exact: false })).toBeVisible()
  await page.getByRole('textbox', { name: 'Javob matni' }).fill('Javob')
  await page.getByRole('button', { name: 'Mening xabarim' }).click()
  await expect(page.getByRole('textbox', { name: 'Xabar matni' })).toHaveValue('')
  await page.getByRole('button', { name: 'Suhbatdosh javobi' }).click()
  await expect(page.getByRole('textbox', { name: 'Javob matni' })).toHaveValue('Javob')
})

test('each route fits the viewport and passes automated accessibility checks', async ({ page }) => {
  for (const route of ['/', '/muloqot', '/iboralar', '/kamera', '/sozlamalar', '/haqida', '/maxfiylik']) {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.locator('html').evaluate(node => node.scrollWidth <= node.clientWidth), route).toBeTruthy()
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), route).toEqual([])
  }
})

test('production cache keeps editor and phrasebook usable offline', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.goto('/iboralar')
  await expect(page.getByRole('heading', { name: 'Iboralar kitobi' })).toBeVisible()
  await page.getByRole('searchbox').fill('rahmat')
  await page.getByRole('button', { name: 'Xabarga qo‘shish', exact: true }).click()
  const editor = page.getByRole('textbox', { name: 'Xabar matni' })
  await expect(editor).toHaveValue('Rahmat')
  await editor.fill('Katta rahmat!')
  await page.getByRole('button', { name: 'Xabarni ko‘rsatish' }).click()
  await expect(page.getByRole('dialog').getByText('Katta rahmat!')).toBeVisible()
})

test('model download failure releases the opened camera stream', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      canvas.getContext('2d')?.fillRect(0, 0, 320, 240)
      const stream = canvas.captureStream(15)
      Reflect.set(window, 'cameraTestStream', stream)
      return stream
    } })
  })
  await page.route('**/gesture_recognizer.task', route => route.abort())
  await page.goto('/kamera')
  await page.getByRole('button', { name: 'Kamerani yoqish' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Ishora modeli yuklanmadi.' })).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, 'cameraTestStream').getTracks()[0].readyState)).toBe('ended')
  await expect(page.getByText('Kamera o‘chiq')).toBeVisible()
})
