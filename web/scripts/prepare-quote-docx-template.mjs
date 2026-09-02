import fs from "node:fs";
import path from "node:path";

const source = "d:/Download/bang_bao_gia_template.docx";
const target = "src/server/assets/quote-report/bang-bao-gia.docx";

fs.copyFileSync(source, path.resolve(target));
console.log("saved", target, fs.statSync(target).size);
