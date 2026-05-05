import { describe, test, expect } from "vitest";
import { formatMin, formatYen } from "../format";

describe("formatMin", () => {
  test("正の分のみ", () => expect(formatMin(45)).toBe("45分"));
  test("ちょうど1時間", () => expect(formatMin(60)).toBe("1時間"));
  test("1時間30分", () => expect(formatMin(90)).toBe("1時間30分"));
  test("ゼロ", () => expect(formatMin(0)).toBe("0分"));
  test("負の分（△表記）", () => expect(formatMin(-45)).toBe("△45分"));
  test("負の時間（△表記）", () => expect(formatMin(-90)).toBe("△1時間30分"));
});

describe("formatYen", () => {
  test("3桁", () => expect(formatYen(500)).toBe("500円"));
  test("4桁カンマ", () => expect(formatYen(1500)).toBe("1,500円"));
  test("ゼロ", () => expect(formatYen(0)).toBe("0円"));
  test("負の円（△表記）", () => expect(formatYen(-500)).toBe("△500円"));
  test("負の大きい値（△+カンマ）", () => expect(formatYen(-1500)).toBe("△1,500円"));
});
