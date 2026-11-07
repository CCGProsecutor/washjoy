import assert from 'node:assert/strict'
import test from 'node:test'
import { PAGE_SIZE, fallbackLocation, routeCacheKey, routeCandidates } from '../src/lib/nearby-helpers.ts'

test('nearby defaults to the documented first page size', () => {
  assert.equal(PAGE_SIZE, 30)
})

test('location fallback is approximate and uses the default city center', () => {
  assert.deepEqual(fallbackLocation({ name: '南京市', center: [118.7969, 32.0603] }), {
    city: '南京市', latitude: 32.0603, longitude: 118.7969, precise: false,
  })
})

test('route cache entries are isolated by origin', () => {
  assert.notEqual(routeCacheKey({ latitude: 32.06, longitude: 118.79 }, 'shop-1'), routeCacheKey({ latitude: 31.23, longitude: 121.47 }, 'shop-1'))
})

test('route candidates include every valid matched place beyond a page', () => {
  const places = Array.from({ length: 101 }, (_, index) => ({ id: String(index), latitude: 32 + index / 1000, longitude: 118 }))
  assert.equal(routeCandidates(places).length, 101)
})
