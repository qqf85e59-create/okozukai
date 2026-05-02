# おもちゃ箱バンク（Toy Box Bank）

家族お小遣い管理アプリ — **To Infinity and Beyond!**

## 注意事項

> **⚠️ 商標について**
> 
> 本アプリは家庭内私的利用のみを目的とした参照実装です。
> 「Toy Story」「Pixar」「Buzz Lightyear」「Woody」等のキャラクター名・配色は着想元として参照しているのみで、
> いかなる公式利用・商業利用も意図しません。
> これらの名称・キャラクター・作品は The Walt Disney Company / Pixar Animation Studios の
> 登録商標・著作物です。

## 技術スタック

- **Next.js 16** (App Router)
- **Prisma 7** + SQLite
- **JWT 認証** (jose)
- **PWA** (Service Worker + Web Push)
- **TailwindCSS v4**

## Getting Started

```bash
# 依存関係インストール
npm install

# Prisma マイグレーション
npx prisma migrate dev

# PWA アイコン生成
npx tsx scripts/gen-icons.ts

# 開発サーバー起動
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

```
DATABASE_URL="file:./dev.db"

# Push Notifications
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:admin@example.com"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""

# Cron
CRON_SECRET=""
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

## Deploy

Fly.io (Tokyo region):
```bash
fly deploy
```

## ディレクトリ構造

```
src/
├── app/
│   ├── page.tsx        ← ログイン（Pixar Ball）
│   ├── home/           ← アンディの部屋（メイン）
│   ├── requests/       ← ミッション一覧
│   ├── history/        ← 思い出アルバム
│   ├── cash/           ← ピザプラネット両替
│   ├── report/         ← 作戦会議
│   ├── items/          ← おもちゃ図鑑（親のみ）
│   ├── expenses/       ← 修理代（親のみ）
│   ├── audit/          ← 監査ログ（admin のみ）
│   ├── settings/       ← 設定
│   └── api/            ← API Routes
├── components/
│   ├── Nav.tsx
│   ├── BalanceSummary.tsx
│   ├── RequestModal.tsx
│   ├── StatusBadge.tsx
│   └── Toast.tsx
└── lib/
    ├── auth.ts
    ├── db.ts
    ├── settlement.ts   ← ⚠️ 変更禁止
    ├── audit.ts
    ├── push.ts
    └── storage.ts
```
