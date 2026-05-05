# フェーズ2 プロンプト（防御版・サブフェーズ分割）

11エンドポイントを4サブフェーズ（2A〜2D）に分割。各サブフェーズを順次実行。Claude Codeに以下をそのまま貼り付ける。

## 全体共通前提（全サブフェーズの先頭に必ず含める）

```
あなたは C:\app\okozukai リポジトリのフェーズ2実装担当である。

【フェーズ1完了状態】
- prisma/schema.prismaに Family, Event, EventParticipant, VirtualMember, EventComment, EventReaction, EventRetrospective, EventTemplate および enum EventCategory, ParticipantRole, UserRole が追加済
- マイグレーション 20260504000000_phase1_calendar_family 適用済
- User.familyId は NOT NULL（既存ユーザーは default_family_001 に紐付け済）
- SavingsGoal に targetDate, linkedEventId, dailySuggestedAmount 追加済

【最重要：完了基準（先に提示）】
本サブフェーズの完了は以下を全て満たした場合のみ「完了」と報告できる。
1. 指定エンドポイント全てが src/app/api/ 配下に作成され、認証・認可・familyスコープが実装されている
2. 各エンドポイントが既存パターン（src/app/api/goals/route.ts 等）と同じ構造を踏襲
3. AuditLog記録が CUD 操作で実装されている
4. npx tsc --noEmit がエラーなく完了
5. 既存ルートが破壊されていない（goals/requests/cash-requests のレスポンスが変化しない）

「だいたい完了」「ほぼ完了」は禁止。完了 or 未完了の二択で報告。

【最重要：カスタムNext.js】
本プロジェクトは標準Next.jsではない。AGENTS.mdに「This is NOT the Next.js you know」と明記。
コードを書く前に必ず：
1. C:\app\okozukai\AGENTS.md を読む
2. 既存ルート src/app/api/goals/route.ts、src/app/api/requests/route.ts、src/app/api/cash-requests/route.ts を必ず読む
3. src/lib/auth.ts、src/lib/db.ts、src/lib/audit.ts を読む
標準Next.jsの記憶でAPIを書かない。既存パターンに合わせる。

【familyスコープ強制】
全クエリで familyId フィルタを必須とする。1箇所でも漏れると他家族データ漏洩。
レビューチェックリスト：
- prisma.event.findMany / findUnique / update / delete に familyId フィルタが入っているか
- prisma.eventComment 等の関連モデル経由でも family整合性が保たれるか
- 親子関係を辿る場合（event経由でcomment取得など）も family一致をWHEREで担保

【権限ルール（厳守）】
- PARENT：全操作可
- CHILD：閲覧、コメント投稿、リアクション追加・削除、自分のSavingsGoalの更新のみ可
- 認可ヘルパーを src/lib/auth.ts に追加：requireParent(), requireFamilyMember(), assertSameFamily(eventId, userId)
- 各ルートでヘルパー呼び出し。インラインで if (user.role !== 'PARENT') を書かない。

【既存lib再利用】
- 認証：src/lib/auth.ts の既存関数を使用（新規作成は最小限のヘルパーのみ）
- DB：src/lib/db.ts の prisma エクスポートを使用
- 監査：src/lib/audit.ts の logAudit を使用（CUD操作で記録）
- 通知：フェーズ4で実装するためここでは呼ばない

【命名衝突対策】
既存 Comment（Request用）と新規 EventComment は別モデル。
import 時は明示的に：
import { Comment as RequestComment, EventComment } from '@prisma/client'
URLパスは /api/requests/[id]/comments と /api/events/[id]/comments で名前空間分離。

【バリデーション】
既存ルートのバリデーションパターンを踏襲。新規ライブラリ（zod等）追加禁止。
不正入力は400、未認証は401、認可エラーは403、未発見は404、サーバーエラーは500で統一。

【出力形式】
既存ルート（特にgoals）のレスポンス形式に合わせる。新規形式を作らない。
```

---

## サブフェーズ2A：基盤＋Events CRUD（最初に実行）

### 目的
認可ヘルパー追加と Events の CRUD 4エンドポイントを実装する。後続サブフェーズの基盤。

### プロンプト

