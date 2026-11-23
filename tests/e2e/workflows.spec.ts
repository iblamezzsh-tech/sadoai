import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('home demo and the text communication workflow', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Har bir insonning ovozi bor.' })).toBeVisible()
  await page.getByRole('button', { name: 'Matn va ovoz' }).click()
  await expect(page.getByText('Assalomu alaykum.', { exact: true })).toBeVisible()
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
  await expect(page.getByText('Kamera o‘chiq', { exact: true })).toBeVisible()
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
  for (const route of ['/', '/muloqot', '/iboralar', '/kamera', '/kamera/tajriba', '/sozlamalar', '/haqida', '/maxfiylik']) {
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
  await page.goto('/kamera/tajriba')
  await page.getByRole('button', { name: 'Kamerani yoqish' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Ishora modeli yuklanmadi.' })).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, 'cameraTestStream').getTracks()[0].readyState)).toBe('ended')
  await expect(page.getByText('Kamera o‘chiq', { exact: true })).toBeVisible()
})

test('sign workspace is honest without an Uzbek model and supports manual text', async ({ page }) => {
  await page.goto('/kamera')
  await expect(page.getByRole('heading', { name: 'Ishoradan matnga' })).toBeVisible()
  await expect(page.getByText('Tasdiqlangan o‘zbek ishora tili modeli hali ulanmagan.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'UzSLR tadqiqot manbasi' })).toHaveAttribute('href', /github\.com\/khdbeck\/uzslr-sign-language-prototype/)
  const transcript = page.getByRole('textbox', { name: 'Jonli matn' })
  await expect(transcript).toHaveValue('')
  await transcript.fill('Qo‘lda yozilgan matn')
  await page.getByRole('button', { name: 'Katta ekranda ko‘rsatish' }).click()
  await expect(page.getByRole('dialog').getByText('Qo‘lda yozilgan matn')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Tozalash' }).click()
  await expect(transcript).toHaveValue('')
  await page.getByRole('link', { name: 'Qo‘l shakllari tajribasini ochish' }).click()
  await expect(page).toHaveURL('/kamera/tajriba')
})

test('landmark download failure keeps preview usable until the user stops it', async ({ page }) => {
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
  await page.route('**/holistic_landmarker.task*', route => route.abort())
  await page.goto('/kamera')
  await page.getByRole('button', { name: 'Kamerani yoqish' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'nuqtalari modeli yuklanmadi' })).toBeVisible()
  await expect(page.locator('video')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Jonli matn' })).toHaveValue('')
  await page.getByRole('button', { name: 'Kamerani o‘chirish' }).click()
  expect(await page.evaluate(() => Reflect.get(window, 'cameraTestStream').getTracks()[0].readyState)).toBe('ended')
})

test('camera transfer preserves drafts and offers append, separate, and explicit replace', async ({ page }) => {
  await page.goto('/muloqot')
  const editor = page.getByRole('textbox', { name: 'Xabar matni' })
  await editor.fill('Avvalgi xabar')
  const transfer = async (text: string) => {
    await page.getByRole('link', { name: 'Kamera', exact: true }).filter({ visible: true }).click()
    await page.getByRole('textbox', { name: 'Jonli matn' }).fill(text)
    await page.getByRole('button', { name: 'Muloqot studiyasiga o‘tkazish' }).click()
    await expect(page.getByRole('dialog', { name: 'Kameradan kelgan matn' })).toBeVisible()
  }
  await transfer('Kamera matni')
  await page.getByRole('dialog').getByRole('button', { name: 'Alohida xabar yaratish' }).click()
  await expect(editor).toHaveValue('Kamera matni')
  await editor.fill('Tahrirlangan alohida matn')
  await page.getByRole('button', { name: 'Mening xabarim' }).click()
  await expect(editor).toHaveValue('Avvalgi xabar')
  await page.getByRole('combobox', { name: 'Alohida kamera qoralamalari' }).selectOption({ label: 'Kamera xabari 1' })
  await expect(editor).toHaveValue('Tahrirlangan alohida matn')
  await transfer('Qo‘shimcha')
  await page.getByRole('dialog').getByRole('button', { name: 'Qoralamaga qo‘shish' }).click()
  await expect(editor).toHaveValue('Avvalgi xabar\nQo‘shimcha')
  await transfer('Yangi xabar')
  await page.getByRole('dialog').getByRole('button', { name: 'Qoralamani almashtirish' }).click()
  await expect(editor).toHaveValue('Yangi xabar')
})

test('speech uses the selected Uzbek voice and speaks the edited transcript', async ({ page }) => {
  await page.addInitScript(() => {
    class MockUtterance extends EventTarget {
      constructor(public text: string) { super() }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance })
    const mock = new EventTarget()
    Object.assign(mock, {
      getVoices: () => [{ lang: 'uz-UZ', localService: true }],
      cancel: () => {},
      speak: (utterance: SpeechSynthesisUtterance) => {
        Reflect.set(window, 'spokenText', { text: utterance.text, language: utterance.lang })
        queueMicrotask(() => utterance.dispatchEvent(new Event('end')))
      },
    })
    Object.defineProperty(window, 'speechSynthesis', { value: mock })
  })
  await page.goto('/kamera')
  await page.getByRole('textbox', { name: 'Jonli matn' }).fill('Sinov matni')
  await page.getByRole('button', { name: 'Ovoz chiqarib o‘qish' }).click()
  expect(await page.evaluate(() => Reflect.get(window, 'spokenText'))).toEqual({ text: 'Sinov matni', language: 'uz-UZ' })
})

test('personal gesture shortcuts persist without arming the camera or creating default text', async ({ page }) => {
  await page.goto('/kamera/tajriba')
  const setup = page.getByRole('region', { name: 'Shaxsiy imo buyruqlari' })
  const automatic = setup.getByRole('checkbox', { name: 'Tanishda matnni avtomatik qo‘shish' })
  const phrase = setup.getByRole('textbox', { name: 'Biriktiriladigan matn' })
  await expect(automatic).toBeDisabled()
  await setup.getByRole('combobox', { name: 'Qo‘l shakli' }).selectOption('Open_Palm')
  await phrase.fill('Salom, sizni ko‘rib xursandman.')
  await setup.getByRole('button', { name: 'Buyruqni saqlash' }).click()
  await automatic.check()
  await expect(setup.getByRole('textbox', { name: 'Buyruqlardan yig‘ilgan matn' })).toHaveValue('')
  await page.reload()
  await expect(phrase).toHaveValue('Salom, sizni ko‘rib xursandman.')
  await expect(automatic).not.toBeChecked()
  await setup.getByRole('button', { name: 'Buyruqni o‘chirish' }).click()
  await expect(automatic).toBeDisabled()
})

test('feedback without a receiver has local options and no false submission', async ({ page }) => {
  await page.goto('/haqida')
  await expect(page.getByText('Yuborish xizmati sozlanmagan.', { exact: false })).toBeVisible()
  await page.getByRole('combobox', { name: 'Mavzu' }).selectOption('Ishorani aniqlash')
  await page.getByRole('textbox', { name: 'Xabar', exact: true }).fill('Tanish holatida xato bor.')
  await page.getByRole('textbox', { name: 'Email (ixtiyoriy)' }).fill('test@example.invalid')
  await expect(page.getByRole('button', { name: 'Fikrni yuborish' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Fayl qilib olish' })).toBeEnabled()
  await expect(page.getByText('Xabaringiz qabul qilindi.')).toHaveCount(0)
})

test('camera transcript stays editable when speech synthesis is unavailable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { value: undefined }))
  await page.goto('/kamera')
  await expect(page.getByText('Bu brauzerda ovozli o‘qish ishlamaydi.', { exact: false })).toBeVisible()
  await page.getByRole('textbox', { name: 'Jonli matn' }).fill('Matn yordamida muloqot')
  await expect(page.getByRole('button', { name: 'Ovoz chiqarib o‘qish' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Katta ekranda ko‘rsatish' })).toBeEnabled()
})

test('accessibility and camera preferences persist and local data can be reset', async ({ page }) => {
  await page.goto('/sozlamalar')
  await page.getByRole('combobox', { name: 'Rang mavzusi' }).selectOption('light')
  await page.getByRole('combobox', { name: 'Matn o‘lchami' }).selectOption('extra')
  await page.getByRole('checkbox', { name: 'Animatsiyalarni kamaytirish' }).check()
  await page.getByRole('combobox', { name: 'Afzal kamera' }).selectOption('environment')
  await page.getByRole('checkbox', { name: 'Tarixni shu brauzerda saqlash' }).check()
  await page.getByRole('slider', { name: 'O‘qish tezligi' }).press('ArrowRight')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-font', 'extra')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
  await expect(page.getByRole('combobox', { name: 'Afzal kamera' })).toHaveValue('environment')
  await expect(page.getByRole('checkbox', { name: 'Tarixni shu brauzerda saqlash' })).toBeChecked()
  await expect(page.getByRole('slider', { name: 'O‘qish tezligi' })).toHaveValue('1.1')
  expect(await page.locator('html').evaluate(node => node.scrollWidth <= node.clientWidth)).toBeTruthy()
  await page.getByRole('button', { name: 'Mahalliy ma’lumotlarni tozalash' }).click()
  await page.getByRole('button', { name: 'Tozalashni tasdiqlash' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-font', 'standard')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on')
  await expect(page.getByRole('checkbox', { name: 'Tarixni shu brauzerda saqlash' })).not.toBeChecked()
})
