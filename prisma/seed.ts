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

  // ── ChoreItem ──
  const choreItemsData = [
    // おてつだい
    { id: "ci_0",  category: "おてつだい", name: "お使い（おつかい）（ビッグ・イオン）",                            bonusMinutes: 50 },
    { id: "ci_1",  category: "おてつだい", name: "お使い（おつかい）（マツキヨ）",                                  bonusMinutes: 30 },
    { id: "ci_2",  category: "おてつだい", name: "お使い（おつかい）（はしごした場合（ばあい））",                   bonusMinutes: 60 },
    { id: "ci_3",  category: "おてつだい", name: "カーテン開け・閉め（あけ・しめ）",                                bonusMinutes: 5  },
    { id: "ci_4",  category: "おてつだい", name: "テーブル拭き（ふき）",                                            bonusMinutes: 5  },
    { id: "ci_5",  category: "おてつだい", name: "玄関掃除（げんかんそうじ）",                                      bonusMinutes: 10 },
    { id: "ci_6",  category: "おてつだい", name: "ときせつのおむつ替え（おむつがえ）（おしっこ）",                  bonusMinutes: 5  },
    { id: "ci_7",  category: "おてつだい", name: "ときせつのおむつ替え（おむつがえ）（うんち）",                    bonusMinutes: 10 },
    { id: "ci_8",  category: "おてつだい", name: "ときせつのお風呂の世話（おふろのせわ）",                          bonusMinutes: 10 },
    { id: "ci_9",  category: "おてつだい", name: "ときせつのお風呂支度（おふろしたく）（脱がす〜着替えまで）",      bonusMinutes: 15 },
    { id: "ci_10", category: "おてつだい", name: "ゴミ捨て（ごみすて）",                                            bonusMinutes: 5  },
    { id: "ci_11", category: "おてつだい", name: "カーテン取る・付ける（とる・つける）（1か所）",                   bonusMinutes: 10 },
    { id: "ci_12", category: "おてつだい", name: "朝ご飯を作る（あさごはんをつくる）",                              bonusMinutes: 5  },
    { id: "ci_13", category: "おてつだい", name: "ソファ・カーペットコロコロ（カバーも）",                          bonusMinutes: 15 },
    { id: "ci_14", category: "おてつだい", name: "ときせつのおもちゃ片付け（かたづけ）",                            bonusMinutes: 8  },
    { id: "ci_15", category: "おてつだい", name: "床掃除（ゆかそうじ）（全部屋・廊下・階段・洗面所）",              bonusMinutes: 50 }, // ★ 暫定値 要確認
    { id: "ci_16", category: "おてつだい", name: "床の水拭き（ゆかのみずぶき）（全部屋・廊下・階段・洗面所）",      bonusMinutes: 60 },
    { id: "ci_17", category: "おてつだい", name: "トイレ掃除（そうじ）",                                            bonusMinutes: 15 },
    { id: "ci_18", category: "おてつだい", name: "お風呂掃除（おふろそうじ）（タイル・サッシ・カビ）",              bonusMinutes: 20 },
    { id: "ci_19", category: "おてつだい", name: "お風呂掃除（おふろそうじ）（網戸もセット）",                      bonusMinutes: 40 },
    { id: "ci_20", category: "おてつだい", name: "窓拭き・サッシ掃除（まどふき・さっしそうじ）（全部）",           bonusMinutes: 40 },
    { id: "ci_21", category: "おてつだい", name: "茶碗洗い（ちゃわんあらい）",                                      bonusMinutes: 15 },
    { id: "ci_22", category: "おてつだい", name: "洗濯物のたたみ（せんたくもののたたみ）",                          bonusMinutes: 15 },
    { id: "ci_23", category: "おてつだい", name: "洗濯物干し（せんたくものほし）",                                  bonusMinutes: 15 },
    { id: "ci_24", category: "おてつだい", name: "普段のお風呂掃除（ふだんのおふろそうじ）",                        bonusMinutes: 10 },
    { id: "ci_25", category: "おてつだい", name: "ミルク（げっぷまで）",                                            bonusMinutes: 10 },
    { id: "ci_26", category: "おてつだい", name: "ときの歯磨き（はみがき）",                                        bonusMinutes: 10 },
    { id: "ci_27", category: "おてつだい", name: "ときの寝る支度（ねるしたく）（スリーパー・ベッドまで）",          bonusMinutes: 5  },
    { id: "ci_28", category: "おてつだい", name: "ときのトイレの手伝い（てつだい）",                                bonusMinutes: 5  },
    { id: "ci_29", category: "おてつだい", name: "米とぎ（こめとぎ）",                                              bonusMinutes: 10 },
    { id: "ci_30", category: "おてつだい", name: "洗面所掃除（せんめんじょそうじ）",                                bonusMinutes: 22 },
    // べんきょう
    { id: "ci_31", category: "べんきょう", name: "勉強時間（実時間申請）",                               bonusMinutes: 0  },
    { id: "ci_32", category: "べんきょう", name: "テスト100点",                                          bonusMinutes: 15 },
    { id: "ci_33", category: "べんきょう", name: "テスト90点以上",                                       bonusMinutes: 8  },
  ];

  for (let i = 0; i < choreItemsData.length; i++) {
    const c = choreItemsData[i];
    await prisma.choreItem.upsert({
      where: { id: c.id },
      update: { name: c.name, bonusMinutes: c.bonusMinutes, sortOrder: i },
      create: {
        id: c.id,
        familyId: defaultFamily.id,
        category: c.category,
        name: c.name,
        bonusMinutes: c.bonusMinutes,
        mode: "FIXED",
        sortOrder: i,
      },
    });
  }

  // ── PenaltyItem ──
  const penaltyItemsData: { id: string; name: string; penaltyMinutes: number; mode?: "FIXED" | "PROPORTIONAL"; unitLabel?: string }[] = [
    { id: "pi_0",  name: "決めつけた（きめつけた）",                                                       penaltyMinutes: 10  },
    { id: "pi_1",  name: "朝（あさ）8時前にときせつが寝ている間（あいだ）のバスケ",                       penaltyMinutes: 60  },
    { id: "pi_2",  name: "最初（さいしょ）に「ちがう」といった",                                          penaltyMinutes: 10  },
    { id: "pi_3",  name: "突発的（とっぱつてき）にウソをつく",                                            penaltyMinutes: 10  },
    { id: "pi_4",  name: "同じ（おなじ）ことを3回注意（ちゅうい）された",                                 penaltyMinutes: 10  },
    { id: "pi_5",  name: "下着（したぎ）を着ないで洗面所（せんめんじょ）から出た",                       penaltyMinutes: 10  },
    { id: "pi_6",  name: "石（いし）を投げる（なげる）",                                                  penaltyMinutes: 30  },
    { id: "pi_7",  name: "カーテン（子ども部屋（こどもべや））・マットレス片付け忘れ（かたづけわすれ）",  penaltyMinutes: 10  },
    { id: "pi_8",  name: "世話（せわ）を引き受けた（ひきうけた）のに最後（さいご）までやらない",          penaltyMinutes: 60  },
    { id: "pi_9",  name: "歯（は）を磨かない（みがかない）",                                              penaltyMinutes: 60  },
    { id: "pi_10", name: "夜（よる）8時までに子ども部屋（こどもべや）を片付けない（かたづけない）（1つにつき）", penaltyMinutes: 20 },
    { id: "pi_11", name: "ときを起こす（おこす）",                                                        penaltyMinutes: 300 },
    { id: "pi_12", name: "ウソの報告（ほうこく）",                                                        penaltyMinutes: 600 },
    { id: "pi_13", name: "ウソをつく",                                                                     penaltyMinutes: 60  },
    { id: "pi_14", name: "暴力（ぼうりょく）",                                                             penaltyMinutes: 60  },
    { id: "pi_15", name: "物（もの）にあたる（人（ひと）の物（もの））",                                  penaltyMinutes: 60  },
    { id: "pi_16", name: "物（もの）にあたる（自分（じぶん）の物（もの））",                              penaltyMinutes: 30  },
    { id: "pi_17", name: "人（ひと）のせいにする",                                                        penaltyMinutes: 30  },
    { id: "pi_18", name: "走り回ってはいけない所で走り回る",                                              penaltyMinutes: 10  },
    { id: "pi_19", name: "片手（かたて）でご飯（ごはん）を食べる（たべる）",                              penaltyMinutes: 10  },
    { id: "pi_20", name: "足を立てて食べる",                                                               penaltyMinutes: 10  },
    { id: "pi_21", name: "イス・ソファの上に立つ",                                                        penaltyMinutes: 10  },
    { id: "pi_22", name: "ご飯（ごはん）を残す（のこす）",                                                penaltyMinutes: 10  },
    { id: "pi_23", name: "時間（じかん）オーバー（登校（とうこう）・習い事（ならいごと）・寝る時間など）1つにつき", penaltyMinutes: 10 },
    { id: "pi_24", name: "出した物（もの）を片付けない（かたづけない）（1つにつき）",                     penaltyMinutes: 20  },
    { id: "pi_25", name: "人（ひと）の物（もの）を勝手（かって）に使う（つかう）",                        penaltyMinutes: 10  },
    { id: "pi_26", name: "勉強（べんきょう）の答え（こたえ）を教え合う（おしえあう）",                    penaltyMinutes: 10  },
    { id: "pi_27", name: "靴（くつ）のかかとを踏む（ふむ）",                                              penaltyMinutes: 10  },
    { id: "pi_28", name: "ご飯中（ごはんちゅう）に立ち歩く（たちあるく）",                                penaltyMinutes: 10  },
    { id: "pi_29", name: "借金（しゃっきん）5万円以上で外出禁止を破る",                                   penaltyMinutes: 300 },
    { id: "pi_30", name: "勝手（かって）にスマホなどを2階（にかい）に持っていく（もっていく）",           penaltyMinutes: 60  },
    { id: "pi_31", name: "勝手（かって）に動画（どうが）を見る（みる）・ゲームをする",                    penaltyMinutes: 600 },
    { id: "pi_32", name: "人（ひと）につばをかける",                                                      penaltyMinutes: 60  },
    { id: "pi_33", name: "決められた（きめられた）時間（じかん）以降（いこう）に話す（はなす）",           penaltyMinutes: 20, mode: "PROPORTIONAL", unitLabel: "分超過ごとに" },
  ];

  for (let i = 0; i < penaltyItemsData.length; i++) {
    const p = penaltyItemsData[i];
    await prisma.penaltyItem.upsert({
      where: { id: p.id },
      update: { name: p.name, penaltyMinutes: p.penaltyMinutes, sortOrder: i },
      create: {
        id: p.id,
        familyId: defaultFamily.id,
        name: p.name,
        penaltyMinutes: p.penaltyMinutes,
        mode: p.mode ?? "FIXED",
        unitLabel: p.unitLabel ?? null,
        sortOrder: i,
      },
    });
  }

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
