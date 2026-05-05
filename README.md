# おもちゃ箱バンク（Toy Box Bank）

家族お小遣い管理アプリ — **Make your wishes count**

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
│   ├── page.tsx        ← ログイン
│   ├── home/           ← ホーム（メイン）
│   ├── requests/       ← おてつだい申請
│   ├── history/        ← おもいで帳
│   ├── cash/           ← 両替所
│   ├── report/         ← レポート
│   ├── items/          ← 項目設定（親のみ）
│   ├── expenses/       ← 実費控除（親のみ）
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
    ├── copy.ts         ← コンセプト別ラベル
    ├── useCountUp.ts   ← 残高アニメーション
    └── storage.ts
```
