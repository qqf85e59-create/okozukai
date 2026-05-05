#!/bin/sh

# /data 内のファイルを nextjs 所有に修正（root で実行）
chown -R nextjs:nodejs /data 2>/dev/null || true

echo "▶ Applying database migrations..."
gosu nextjs npx prisma migrate deploy
echo "✓ Migrations done."

echo "▶ Seeding initial data..."
gosu nextjs npx tsx prisma/seed.ts && echo "✓ Seed done." || echo "⚠ Seed failed, continuing..."

echo "▶ Starting Next.js..."
exec gosu nextjs npm start
