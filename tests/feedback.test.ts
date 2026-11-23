import assert from 'node:assert/strict'
import { test } from 'node:test'
import { submitFeedback } from '../lib/feedback-action'

test('feedback reports delivery only after a receiver accepts it', async t => {
  const data = new FormData()
  data.set('category', 'Ishorani aniqlash')
  data.set('message', 'Kamera holati haqida xabar.')
  const previous = { status: 'idle' as const, message: '' }
  const savedUrl = process.env.FEEDBACK_WEBHOOK_URL
  delete process.env.FEEDBACK_WEBHOOK_URL
  t.after(() => {
    if (savedUrl === undefined) delete process.env.FEEDBACK_WEBHOOK_URL
    else process.env.FEEDBACK_WEBHOOK_URL = savedUrl
  })
  assert.equal((await submitFeedback(previous, data)).status, 'error')
  process.env.FEEDBACK_WEBHOOK_URL = 'https://example.invalid/feedback'
  const mockedFetch = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  assert.equal((await submitFeedback(previous, data)).status, 'error')
  mockedFetch.mock.mockImplementation(async () => new Response(null, { status: 202 }))
  assert.equal((await submitFeedback(previous, data)).status, 'sent')
  data.set('contact', 'invalid')
  assert.equal((await submitFeedback(previous, data)).status, 'error')
  assert.equal(mockedFetch.mock.callCount(), 2)
})