```
（全体共通前提を先頭に貼る）

【サブフェーズ2A：基盤＋Events CRUD】

================================
ステップ0：状態確認（最初に必ず実行）
================================
1. cd C:\app\okozukai
2. git status
3. git branch --show-current
4. git log --oneline -5
5. ls src/app/api/events/ 2>nul || echo "events directory not exists"
6. grep -E "requireParent|requireFamilyMember" src/lib/auth.ts 2>nul

判定：
- src/app/api/events/ が既に存在する場合は内容を ls で表示し、既実装範囲を報告して指示を仰ぐ
- requireParent 等が既に存在するなら追加せず既存活用
- 上記がなければ ステップ1 へ

================================
ステップ1：環境理解（読み込みのみ）
================================
1. cat C:\app\okozukai\AGENTS.md
2. cat src/lib/auth.ts
3. cat src/lib/db.ts
4. cat src/lib/audit.ts
5. cat src/app/api/goals/route.ts
6. cat src/app/api/goals/[id]/route.ts
7. cat src/app/api/requests/route.ts

各ファイルから以下を1段落で要約せよ：
- 認証取得方法（cookie、headers、middleware）
- prismaインスタンスの取得方法
- レスポンス形式（NextResponse.json の構造）
- エラーハンドリングのパターン
- AuditLog記録の呼び出し方法

================================
ステップ2：認可ヘルパー追加
================================
src/lib/auth.ts に以下のヘルパーを追加：

- requireParent(): 現在ユーザーを取得し、role !== 'PARENT' なら403相当をthrow
- requireFamilyMember(): 認証済かつfamilyIdを持つユーザーを返す
- assertEventInFamily(eventId, familyId): イベントが指定familyに属するかDB確認、違反なら404相当
- assertSameFamily(targetUserId, currentUserId): 両者のfamilyIdが一致するかDB確認

既存関数のシグネチャ・エラー型を踏襲。新規エラー型を作らない。
追加後 cat src/lib/auth.ts | grep -E "^export (async )?function" で関数一覧を出力。

================================
ステップ3：Events CRUDエンドポイント実装
================================

A. src/app/api/events/route.ts
   - GET：認証ユーザーのfamilyIdに属するイベント一覧
     - クエリ：from, to (ISO date), category, participantUserId
     - レスポンス：events配列、各eventにparticipants配列含む（include）
     - 並び順：startAt 昇順
   - POST：イベント作成（PARENTのみ）
     - body：{ title, description?, startAt, endAt?, allDay?, location?, category, templateId?, participants: Array<{userId?, virtualMemberId?, role}> }
     - バリデーション：title必須、category は EventCategory値のいずれか、startAt は parseable date
     - participants は同一トランザクションで作成
     - AuditLog記録：action='event.create', targetType='Event', targetId=event.id

B. src/app/api/events/[id]/route.ts
   - GET：イベント詳細（参加者・コメント・リアクション・振り返り含む）
     - assertEventInFamily で family整合性チェック
     - include：participants（user/virtualMember展開）、comments（author展開、createdAt降順）、reactions、retrospective
   - PATCH：更新（PARENTのみ、または createdBy本人）
     - 更新可フィールド：title, description, startAt, endAt, allDay, location, category
     - participants更新は別エンドポイント（フェーズ2B）
     - AuditLog記録：action='event.update', diff含む
   - DELETE：削除（PARENTのみ）
     - cascadeでcomment, reaction, participant, retrospective も削除（schemaで定義済）
     - AuditLog記録：action='event.delete'

================================
ステップ4：型チェックと完了確認
================================
1. npx tsc --noEmit 2>&1 | head -30
2. ls src/app/api/events/ src/app/api/events/[id]/
3. grep -c "familyId" src/app/api/events/route.ts src/app/api/events/[id]/route.ts
   - 各ファイルで2件以上ヒットすることを確認（authユーザー取得＋クエリ条件）

================================
ステップ5：完了報告（固定フォーマット）
================================
【完了報告】
- 結果：完了 / 未完了
- 追加ファイル一覧：
- 変更ファイル一覧（src/lib/auth.ts等）：
- 認可ヘルパー追加関数名：
- 実装エンドポイント数：4 / 4
- npx tsc --noEmit 結果：成功 / 失敗（エラー数）
- familyスコープ漏れチェック結果：（grep件数）
- 既存パターンとの差異（あれば）：
- 想定外の事象（あれば）：

未完了の場合は達成済・未達成を明示。
```

