# Generator: any studio project -> QR flyer kit (tabletop USDZ 1:100/1:50 image-anchored to the flyer marker, GLB, plan PNG, QR, A4 PDF).
# usage: python3 qr_build.py <demoButtonId> <flyerId> [title]
import sys,json,base64,os,qrcode
sys.path.insert(0,'/workspace/vk_ar_qa'); from boot import boot
from playwright.sync_api import sync_playwright
V='20261126a'; demo=sys.argv[1]; fid=sys.argv[2]; title=sys.argv[3] if len(sys.argv)>3 else 'Ukážkový rodinný dom'
R='/workspace/vk_ar'; out=f'{R}/assets/ar/qr/{fid}'; os.makedirs(out,exist_ok=True)
L=dict(markerMM=80,marker=[57,240],plan=[105,118],planBox=[186,120])  # must equal LAYOUT in ar-qr/qr.js
url=f'https://adamskusaai.github.io/vkroc-studio-dfac2a/ar-qr/index.html?v={V}&m={fid}'
with sync_playwright() as p:
    b,ctx,pg=boot(p,'http://localhost:8797/ar-preview/index.html?v=rt&nocount=1&armode=usdz&arlodt=250&arlodc=0.06',device='iPhone 13',demo=demo)
    pg.evaluate("document.querySelector('[data-s=vw]').click()"); pg.wait_for_timeout(800)
    k=pg.evaluate("async()=>{const m=await import('/ar-qr/qr.js?v=%s');const o=await m.flyerKit({});o.layout=m.LAYOUT;return o;}"%V)
    b.close()
assert k['layout']==L,(k['layout'],L)
for n,d in k['files'].items(): open(f'{out}/{n}','wb').write(base64.b64decode(d)); print(n,os.path.getsize(f'{out}/{n}'))
pl=k['plan']; open(f'{out}/plan.png','wb').write(base64.b64decode(pl['url'].split(',')[1]))
F=pl['F']; meta=dict(v=V,id=fid,title=title,width=round(F['width'],2),depth=round(F['depth'],2),scales=[100,50],markerMM=L['markerMM'],url=url,files=sorted(k['files']))
json.dump(meta,open(f'{out}/meta.json','w'),ensure_ascii=False,indent=1)
q=qrcode.QRCode(border=1,box_size=10,error_correction=qrcode.constants.ERROR_CORRECT_M); q.add_data(url); q.make()
q.make_image(fill_color='black',back_color='white').convert('RGB').save(f'{out}/qr.png')
pw,ph=pl['mm'][0]/100,pl['mm'][1]/100   # printed plan size at 1:100 (mm)
assert pw<=L['planBox'][0] and ph<=L['planBox'][1],(pw,ph)
fm=lambda x:('%.2f'%x).replace('.',',')
html=f'''<!doctype html><html lang="sk"><head><meta charset="utf-8"><style>@page{{size:A4;margin:0}}*{{box-sizing:border-box}}body{{margin:0;width:210mm;height:297mm;position:relative;font-family:"DejaVu Sans",sans-serif;color:#1b1b1b}}
.a{{position:absolute}}h1{{font-size:20pt;margin:0}}.s{{font-size:10pt;color:#555}}ol{{margin:0;padding-left:5mm;font-size:9.5pt;line-height:1.45}}</style></head><body>
<div class="a" style="left:12mm;top:10mm;right:12mm"><h1>{title}</h1><div class="s">Šírka {fm(F['width'])} m · hĺbka {fm(F['depth'])} m · ukážkový projekt Vkroč</div></div>
<img class="a" src="file://{out}/plan.png" style="width:{pw}mm;height:{ph}mm;left:{L['plan'][0]-pw/2}mm;top:{L['plan'][1]-ph/2}mm">
<div class="a s" style="left:12mm;top:{L['plan'][1]+L['planBox'][1]/2+1}mm">Pôdorys 1:100 (rez vo výške 1,2 m) · ulica / vstup je dole</div>
<img class="a" src="file://{R}/{'assets/ar/marker_ref_20261125b.png'}" style="width:{L['markerMM']}mm;height:{L['markerMM']}mm;left:{L['marker'][0]-L['markerMM']/2}mm;top:{L['marker'][1]-L['markerMM']/2}mm;image-rendering:pixelated">
<img class="a" src="file://{out}/qr.png" style="width:38mm;height:38mm;left:110mm;top:{L['marker'][1]-L['markerMM']/2}mm">
<div class="a" style="left:152mm;top:{L['marker'][1]-L['markerMM']/2}mm;width:47mm"><b style="font-size:10.5pt">Dom v 3D na tomto papieri</b><ol><li>Naskenujte QR kód fotoaparátom.</li><li>Ťuknite na <b>Otvoriť v AR</b>.</li><li>Namierte mobil na obrázok vľavo, dom sa postaví na pôdorys.</li></ol></div>
<div class="a s" style="left:110mm;top:{L['marker'][1]+14}mm;width:89mm;font-size:8pt">Tlačte v mierke 100 % (bez prispôsobenia). Kontrola: čiara nižšie má mať 50 mm.<div style="margin-top:2mm;width:50mm;height:2mm;background:#000"></div></div>
</body></html>'''
hp=f'/workspace/vk_ar_qa/letak_{fid}.html'; open(hp,'w').write(html)
pdf=f'{R}/ar-qr/letak_{fid}.pdf'
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.goto('file://'+hp); pg.wait_for_timeout(800)
    pg.pdf(path=pdf,format='A4',print_background=True,prefer_css_page_size=True); pg.set_viewport_size({'width':794,'height':1123}); pg.screenshot(path=f'/workspace/vk_ar_qa/letak_{fid}.png'); b.close()
print('pdf',pdf,os.path.getsize(pdf)); print(json.dumps(meta))
