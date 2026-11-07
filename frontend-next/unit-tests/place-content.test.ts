import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePlace } from '../src/lib/api'
import { placeContent } from '../src/lib/place-content'

test('admin prose stays literal and service lists split delimiters without splitting names', () => {
  const place = normalizePlace({ id: 'admin-1', description: '第一行\n<script>unsafe()</script>', services: '泡汤|汗蒸，足疗;泡汤\n24 小时｜搓背', tags: ['汗蒸', '可过夜'] })
  assert.deepEqual(placeContent(place), { description: '第一行\n<script>unsafe()</script>', tags: ['泡汤', '汗蒸', '足疗', '24 小时', '搓背', '可过夜'] })
})

test('legacy services and public tel are retained; malformed admin fields never become visible objects', () => {
  const legacy = normalizePlace({ id: 'legacy', services: '  ', service_summary: '免费停车、泡汤', tel: '025-12345678' })
  assert.deepEqual(placeContent(legacy).tags, ['免费停车', '泡汤'])
  assert.equal(legacy.phone, '025-12345678')
  const malformed = normalizePlace({ id: 'bad', description: { text: 'invalid' }, services: ['invalid'], service_summary: {}, phone: {}, tel: null, tags: [42, null] })
  assert.deepEqual(placeContent(malformed), { description: '', tags: [] })
  assert.equal(malformed.phone, '')
})
