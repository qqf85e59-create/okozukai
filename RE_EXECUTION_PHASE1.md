# フェーズ1 再実行プロンプト（防御版）

前回Claude Code実行でschema.prismaに反映されなかったため、状態確認・チェックポイント・失敗時報告を強化したプロンプト。Claude Codeに以下を**そのまま貼り付けて**実行する。

---

## プロンプト本体（コピーして貼り付け）

```
あなたは C:\app\okozukai リポジトリの実装担当である。
今回は「フェーズ1：DBスキーマ拡張」の再実行を依頼する。
前回実行ではschema.prismaに変更が反映されなかったため、以下の手順を厳守すること。

【最重要：完了基準（先に提示）】
本タスクの完了は以下5点を全て満たした場合のみ「完了」と報告できる。
1. prisma/schema.prisma に新規モデル・enum・拡張フィールドが追加されている
2. prisma/migrations/ 配下に新規マイグレーションフォルダが1つ追加されている
3. npx prisma generate がエラーなく完了している
4. npx tsc --noEmit がエラーなく完了している
5. 既存ファイル（src/app/api/goals/route.ts、src/app/api/balance/[userId]/route.ts 等）が型エラーを起こしていない

上記いずれかが満たせない場合は「未完了」として、達成項目と未達成項目を明示報告すること。「だいたい完了」「ほぼ完了」は禁止。

================================
ステップ0：状態確認（最初に必ず実行）
================================
以下を順に実行し、全ての出力をそのまま提示せよ。

1. pwd
2. git status
3. git branch --show-current
4. git log --oneline -5
5. ls prisma/migrations/
6. grep -E "^model |^enum " prisma/schema.prisma

ステップ0の結果から判定：
- もし prisma/schema.prisma に既に「model Event」「model Family」「model VirtualMember」のいずれかが存在するなら、即座に作業中止し「既に部分実装あり」と報告して指示を仰げ。
- もし作業ブランチがmain以外なら、ユーザーに「現ブランチで進めてよいか」を確認してから先に進め。
- それ以外なら ステップ1 へ進む。

================================
ステップ1：環境理解（読み込みのみ、変更しない）
================================
1. cat C:\app\okozukai\AGENTS.md
2. cat C:\app\okozukai\prisma\schema.prisma | head -300
3. cat C:\app\okozukai\src\lib\db.ts
4. cat C:\app\okozukai\src\lib\auth.ts
5. cat C:\app\okozukai\prisma\migrations\20260502120000_add_windfall_spending\migration.sql

これらを全て読んだ上で、以下を1段落で説明せよ：
- 本プロジェクトの標準Next.jsとの差分（AGENTS.mdから把握した内容）
- 既存のUser、SavingsGoalがどのように使われているか
- マイグレーションSQLの記述スタイル（CREATE TABLE構文の癖、enumの扱い等）

================================
ステップ2：schema.prisma 編集
================================
以下の仕様に従い prisma/schema.prisma を編集せよ。編集はファイル末尾への追記＋既存モデルへのフィールド追加で行う。

【追加するenum】（schema.prisma末尾に追加）
- enum EventCategory { BIRTHDAY TRIP EXAM SCHOOL FAMILY OTHER }
- enum ParticipantRole { ORGANIZER ATTENDEE OBSERVER }
- enum UserRole { PARENT CHILD }

注意：本プロジェクトはSQLite（datasource db { provider = "sqlite" }）。SQLiteはネイティブenumをサポートしないが、Prisma側でString制約として扱える。既存のUser.role（String型）との整合性を保つため、enumを使うかStringのままにするかは、既存のenum使用例があるか確認してから決定せよ。既存にenumがなければString型のままで「コメントで値域を明記」する方式にせよ。

【追加するモデル】（schema.prisma末尾に追加）

model Family {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  members   User[]
  events    Event[]
  virtualMembers VirtualMember[]
  templates EventTemplate[]
}

model Event {
  id          String   @id @default(cuid())
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  title       String
  description String?
  startAt     DateTime
  endAt       DateTime?
  allDay      Boolean  @default(false)
  location    String?
  category    String   // EventCategory: BIRTHDAY|TRIP|EXAM|SCHOOL|FAMILY|OTHER
  createdById String
  createdBy   User     @relation("EventCreatedBy", fields: [createdById], references: [id])
  templateId  String?
  template    EventTemplate? @relation(fields: [templateId], references: [id])
  participants EventParticipant[]
  comments    EventComment[]
  reactions   EventReaction[]
  retrospective EventRetrospective?
  linkedGoals SavingsGoal[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([familyId, startAt])
}

model EventParticipant {
  id              String   @id @default(cuid())
  eventId         String
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId          String?
  user            User?    @relation(fields: [userId], references: [id])
  virtualMemberId String?
  virtualMember   VirtualMember? @relation(fields: [virtualMemberId], references: [id])
  role            String   // ParticipantRole: ORGANIZER|ATTENDEE|OBSERVER

  @@index([eventId])
}

model VirtualMember {
  id          String   @id @default(cuid())
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  displayName String
  colorTag    String?
  participations EventParticipant[]
  createdAt   DateTime @default(now())

  @@index([familyId])
}

model EventComment {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  body      String
  createdAt DateTime @default(now())

  @@index([eventId, createdAt])
}

model EventReaction {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  emoji     String
  createdAt DateTime @default(now())

  @@unique([eventId, userId, emoji])
}

model EventTemplate {
  id              String   @id @default(cuid())
  familyId        String?
  family          Family?  @relation(fields: [familyId], references: [id])
  name            String
  category        String
  defaultBudget   Int?
  defaultLeadDays Int?
  description     String?
  events          Event[]
}

model EventRetrospective {
  id             String   @id @default(cuid())
  eventId        String   @unique
  event          Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  plannedAmount  Int?
  actualAmount   Int?
  note           String?
  createdAt      DateTime @default(now())
}

【既存モデルへのフィールド追加】

User モデルに以下を追加：
- familyId String?    // フェーズ1初期は任意。マイグレーションで既存ユーザーをdefaultFamilyに紐付けたあと、後続フェーズで必須化を検討。
- family   Family?    @relation(fields: [familyId], references: [id])
- createdEvents   Event[]            @relation("EventCreatedBy")
- eventParticipations EventParticipant[]
- eventComments       EventComment[]
- eventReactions      EventReaction[]

注意：Userのrole は既にStringで存在するため変更しない。enumへの変換は既存コードへの影響が大きいため本フェーズではスコープ外とする。

SavingsGoal モデルに以下を追加：
- targetDate           DateTime?
- linkedEventId        String?
- linkedEvent          Event?     @relation(fields: [linkedEventId], references: [id])
- dailySuggestedAmount Int?

【ステップ2 完了確認（必須実行）】
編集後、以下を実行し全出力を提示せよ：
1. grep -E "^model |^enum " prisma/schema.prisma | sort
2. grep -A 2 "familyId" prisma/schema.prisma
3. grep -A 2 "targetDate" prisma/schema.prisma

期待される出力：
- model Event, EventComment, EventParticipant, EventReaction, EventRetrospective, EventTemplate, Family, VirtualMember が一覧に含まれる
- familyId が User と Family、Event 等で確認できる
- targetDate が SavingsGoal で確認できる

期待と異なる場合は「ステップ2失敗」と明示し、何が原因か（書き込み権限、ファイル位置、構文エラー等）を調査して報告せよ。先に進まない。

================================
ステップ3：マイグレーション生成（--create-only）
================================
1. npx prisma migrate dev --name add_calendar_events --create-only

成功したら以下を実行：
2. ls -1t prisma/migrations/ | head -3
3. cat prisma/migrations/<生成された最新フォルダ>/migration.sql

失敗時：
- エラーメッセージ全文を提示
- schema.prismaの構文エラーが原因なら、エラー箇所を特定し修正案を提示してから停止（ユーザー確認後に再実行）

================================
ステップ4：既存ユーザー移行SQL追加
================================
ステップ3で生成された migration.sql の末尾に、既存ユーザーのデータ移行SQLを追記する。

追記内容：
```sql
-- 既存ユーザーをデフォルトFamilyに移行
INSERT INTO "Family" ("id", "name", "createdAt") VALUES ('default-family', 'デフォルト家族', CURRENT_TIMESTAMP);
UPDATE "User" SET "familyId" = 'default-family' WHERE "familyId" IS NULL;
```

追記後、cat で migration.sql 全文を再表示せよ。

================================
ステップ5：マイグレーション適用と検証
================================
1. npx prisma migrate dev
2. npx prisma generate
3. npx tsc --noEmit 2>&1 | head -50

各コマンドの出力を提示。

ステップ5 失敗時：
- マイグレーション適用エラーなら、エラーメッセージ全文と原因仮説を提示、修正案を出してユーザー確認を仰ぐ
- TypeScriptエラーが大量に出た場合（既存コードへの影響）は、エラー上位10件を提示し対応方針をユーザーに確認

================================
ステップ6：完了報告（必須・固定フォーマット）
================================
以下のフォーマットで完了報告せよ。

【完了報告】
- 結果：完了 / 未完了 （二択）
- 追加マイグレーションフォルダ：prisma/migrations/<フォルダ名>
- schema.prisma 追加モデル一覧：（モデル名をカンマ区切り）
- schema.prisma 追加フィールド一覧：（model.field形式でカンマ区切り）
- npx prisma generate 結果：成功 / 失敗
- npx tsc --noEmit 結果：成功 / 失敗（エラー数）
- 既存コードへの影響：影響なし / 影響あり（影響箇所一覧）
- git diff --stat の結果（そのまま貼り付け）
- 想定外の事象（あれば）

未完了の場合は、達成済ステップと未達成ステップを明示。「だいたい完了」は禁止。

================================
失敗時のフォールバック
================================
ステップ2以降のいずれかで複数回失敗した場合、本プロンプト全体の実行を中止し以下を報告：
- 直近の失敗ステップ
- 直近のエラーメッセージ全文
- これまでに編集したファイル一覧（git status の出力）

ユーザーが「Phase 1を更に細分化して再実行」を判断できるよう材料を提供すること。
```

---

## 実行時の注意

1. 上記プロンプト全体を1メッセージとしてClaude Codeに貼り付ける。
2. 実行中、Claude Codeが各ステップの出力を順次返してくるはずなので、ステップ0の出力時点で `git branch --show-current` の結果が `main` かどうかを目視確認する。
3. ステップ2完了後の `grep` 出力で、期待される全モデル・enumが揃っているかを目視確認する。
4. 完了報告フォーマットが揃っていなければ、Claude Codeに「完了報告フォーマットで報告し直して」と指示する。

## 失敗時の追加対応

本プロンプトでも失敗する場合は、以下の細分化案を採用：
- フェーズ1A：Family + User拡張のみ
- フェーズ1B：Event + EventParticipant + VirtualMember
- フェーズ1C：EventComment + EventReaction
- フェーズ1D：EventTemplate + EventRetrospective + SavingsGoal拡張

各サブフェーズごとにマイグレーションを分離する。
