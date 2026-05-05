# フェーズ2 API疎通スモークテスト

代表5エンドポイントの動作確認スクリプト。Windows PowerShellおよびBashの両方を提供。

## 前提

- 開発サーバーが http://localhost:3000 で稼働中
- テスト用ユーザーが2名以上存在し、ID と パスワード が判明している
- 1名はPARENT相当（role="approver"または"admin"）、1名はCHILD相当（role="child"）
- 同一familyId（default_family_001）に所属している

## 事前確認（DBで直接確認）

```bash
cd C:\app\okozukai
sqlite3 prisma/dev.db ".schema User" 2>nul
sqlite3 prisma/dev.db "SELECT id, role, familyId FROM User;"
```

User ID とroleを控える（以下スクリプトで使用）。

---

## PowerShell版（Windows標準）

```powershell
# ──────────────────────────────────────
# 設定
# ──────────────────────────────────────
$BASE_URL = "http://localhost:3000"
$PARENT_USER = "<親のID>"            # 例: "user_parent_001"
$PARENT_PASS = "<親のパスワード>"
$CHILD_USER  = "<子のID>"
$CHILD_PASS  = "<子のパスワード>"

# ──────────────────────────────────────
# ステップ1：親でログイン → cookie保持
# ──────────────────────────────────────
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" `
  -Method POST `
  -Body (@{ id=$PARENT_USER; password=$PARENT_PASS } | ConvertTo-Json) `
  -ContentType "application/json" `
  -WebSession $session

# 認証確認
$me = Invoke-RestMethod -Uri "$BASE_URL/api/auth/me" -WebSession $session
Write-Host "Logged in as:" ($me | ConvertTo-Json)

# ──────────────────────────────────────
# テスト1：GET /api/events（一覧取得、認証必須）
# ──────────────────────────────────────
Write-Host "`n=== TEST 1: GET /api/events ==="
$events = Invoke-RestMethod -Uri "$BASE_URL/api/events" -WebSession $session
Write-Host "Events count:" $events.Count
$events | Select-Object -First 3 | ConvertTo-Json -Depth 3

