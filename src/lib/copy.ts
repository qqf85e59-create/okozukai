import type { Concept } from "@/components/ConceptThemeProvider";

type CopyDef = {
  appName: string;
  appNameJp: string;
  home: string;
  missions: string;
  history: string;
  cash: string;
  report: string;
  items: string;
  expenses: string;
  audit: string;
  admin: string;
  settings: string;
  balance: string;
  missionLabel: string;
  welcome: string;
  tagline: string;
  moonRoom: string;
};

export const COPY: Record<Concept, CopyDef> = {
  arcade: {
    appName: "TOYBOX ARCADE",
    appNameJp: "おもちゃ箱バンク",
    home: "ホーム", missions: "クエスト", history: "プレイ履歴", cash: "両替",
    report: "ステータス", items: "メダル一覧", expenses: "ペナルティ",
    audit: "ログ", admin: "プレイヤー", settings: "セッティング",
    balance: "TICKETS", missionLabel: "MISSION",
    welcome: "WELCOME PLAYER",
    tagline: "★ INSERT COIN TO START ★",
    moonRoom: "プレイルーム",
  },
  cosmic: {
    appName: "STELLAR BANK",
    appNameJp: "おもちゃ箱バンク",
    home: "司令室", missions: "ミッション", history: "スターログ", cash: "スターポート",
    report: "作戦会議", items: "ミッション図鑑", expenses: "修理費", audit: "管制履歴",
    admin: "クルー管理", settings: "設定",
    balance: "ENERGY", missionLabel: "MISSION",
    welcome: "ようこそ、宇宙飛行士",
    tagline: "TO INFINITY · AND BEYOND",
    moonRoom: "アンディの司令室",
  },
  pixel: {
    appName: "TOYBOX",
    appNameJp: "おもちゃ箱バンク",
    home: "ホーム", missions: "クエスト", history: "ログブック", cash: "コインバンク",
    report: "ステータス", items: "クエスト図鑑", expenses: "ペナルティ",
    audit: "アクセスログ", admin: "プレイヤー管理", settings: "セッティング",
    balance: "GOLD", missionLabel: "QUEST",
    welcome: "PRESS START",
    tagline: "PRESS ANY KEY TO PLAY",
    moonRoom: "プレイヤーズルーム",
  },
  workshop: {
    appName: "Toy Box Bank",
    appNameJp: "おもちゃ箱バンク",
    home: "ホーム", missions: "おてつだい", history: "おもいで帳", cash: "両替所",
    report: "ふりかえり", items: "おてつだい一覧", expenses: "なおし代",
    audit: "記録", admin: "メンバー", settings: "せってい",
    balance: "ざんだか", missionLabel: "TASK",
    welcome: "おかえりなさい",
    tagline: "Make your wishes count",
    moonRoom: "アンディのへや",
  },
};
