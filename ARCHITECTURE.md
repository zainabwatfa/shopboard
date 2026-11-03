# ShopBoard: المخطط المعماري

**الفكرة:** كل ميزة (module) إلها مجلد فيه كل ملفاتها. الكود اللي بتحتاجه أكثر من ميزة بيروح على `shared/`. والملف `main.ts` بيشغّل التطبيق وبيوصل الميزات ببعض.

ShopBoard متجر demo لكورس: ما في طلبات حقيقية ولا دفع، وفورم التسجيل ما بيبعت ولا بيحفظ شي.

```
src/
├── shared/                 كود مشترك لأي module
│   ├── api/client.ts       fetchJson<T> و ApiError
│   └── ui/
│       ├── toast.ts        showToast()
│       ├── dom.ts          getElement و formatMoney و createImage
│       └── page.ts         getCurrentPage()
├── modules/                مجلد لكل ميزة
│   ├── products/
│   │   ├── products.types.ts   شكل المنتج
│   │   ├── products.api.ts     بيجيب المنتجات من api/products.json
│   │   ├── products.logic.ts   بحث وفلترة وترتيب وفحص البيانات
│   │   └── products.ui.ts      رسم الكروت وقراءة الفلاتر
│   ├── cart/
│   │   ├── cart.types.ts       شكل عنصر السلة
│   │   ├── cart.state.ts       السلة نفسها + localStorage + reloadCart
│   │   ├── cart.logic.ts       العدد والإجمالي وتنظيف البيانات
│   │   └── cart.ui.ts          صفحة السلة والرقم بالهيدر + bindCartSync
│   └── register/
│       ├── register.types.ts   شكل RegisterHandlers
│       └── register.ui.ts      فورم التسجيل (demo): بيبلّغ main.ts عن الـ submit
├── main.ts                 بيشغّل التطبيق وبيوصل الـ modules
└── styles.css              تصميم كل الصفحات
```

البيانات صارت ملف JSON حقيقي: `public/api/products.json`. والكود بيطلبه بمسار نسبي `api/products.json` (بدون `/` بالأول، شوف «المسارات» تحت).

## كل نوع ملف إله شغلة

| الملف | شغلته |
|---|---|
| `*.types.ts` | أشكال البيانات فقط. ما فيه كود بيشتغل |
| `*.api.ts` | بيجيب البيانات من الشبكة عن طريق `fetchJson`، وبيفحصها |
| `*.logic.ts` | دوال نقية: نفس المدخلات بتعطي نفس النتيجة، وما بتلمس الصفحة ولا التخزين ولا الشبكة |
| `*.state.ts` | بيحفظ البيانات اللي بتتغير (السلة) في `localStorage` |
| `*.ui.ts` | بيرسم على الصفحة وبيبلّغ `main.ts` عن النقرات |
| `shared/` | أدوات بتحتاجها أكثر من ميزة |
| `main.ts` | بيقرر **إمتى** يصير كل شي: يحمّل المنتجات، يربط الأحداث، يرسم |

## مين بيعمل import لمين

```
                                   main.ts
          ┌───────────────────────────┼────────────────┬───────────────┐
          ▼                           ▼                ▼               ▼
   modules/products ◄────────── modules/cart    modules/register    shared/
          │  import type Product      │                │               ▲
          └───────────────────────────┴────────────────┴───────────────┘
                           كل module بيستخدم shared/
```

1. `main.ts` بيستورد من الـ modules ومن `shared/`.
2. الـ module بيستورد من مجلده ومن `shared/` فقط.
3. **module ما بيستورد كود من module ثاني.** المسموح بس `import type`، مثل السلة بتستخدم نوع `Product`. الوصل بين الميزات شغلة `main.ts`.
4. `shared/` ما بيستورد أبداً من `modules/`.

## كيف تمشي البيانات

**فتح صفحة المتجر**
```
main.startShop()
  ─► products.ui: "Loading products…"
  ─► products.api.getProducts()
        ─► shared/api/client.fetchJson("api/products.json")
        ─► products.logic.isProduct   (بيبقي بس العناصر السليمة)
  ─► cart.state.keepOnly(ids)         (بيشيل من السلة منتجات ما عادت موجودة)
  ─► products.ui.bindProductEvents + renderProducts
  (إذا فشل التحميل: ApiError ─► main ─► رسالة واضحة مكان "Loading")
```

**إضافة منتج**
```
نقرة ─► products.ui ─► main.onAdd
  ─► cart.state.addToCart
        ─► reloadCart                 (بيقرا السلة المحفوظة من جديد، يمكن تاب ثاني غيّرها)
        ─► localStorage
  ─► cart.ui.renderCartCount          (الرقم بالهيدر)
  ─► shared/ui/toast.showToast("… added", { View cart ─► cart.html })
```

