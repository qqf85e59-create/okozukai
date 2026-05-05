# 実装プロンプト集（親子向けスケジュール+お小遣いアプリ拡張）

本ファイルは、Claude Codeで実装を進めるためのフェーズ別プロンプトを記載する。各フェーズを順に実行すること。前フェーズが完了するまで次に進まない。

---

## 共通前提（全フェーズの先頭に必ず含める）

```
あなたは本リポジトリ（C:\app\okozukai）の実装担当である。以下を必ず守ること。

【最重要：カスタムNext.js】
本プロジェクトは標準のNext.jsではない。AGENTS.mdに「This is NOT the Next.js you know」と明記されている。
コードを書く前に必ず以下を実行：
1. C:\app\okozukai\AGENTS.md を読む
2. node_modules/next/dist/docs/ 内の関連ドキュメントを読む
3. 既存のsrc/app配下のルート実装パターンを最低3つ参照する
標準Next.jsの記憶でAPIを書かない。既存パターンに合わせる。

【既存モデル・ライブラリの尊重】
- 既存モデル：User、SavingsGoal、ScheduledBonus、Request、CashRequest、Comment、Push、Audit、Attachment
- 既存lib：src/lib/auth.ts、db.ts、push.ts、audit.ts、settlement.ts、storage.ts
- 新規実装は既存モデル・libを再利用すること。重複実装を作らない。
- 既存のRequest/Comment承認フローはチャット類似機能として参照すること。

【プロダクト前提】
- ターゲット：小学生〜高校生（7〜18歳）の子を持つ家族
- 差別化軸：親子コミュニケーション促進
- 既存機能を壊さないこと。新機能は加算のみ。

【受け入れ基準（各フェーズ共通）】
- TypeScriptの型エラー0
- ESLintエラー0
- 既存テスト（あれば）全通過
- 既存ページ（src/app配下）が動作する
- 変更ファイルと追加ファイルのリストを最後に提示する
```

---

## フェーズ1：DBスキーマ拡張

### 目的
カレンダー機能、イベント、親子コミュニケーション、目標連動を支えるDB構造を確定する。

### プロンプト

```
（共通前提を先頭に貼る）

【フェーズ1：DBスキーマ拡張】

以下のモデルをprisma/schema.prismaに追加・拡張せよ。マイグレーションファイルも生成すること。

■ 追加モデル

1. Event（イベント）
   - id: String @id @default(cuid())
   - familyId: String（家族グループID。Userモデルにも追加が必要）
   - title: String
   - description: String?
   - startAt: DateTime
   - endAt: DateTime?
   - allDay: Boolean @default(false)
   - location: String?
   - category: EventCategory（enum：BIRTHDAY, TRIP, EXAM, SCHOOL, FAMILY, OTHER）
   - createdById: String（User参照）
   - templateId: String?（EventTemplate参照、任意）
   - createdAt: DateTime @default(now())
   - updatedAt: DateTime @updatedAt
   - インデックス：[familyId, startAt]

2. EventParticipant（イベント参加者、仮想メンバー含む）
   - id: String @id @default(cuid())
   - eventId: String
   - userId: String?（実ユーザーの場合）
   - virtualMemberId: String?（仮想メンバーの場合）
   - role: ParticipantRole（enum：ORGANIZER, ATTENDEE, OBSERVER）
   - 制約：userIdとvirtualMemberIdはどちらか必須

3. VirtualMember（スマホ未所持の家族メンバー）
   - id: String @id @default(cuid())
   - familyId: String
   - displayName: String
   - colorTag: String?
   - createdAt: DateTime @default(now())

4. EventComment（イベントごとのコメント＝親子コミュニケーション軸の核）
   - id: String @id @default(cuid())
   - eventId: String
   - authorId: String（User参照）
   - body: String
   - createdAt: DateTime @default(now())
   - インデックス：[eventId, createdAt]

5. EventReaction（リアクション＝軽量コミュニケーション）
   - id: String @id @default(cuid())
   - eventId: String
   - userId: String
   - emoji: String（"👍" "❤️" "🎉" 等の固定セット）
   - createdAt: DateTime @default(now())
   - 制約：[eventId, userId, emoji]はユニーク

6. EventTemplate（誕生日・テスト・旅行テンプレート）
   - id: String @id @default(cuid())
   - familyId: String?（nullなら全家族共通プリセット）
   - name: String
   - category: EventCategory
   - defaultBudget: Int?
   - defaultLeadDays: Int?（事前準備日数の目安）
   - description: String?

7. EventRetrospective（イベント後の振り返り）
   - id: String @id @default(cuid())
   - eventId: String @unique
   - plannedAmount: Int?
   - actualAmount: Int?
   - note: String?
   - createdAt: DateTime @default(now())

■ 拡張モデル

8. User
   - familyId: String 追加（必須）
   - role: UserRole（enum：PARENT, CHILD）追加
   - birthDate: DateTime?（年齢別UIに使用）

9. Family（新規、Userの上位グループ）
   - id: String @id @default(cuid())
   - name: String
   - createdAt: DateTime @default(now())

10. SavingsGoal
    - targetDate: DateTime? 追加
    - linkedEventId: String? 追加（Event参照、任意）
    - dailySuggestedAmount: Int?（targetDate到達のための日次推奨積立、APIで計算してキャッシュ）

■ enum追加
- EventCategory：BIRTHDAY, TRIP, EXAM, SCHOOL, FAMILY, OTHER
- ParticipantRole：ORGANIZER, ATTENDEE, OBSERVER
- UserRole：PARENT, CHILD

■ マイグレーション
- prisma/migrations/ に新規マイグレーションを作成
- 既存データ移行戦略：既存UserにdefaultでFamilyを1つ作成し全ユーザーを所属させる（マイグレーションSQLに記述）

■ 受け入れ基準
- npx prisma generate がエラーなく完了
- npx prisma migrate dev がエラーなく完了
- src/generated/prisma配下が更新される
- 既存のSavingsGoal、Userを参照しているコードが型エラーにならない（必要なら最小限のadapter追加）
- 完了時に「変更ファイル一覧」「追加マイグレーション名」「既存コードへの影響範囲」を出力

実装後、git diff でレビュー可能な状態にすること。
```

