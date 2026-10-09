import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const excelRequire = createRequire(require.resolve("exceljs/package.json"));
const bracedV4 = /\{[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\}/g;

type ZipArchive = {
  file(path: string): { async(format: "string"): Promise<string> } | null;
};
const zipLoader = excelRequire("jszip") as {
  loadAsync(input: ExcelJS.Buffer): Promise<ZipArchive>;
};

describe("ExcelJS server security patch compatibility", () => {
  it("uses the applied Node crypto patch with no resolvable legacy UUID dependency", () => {
    const source = readFileSync(
      excelRequire.resolve("./lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js"),
      "utf8"
    );
    expect(source).toContain("require('node:crypto')");
    expect(source).not.toContain("require('uuid')");
    expect(() => excelRequire.resolve("uuid")).toThrow();
  });

  it("keeps the patched dependency behind the Node export boundary", () => {
    const exportRoute = readFileSync("src/app/api/employees/export/route.ts", "utf8");
    expect(exportRoute).toMatch(/export const runtime = ["']nodejs["']/);
    const visit = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
          const source = readFileSync(path, "utf8");
          expect(source, path).not.toMatch(/["']exceljs\/dist\//);
          if (/["']exceljs["']/.test(source)) {
            expect(path.replaceAll("\\", "/")).toBe("src/app/api/employees/export/route.ts");
          }
        }
      }
    };
    visit("src");
  });
  it("round-trips extended conditional formatting with distinct braced UUID-v4 identifiers", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Extensions");
    worksheet.addRows([[1], [2], [3]]);
    for (const ref of ["A1:A3", "B1:B3"]) {
      worksheet.addConditionalFormatting({
        ref,
        rules: [{
          type: "iconSet", priority: 1, iconSet: "3Stars",
          cfvo: [{ type: "percent", value: 0 }, { type: "percent", value: 33 }, { type: "percent", value: 67 }],
        }],
      });
    }
    const bytes = await workbook.xlsx.writeBuffer();
    const zip = await zipLoader.loadAsync(bytes);
    const sheet = zip.file("xl/worksheets/sheet1.xml");
    expect(sheet).not.toBeNull();
    const xml = await sheet!.async("string");
    const identifiers = [...xml.matchAll(/<x14:cfRule\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]);
    expect(identifiers).toHaveLength(2);
    expect(new Set(identifiers).size).toBe(2);
    for (const id of identifiers) expect(id.match(bracedV4)).toEqual([id]);
    const restored = new ExcelJS.Workbook();
    await restored.xlsx.load(bytes);
    expect(restored.getWorksheet("Extensions")?.getCell("A2").value).toBe(2);
    expect(restored.getWorksheet("Extensions")?.conditionalFormattings).toHaveLength(2);
  });
});