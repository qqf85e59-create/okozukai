# Claude Code 投入用プロンプト集 v0.1

本書は、設計書「お小遣い制度設計書 v0.2」に基づく実装を Claude Code に段階投入するためのプロンプト集である。
P0（バグ修正）から順次1フェーズずつ投入し、各フェーズ完了後に動作確認を挟むこと。

---

## 投入順序と完了条件

| Phase | 目的 | 完了条件 |
|---|---|---|
| P0 | 残高反映バグ修正 | 「+臨時収入」「実費控除」が即時残高反映 |
| P1 | TimeLedger / YenLedger 基盤＋既存残高の Ledger 化 | ホーム残高表示が Ledger 集計値で動作 |
| P2 | 項目マスタ＋個人別 override＋seed 投入 | 親が項目 CRUD 可能、PDF項目が初期投入済 |
| P3 | 申請承認フロー（棄却理由含む） | 子の申請→親の承認・棄却が完結 |
| P4 | 時間→金額換算（60分単位） | 子が時間→金額変換可能 |
| P5 | 換金（手数料500円・マイナス時不可） | 子が換金申請、親が現金支給フロー完結 |
| P6 | 時間消費（ゲーム／スマホ） | 子が消費登録可能 |
| P7 | 比例モード（超過時間×単位分数） | PROPORTIONAL ペナルティ計上が動作 |

---

## 共通前提（全プロンプトの冒頭に必ず含める）

```
あなたは本リポジトリ（C:\app\okozukai）の実装担当である。以下を必ず守ること。

【最重要：カスタムNext.js】
本プロジェクトは標準Next.jsではない。
コードを書く前に必ず以下を実行：
1. C:\app\okozukai\AGENTS.md を読む
2. node_modules/next/dist/docs/ 内の関連ドキュメントを読む
3. 既存の src/app 配下のルート実装パターンを最低3つ参照する
標準Next.jsの記憶でAPIを書かない。既存パターンに合わせる。

【設計書の参照】
本タスクの仕様の正は C:\app\okozukai\お小遣い制度設計書_v0.2.md である。
着手前に該当章を必読し、不一致があれば設計書を優先して報告する。

【既存資産の尊重】
- 既存モデル：User、SavingsGoal、ScheduledBonus、Request、CashRequest、Comment、Push、Audit、Attachment
- 既存lib：src/lib/auth.ts、db.ts、push.ts、audit.ts、settlement.ts、storage.ts
- 新規実装は既存モデル・libを再利用すること。重複実装を作らない。
- 既存のRequest/Comment承認フローを申請承認の参照実装とすること。

【プロダクト前提】
- ターゲット：小学生〜高校生＋未就学児の子を持つ家族
- 既存機能を壊さないこと。新機能は加算のみ。
- 子供：善輝（中1）、柚輝（小3）、杜輝（未就学児）、雪凪（未就学児）

【受け入れ基準（共通）】
- TypeScript 型エラー 0
- ESLint エラー 0
- 既存テスト全通過（テスト基盤がない場合は本タスクで最低限のテストを追加）
- 既存ページ（src/app配下）が動作する
- destructive 変更（カラム削除・型変更）を行う場合は事前に列挙し承認を求める

【出力フォーマット（共通）】
- 読んだファイル一覧（AGENTS.md と参照した既存ルート）
- 変更ファイル一覧（行数規模付き）
- 追加ファイル一覧
- 既存コードへの影響範囲
- 動作確認手順（curl または ブラウザ操作）
- 未対応の edge case
- ロールバック手順
```

---

## P0：残高反映バグ修正

