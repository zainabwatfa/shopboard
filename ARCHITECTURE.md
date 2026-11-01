# ShopBoard: المخطط المعماري

خمس ملفات داخل `src/`، كل ملف إله شغلة وحدة. ملف `index.html` بيحمّل `main.js` فقط.

| الملف | شغلته بجملة وحدة |
|---|---|
| `data.js` | قائمة المنتجات فقط. |
| `logic.js` | دوال نقية للبحث والفلترة والترتيب وحساب السلة. ما بتلمس الصفحة ولا التخزين. |
| `state.js` | يملك السلة `[{ id, qty }]` ويغيّرها ويحفظها ويحمّلها من `localStorage`. |
| `ui.js` | الملف الوحيد اللي بيلمس الصفحة (DOM): بيقرأ الحقول وبيرسم وبيبلّغ عن النقرات. |
| `main.js` | بيوصل الملفات ببعض: عند كل حدث بياخذ القيم من `state` و`logic` وبيعطيها لـ `ui`. |

## مين بيعمل import لمين

```
                       index.html
                           │  <script type="module" src="/src/main.js">
                           ▼
                    ┌─────────────┐
                    │   main.js   │   بيوصل الكل
                    └──┬──┬──┬──┬─┘
          ┌────────────┘  │  │  └─────────────┐
          ▼               ▼  ▼                ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ data.js  │  │ logic.js │  │ state.js │  │  ui.js   │
    │ منتجات   │  │ دوال نقية│  │  السلة   │  │   DOM    │
    └──────────┘  └──────────┘  └────┬─────┘  └──────────┘
          ▲             ▲            │
          └─────────────┴────────────┘
             state بيستخدم products و sanitizeCart
```

- `data.js` و`logic.js` و`ui.js` **ما بيعملوا import لأي ملف.**
- الأسهم باتجاه واحد، وما في دوائر.

## كيف تمشي البيانات

**بحث أو فلترة أو ترتيب**
```
DOM (input / change) ─► ui ─► main.refreshProducts()
   ─► ui.getFilters()                        القيم الثلاث كما هي
   ─► logic.filterProducts(products, …)      بحث بدون حساسية للحروف + تصنيف
   ─► logic.sortProducts(…, sortKey)         بيرتّب نسخة
   ─► ui.renderProducts(…)                   ─► DOM
```

**إضافة أو + أو − أو حذف أو مسح السلة**
```
DOM (click) ─► ui ─► main (onAdd / onIncrease / onDecrease / onRemove / onClear)
   ─► state.addToCart / changeQty / removeFromCart / clearCart
          └─► localStorage.setItem(JSON.stringify(cart))
   ─► main.refreshCart()
   ─► state.getCart() ─► logic.getCartLines / getCartCount / getCartTotal
   ─► ui.renderCart(…)                       ─► DOM
```

**فتح الصفحة**
```
localStorage ─► state (JSON.parse ─► sanitizeCart) ─► السلة جاهزة
main ─► refreshProducts() + refreshCart() ─► ui ─► DOM
```

## وين بتروح ميزة جديدة؟ (مثال: قائمة الأمنيات wishlist)

| القطعة | الملف |
|---|---|
| حفظ القائمة في `localStorage` | `wishlist.js` جديد، بنفس شكل `state.js` |
| أي حساب عليها | `logic.js` |
| زر القلب ورسم القائمة | `ui.js` |
| ربط النقرة بالحفظ ثم الرسم | `main.js` |

## فحص الحدود

```
grep -lE "document|window" src/*.js   # لازم يطلع src/ui.js فقط
grep -l "localStorage" src/*.js       # لازم يطلع src/state.js فقط
```
أو في VS Code: `Ctrl + Shift + F` وابحثي عن `document` ثم عن `localStorage`.
