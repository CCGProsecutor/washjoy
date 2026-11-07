import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPlaces, type Place } from './api'
import { cityDatasets, getRouteDuration, locate, type LocationFix } from './amap'
import { distanceInKm } from './geo'
import { fallbackLocation, PAGE_SIZE, routeCandidates } from './nearby-helpers'
import { computeRouteBatch, RouteCache, routeRequestKey, type RouteRequest } from './route-cache'
import { travelModeLabels, type TravelMode } from './travel-mode'

const routeCache = new RouteCache((request, signal) => getRouteDuration(request.mode, request.city, [request.origin.longitude, request.origin.latitude], [request.destination.longitude, request.destination.latitude], signal))

const EMPTY_PLACES: Place[] = []

export const radiusSteps = [3, 5, 10, 0] as const
export const radiusLabel = (km: number) => (km === 0 ? '全城' : `${km} 公里`)
export const durationSteps = [15 * 60, 30 * 60, 45 * 60, 60 * 60] as const // 秒
export const durationLabel = (sec: number) => (sec === 0 ? '无限制' : `${sec / 60 | 0} 分钟`)
export { PAGE_SIZE } from './nearby-helpers'

export type NearbyPlace = { place: Place; distance: number | null }
export type LocationState = 'pending' | 'ready' | 'failed'