```
（共通前提を先頭に貼る）

【P0：残高反映バグ修正】

■ 現象（事実）
- ホーム画面「みんなの残高」が4人全員0円固定
- 「+臨時収入」モーダルから「お年玉 3,000円」を登録 → ボタン押下後も0円のまま
- 同症状はペナルティ画面の「実費控除」でも検証対象
- アプリには「週次集計を実行する」ボタンが存在する

■ 最初に判定すること（仕様 vs バグ）
1. 「臨時収入」が即時残高反映を要件とするか、週次集計後反映を要件とするか
   - schema.prisma、src/lib/settlement.ts、関連READMEを読んで判定
   - 不明な場合は「仕様未確定」と報告し、両ケースの仮実装方針を提示
2. 仕様が「即時反映」の場合 → バグとして以下を調査
3. 仕様が「週次集計後反映」の場合 → 「現在の暫定残高」UI表示の有無を確認

■ バグ調査ステップ
1. 「臨時収入」登録のフロー全体を追跡：
   - フロント：モーダルの onSubmit → fetch 先 API
   - API：src/app/api/ 配下の該当ルート
   - lib：src/lib/settlement.ts、db.ts の残高更新関数
   - prisma：update の戻り値、where の条件
2. 「みんなの残高」表示のデータ取得経路を追跡：
   - 取得元 API
   - SWR／React Query 等のキャッシュの有無
   - 集計対象テーブル（残高は実テーブル列か、トランザクション集計か）
3. 同様に「実費控除」「ペナルティ」も追跡し、共通バグか個別事象か判定

■ 原因特定後の出力
- 仮説リスト（最低3つ）と採用理由
- 修正したファイルと差分要約
- 追加した再現テスト（修正前 fail → 修正後 pass）
- 既存の正常ケースを破壊していないことの確認手順

■ 受け入れ基準
- 「お年玉3,000円」登録後、ホーム画面の対象児の残高が即時 3,000円 に更新される
- 「実費控除」も同様に反映される（または仕様通り週次集計後反映される）
- 既存の週次集計の挙動が壊れていない
- src/lib/audit.ts の記録が引き続き残る

■ 禁止事項
- 仕様未確定のまま広範囲改修しない
- 残高計算の挙動を勝手に変更しない（既存仕様の追従が原則）
- 設計書 v0.2 の Ledger 化はこのタスクで実装しない（P1で実施）

完了時、共通の出力フォーマットに従って報告すること。
```

---

## P1：TimeLedger / YenLedger 基盤＋既存残高の Ledger 化

```
（共通前提を先頭に貼る）

【P1：Ledger 基盤導入】

前提：P0 が完了している。

■ 実装範囲
1. prisma/schema.prisma に以下を追加（設計書 v0.2 §4.2 を正とする）
   - TimeLedger（イベントログ）
   - YenLedger（イベントログ）
   - LedgerReason / LedgerSourceType / YenLedgerReason enum
2. src/lib/ledger.ts 新設
   - addTimeLedger(userId, deltaMinutes, reason, ...) 関数
   - addYenLedger(userId, deltaYen, reason, ...) 関数
   - getTimeBalance(userId) / getYenBalance(userId) 関数（集計）
3. 既存の残高加減算ロジック（settlement.ts）を Ledger 経由に置換
   - 「+臨時収入」→ YenLedger.BONUS で記録
   - 「実費控除」→ YenLedger.EXPENSE_DEDUCT で記録
   - 既存ScheduledBonus → YenLedger.BONUS（または新Reason）で記録
4. ホーム画面「みんなの残高」を YenLedger 集計値ベースに変更
   - 時間残高表示も追加（h:m 表記）
5. 既存データの移行マイグレーション
   - 既存「みんなの残高」円残高を YenLedger に BONUS として一括投入する seed
   - もしくはゼロ起算（家族判断）。マイグレーションの両案を提示し採用案で実装
   - DRY-RUN モードで事前確認可能にすること

■ 受け入れ基準
- npx prisma generate / migrate dev がエラーなく完了
- ホームの残高表示が Ledger 集計と一致
- P0 で動作するようにした「+臨時収入」「実費控除」が引き続き動作
- 既存履歴の整合性確認手順を提示

■ 禁止事項
- 申請承認フローはこのタスクで実装しない（P3で実施）
- 換算・換金・消費はこのタスクで実装しない

■ ロールバック手順
- マイグレーション差し戻しコマンドと、コード変更の revert 手順を明記
```

---

## P2：項目マスタ＋個人別 override＋seed 投入