**صفحة السلة**
```
main.startCart() ─► تحميل المنتجات (نفس الطريق)
  ─► cart.state.getCart ─► cart.logic.getCartLines / getCartCount / getCartTotal
  ─► cart.ui.renderCart
  ─► cartPageReady = true
نقرة + / − / Remove / Clear ─► cart.ui ─► main ─► cart.state ─► رسم من جديد
```

**الصفحة الرئيسية: فورم التسجيل (demo)**
```
main.startHome()
  ─► register.ui.bindRegisterEvents({ onSubmit })
submit ─► register.ui                 (المتصفح ما بيبعته إلا إذا كل الحقول المطلوبة سليمة)
  ─► preventDefault                   (ما في إرسال ولا reload)
  ─► main.onSubmit ─► shared/ui/toast.showToast("Thanks! This is a demo, so nothing was sent or saved.")
  ─► form.reset()
```

**مزامنة السلة بين التابات**
```
تاب ثاني حفظ تغيير ─► المتصفح بيبعت حدث "storage" لباقي تابات الموقع
  ─► cart.ui.bindCartSync ─► main     (انربط مرة وحدة، على كل صفحة)
  ─► cart.state.reloadCart            (بيقرا السلة من localStorage من جديد)
  ─► إذا cartPageReady: refreshCart   (صفحة السلة كلها + الرقم بالهيدر)
     غير هيك:          refreshCount  (بس الرقم بالهيدر)
```

- `cart.ui` ما بيعرف أي مفتاح هو السلة، فبيبلّغ عن أي تغيير بالتخزين.
- `bindCartSync` بيسمع كمان لحدث `pageshow`: لما Back أو Forward بيرجّع الصفحة من الـ cache تبع المتصفح، بتصير نفس المزامنة، لأنه يمكن السلة تغيّرت من وقتها.
- كل تغيير بـ `cart.state` (`addToCart` و `changeQty` و `removeFromCart` و `clearCart` و `keepOnly`) بيستدعي `reloadCart` أول شي، فالحفظ ما بيمسح شي حفظه تاب ثاني.
- إذا آخر حفظ فشل (`lastSaveFailed`)، `reloadCart` ما بيعمل شي: النسخة اللي بالذاكرة أحدث من المحفوظة.

## المسارات: بدون `/` بالأول

الموقع منشور على GitHub Pages تحت `/shopboard/` (https://zainabwatfa.github.io/shopboard/)، مش على أول الدومين. يعني أي مسار بيبلش بـ `/` بيطلع برّا الموقع.

- `vite.config.ts` فيه `base: "./"`، فالملفات المبنية بتأشّر على بعضها بمسارات نسبية.
- الروابط والمسارات اللي منكتبها بإيدنا بدون `/`: `./` و `shop.html` و `cart.html` و `./#register` بالـ HTML وبالـ toast، و `api/products.json` بـ `products.api.ts`، و `products/x.svg` بـ `products.json`.
- الاستثناء: مسارات `<script>` و `<link>` و `<img>` بالـ HTML (مثل `/src/main.ts` و `/favicon.svg`) بتضل بـ `/`، لأن Vite بيحوّلها لمسارات نسبية وقت الـ build.

## وين بتروح ميزة جديدة؟ (مثال: wishlist)

مجلد جديد `modules/wishlist/` فيه بس الملفات اللي بتحتاجها:

| القطعة | الملف |
|---|---|
| نوع `WishlistItem` | `wishlist.types.ts` |
| الحفظ في `localStorage` | `wishlist.state.ts` |
| أي حساب | `wishlist.logic.ts` |
| زر القلب ورسم القائمة | `wishlist.ui.ts` |
| ربط النقرة بالحفظ ثم الرسم | `main.ts` |

وإذا الـ wishlist والسلة احتاجوا نفس الأداة، بتروح على `shared/`.

مثال حقيقي صغير: `modules/register/` فيه بس `register.types.ts` و `register.ui.ts`، لأنه ما بيحفظ شي وما فيه حساب.

## فحص الحدود

```
grep -rlE "document|window" src --include=*.ts   # بس *.ui.ts و shared/ui/*
grep -rl "localStorage" src --include=*.ts       # بس cart.state.ts
grep -rlE "\bfetch\(" src --include=*.ts         # بس shared/api/client.ts
```

## فحص الأنواع

```
npm run typecheck   # لازم ما يطبع شي
```