---

## フェーズ2：APIルート実装

### 目的
フェーズ1で追加したモデルに対するCRUDと、ビジネスロジック（目標連動、家族カレンダー集約）を提供する。

### プロンプト

```
（共通前提を先頭に貼る）

【フェーズ2：APIルート実装】

前提：フェーズ1のスキーマ変更が完了している。既存のsrc/app/api/配下のルート実装パターン（特にrequests、goals、cash-requests）を必ず参照し、認証・エラーハンドリング・レスポンス形式を揃えること。

■ 追加するエンドポイント

1. /api/events
   - GET：認証ユーザーのfamilyIdに属するイベント一覧。クエリ：from, to, category, participantUserId
   - POST：イベント作成。body：Event全フィールド＋participants配列＋templateId（任意）
   - 認可：作成は親（role=PARENT）または該当家族の成人。子は閲覧のみ。

2. /api/events/[id]
   - GET：詳細（コメント・リアクション・参加者・振り返り含む）
   - PATCH：更新（authorまたは親のみ）
   - DELETE：削除（authorまたは親のみ）

3. /api/events/[id]/comments
   - GET：コメント一覧（時系列）
   - POST：コメント追加。家族メンバーは全員可。

4. /api/events/[id]/reactions
   - POST：リアクション追加（emoji指定）
   - DELETE：リアクション取り消し

5. /api/events/[id]/participants
   - PUT：参加者一括更新（実ユーザー＋仮想メンバー混在可）

6. /api/events/[id]/retrospective
   - PUT：振り返り作成・更新（plannedAmount、actualAmount、note）
   - GET：振り返り取得

7. /api/events/templates
   - GET：プリセット＋自家族テンプレート一覧
   - POST：自家族テンプレート作成（親のみ）

8. /api/family/calendar
   - GET：家族全員のイベントを集約（クエリ：from, to）。家族イベントの一目把握用。
   - レスポンス：日別グルーピング、参加者カラータグ含む

9. /api/family/virtual-members
   - GET：自家族の仮想メンバー一覧
   - POST：仮想メンバー追加（親のみ）
   - DELETE：仮想メンバー削除（親のみ、参加中イベントから除外処理）

10. /api/savings-goals/[id]/daily-suggested
    - GET：targetDateとtargetAmountと現在残高から日次推奨積立額を計算して返す
    - 計算式：(targetAmount - currentBalance) / 残日数。マイナスなら達成済みフラグ。

11. /api/savings-goals/[id]/link-event
    - POST：linkedEventIdを設定。targetDateも自動でEventのstartAtと同期するか選択。

■ 既存統合
- ScheduledBonusとEventの連動：イベント発生日に自動ボーナス支給する場合のフラグをEventに追加検討（フェーズ1未対応なら、ここでschemaを追加）
- Comment（既存）とEventCommentの命名衝突に注意。namespaceを分ける。
- Audit（既存）：イベント作成・更新・削除を記録する。

■ 受け入れ基準
- 全エンドポイントで認証ミドルウェア（src/lib/auth.ts）を経由
- 認可エラーは403、未認証は401で統一
- バリデーションエラーは400＋詳細メッセージ
- 既存ルート（goals、requests）と同じレスポンス形式（success/data/error）
- 完了時に「追加ルート一覧」「使用した既存lib」「未対応のedge case」を出力
```

