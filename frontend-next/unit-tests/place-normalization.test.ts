import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePlace } from '../src/lib/api.ts'
test('normalizes malformed external records without leaking non-string tags or invalid numbers',()=>{
 const place=normalizePlace({id:'p1',name:'足道',adminCategory:42,tags:['安静',null,{}],photos:[null,{url:'/valid.jpg'},17],reviewRating:NaN,location:{lat:Infinity,lng:118.8}})
 assert.equal(place.category,'足疗会所');assert.deepEqual(place.tags,['安静']);assert.deepEqual(place.images,['/valid.jpg']);assert.equal(place.score,undefined);assert.equal(place.latitude,undefined)
})
test('preserves explicit private bath category and numeric review rating',()=>{
 const place=normalizePlace({id:'p2',name:'门店',adminCategory:'私汤',reviewRating:'4.8',location:'118.8,32.1',photos:['/photo.jpg']})
 assert.equal(place.category,'私汤');assert.equal(place.score,4.8);assert.equal(place.longitude,118.8);assert.equal(place.latitude,32.1)
})
