# ── ビルドステージ ────────────────────────────────────────
FROM node:20-slim AS builder

# better-sqlite3 のネイティブモジュールをコンパイルするためのツール
RUN apt-get update -y && \
    apt-get install -y openssl python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Prisma クライアント生成（生成済みでも再実行して確実に最新化）
RUN npx prisma generate

# ビルド時は DB 接続不要なのでダミー値を設定
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/tmp/build-placeholder.db"
ENV JWT_SECRET="build-placeholder-not-used-at-runtime"

RUN npm run build

# シード用スクリプトをコンパイル
RUN npx --yes esbuild prisma/seed.ts --bundle --platform=node --format=cjs --external:@prisma/client --external:bcryptjs --outfile=seed-compiled.cjs

# ── ランタイムステージ ─────────────────────────────────────
FROM node:20-slim AS runner

RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 非 root ユーザーと SQLite 用ディレクトリを作成
RUN groupadd --system --gid 1001 nodejs && \
    useradd  --system --uid 1001 nextjs && \
    mkdir -p /data && chown nextjs:nodejs /data

# アプリ本体
COPY --from=builder --chown=nextjs:nodejs /app/public       ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next        ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# マイグレーション実行に必要な Prisma ファイル群
COPY --from=builder --chown=nextjs:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/seed-compiled.cjs ./seed-compiled.cjs

# 起動スクリプト
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
