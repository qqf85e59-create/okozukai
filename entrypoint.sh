#!/bin/sh

echo "▶ Applying database migrations..."
npx prisma migrate deploy
echo "✓ Migrations done."

echo "▶ Seeding initial data..."
node seed-compiled.cjs && echo "✓ Seed done." || echo "⚠ Seed failed, continuing..."

echo "▶ Starting Next.js..."
exec npm start