---

## サブフェーズ2B：コミュニケーション（comments、reactions、participants）

### プロンプト

```
（全体共通前提を先頭に貼る）

【サブフェーズ2B：コミュニケーション系3エンドポイント】

前提：サブフェーズ2A完了済（Events CRUDと認可ヘルパー実装済）。

================================
ステップ0：状態確認
================================
1. ls src/app/api/events/[id]/
2. grep -E "^export (async )?function" src/lib/auth.ts
3. cat src/app/api/events/route.ts | head -30

判定：
- assertEventInFamily, requireParent 等が定義されているか確認
- 既存event APIが想定構造と一致するか確認
- 不足があれば報告して中止

================================
ステップ1：環境理解（追加読み込み）
================================
1. cat src/app/api/events/route.ts
2. cat src/app/api/events/[id]/route.ts
3. cat src/app/api/requests/[id]/comments/route.ts （既存comment実装の参考）

================================
ステップ2：実装
================================

A. src/app/api/events/[id]/comments/route.ts
   - GET：イベントのコメント一覧（時系列、author情報include）
     - assertEventInFamily チェック
   - POST：コメント追加（家族メンバー全員可、CHILDも可）
     - body：{ body: string }（最大1000字バリデーション）
     - AuditLog記録：action='eventComment.create'

B. src/app/api/events/[id]/reactions/route.ts
   - POST：リアクション追加
     - body：{ emoji: string }（許容セット：'👍','❤️','🎉','👏','🙏' のみ）
     - 同一(eventId, userId, emoji)が既存ならエラー（schemaの@@uniqueで担保、エラーは409を返す）
     - 家族メンバー全員可
   - DELETE：リアクション取り消し
     - body またはクエリ：emoji
     - 自分のリアクションのみ削除可

C. src/app/api/events/[id]/participants/route.ts
   - PUT：参加者一括更新（PARENTまたはイベントcreatedBy）
     - body：{ participants: Array<{userId?, virtualMemberId?, role: ParticipantRole}> }
     - 既存participantsを全削除→新規作成（同一トランザクション）
     - userId と virtualMemberId は同family所属チェック
     - AuditLog記録：action='event.participants.update'

================================
ステップ3：型チェックと完了確認
================================
1. npx tsc --noEmit 2>&1 | head -30
2. ls src/app/api/events/[id]/
3. grep -c "assertEventInFamily" src/app/api/events/[id]/comments/route.ts src/app/api/events/[id]/reactions/route.ts src/app/api/events/[id]/participants/route.ts

================================
ステップ4：完了報告（固定フォーマット）
================================
（2Aと同じ形式）
```

---

## サブフェーズ2C：テンプレート・振り返り・家族カレンダー集約

### プロンプト

```
（全体共通前提を先頭に貼る）

【サブフェーズ2C：テンプレート・振り返り・家族カレンダー集約】

================================
ステップ0：状態確認
================================
1. ls src/app/api/events/templates/ 2>nul
2. ls src/app/api/family/ 2>nul
3. grep -c "EventTemplate" src/generated/prisma/models/EventTemplate.ts

================================
ステップ1：実装
================================

A. src/app/api/events/templates/route.ts
   - GET：プリセット（familyId=null）＋自家族テンプレート一覧
   - POST：自家族テンプレート作成（PARENTのみ）
     - body：{ name, category, defaultBudget?, defaultLeadDays?, description? }

B. src/app/api/events/[id]/retrospective/route.ts
   - GET：振り返り取得（assertEventInFamilyチェック）
   - PUT：振り返り作成・更新（PARENTまたはイベントcreatedBy）
     - body：{ plannedAmount?, actualAmount?, note? }
     - 既存あればupdate、なければcreate（upsert）

C. src/app/api/family/calendar/route.ts
   - GET：家族全員のイベントを集約
     - クエリ：from, to (ISO date)
     - レスポンス：日別グルーピング
       {
         "2026-05-10": [{event...}, ...],
         "2026-05-12": [...]
       }
     - 各eventにparticipantsのcolorTag（VirtualMember）またはuserのcolorToken（既存User）を含める

D. src/app/api/family/virtual-members/route.ts
   - GET：自家族の仮想メンバー一覧
   - POST：仮想メンバー追加（PARENTのみ）
     - body：{ displayName, colorTag? }
   - DELETE：本ファイルではなく [id]/route.ts に分離

E. src/app/api/family/virtual-members/[id]/route.ts
   - DELETE：仮想メンバー削除（PARENTのみ）
     - 参加中イベントから関連EventParticipantを除外（同一トランザクション）

================================
ステップ2：型チェック・完了報告
================================
（2A・2Bと同じ形式）
```

