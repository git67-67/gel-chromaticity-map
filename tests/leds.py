"""LED library + LED compare tabs in a headless browser.   python3 tests/leds.py [N]   (N demo LEDs, default 150; use 1000 for the scale test)"""
import sys, tempfile, subprocess, time, glob, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
N = int(sys.argv[1]) if len(sys.argv) > 1 else 150
tmp = tempfile.mkdtemp()
subprocess.run([sys.executable, str(ROOT / 'tools' / 'make_demo_leds.py'), str(N), tmp], check=True, capture_output=True)
Path(tmp, 'meta.csv').write_text('rid,title,cct,ra\nled_0001,Named by table,3000,80\n')
files = sorted(glob.glob(tmp + '/led_*.csv')) + [tmp + '/meta.csv']
fail = 0
def check(name, cond, info=''):
    global fail
    print(('PASS ' if cond else 'FAIL ') + name + (('  ' + str(info)) if info != '' else ''))
    fail += 0 if cond else 1
with sync_playwright() as p:
    b = p.chromium.launch()
    for tag, vp in (('light 1200px', {'width': 1200, 'height': 900}), ('mobile 390px', {'width': 390, 'height': 844})):
        pg = b.new_page(viewport=vp); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + str(ROOT / 'dist' / 'index.html')); pg.wait_for_timeout(400)
        # map tab: library source
        pg.click('#srcrow [data-src="lib"]'); pg.wait_for_timeout(200)
        check(tag + ' map: library source shows picker and rendering numbers', pg.is_visible('#libpick') and 'Rf' in pg.inner_text('#libinfo'))
        pg.click('#t-leds'); pg.wait_for_timeout(300)
        n0 = pg.evaluate('LED.items.size'); check(tag + ' library starts with the CIE standard sources', n0 >= 38, n0)
        t = time.time(); pg.set_input_files('#ld-files', files)
        pg.wait_for_function("document.querySelector('#ld-status').textContent.startsWith('Added')", timeout=180000)
        dt = time.time() - t
        check(tag + f' imported {N} LEDs + a metadata table', pg.evaluate('LED.items.size') == n0 + N, f'{dt:.1f}s')
        check(tag + ' metadata table renamed a light', pg.evaluate("LED.items.get('usr:led_0001').name") == 'Named by table')
        check(tag + ' every light has CRI and TM-30 values', pg.evaluate("ledUser().filter(x=>x.q.ok&&x.q.tm30&&x.q.cri).length") > N * 0.95)
        pg.fill('#ld-q', 'Named by'); pg.wait_for_timeout(350)
        check(tag + ' search finds the renamed light', pg.locator('#ld-list .vrow').count() == 1)
        pg.fill('#ld-q', ''); pg.click('#ld-filters summary'); pg.fill('#ld-f-ra', '90'); pg.wait_for_timeout(400)
        k = pg.evaluate("ld.list.length>0&&ld.list.every(x=>ledVal(x,'Ra')>=90)"); check(tag + ' filter Ra ≥ 90', k, pg.inner_text('#ld-count'))
        pg.click('#ld-f-clear'); pg.select_option('#ld-sort', 'Rf'); pg.wait_for_timeout(300)
        check(tag + ' sort by Rf puts the best first', pg.evaluate("ledVal(ld.list[0],'Rf')>=ledVal(ld.list[5],'Rf')"))
        pg.click('#ld-list .vrow >> nth=2'); pg.wait_for_timeout(200)
        check(tag + ' detail shows spectrum and colour vector graphic', pg.is_visible('#ld-sp') and pg.is_visible('#ld-cvg'))
        pg.click('#ld-find'); pg.wait_for_timeout(900)
        check(tag + ' "find lights with the same CCT and Duv" opens compare with partners', pg.is_visible('#view-cmp') and pg.locator('#cm-cands tr.cand').count() > 0, pg.locator('#cm-cands tr.cand').count())
        pg.click('#cm-cands tr.cand >> nth=0'); pg.wait_for_timeout(500)
        txt = pg.inner_text('#cm-sum'); check(tag + ' compare summary names both lights and a shift', 'Swapping' in txt and 'Δu′v′' in txt, txt[:90])
        check(tag + ' compare lists every filter', pg.evaluate('cmp.res.rows.length') == 97)
        modes = ['none', 'shift', 'cri', 'tm30'] + ['cat:' + c for c in pg.evaluate('CATS.map(c=>c.id)')]
        means = {}
        for m in modes:
            pg.select_option('#cm-wp', m); pg.wait_for_timeout(120)
            means[m] = pg.evaluate('cmp.res.stats.mean')
        check(tag + ' every white-point method gives finite shifts', all(v == v and v >= 0 for v in means.values()), str(means))
        check(tag + ' a method changes the shifts (when the white points differ)', pg.evaluate('cmp.res.wShift') < 1e-4 or abs(means['none'] - means['shift']) > 1e-7, str(means))
        check(tag + ' TM-30 method equals CAT02 with D = 1', abs(means['tm30'] - means['cat:cat02']) < 1e-9, str((means['tm30'], means['cat:cat02'])))
        # B's own white must land exactly on A's white for every method with complete adaptation
        bad = pg.evaluate("""(()=>{const LA=cmLight(cmp.A),LB=cmLight(cmp.B),sa=sums(LA.spd),sb=sums(LB.spd),wA=chroma(...sa),wB=chroma(...sb),
          nW=(s,w)=>({xyz:[s[0]/s[1],1,s[2]/s[1]],up:w.up,vp:w.vp}),out=[];
          for(const mode of ['shift','cri','tm30','cat']){for(const c of CATS){const wp={mode,cat:c.id,dmode:'full',dman:1,LA:64,F:1},f=cmpAdapter(wp,nW(sb,wB),nW(sa,wA)),r=f([sb[0]/sb[1],1,sb[2]/sb[1]],wB);
            if(Math.hypot(r.up-wA.up,r.vp-wA.vp)>1e-9)out.push(mode+':'+c.id);if(mode!=='cat')break;}}return out;})()""")
        check(tag + ' every method maps B\'s white onto A\'s white', not bad, str(bad))
        pg.click('#cm-wp-adv summary'); pg.select_option('#cm-wp', 'cat:bfd'); pg.select_option('#cm-wp-dmode', 'manual'); pg.fill('#cm-wp-dman', '0'); pg.wait_for_timeout(150)
        check(tag + ' D = 0 means no adaptation (same as off)', abs(pg.evaluate('cmp.res.stats.mean') - means['none']) < 1e-9)
        pg.select_option('#cm-wp-dmode', 'full'); pg.select_option('#cm-wp-anchor', 'B'); pg.wait_for_timeout(150)
        check(tag + ' anchoring on B works', pg.evaluate('cmp.res.stats.mean') == pg.evaluate('cmp.res.stats.mean') and 'light B' in pg.inner_text('#cm-sum'), pg.inner_text('#cm-sum')[-120:])
        pg.select_option('#cm-wp-anchor', 'A'); pg.select_option('#cm-wp', 'none'); pg.wait_for_timeout(100)
        pg.click('#cm-ref'); pg.wait_for_timeout(300)
        check(tag + ' ideal reference as B gives Ra = Rf = 100', pg.evaluate("(()=>{const q=cmLight(cmp.B).q;return Math.abs(q.cri.Ra-100)<.5&&Math.abs(q.tm30.Rf-100)<.5})()"))
        check(tag + ' no horizontal page scroll', pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), pg.evaluate('document.documentElement.scrollWidth'))
        # lab accepts a library light
        pg.click('#t-lab'); pg.wait_for_timeout(200); pg.select_option('#lA-src', 'lib'); pg.wait_for_timeout(500)
        check(tag + ' adaptation lab accepts a library light', pg.is_visible('#lA-pick') and pg.evaluate("lab.A.src==='lib'"))
        check(tag + ' no page errors', not errs, errs[:2]); pg.close()
    b.close()
print('\n%d FAILED' % fail if fail else '\nall passed'); sys.exit(1 if fail else 0)