# ──────────────────────────────────────
# テスト2：POST /api/events（イベント作成、PARENTのみ）
# ──────────────────────────────────────
Write-Host "`n=== TEST 2: POST /api/events ==="
$body = @{
  title = "スモークテスト用イベント"
  description = "API動作確認"
  startAt = (Get-Date).AddDays(7).ToString("o")
  endAt = (Get-Date).AddDays(7).AddHours(2).ToString("o")
  category = "FAMILY"
  participants = @()
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri "$BASE_URL/api/events" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -WebSession $session

Write-Host "Created event:"
$created | ConvertTo-Json -Depth 3
$EVENT_ID = $created.id

# ──────────────────────────────────────
# テスト3：GET /api/events/[id]（詳細）
# ──────────────────────────────────────
Write-Host "`n=== TEST 3: GET /api/events/$EVENT_ID ==="
$detail = Invoke-RestMethod -Uri "$BASE_URL/api/events/$EVENT_ID" -WebSession $session
$detail | ConvertTo-Json -Depth 4

# ──────────────────────────────────────
# テスト4：POST /api/events/[id]/comments（CHILDも投稿可）
# ──────────────────────────────────────
Write-Host "`n=== TEST 4: POST /api/events/$EVENT_ID/comments ==="
$commentBody = @{ body = "テストコメント from PARENT" } | ConvertTo-Json
$comment = Invoke-RestMethod -Uri "$BASE_URL/api/events/$EVENT_ID/comments" `
  -Method POST `
  -Body $commentBody `
  -ContentType "application/json" `
  -WebSession $session
Write-Host "Created comment:"
$comment | ConvertTo-Json -Depth 2

# ──────────────────────────────────────
# テスト5：GET /api/family/calendar（家族イベント集約）
# ──────────────────────────────────────
Write-Host "`n=== TEST 5: GET /api/family/calendar ==="
$from = (Get-Date).ToString("yyyy-MM-dd")
$to = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
$calendar = Invoke-RestMethod -Uri "$BASE_URL/api/family/calendar?from=$from&to=$to" -WebSession $session
Write-Host "Calendar dates:"
$calendar.PSObject.Properties.Name

# ──────────────────────────────────────
# 認可テスト：CHILDで再ログイン → POST /api/events が403を返すか
# ──────────────────────────────────────
Write-Host "`n=== AUTH TEST: CHILD cannot POST /api/events ==="
$childSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" `
  -Method POST `
  -Body (@{ id=$CHILD_USER; password=$CHILD_PASS } | ConvertTo-Json) `
  -ContentType "application/json" `
  -WebSession $childSession

try {
  Invoke-RestMethod -Uri "$BASE_URL/api/events" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -WebSession $childSession
  Write-Host "FAIL: CHILD was able to create event (expected 403)" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 403) {
    Write-Host "PASS: CHILD blocked with 403" -ForegroundColor Green
  } else {
    Write-Host "UNEXPECTED status: $statusCode" -ForegroundColor Yellow
  }
}

# ──────────────────────────────────────
# クリーンアップ：作成したテストイベントを削除
# ──────────────────────────────────────
Write-Host "`n=== CLEANUP: DELETE /api/events/$EVENT_ID ==="
Invoke-RestMethod -Uri "$BASE_URL/api/events/$EVENT_ID" `
  -Method DELETE `
  -WebSession $session
Write-Host "Cleaned up test event"

Write-Host "`n=== ALL TESTS COMPLETED ==="
```

---

## Bash版（WSL/Git Bash）

```bash
#!/bin/bash
BASE_URL="http://localhost:3000"
PARENT_USER="<親のID>"
PARENT_PASS="<親のパスワード>"
CHILD_USER="<子のID>"
CHILD_PASS="<子のパスワード>"
COOKIE_PARENT="cookie_parent.txt"
COOKIE_CHILD="cookie_child.txt"

# ステップ1：親ログイン
curl -c "$COOKIE_PARENT" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$PARENT_USER\",\"password\":\"$PARENT_PASS\"}"

# テスト1：GET /api/events
echo -e "\n=== TEST 1 ==="
curl -b "$COOKIE_PARENT" "$BASE_URL/api/events" | head -c 500

# テスト2：POST /api/events
echo -e "\n\n=== TEST 2 ==="
EVENT=$(curl -b "$COOKIE_PARENT" -X POST "$BASE_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"smoke test\",\"startAt\":\"2026-05-15T10:00:00.000Z\",\"category\":\"FAMILY\",\"participants\":[]}")
echo "$EVENT"
EVENT_ID=$(echo "$EVENT" | grep -oP '"id":"[^"]+' | head -1 | cut -d'"' -f4)
echo "Event ID: $EVENT_ID"

# テスト3：GET /api/events/[id]
echo -e "\n=== TEST 3 ==="
curl -b "$COOKIE_PARENT" "$BASE_URL/api/events/$EVENT_ID" | head -c 500

# テスト4：POST comment
echo -e "\n\n=== TEST 4 ==="
curl -b "$COOKIE_PARENT" -X POST "$BASE_URL/api/events/$EVENT_ID/comments" \
  -H "Content-Type: application/json" \
  -d '{"body":"smoke comment"}'

# テスト5：family calendar
echo -e "\n\n=== TEST 5 ==="
FROM=$(date -I)
TO=$(date -I -d "+30 days")
curl -b "$COOKIE_PARENT" "$BASE_URL/api/family/calendar?from=$FROM&to=$TO" | head -c 500

# 認可テスト：CHILDで POST → 403期待
echo -e "\n\n=== AUTH TEST ==="
curl -c "$COOKIE_CHILD" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$CHILD_USER\",\"password\":\"$CHILD_PASS\"}"

HTTP_CODE=$(curl -b "$COOKIE_CHILD" -o /dev/null -s -w "%{http_code}" \
  -X POST "$BASE_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"title":"by child","startAt":"2026-05-15T10:00:00.000Z","category":"FAMILY","participants":[]}')
echo "CHILD POST status: $HTTP_CODE (期待: 403)"

# クリーンアップ
curl -b "$COOKIE_PARENT" -X DELETE "$BASE_URL/api/events/$EVENT_ID"
rm "$COOKIE_PARENT" "$COOKIE_CHILD"

echo -e "\n=== ALL TESTS COMPLETED ==="
```

---

## 期待される結果

| テスト | 期待 | 失敗時の意味 |
|---|---|---|
| TEST 1 | 200、events配列 | 認証またはGET実装の問題 |
| TEST 2 | 200/201、id付きレスポンス | POST、バリデーション、familyスコープの問題 |
| TEST 3 | 200、participants/comments/reactions/retrospective含む詳細 | includeネストの問題 |
| TEST 4 | 200/201、コメント作成 | EventCommentモデル参照またはAudit |
| TEST 5 | 200、日別グルーピング | calendar集約ロジック |
| AUTH | 403 | requireParent()の動作不良。最重要バグの可能性 |

## 失敗時の対応

- 401（未認証）：proxy.tsのJWT処理確認、cookie名確認
- 403（権限）：認可ロジックOK、ただしPARENT想定ユーザーのroleが"approver"/"admin"であることを確認
- 404（未発見）：familyスコープが過剰、ユーザーのfamilyIdとイベントのfamilyIdが一致するか確認
- 500（サーバーエラー）：サーバーログ（`npm run dev`のターミナル）を確認
