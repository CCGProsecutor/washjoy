import { expect, test } from '@playwright/test'
import { installAMapSdk, installApiMock, places } from './fixtures'

const photos = [1, 2, 3].map(i => `https://images.invalid/perf-${i}.svg`)
const percentile = (values: number[], p: number) => [...values].sort((a,b)=>a-b)[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)]

test('390x844, 4x CPU: repeatable motion frame and long-task sample', async ({ page, browser }, testInfo) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await installAMapSdk(page)
  await page.route('https://images.invalid/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#635840"/></svg>' }))
  await installApiMock(page, { session: { phone: '13800000000', role: 'user', createdAt: 1 }, onApiRequest: async route => {
    if (!route.request().url().includes('/public-data')) return false
    await route.fulfill({ json: { pois: [{ ...places[0], photos }, ...places.slice(1)] } })
    return true
  } })
  await page.goto('/washjoy/')
  await expect(page.getByRole('button', { name: '查看栖霞云汤泉详情' })).toBeVisible()

  // Native input avoids injected role-tree/actionability scans during animation.
  const click = async (selector: string) => {
    await page.waitForFunction(selector => Boolean(document.querySelector(selector)), selector, { timeout: 10_000 })
    const point = await page.evaluate(selector => {
      performance.mark(`input:${selector}`)
      const rect = document.querySelector(selector)!.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }, selector)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
  }
  const runSequence = async () => {
    await click('button[aria-label="查看栖霞云汤泉详情"]')
    await page.waitForFunction(() => Boolean(document.querySelector('.wj-detail button[aria-label^="放大查看"]')))
    const pause = '.wj-detail button[aria-label="暂停图片轮播"]'
    if (await page.evaluate(selector => Boolean(document.querySelector(selector)), pause)) await click(pause)
    await click('.wj-detail button[aria-label^="放大查看"]')
    await click('.wj-photo-dialog button[aria-label="放大图片"]')
    await page.waitForTimeout(350)
    await click('.wj-photo-dialog button[aria-label="还原图片"]')
    await page.waitForTimeout(350)
    await click('.wj-photo-dialog button[aria-label="下一张图片"]')
    await page.evaluate(() => performance.mark('input:Escape'))
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await page.waitForFunction(() => !document.querySelector('.wj-photo-dialog'))
    await click('.wj-detail button[aria-label="关闭门店详情"]')
    await page.waitForFunction(() => !document.querySelector('.wj-detail'))
  }

  await runSequence()
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  const samples: { frameTimestampsMs: number[]; tasks: { start: number; end: number }[]; phases: { name: string; start: number }[]; frameCount: number; p95FrameIntervalMs: number; over33msRatio: number; over50msLongTasks: number; intervalsMs: number[]; nonAnimationLongTasksMs: number[]; windows: { start: number; end: number; kind: string }[] }[] = []
  for (let trial = 0; trial < 3; trial++) {
    await page.evaluate(() => {
      type Window = { start: number; end: number; kind: string }
      const frames: number[] = []
      const tasks: { start: number; end: number }[] = []
      const windows: Window[] = []
      const active = new Map<string, Window>()
      const elementIds = new WeakMap<EventTarget, number>()
      let nextId = 0
      const key = (event: Event) => {
        if (!elementIds.has(event.target!)) elementIds.set(event.target!, ++nextId)
        return `${elementIds.get(event.target!)}:${event instanceof TransitionEvent ? event.propertyName : (event as AnimationEvent).animationName}`
      }
      const tracked = new WeakMap<Animation, Window>()
      const track = (animation: Animation, window: Window) => {
        tracked.set(animation, window)
        const synchronize = () => {
          const timing = animation.effect?.getComputedTiming()
          if (typeof animation.startTime !== 'number' || !timing || animation.playbackRate <= 0) return
          window.start = animation.startTime + Number(timing.delay) / animation.playbackRate
          // The compositor ends on its timeline, even when a busy main thread
          // delivers animationend/finished callbacks substantially later.
          if (typeof timing.endTime === 'number') window.end = Math.min(window.end, animation.startTime + timing.endTime / animation.playbackRate)
        }
        synchronize()
        void animation.ready.then(synchronize).catch(() => {})
      }
      const originalFinish = Animation.prototype.finish
      const originalCancel = Animation.prototype.cancel
      Animation.prototype.finish = function () {
        originalFinish.call(this)
        const window = tracked.get(this)
        if (window) window.end = Math.min(window.end, performance.now())
      }
      Animation.prototype.cancel = function () {
        originalCancel.call(this)
        const window = tracked.get(this)
        if (window) window.end = Math.min(window.end, performance.now())
      }
      const start = (event: Event) => {
        const window = { start: performance.now(), end: Infinity, kind: `${event.type}:${(event.target as Element).className}:${event instanceof TransitionEvent ? event.propertyName : (event as AnimationEvent).animationName}` }
        windows.push(window); active.set(key(event), window)
        const animation = (event.target as Element).getAnimations().find(animation => event instanceof TransitionEvent
          ? animation instanceof CSSTransition && animation.transitionProperty === event.propertyName
          : animation instanceof CSSAnimation && animation.animationName === (event as AnimationEvent).animationName)
        if (animation) track(animation, window)
      }
      const end = (event: Event) => {
        const window = active.get(key(event))
        if (window) { window.end = Math.min(window.end, performance.now()); active.delete(key(event)) }
      }
      const starts = ['transitionstart', 'animationstart']
      const ends = ['transitionend', 'transitioncancel', 'animationend', 'animationcancel']
      starts.forEach(name => document.addEventListener(name, start, true))
      ends.forEach(name => document.addEventListener(name, end, true))
      const originalAnimate = Element.prototype.animate
      Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
        const animation = originalAnimate.apply(this, args)
        const window = { start: performance.now(), end: Infinity, kind: 'WAAPI' }
        windows.push(window)
        track(animation, window)
        void animation.finished.then(() => { window.end = Math.min(window.end, performance.now()) }).catch(() => { window.end = Math.min(window.end, performance.now()) })
        return animation
      }
      const motion = (event: Event) => {
        const { id, phase } = (event as CustomEvent<{ id: string; phase: string }>).detail
        if (phase === 'start') {
          const window = { start: performance.now(), end: Infinity, kind: 'Motion spring' }
          windows.push(window); active.set(id, window)
        } else {
          const window = active.get(id)
          if (window) { window.end = performance.now(); active.delete(id) }
        }
      }
      window.addEventListener('wj-motion-lifecycle', motion)
      let raf = 0
      const frame = (now: number) => { frames.push(now); raf = requestAnimationFrame(frame) }
      raf = requestAnimationFrame(frame)
      const observer = new PerformanceObserver(entries => tasks.push(...entries.getEntries().map(entry => ({ start: entry.startTime, end: entry.startTime + entry.duration }))))
      observer.observe({ type: 'longtask', buffered: false })
      const stop = () => {
        cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('wj-motion-lifecycle', motion)
        starts.forEach(name => document.removeEventListener(name, start, true))
        ends.forEach(name => document.removeEventListener(name, end, true))
        Element.prototype.animate = originalAnimate
        Animation.prototype.finish = originalFinish
        Animation.prototype.cancel = originalCancel
        const now = performance.now()
        windows.forEach(window => { if (!Number.isFinite(window.end)) window.end = now })
        return { frames, tasks, windows, phases: performance.getEntriesByType('mark').filter(mark => mark.name.startsWith('input:')).map(mark => ({ name: mark.name, start: mark.startTime })) }
      }
      ;(window as typeof window & { __motionStop?: typeof stop }).__motionStop = stop
    })
    await runSequence()
    const result = await page.evaluate(async () => {
      // Drain observer delivery only; frame statistics select animation windows.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      return (window as typeof window & { __motionStop: () => { phases: { name: string; start: number }[]; frames: number[]; tasks: { start: number; end: number }[]; windows: { start: number; end: number; kind: string }[] } }).__motionStop()
    })
    const overlaps = (start: number, end: number) => result.windows.some(window => window.end > start && window.start < end)
    // Only complete consecutive animation frames enter the distribution. Mount
    // layout before animationstart is reported separately, never as idle frames.
    const intervalsMs = result.frames.slice(1).flatMap((end, index) => {
      const start = result.frames[index]
      return result.windows.some(window => start >= window.start && end <= window.end) ? [end - start] : []
    })
    samples.push({
      frameCount: intervalsMs.length,
      p95FrameIntervalMs: percentile(intervalsMs, .95),
      over33msRatio: intervalsMs.filter(value => value > 33).length / intervalsMs.length,
      over50msLongTasks: result.tasks.filter(task => task.end - task.start > 50 && overlaps(task.start, task.end)).length,
      nonAnimationLongTasksMs: result.tasks.filter(task => !overlaps(task.start, task.end)).map(task => task.end - task.start),
      intervalsMs,
      windows: result.windows,
      frameTimestampsMs: result.frames,
      tasks: result.tasks,
      phases: result.phases,
    })
  }
  const env = await page.evaluate(() => ({ dpr: devicePixelRatio, userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight }, hardwareConcurrency: navigator.hardwareConcurrency }))
  const report = { browser: browser.version(), cpuThrottlingRate: 4, environment: env, warmupRuns: 1, trials: samples }
  await testInfo.attach('motion-performance.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' })
  for (const sample of samples) {
    expect(sample.frameCount).toBeGreaterThan(20)
    expect(sample.p95FrameIntervalMs, JSON.stringify(report)).toBeLessThanOrEqual(20)
    expect(sample.over33msRatio, JSON.stringify(report)).toBeLessThanOrEqual(.03)
    expect(sample.over50msLongTasks, JSON.stringify(report)).toBe(0)
  }
})
