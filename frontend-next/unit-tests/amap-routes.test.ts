import assert from 'node:assert/strict'
import test from 'node:test'
import { routeDurationFromResult } from '../src/lib/amap.ts'

test('Driving and Riding use routes[].time in seconds', () => {
  for (const mode of ['car', 'bike'] as const) {
    assert.equal(routeDurationFromResult(mode, { routes: [{ time: 1800 }, { time: 1200 }] }), 1200)
    assert.equal(routeDurationFromResult(mode, { routes: [{}] }), null)
  }
})

test('Transfer uses plans[].time and rejects invalid durations', () => {
  assert.equal(routeDurationFromResult('transit', { plans: [{ time: 1300 }], routes: [{ time: 5 }] }), 1300)
  for (const result of [{}, { plans: [] }, { plans: [{ time: NaN }, { time: Infinity }, { time: -1 }] }]) {
    assert.equal(routeDurationFromResult('transit', result), null)
  }
  assert.equal(routeDurationFromResult('bike', { routes: [{ time: 0 }] }), 0)
})
