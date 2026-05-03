import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Family (upsert default family used by all seed users)
  const defaultFamily = await prisma.family.upsert({
    where: { id: "default_family_001" },
    update: {},
    create: { id: "default_family_001", name: "デフォルト家族" },
  });

  // Users
  const users = [
    { id: "shina", displayName: "しいな", role: "approver", password: "shina123", birthDate: null },
    { id: "yuya", displayName: "友哉", role: "admin", password: "yuya123", birthDate: null },
    { id: "zenki", displayName: "善輝（ぜんき）", role: "child", password: "zenki123", birthDate: new Date("2013-11-26") },
    { id: "yuzuki", displayName: "柚輝（ゆずき）", role: "child", password: "yuzuki123", birthDate: new Date("2017-04-20") },
    { id: "toki", displayName: "杜輝（とき）", role: "child", password: "toki123", birthDate: new Date("2023-12-01") },
    { id: "setsuna", displayName: "雪凪（せつな）", role: "child", password: "setsuna123", birthDate: new Date("2026-01-30") },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { id: u.id },
      update: { role: u.role },  // always sync role on re-seed
      create: {
        id: u.id,
        familyId: defaultFamily.id,
        displayName: u.displayName,
        role: u.role,
        birthDate: u.birthDate,
        passwordHash,
        mustChangePassword: true,
      },
    });
    await prisma.balance.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id },
    });
  }

  // Chore items
  const chores = [
    { idSuffix: "おつかい ビッグ・イオン", name: "おつかい（ビッグ・イオン）", defaultMin: 50 },
    { idSuffix: "おつかい マツキヨ", name: "おつかい（マツキヨ）", defaultMin: 30 },
    { idSuffix: "おつかい マツキヨになくて、もう1件行った場合", name: "おつかい（はしごしたばあい）", defaultMin: 60 },
    { idSuffix: "カーテン開け・閉め", name: "カーテンあけ・しめ", defaultMin: 5 },
    { idSuffix: "テーブルふき", name: "テーブルふき", defaultMin: 5 },
    { idSuffix: "げんかんそうじ", name: "げんかんそうじ", defaultMin: 10 },
    { idSuffix: "ときせつのおむつ換え（おしっこ）", name: "ときせつのおむつがえ（おしっこ）", defaultMin: 5 },
    { idSuffix: "ときせつのおむつ換え（うんち）", name: "ときせつのおむつがえ（うんち）", defaultMin: 10 },
    { idSuffix: "ときせつのおふろ", name: "ときせつのおふろのせわ", defaultMin: 10 },
    { idSuffix: "ときせつのおふろしたく（服ぬがす・保湿・ドライヤー・服着・服準備）", name: "ときせつのおふろしたく（ぬがす〜きがえまで）", defaultMin: 15 },
    { idSuffix: "ごみすて", name: "ごみすて", defaultMin: 5 },
    { idSuffix: "カーテン取る・つける（1カ所）", name: "カーテンとる・つける（1か所）", defaultMin: 10 },
    { idSuffix: "朝ごはんを作ってあげる", name: "あさごはんをつくる", defaultMin: 5 },
    { idSuffix: "ソファ・カーペットコロコロ（ソファカバーセットまで）", name: "ソファ・カーペットコロコロ（カバーも）", defaultMin: 15 },
    { idSuffix: "ときせつのおもちゃ整理整頓", name: "ときせつのおもちゃかたづけ", defaultMin: 8 },
    { idSuffix: "床そうじ（全部屋・ろう下・階段・洗面所セット）", name: "ゆかそうじ（ぜんぶや・ろうか・かいだん・せんめんじょ）", defaultMin: 45 },
    { idSuffix: "床水ぶきそうじ（全部屋・ろう下・階段・洗面所セット）", name: "ゆかの水ぶき（ぜんぶや・ろうか・かいだん・せんめんじょ）", defaultMin: 60 },
    { idSuffix: "トイレそうじ", name: "トイレそうじ", defaultMin: 15 },
    { idSuffix: "おふろそうじ（タイル・さっし・カビ箇所）", name: "おふろそうじ（タイル・さっし・カビ）", defaultMin: 20 },
    { idSuffix: "おふろそうじ（有み戸もセット）", name: "おふろそうじ（あみどもセット）", defaultMin: 40 },
    { idSuffix: "窓ふき・さっしそうじ（全各階）", name: "まどふき・さっしそうじ（ぜんぶ）", defaultMin: 40 },
    { idSuffix: "茶わん洗い", name: "ちゃわんあらい", defaultMin: 15 },
    { idSuffix: "洗たくもののたたみ", name: "せんたくもののたたみ", defaultMin: 15 },
    { idSuffix: "洗たくものの干し", name: "せんたくものほし", defaultMin: 15 },
    { idSuffix: "普段のおふろそうじ", name: "ふだんのおふろそうじ", defaultMin: 10 },
    { idSuffix: "ミルク（げっぷまで）", name: "ミルク（げっぷまで）", defaultMin: 10 },
    { idSuffix: "ときの歯みがき", name: "ときの歯みがき", defaultMin: 10 },
    { idSuffix: "ときの寝るしたく（スリーパー・ベットに連れていく）", name: "ときの寝るしたく（スリーパー・ベッドまで）", defaultMin: 5 },
    { idSuffix: "ときのトイレ", name: "ときのトイレのてつだい", defaultMin: 5 },
    { idSuffix: "米とぎ", name: "こめとぎ", defaultMin: 10 },
    { idSuffix: "洗面所そうじ", name: "せんめんじょそうじ", defaultMin: 22 },
  ];

  const choreItems: { id: string; name: string }[] = [];
  for (const c of chores) {
    const item = await prisma.masterItem.upsert({
      where: { id: `chore_${c.idSuffix}` },
      update: { name: c.name, defaultMin: c.defaultMin },
      create: { id: `chore_${c.idSuffix}`, category: "chore", name: c.name, defaultMin: c.defaultMin },
    });
    choreItems.push(item);
  }

  // Study items
  const studyData = [
    { id: "study_free", name: "勉強時間（実時間申請）", defaultMin: 0, description: "実際に勉強した時間を分単位で申請" },
    { id: "study_100", name: "テスト100点", defaultMin: 15 },
    { id: "study_90", name: "テスト90点以上", defaultMin: 8 },
  ];

  for (const s of studyData) {
    await prisma.masterItem.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, category: "study", name: s.name, defaultMin: s.defaultMin, description: s.description },
    });
  }

  // Study overrides: テスト100点
  await prisma.itemOverride.upsert({
    where: { itemId_userId: { itemId: "study_100", userId: "zenki" } },
    update: {},
    create: { itemId: "study_100", userId: "zenki", overrideMin: 20 },
  });
  await prisma.itemOverride.upsert({
    where: { itemId_userId: { itemId: "study_100", userId: "yuzuki" } },
    update: {},
    create: { itemId: "study_100", userId: "yuzuki", overrideMin: 10 },
  });

  // Study overrides: テスト90点以上
  await prisma.itemOverride.upsert({
    where: { itemId_userId: { itemId: "study_90", userId: "zenki" } },
    update: {},
    create: { itemId: "study_90", userId: "zenki", overrideMin: 10 },
  });
  await prisma.itemOverride.upsert({
    where: { itemId_userId: { itemId: "study_90", userId: "yuzuki" } },
    update: {},
    create: { itemId: "study_90", userId: "yuzuki", overrideMin: 5 },
  });

  // Penalty items
  const penalties = [
    { id: "pen_1", name: "きめつけた", defaultMin: -10 },
    { id: "pen_2", name: "あさ8時前にときせつが寝ている間のバスケ", defaultMin: -60 },
    { id: "pen_3", name: "さいしょに「ちがう」といった", defaultMin: -10 },
    { id: "pen_4", name: "とっぱつ的にウソをつく", defaultMin: -10 },
    { id: "pen_5", name: "おなじ事を3回ちゅういされた", defaultMin: -10 },
    { id: "pen_6", name: "したぎを着ないでせんめんじょから出た", defaultMin: -10 },
    { id: "pen_7", name: "いしをなげる", defaultMin: -30 },
    { id: "pen_8", name: "カーテン（こどもべや）・マットレスかたづけわすれ", defaultMin: -10 },
    { id: "pen_9", name: "せわをひきうけたのに最後までやらない", defaultMin: -60 },
    { id: "pen_10", name: "歯をみがかない", defaultMin: -60 },
    { id: "pen_11", name: "よる8時までにこどもべやをかたづけない（1つにつき）", defaultMin: -20 },
    { id: "pen_12", name: "ときを起こす", defaultMin: -300 },
    { id: "pen_13", name: "ウソのほうこく", defaultMin: -600 },
    { id: "pen_14", name: "ウソをつく", defaultMin: -60 },
    { id: "pen_15", name: "ぼうりょく", defaultMin: -60 },
    { id: "pen_16", name: "モノにあたる（人のモノ）", defaultMin: -60 },
    { id: "pen_17", name: "モノにあたる（じぶんのモノ）", defaultMin: -30 },
    { id: "pen_18", name: "人のせいにする", defaultMin: -30 },
    { id: "pen_19", name: "走り回ってはいけない所で走り回る", defaultMin: -10 },
    { id: "pen_20", name: "かたてでご飯を食べる", defaultMin: -10 },
    { id: "pen_21", name: "足を立てて食べる", defaultMin: -10 },
    { id: "pen_22", name: "イス・ソファの上に立つ", defaultMin: -10 },
    { id: "pen_23", name: "ご飯をのこす", defaultMin: -10 },
    { id: "pen_24", name: "じかんオーバー（とうこう・ならいごと・寝る時間など）1つにつき", defaultMin: -10 },
    { id: "pen_25", name: "出したものをかたづけない（1つにつき）", defaultMin: -20 },
    { id: "pen_26", name: "人の物をかってに使う", defaultMin: -10 },
    { id: "pen_27", name: "べんきょうの答えをおしえ合う", defaultMin: -10 },
    { id: "pen_28", name: "くつのかかとをふむ", defaultMin: -10 },
    { id: "pen_29", name: "ご飯中にたちあるく", defaultMin: -10 },
    { id: "pen_30", name: "しゃっきん3万円以上で外に遊びにいく", defaultMin: -300 },
    { id: "pen_31", name: "かってにスマホなどを2階に持っていく", defaultMin: -60 },
    { id: "pen_32", name: "かってに動画を見る・ゲームをする", defaultMin: -600 },
    { id: "pen_33", name: "人につばをかける", defaultMin: -60 },
    { id: "pen_34", name: "きめられた時間いこうに話す", defaultMin: -20 },
  ];

  for (const p of penalties) {
    await prisma.masterItem.upsert({
      where: { id: p.id },
      update: { name: p.name, defaultMin: p.defaultMin },
      create: { id: p.id, category: "penalty", name: p.name, defaultMin: p.defaultMin },
    });
  }

  // Penalty overrides: 暴力 (pen_15)
  await prisma.itemOverride.upsert({
    where: { itemId_userId: { itemId: "pen_15", userId: "yuzuki" } },
    update: {},
    create: { itemId: "pen_15", userId: "yuzuki", overrideMin: -10 },
  });
  await prisma.itemOverride.upsert({
    where: { itemId_userId: { itemId: "pen_15", userId: "setsuna" } },
    update: {},
    create: { itemId: "pen_15", userId: "setsuna", overrideMin: -10 },
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
