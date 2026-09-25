import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
for (const vp of [{w:390,h:844,tag:"m390"},{w:360,h:800,tag:"m360"},{w:320,h:760,tag:"m320"},{w:1440,h:900,tag:"d"}]) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  p.on("pageerror", e => errs.push(`${vp.tag} ${e.message}`));
  p.on("console", m => { if (m.type() === "error") errs.push(`${vp.tag} ${m.text()}`); });
  for (const r of ["/inbox","/transactions","/budgets","/rules","/imports","/transactions/trash","/reports","/capture/upload","/imports/direct"]) {
    const name = r.slice(1).replace(/\//g,"-");
    const resp = await p.goto(`http://localhost:3107${r}`, { waitUntil: "networkidle", timeout: 30000 }).catch(()=>null);
    if (!resp || resp.status() !== 200) errs.push(`${vp.tag} ${r} status=${resp?.status()}`);
    const hscroll = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (hscroll) errs.push(`${vp.tag} ${r} H-SCROLL`);
    // detect overflowing buttons: scrollWidth of button > clientWidth
    const clipped = await p.evaluate(() => {
      const bad = [];
      document.querySelectorAll("a,button").forEach(el => {
        if (el.scrollWidth > el.clientWidth + 1) bad.push(el.textContent.trim().slice(0,40));
      });
      return bad;
    });
    if (clipped.length) errs.push(`${vp.tag} ${r} CLIPPED: ${clipped.join(" | ")}`);
    await p.screenshot({ path: `/tmp/mf-density/${vp.tag}2-${name}.png` });
  }
  await ctx.close();
}
await b.close();
console.log("done", errs.length ? `\nERRORS:\n${errs.join("\n")}` : "no errors");