```
（共通前提を先頭に貼る）

【P2：項目マスタとオーバーライド】

前提：P1 が完了している。

■ 実装範囲
1. prisma/schema.prisma に以下を追加
   - ChoreItem / UserChoreOverride
   - PenaltyItem / UserPenaltyOverride
   - ItemMode enum（FIXED / PROPORTIONAL）
2. src/lib/items.ts 新設
   - resolveBonusMinutes(userId, choreItemId) 関数
   - resolvePenaltyMinutes(userId, penaltyItemId) 関数
3. seed スクリプト（prisma/seed.ts または script）
   - 設計書 v0.2 §7 の項目をすべて投入
   - おてつだい31件、べんきょう3件、マイナス33件＋PROPORTIONAL「決められた時間以降に話す」1件
   - 「床そうじ」分数は要確認注記の通り暫定値で投入し、後修正可能にする
4. API
   - GET/POST/PATCH/DELETE /api/admin/chore-items（親のみ）
   - GET/POST/PATCH/DELETE /api/admin/penalty-items（親のみ）
   - GET/PUT /api/admin/users/[id]/overrides（親のみ）
5. UI
   - /admin/chore-items：CRUD、カテゴリ別表示、ドラッグソート
   - /admin/penalty-items：CRUD、モード切替（FIXED/PROPORTIONAL）
   - /admin/users/[id]/overrides：子別の項目分数オーバーライド／非表示設定
   - ホーム下部「おこづかい項目（参照用）」を新マスタから動的表示

■ 受け入れ基準
- 親アカウントで項目 CRUD 可能
- 子アカウントでは編集 UI が見えない
- 個人別 override で分数を上書きすると、resolveBonusMinutes が override 値を返す
- seed 投入後、既存「おてつだい31件」表示が新マスタと一致

■ 禁止事項
- 申請計上ロジックはこのタスクで実装しない（P3で実施）
- マスタ削除時の既存履歴への影響対策を必ず実装（論理削除＋active=false 推奨）
```

---

## P3：申請承認フロー（棄却理由含む）

```
（共通前提を先頭に貼る）

【P3：申請承認フロー】

前提：P2 が完了している。
既存の Request／Comment 承認フローを参照実装とすること。

■ 実装範囲
1. prisma/schema.prisma に以下を追加
   - StudyLog（rejectedReason 含む）
   - ChoreClaim（rejectedReason、actualValue 含む）
   - PenaltyEvent（reason 必須、actualValue 含む）
   - ClaimStatus enum
2. API
   - POST /api/study-logs（子が登録、PENDING で作成）
   - POST /api/study-logs/[id]/approve（親、TimeLedger 計上）
   - POST /api/study-logs/[id]/reject（親、rejectedReason 必須）
   - POST /api/chore-claims（子が登録、totalMinutes をスナップショット）
   - POST /api/chore-claims/[id]/approve / reject
   - POST /api/penalty-events（親が直接計上、reason 必須、TimeLedger 計上）
3. UI
   - /study-logs/new：勉強時間申請（子）
   - /chore-claims/new：お手伝い項目選択＋回数（子）
   - /requests：自分の申請ステータス一覧（子・親両方）
   - /approvals：承認待ち一覧（親）。承認／棄却ボタン、棄却時は理由入力モーダル必須
   - /penalties/new：ペナルティ計上（親）
4. Push 通知
   - 申請発生時に親へ通知
   - 承認・棄却時に子へ通知
   - ペナルティ計上時に子へ通知

■ 受け入れ基準
- 子が申請 → 親に通知 → 親が承認 → 子に通知＋ TimeLedger に計上 が一気通貫で動作
- 棄却時は rejectedReason が必須でないと API がエラーを返す
- 子は他人の申請を見られない（自分の申請のみ）
- 親は全員の申請を見られる
- スマホ幅 375px でレイアウト崩れなし

■ 禁止事項
- 比例モード（PROPORTIONAL）の actualValue 入力 UI は P7 で実装。本タスクでは固定モードのみ動作確認できればよい
```

---

## P4：時間→金額換算（60分単位）