---

## フェーズ3：UIコンポーネント実装

### 目的
カレンダー画面、イベント詳細、家族イベントビュー、目標連動ウィジェットを実装する。年齢別UI考慮を必須とする。

### プロンプト

```
（共通前提を先頭に貼る）

【フェーズ3：UIコンポーネント実装】

前提：フェーズ2のAPIが動作している。既存のsrc/app/配下のページ実装、src/components/配下のコンポーネントを必ず参照し、UI/UXトーンを揃えること。特にConceptThemeProvider、Toast、StatusBadgeを再利用すること。

■ 追加ページ

1. src/app/calendar/page.tsx
   - 月表示／週表示切り替え
   - イベントは参加者カラーで表示
   - 日付クリックで詳細パネル表示
   - 「+」ボタンでイベント新規作成モーダル
   - レスポンシブ：スマホでは縦スクロール、PCでは月間グリッド

2. src/app/events/[id]/page.tsx
   - イベント詳細（タイトル、日時、場所、参加者、説明）
   - 連動目標があれば「残日数：X日／残額：¥Y／日次推奨：¥Z」を強調表示
   - コメントスレッド（時系列、自分発言は右、他人は左）
   - リアクション（emoji選択UI）
   - 振り返りセクション（イベント終了後のみ表示）

3. src/app/family/page.tsx（家族イベント一覧）
   - 直近30日のイベントタイムライン
   - 参加者別フィルタ
   - お金が絡むイベント（連動目標あり）はバッジ表示
   - 既存Nav.tsxにメニュー追加

4. src/app/events/new/page.tsx
   - テンプレート選択（カテゴリ別）
   - フォーム：タイトル、日時、場所、参加者選択（実ユーザー＋仮想メンバー）、説明
   - 「貯蓄目標を作成して連動」チェックボックス（チェック時はtargetAmount入力欄追加）

■ 追加コンポーネント

5. src/components/CalendarGrid.tsx
   - 月間カレンダー本体。props：events、onDateClick、onEventClick

6. src/components/EventCard.tsx
   - イベント1件の表示。props：event、size（"sm"|"md"|"lg"）

7. src/components/CommentThread.tsx
   - イベントまたは目標に紐づくコメントスレッド。props：targetType、targetId

8. src/components/ReactionBar.tsx
   - emojiリアクションUI。props：reactions、onAdd、onRemove

9. src/components/GoalCountdown.tsx
   - 残日数・残額・日次推奨を視覚化。props：goal
   - 進捗バー＋数値表示

10. src/components/ParticipantSelector.tsx
    - 実ユーザー＋仮想メンバーを混在で選択するUI

■ 年齢別UI考慮（必須）
- ログインユーザーのrole=CHILDかつbirthDateから算出される年齢に応じて以下を切り替え：
  - 12歳以下：大きいフォント、ひらがな多め、絵文字多め、操作ボタン少なめ
  - 13歳以上：通常UI
- 切り替えロジックは src/lib/uiMode.ts（新規）に集約
- 親（PARENT）は常に通常UI

■ 既存ページとの統合
- src/app/page.tsx（ホーム）：直近イベント3件と連動目標カウントダウンを追加
- src/components/Nav.tsx：「カレンダー」「家族」メニュー追加

■ 受け入れ基準
- 全ページがTypeScript型エラーなし
- 既存のConceptThemeProviderテーマで表示崩れなし
- スマホ幅（375px）でレイアウト崩れなし
- ローディング・エラー・空状態の3パターンを各ページで実装
- 完了時に「追加ファイル一覧」「変更した既存ファイル一覧」「動作確認したページURL一覧」を出力
```