---

## サブフェーズ2D：SavingsGoal拡張

### プロンプト

```
（全体共通前提を先頭に貼る）

【サブフェーズ2D：SavingsGoal拡張】

================================
ステップ0：状態確認
================================
1. ls src/app/api/goals/[id]/
2. cat src/app/api/goals/[id]/route.ts | head -50

================================
ステップ1：実装
================================

A. src/app/api/goals/[id]/daily-suggested/route.ts
   - GET：targetDateとtargetAmountと現在残高から日次推奨積立額を計算
     - 取得：goal、user.balance（既存Balanceモデル）
     - 計算：
       remainingDays = max(1, ceil((targetDate - today) / 1day))
       remainingAmount = max(0, targetAmount - currentBalance)
       dailySuggested = ceil(remainingAmount / remainingDays)
     - レスポンス：{ remainingDays, remainingAmount, dailySuggestedAmount, isAchieved }
     - targetDate未設定なら400エラー
     - 認可：自分のgoalまたは同family内（CHILDは自分のみ、PARENTは家族全員）

B. src/app/api/goals/[id]/link-event/route.ts
   - POST：linkedEventIdを設定
     - body：{ eventId: string, syncTargetDate?: boolean }
     - eventの所属family検証
     - syncTargetDate=trueなら goal.targetDate = event.startAt も同時更新
     - AuditLog記録：action='goal.linkEvent'
   - DELETE：リンク解除
     - linkedEventId = null

================================
ステップ2：goals既存ルートへの影響確認
================================
1. grep -E "targetDate|linkedEventId|dailySuggestedAmount" src/app/api/goals/route.ts src/app/api/goals/[id]/route.ts
2. 既存GETレスポンスに新フィールドを含めるか判断（推奨：含める）
3. 既存POSTでtargetDate受け付けるか判断（推奨：オプショナルで受け付け）
4. 必要なら既存ルートも修正（最小限）

================================
ステップ3：型チェック・完了報告
================================
（2A・2B・2Cと同じ形式）

================================
全フェーズ2 完了確認
================================
全11エンドポイント完成後、以下を実行して総合確認：

1. ls -R src/app/api/events/ src/app/api/family/
2. grep -c "familyId" src/app/api/events/**/*.ts src/app/api/family/**/*.ts
3. grep -c "logAudit\|requireParent\|requireFamilyMember" src/app/api/events/**/*.ts src/app/api/family/**/*.ts
4. npx tsc --noEmit
5. npm run dev でサーバー起動確認

総合完了報告：
- 全エンドポイント：11 / 11
- 型エラー：0
- familyスコープ未漏出チェック：合計件数
- 認可ヘルパー使用箇所数：合計件数
- AuditLog記録箇所数：合計件数
```

---

## 実行順序と注意

1. 必ず 2A → 2B → 2C → 2D の順で実行する。2Aの認可ヘルパーが他全ての依存。
2. 各サブフェーズ完了後、commit してから次へ進む（worktree使用時は特に）。
3. サブフェーズ完了報告で「未完了」が出たら、フェーズ2Eプロンプト（差分修正）に進む前に、未達成項目の原因を特定する。
4. 2D完了後、フェーズ3（UI）プロンプトを別途作成する。

## 失敗時のフォールバック

サブフェーズ内で複数回失敗する場合、エンドポイント単位（1ファイルずつ）に更に分割して再実行。

## 補足：worktree運用について

フェーズ1ではClaude Codeがworktreeで作業した。フェーズ2も同様の挙動の場合、各サブフェーズ完了後に必ずcommit→merge→pushの流れを実施すること。worktreeに長時間放置すると消失リスクあり。