// 定位 + 数据集（江苏 13 市 + 上海） + 筛选 + 距离排序 + 所选出行模式时间筛选。首页和详情共用同一份结果。
export function useNearby(travelMode: TravelMode = 'transit') {
  const [fix, setFix] = useState<LocationFix | null>(null)
  const [locationState, setLocationState] = useState<LocationState>('pending')
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [radiusIndex, setRadiusIndex] = useState(3)
  const [durationIndex, setDurationIndex] = useState(1) // 默认 30 分钟；-1 = 无时间限制
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('全部')
  const [recommended, setRecommended] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [durations, setDurations] = useState<Map<string, { duration: number | null; expires: number }>>(new Map())
  const [durationPending, setDurationPending] = useState(false)
  const locationAttempt = useRef(0)
  const [routeRefresh, setRouteRefresh] = useState(0)
  const [routeBudget, setRouteBudget] = useState({ key: '', count: PAGE_SIZE })
  const routeProgress = useRef({ key: '', count: 0 })

  const matchedCity = fix?.city ? cityDatasets.find((item) => fix.city.startsWith(item.name.replace('市', ''))) : undefined
  const dataset = matchedCity ?? cityDatasets[0]
  const outsideCoverage = Boolean(fix?.city) && !matchedCity
  const userLocation = fix && fix.precise && !outsideCoverage ? fix : null
  const radiusKm = userLocation ? radiusSteps[radiusIndex] : 0
  const routeOrigin = useMemo(() => userLocation ? {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
  } : null, [userLocation])

  const { data = EMPTY_PLACES, isPending, isError, refetch } = useQuery({
    queryKey: ['places', dataset.id],
    queryFn: () => getPlaces(dataset.id),
    staleTime: 60_000,
    retry: 1,
  })

  const locateUser = useCallback(() => {
    const attempt = ++locationAttempt.current
    setLocating(true)
    setLocationState('pending')
    setLocationMessage('')
    const fallback = () => {
      const city = cityDatasets[0]
      setFix(fallbackLocation(city))
      setLocationState('failed')
      setRadiusIndex(3)
      setLimit(PAGE_SIZE)
    }
    let timeoutId: number | undefined
    const timeout = new Promise<never>((_, reject) => { timeoutId = window.setTimeout(() => reject(new Error('location-timeout')), 3500) })
    Promise.race([locate(), timeout]).then((result) => {
      if (attempt !== locationAttempt.current) return
      setFix(result); setLocationState('ready'); setRadiusIndex(3); setLimit(PAGE_SIZE)
    }).catch((error: unknown) => {
      if (attempt !== locationAttempt.current) return
      const text = error instanceof Error ? error.message : ''
      setLocationMessage(/denied|permission/i.test(text) ? '请允许浏览器定位权限' : /timeout/i.test(text) ? '定位超时，显示默认城市' : '暂时无法定位，显示默认城市')
      fallback()
    }).finally(() => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      if (attempt === locationAttempt.current) setLocating(false)
    })
  }, [])

  useEffect(() => { locateUser() }, [locateUser])
  useEffect(() => { setLimit(PAGE_SIZE) }, [query, category, recommended, radiusIndex, durationIndex, dataset.id, travelMode])

  const nearbyCandidates = useMemo<NearbyPlace[]>(() => {
    const needle = query.trim().toLowerCase()
    return data
      .filter((place) => {
        const text = `${place.name} ${place.address} ${place.category}`.toLowerCase()
        return text.includes(needle) && (category === '全部' || place.category === category) && (!recommended || place.recommended)
      })
      .map((place) => ({ place, distance: userLocation && Number.isFinite(place.latitude) && Number.isFinite(place.longitude) ? distanceInKm(userLocation.latitude, userLocation.longitude, place.latitude!, place.longitude!) : null }))
      .filter(({ distance }) => !userLocation || radiusKm === 0 || (distance !== null && distance <= radiusKm))
      .sort((a, b) => (a.distance ?? Number.MAX_VALUE) - (b.distance ?? Number.MAX_VALUE))
  }, [category, data, query, recommended, userLocation, radiusKm])

  const routePlaces = useMemo(() => routeCandidates(nearbyCandidates.map(({ place }) => place)), [nearbyCandidates])
  const requestFor = useCallback((place: Place, mode: TravelMode = travelMode): RouteRequest => ({
    mode, city: dataset.name, origin: routeOrigin!, destination: { longitude: place.longitude!, latitude: place.latitude! },
  }), [dataset.name, routeOrigin, travelMode])
  const routeContextKey = JSON.stringify([travelMode, dataset.id, routeOrigin, query, category, recommended, radiusIndex])
  const routeCount = routeBudget.key === routeContextKey ? routeBudget.count : PAGE_SIZE
  const reachabilityAvailable = Boolean(routeOrigin)
  const routeHasMore = durationIndex >= 0 && reachabilityAvailable && routeCount < routePlaces.length
  const routeLoadMore = useCallback(() => {
    setRouteBudget((current) => ({ key: routeContextKey, count: (current.key === routeContextKey ? current.count : PAGE_SIZE) + PAGE_SIZE }))
  }, [routeContextKey])

  const results = useMemo<NearbyPlace[]>(() => {
    if (durationIndex < 0 || !routeOrigin) return nearbyCandidates
    const maxDuration = durationSteps[durationIndex]
    return nearbyCandidates.filter(({ place }) => {
      const entry = durations.get(routeRequestKey(requestFor(place)))
      return entry && entry.expires > Date.now() && entry.duration !== null && entry.duration <= maxDuration
    })
  }, [durationIndex, durations, nearbyCandidates, routeOrigin, requestFor])

  const routeBatchCandidateCount = Math.min(routeCount, routePlaces.length)
  const routeComputedCount = routeOrigin ? routePlaces.slice(0, routeBatchCandidateCount).filter((place) => {
    const entry = durations.get(routeRequestKey(requestFor(place)))
    return entry && entry.expires > Date.now()
  }).length : 0

  useEffect(() => {
    if (durationIndex < 0 || !routeOrigin) return
    const timer = window.setInterval(() => setRouteRefresh((value) => value + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [durationIndex, routeOrigin])

  useEffect(() => {
    if (durationIndex < 0 || !routeOrigin) { setDurationPending(false); return }
    const controller = new AbortController()
    const previous = routeProgress.current
    const sameContext = previous.key === routeContextKey
    const start = sameContext && routeCount > previous.count ? previous.count : 0
    const end = Math.min(routeCount, routePlaces.length)
    routeProgress.current = { key: routeContextKey, count: routeCount }
    const batch = routePlaces.slice(start, end)
    setDurationPending(true)
    // Clear expired snapshots even when the persistent cache has already evicted them.
    setDurations((current) => new Map([...current].filter(([, entry]) => entry.expires > Date.now())))
    void computeRouteBatch(batch, controller.signal,
      (place) => routeCache.request(requestFor(place), controller.signal),
      (place) => {
        const request = requestFor(place)
        const entry = routeCache.peek(request)
        if (entry) setDurations((current) => new Map(current).set(routeRequestKey(request), entry))
      },
    ).then(() => {
      if (!controller.signal.aborted) setDurationPending(false)
    })
    return () => controller.abort()
  }, [durationIndex, routeOrigin, routePlaces, requestFor, routeContextKey, routeCount, routeRefresh])

  // Preheat only six visible destinations after foreground calculation settles.
  // shortcut: low-priority preheat uses one slot; increase only after quota measurements.
  useEffect(() => {
    if (durationPending || durationIndex < 0 || !routeOrigin || results.length === 0) return
    const controller = new AbortController()
    const places = results.slice(0, Math.min(limit, 6)).map(({ place }) => place)
    const timer = window.setTimeout(() => {
      void (async () => {
        for (const place of places) {
          for (const mode of ['transit', 'bike', 'car'] as const) {
            if (controller.signal.aborted) return
            if (mode !== travelMode) await routeCache.request(requestFor(place, mode), controller.signal, true)
          }
        }
      })()
    }, 500)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [durationPending, durationIndex, routeOrigin, results, limit, travelMode, requestFor])

  const status = locating ? '正在获取位置…'
    : locationState === 'failed' ? locationMessage
    : durationPending ? `正在计算${travelModeLabels[travelMode]}时间…`
    : outsideCoverage ? `${fix?.city}暂无数据，显示${dataset.name}`
    : userLocation ? `${radiusLabel(radiusKm)}内 · 已定位`
    : locationState === 'ready' ? '大致位置，点定位按钮重试'
    : `${dataset.name}默认视野`

  return {
    fix, userLocation, dataset, outsideCoverage, radiusKm, radiusIndex, setRadiusIndex,
    durationIndex, setDurationIndex, travelMode, routeHasMore, routeLoadMore, routeComputedCount,
    routeBatchCandidateCount, routeRemainingCount: Math.max(0, routePlaces.length - routeCount), reachabilityAvailable,
    query, setQuery, category, setCategory, recommended, setRecommended, limit, setLimit,
    results, visible: results.slice(0, limit), allPlaces: data, isPending, isError, refetch,
    locating, locationState, durationPending, status, locateUser,
  }
}
