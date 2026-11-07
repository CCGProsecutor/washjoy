import type { Place } from './api'

// Admin content belongs to the venue profile, separate from customer reviews.
// Preserve prose and split only service-list delimiters, not ordinary spaces.
export function placeContent(place: Pick<Place, 'description' | 'services' | 'tags'>) {
  const description = typeof place.description === 'string' ? place.description.trim() : ''
  const configured = typeof place.services === 'string' ? place.services.split(/[|｜,，、;；\r\n]+/) : []
  const tags = [...new Set([...configured, ...place.tags].map(tag => tag.trim()).filter(Boolean))]
  return { description, tags }
}