```
（共通前提を先頭に貼る）

【P4：時間→金額換算】

前提：P3 が完了している。

■ 実装範囲
1. prisma/schema.prisma に TimeConvert 追加
2. API
   - POST /api/time-converts（子が実行）
     - 入力検証：minutesUsed が 60 の倍数かつ 60 以上
     - 入力検証：時間残高が minutesUsed 以上
   - GET /api/time-converts?userId=
3. lib/ledger.ts に換算関数を追加
   - convertTimeToYen(userId, minutesUsed)：トランザクションで TimeLedger -minutes、YenLedger +yen を同時記録
4. UI
   - /convert：60分単位ステッパー、現在残高、換算後残高プレビュー
   - 完了後ホームへリダイレクト

■ 受け入れ基準
- 60分単位以外の入力は API が 400 を返す
- トランザクション失敗時は両 Ledger ともロールバックされる
- 換算後、ホームの時間残高と金額残高が即時反映される

■ 禁止事項
- レート（60分=500円）のハードコードを避け、定数化（src/lib/constants.ts 推奨）
```

---

## P5：換金（手数料500円・マイナス時不可）

```
（共通前提を先頭に貼る）

【P5：換金】

前提：P4 が完了している。

■ 実装範囲
1. prisma/schema.prisma に CashOut 追加
2. API
   - POST /api/cashouts（子が申請、親が即時承認・現金支給）
     - 入力検証：金額残高 ≧ 500円
     - YenLedger に CASH_OUT で -grossYen、CASH_FEE で 0（または内訳記録）
3. UI
   - /cashout：現在残高、手数料、純額（grossYen - 500）の確認画面
   - 残高 < 500円 の場合はボタン無効化＋理由表示
   - 「次に X 円ためれば実質受取 Y 円」の金融教育ヒント表示
4. 履歴
   - /ledger に CASH_OUT イベントを表示

■ 受け入れ基準
- 残高 < 500円 で換金 API が 400 を返す
- 換金後、金額残高が grossYen 分減算される
- CashOut レコードに親の approvedById が記録される

■ 禁止事項
- 換金日（土曜午前）の曜日ロックは UI 上の推奨表示のみ。API 側でのロックは行わない
```

---

## P6：時間消費（ゲーム／スマホ）

```
（共通前提を先頭に貼る）

【P6：時間消費】

前提：P5 が完了している。

■ 実装範囲
1. prisma/schema.prisma に TimeConsume 追加、ConsumeCategory enum 追加
2. API
   - POST /api/time-consumes（子が登録）
     - マイナス残高でも登録可能（青天井）
   - GET /api/time-consumes?userId=
3. UI
   - /consume：カテゴリ選択＋分数入力＋メモ
   - ホームに本日の消費合計を表示
4. 親の事後修正
   - 親は対象児の TimeConsume を編集／削除可能（Audit 記録あり）

■ 受け入れ基準
- 残高マイナスでも登録できる
- 親の編集が Audit に記録される
```

---

## P7：比例モード（超過時間×単位分数）

```
（共通前提を先頭に貼る）

【P7：比例モード】

前提：P6 が完了している。
P2 で ItemMode enum と actualValue カラムは追加済みである。本フェーズはモード対応の UI と計上ロジックのみ実装する。

■ 実装範囲
1. PenaltyEvent 計上ロジック修正
   - mode=FIXED：totalMinutes = penaltyMinutes × count
   - mode=PROPORTIONAL：totalMinutes = penaltyMinutes × actualValue
2. ChoreClaim 計上ロジックも同様に拡張
3. UI
   - /penalties/new：項目選択時にモードを判定し、入力フィールドを切替
     - FIXED：回数入力
     - PROPORTIONAL：実数値入力（unitLabel をプレースホルダ表示）
   - /admin/penalty-items：モード切替時に unitLabel 入力欄を活性化
4. seed の「決められた時間以降に話す（超過時間×20分）」が動作確認できる状態にする

■ 受け入れ基準
- モード切替時のバリデーションが正しく動作
- FIXED と PROPORTIONAL を混在運用しても計上が正しい
- 既存（P3で動作していた）固定モードのフローが壊れていない

■ 禁止事項
- ItemMode 以外の追加 enum 値を勝手に増やさない
```

---

## 投入時の運用ルール

1. 1フェーズ＝1セッションで投入。前フェーズが完了するまで次に進まない
2. 各フェーズ完了後、家族で 30分 試用し違和感を記録
3. 違和感があれば本書 v0.x に Issue として追記し、設計書 v0.x にも反映
4. destructive 変更が発生する場合、Claude Code が事前承認を求めるまで実行させない

---

## 改訂履歴

- v0.1（本書）：初版。設計書 v0.2 に基づく P0〜P7 のプロンプト集