---

## フェーズ4：通知ロジック実装

### 目的
イベント前リマインダー、目標達成通知、コメント・リアクション通知、日次積立リマインダーを既存push基盤の上で実装する。

### プロンプト

```
（共通前提を先頭に貼る）

【フェーズ4：通知ロジック実装】

前提：フェーズ1〜3が完了している。既存のsrc/lib/push.ts、src/app/api/push/配下、src/app/api/cron/run/route.ts を必ず参照し、既存のpush送信パターンを再利用すること。

■ 追加する通知トリガー

1. イベント前リマインダー
   - トリガー：イベント開始のN日前（デフォルト3日前と当日朝、設定可能）
   - 対象：イベント参加者全員
   - 内容：「【イベント名】まであとX日」
   - 実装場所：cron/run/route.ts に追加

2. 目標達成リマインダー
   - トリガー：日次推奨積立額が達成されていない日（前日比で残高が増えていない）
   - 対象：目標オーナー（子）と親
   - 内容：「目標【XXX】のために今日は¥Y貯めよう」
   - ON/OFF：ユーザー設定で切り替え可

3. 目標達成通知
   - トリガー：currentBalance >= targetAmount に到達した瞬間
   - 対象：家族全員
   - 内容：「【子の名前】が【目標名】を達成しました🎉」
   - リアクション可能なリンク付き

4. コメント通知
   - トリガー：イベントに新規コメントが投稿された
   - 対象：イベント参加者（投稿者除く）
   - 内容：「【投稿者】が【イベント名】にコメント：[本文先頭30文字]」

5. リアクション通知
   - トリガー：自分のコメント・イベントにリアクションがついた
   - 対象：コメント投稿者またはイベント作成者
   - 内容：「【リアクション者】が【emoji】しました」
   - 集約：5分以内の連続リアクションはまとめて1通知

6. イベント振り返り促進
   - トリガー：イベント終了から24時間後、振り返り未入力の場合
   - 対象：イベント作成者
   - 内容：「【イベント名】の振り返りを記録しよう（実際にいくら使った？）」

■ 設定UI
- src/app/settings/page.tsx に通知ON/OFFセクション追加
- 各通知種別ごとにトグル
- 子向けは「親からのメッセージ通知」「目標応援通知」のみ表示（簡素化）

■ 既存統合
- 既存のPushSubscriptionモデルを使用
- 既存のsrc/lib/push.ts の送信関数を使用
- 既存のAuditで通知送信を記録

■ レート制限
- 1ユーザーあたり1日最大10通知
- 同種通知は1時間に1回まで
- 実装場所：src/lib/notificationThrottle.ts（新規）

■ 受け入れ基準
- 全通知がローカルテストで送信できる（src/app/api/push/test/route.ts を参考に）
- cron/run/route.ts のスケジュール実行で意図通り動作
- 通知ON/OFFが反映される
- 既存通知（あれば）に影響なし
- 完了時に「追加通知一覧」「cron実行頻度の推奨設定」「未実装のedge case」を出力
```

---

## 実行順序と注意

1. フェーズ1完了後、必ずDB状態を確認してからフェーズ2へ。
2. フェーズ2完了後、Postman等でAPIを手動確認してからフェーズ3へ。
3. フェーズ3完了後、ブラウザで全ページ動作確認してからフェーズ4へ。
4. フェーズ間で問題が出た場合は前フェーズに戻る。スキーマ変更はマイグレーション追加で対応（destructiveな変更は避ける）。

## ヒアリング非実施に伴うリスク（記録のみ）

本実装は需要検証ヒアリングを経ずに進めるため、以下のリスクを認識すること。
- リスクA：実装機能の何割かは利用されない可能性。
- リスクB：「親子コミュニケーション促進」軸が訴求軸として機能するかは未検証。
- リスクC：年齢別UI設計が実ユーザーの行動と乖離する可能性。
- 軽減策：フェーズ完了ごとに身近な家族（自分・親族）で30分試用し、明らかな違和感の早期発見に努める。
