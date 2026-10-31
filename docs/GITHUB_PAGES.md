# เผยแพร่ NangLung บน GitHub Pages

โปรเจกต์เป็นเว็บ static ไม่มี backend จึงนำโฟลเดอร์ `dist/` ขึ้น GitHub Pages ได้ กล้องต้องได้รับอนุญาตจากเบราว์เซอร์ เว็บไซต์ Pages ใช้ HTTPS และภาพกล้องยังประมวลผลบนอุปกรณ์ของผู้ใช้

## Workflow ที่เตรียมไว้

ไฟล์ `.github/workflows/pages.yml` ทำงานเมื่อ push ไป `main` หรือกด Run workflow:

1. ติดตั้งแพ็กเกจจาก lockfile ด้วย Node.js 22
2. รัน Vitest
3. อ่าน base path จากการตั้งค่า Pages
4. สร้างเว็บพร้อม worker, WASM, โมเดล และ SVG ทั้งห้า
5. อัปโหลดเฉพาะ `dist/` และ deploy ไป environment `github-pages`

ค่าฐานใช้จาก Pages โดยตรง รองรับทั้ง `https://USERNAME.github.io/REPOSITORY/` และเว็บไซต์ที่รากโดเมน การเปิด dev server ในเครื่องยังใช้ `/` ตามเดิม

## เปิดใช้งานครั้งแรก

1. เลือกหรือสร้าง repository และ push โปรเจกต์ไป branch `main`
2. ไปที่ Settings → Pages → Build and deployment → Source เลือก **GitHub Actions**
3. ไปที่ Actions → Deploy NangLung to GitHub Pages → Run workflow
4. เมื่อ job `deploy` สำเร็จ เปิด URL จาก environment `github-pages`

เผยแพร่ที่ **[https://kimookpong.github.io/nanglung/](https://kimookpong.github.io/nanglung/)** จาก repository สาธารณะ **[kimookpong/nanglung](https://github.com/kimookpong/nanglung)** แล้ว โดย workflow รอบแรกผ่านทั้ง build และ deploy ดู [ผลรันครั้งแรก](https://github.com/kimookpong/nanglung/actions/runs/41208548986)

GitHub Free รองรับ Pages จาก repository สาธารณะ หากต้องการเก็บ source repository เป็น private ต้องใช้แผนที่รองรับ การนำ source repository เป็น public จะเปิดเผยไฟล์ต้นฉบับและเอกสารด้วย

## ตรวจ build ในเครื่อง

```sh
npm test
npm run build -- --base /nanglung/
npm run preview -- --open /nanglung/
```

เปลี่ยน `/nanglung/` ให้ตรงกับชื่อ repository หากเปลี่ยนชื่อ โมเดลและ WASM รวมอยู่ใน build แล้ว ผู้ใช้ไม่ต้องใส่ API key และไม่มีการส่งภาพกล้องไป GitHub

ไฟล์ WASM และ worker ที่สร้างอัตโนมัติไม่ต้อง commit เพราะ workflow สร้างใหม่จากแพ็กเกจที่ตรึงใน lockfile โมเดลมี checksum ตรวจสอบระหว่าง build

เอกสารทางการ: [Vite: GitHub Pages](https://vite.dev/guide/static-deploy#github-pages), [GitHub Pages: custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
