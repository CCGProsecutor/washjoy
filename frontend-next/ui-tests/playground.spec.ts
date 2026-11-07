import { test, expect } from '@playwright/test'
test('HeroUI visual and interaction baseline',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/washjoy/ui-playground');
 await expect(page.locator('.wj-playground')).toBeVisible();
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('light.png'),fullPage:true});
 await page.locator('.wj-play-place').first().click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('dialog')).toHaveCSS('opacity','1');
 await page.waitForTimeout(350);
 const rect=await page.getByRole('dialog').boundingBox();
 expect(rect!.y).toBeGreaterThanOrEqual(0);
 expect(rect!.y+rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);
 await page.screenshot({path:info.outputPath('detail.png'),fullPage:true});
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toBeHidden();
 await expect(page.locator('.wj-play-place').first()).toBeFocused();
 await page.getByRole('button',{name:'切换深色模式'}).click();
 await expect(page.locator('.wj-playground')).toHaveClass(/wj-play-dark/);
 await page.screenshot({path:info.outputPath('dark.png'),fullPage:true});
 expect(errors).toEqual([]);
 await page.getByRole('button',{name:'私汤温泉',exact:true}).click();
 await expect(page.locator('.wj-play-place')).toHaveCount(1);
 await page.getByRole('button',{name:'重置演示筛选'}).click();
 await page.getByRole('button',{name:'3 km',exact:true}).click();
 await expect(page.locator('.wj-play-place')).toHaveCount(1);
});
test('narrow viewport and failure states',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/washjoy/ui-playground');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for (const name of ['加载','空态','错误','推荐']) {
  const tab=page.getByRole('tab',{name,exact:true});
  await expect(tab).toBeVisible();await tab.click();
 }
 await page.getByRole('textbox',{name:'搜索门店'}).fill('ThisIsAnUnbreakableVeryLongStoreName没有对应店铺');
 expect(await page.locator('.wj-play-place').count()).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
