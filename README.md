# নিজের হিসাব

প্রায়োরিটি/হ্যাবিট ট্র্যাকার + খরচের হিসাব + ধার-দেনার খাতা — একটি Vite + React + Tailwind PWA।
ডেটা ব্রাউজারের `localStorage`-এ সেভ হয় (personal, single-user, কোনো ব্যাকএন্ড লাগে না)।

## লোকালি চালানো

```bash
npm install
npm run dev
```

## GitHub-এ পুশ করা

```bash
git init
git add .
git commit -m "init: nijer hishab app"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Vercel-এ ডিপ্লয়

1. [vercel.com](https://vercel.com) → New Project → GitHub repo সিলেক্ট করো।
2. Framework Preset: **Vite** (স্বয়ংক্রিয়ভাবে ধরবে)।
3. Build Command: `npm run build` (default)
4. Output Directory: `dist` (default)
5. Deploy চাপো — ব্যস, লাইভ হয়ে যাবে।

কোনো environment variable লাগবে না, কারণ ডেটা localStorage-এ থাকে।

## গুরুত্বপূর্ণ সীমাবদ্ধতা

- **localStorage ডিভাইস-নির্দিষ্ট।** একই ব্রাউজারে যতবার খুশি ব্যবহার করতে পারবে, কিন্তু অন্য ডিভাইস/ব্রাউজারে গেলে ডেটা সিঙ্ক হবে না। মাল্টি-ডিভাইস sync দরকার হলে পরে Supabase (Auth + Postgres + Realtime) যোগ করা যাবে — চাইলে বলো, সেই ভার্সনও বানিয়ে দেব।
- **রিয়েল পুশ নোটিফিকেশন/অ্যালার্ম** এখনো নেই। ব্রাউজার ট্যাব খোলা থাকলে ভবিষ্যতে Notification API যোগ করে দেওয়া যায়, অথবা প্রকৃত মোবাইল push দরকার হলে service worker + push server লাগবে।
- মোবাইলে "Add to Home Screen" করলে এটি PWA হিসেবে অ্যাপের মতো ব্যবহার করা যাবে।
