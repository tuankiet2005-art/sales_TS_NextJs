import { createHash } from "node:crypto";

import PizZip from "pizzip";
import sharp from "sharp";

import { colorGridCellRects } from "@/lib/colorGridLayout";
import { formatQuoteAmount } from "@/lib/format";
import { translateQuoteLabel } from "@/lib/quoteLabels";
import type { Lang } from "@/i18n/translations";

import { normalizeLanguage, type QuoteSheetFillInput } from "./quote-sheet-fill";
import type { QuoteColorGridImage } from "./quote-color-photos";

export function buildDocxTokens(input: QuoteSheetFillInput) {
  const amounts = new Map<string, number>();
  for (const fee of input.fees) {
    amounts.set(fee.code, fee.includedInTotal ? fee.amount : 0);
  }

  const gifts = giftItems(input.gifts);
  const extras = input.accessoriesTotal || 0;
  const loanTermYears = input.bankLoan?.loanTermYears ?? 5;
  const monthlyInterestRate = input.bankLoan?.monthlyInterestRate ?? 0.65;
  const months = loanTermYears * 12;
  const loanAmount = Math.max(input.salePrice - input.deposit, 0);
  const annualRatePercent = monthlyInterestRate * 12;
  const monthlyRateDecimal = monthlyInterestRate / 100;
  const monthlyPrincipal = months > 0 ? loanAmount / months : 0;
  const monthlyInterest = loanAmount * monthlyRateDecimal;
  const monthlyPayment = calcMonthlyPayment(loanAmount, monthlyInterestRate, months);
  const optionalBody = amounts.get("OPTIONAL_BODY_INSURANCE") ?? 0;
  const vat = Math.round(input.salePrice * 0.1);
  const secondPayment = Math.max(input.estimatedOnRoadTotal - input.deposit, 0);

  return {
    customer_name: input.customerName?.trim() || "Khách hàng",
    address: input.customerAddress?.trim() || "",
    sales_rep_name: input.bankLoan?.consultingEmployeeName?.trim() || "",
    phone_number: input.bankLoan?.consultingEmployeePhone?.trim() || "",
    car_model: input.vehicleName,
    model_year: String(input.modelYear ?? ""),
    quote_date: formatDate(new Date()),
    list_price: formatQuoteAmount(input.listPrice),
    delivery_time: input.deliveryNote ?? "",
    car_color: input.color?.trim() || "",
    discount: formatQuoteAmount(input.discountAmount),
    selling_price: formatQuoteAmount(input.salePrice),
    registration_tax: formatQuoteAmount(amounts.get("REGISTRATION_TAX") ?? 0),
    gift_1: gifts[0] ?? "",
    gift_2: gifts[1] ?? "",
    license_plate_fee: formatQuoteAmount(amounts.get("LICENSE_PLATE") ?? 0),
    inspection_fee: formatQuoteAmount(amounts.get("INSPECTION") ?? 0),
    civil_liability_insurance: formatQuoteAmount(amounts.get("COMPULSORY_INSURANCE") ?? 0),
    road_usage_fee: formatQuoteAmount(amounts.get("ROAD_USE") ?? 0),
    registration_service_fee: formatQuoteAmount(
      amounts.get("REGISTRATION_SERVICE") ?? amounts.get("REGISTRATION_FEE") ?? 0,
    ),
    total_registration_cost: formatQuoteAmount(input.totalMandatoryFees + input.totalOptionalFees),
    total_on_road_price: formatQuoteAmount(input.estimatedOnRoadTotal),
    total_additional_cost: formatQuoteAmount(extras),
    deposit: formatQuoteAmount(input.deposit),
    car_price: formatQuoteAmount(input.salePrice),
    additional_cost: formatQuoteAmount(extras),
    loan_amount: formatQuoteAmount(loanAmount),
    vat: formatQuoteAmount(vat),
    comprehensive_insurance: optionalBody ? formatQuoteAmount(optionalBody) : "",
    second_payment: formatQuoteAmount(secondPayment),
    loan_term_years: `${loanTermYears} Năm`,
    loan_term_months: String(months),
    estimated_monthly_interest: formatQuoteAmount(Math.round(monthlyInterest)),
    annual_interest_rate: `${annualRatePercent.toFixed(2)}%`,
    monthly_interest_rate: `${monthlyInterestRate.toFixed(2)}%`,
    monthly_principal: formatQuoteAmount(Math.round(monthlyPrincipal)),
    monthly_payment: formatQuoteAmount(Math.round(monthlyPayment)),
  };
}

export async function fillQuoteDocument(
  templateBuffer: Buffer,
  input: QuoteSheetFillInput,
  colorGridImages?: QuoteColorGridImage[],
): Promise<Buffer> {
  const zip = new PizZip(templateBuffer);
  const docPath = "word/document.xml";
  let xml = zip.file(docPath)?.asText();
  if (!xml) {
    throw new Error("Quote Word template is missing document.xml");
  }

  const tokens = buildDocxTokens(input);
  xml = replaceDocxPlaceholders(xml, tokens, "{{", "}}");

  if (colorGridImages?.length) {
    xml = await embedColorGridImage(xml, zip, colorGridImages);
  }

  zip.file(docPath, xml);
  let output = zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
  const language = normalizeLanguage(input.language);
  if (language !== "vi") {
    output = translateDocxBuffer(output, language);
  }
  return output;
}

function replaceDocxPlaceholders(
  xml: string,
  tokens: Record<string, string | number>,
  open: string,
  close: string,
) {
  const pattern = new RegExp(`${escapeRegExp(open)}([\\s\\S]*?)${escapeRegExp(close)}`, "g");
  return xml.replace(pattern, (match, inner) => {
    const key = inner.replace(/<[^>]+>/g, "").trim();
    if (!(key in tokens)) {
      return match;
    }
    const value = tokens[key];
    return escapeXml(String(value ?? ""));
  });
}

async function embedColorGridImage(xml: string, zip: PizZip, images: QuoteColorGridImage[]) {
  const composite = await buildColorGridComposite(images);
  if (!composite) {
    return xml;
  }

  const fileName = `colors-${createHash("sha1").update(composite).digest("hex").slice(0, 10)}.png`;
  zip.file(`word/media/${fileName}`, composite);

  const relsPath = "word/_rels/document.xml.rels";
  const rels = zip.file(relsPath)?.asText() ?? "";
  const nextId = nextRelationshipId(rels);
  const relTag = `<Relationship Id="${nextId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`;
  zip.file(relsPath, rels.replace("</Relationships>", `${relTag}</Relationships>`));

  const contentTypesPath = "[Content_Types].xml";
  const contentTypes = zip.file(contentTypesPath)?.asText() ?? "";
  if (!contentTypes.includes("image/png")) {
    zip.file(
      contentTypesPath,
      contentTypes.replace(
        "</Types>",
        '<Default Extension="png" ContentType="image/png"/></Types>',
      ),
    );
  }

  const rowElements = [...xml.matchAll(/<w:tr[\s>][\s\S]*?<\/w:tr>/g)].map((match) => match[0]);
  let targetRow = -1;
  for (let rowIndex = 0; rowIndex < rowElements.length; rowIndex += 1) {
    const firstTc = rowElements[rowIndex].match(/<w:tc[\s>][\s\S]*?<\/w:tc>/)?.[0];
    if (!firstTc) {
      continue;
    }
    const isCarSlot =
      firstTc.includes('w:vMerge w:val="restart"') &&
      !cellXmlText(firstTc) &&
      Number(firstTc.match(/<w:gridSpan w:val="(\d+)"/)?.[1] ?? 1) >= 2;
    if (isCarSlot) {
      targetRow = rowIndex;
      break;
    }
  }

  const width = 280 * EMU_PER_PX;
  const height = 220 * EMU_PER_PX;
  const header =
    '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="20" w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>CÁC MÀU XE</w:t></w:r></w:p>';
  const drawing = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:docPr id="99" name="Color grid"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="Color grid"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${nextId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;

  if (targetRow >= 0) {
    const rowXml = rowElements[targetRow];
    const updatedRow = rowXml.replace(/<w:tc[\s>][\s\S]*?<\/w:tc>/, (match) => {
      if (!match.includes('w:vMerge w:val="restart"')) {
        return match;
      }
      if (match.includes("<w:drawing")) {
        return match;
      }
      return match.replace("</w:tc>", `${header}${drawing}</w:tc>`);
    });
    return xml.replace(rowXml, updatedRow);
  }

  return xml;
}

async function buildColorGridComposite(images: QuoteColorGridImage[]) {
  const count = Math.min(images.length, 5);
  if (count <= 0) {
    return null;
  }

  const canvasWidth = 500;
  const canvasHeight = 300;
  const padding = count === 1 ? 12 : 8;
  const rects = colorGridCellRects(count, canvasWidth, canvasHeight, padding);
  const layers: sharp.OverlayOptions[] = [];

  for (let index = 0; index < count; index += 1) {
    const item = images[index];
    const rect = rects[index];
    if (!item || !rect) {
      continue;
    }
    const resized = await sharp(item.buffer)
      .resize(rect.width, rect.height, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();
    const metadata = await sharp(resized).metadata();
    const imageWidth = metadata.width ?? rect.width;
    const imageHeight = metadata.height ?? rect.height;
    layers.push({
      input: resized,
      left: rect.left + Math.round((rect.width - imageWidth) / 2),
      top: rect.top + Math.round((rect.height - imageHeight) / 2),
    });
  }

  if (!layers.length) {
    return null;
  }

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

const EMU_PER_PX = 9525;

function cellXmlText(tcXml: string) {
  return [...tcXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((match) => match[1])
    .join("")
    .trim();
}

function nextRelationshipId(rels: string) {
  const ids = [...rels.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
  const next = ids.length ? Math.max(...ids) + 1 : 1;
  return `rId${next}`;
}

function translateDocxBuffer(buffer: Buffer, language: Lang): Buffer {
  const zip = new PizZip(buffer);
  const docPath = "word/document.xml";
  const xml = zip.file(docPath)?.asText();
  if (!xml) {
    return buffer;
  }
  const translated = xml.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (match, attrs, text) => {
    const next = translateQuoteLabel(text, language);
    return next === text ? match : `<w:t${attrs}>${escapeXml(next)}</w:t>`;
  });
  zip.file(docPath, translated);
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

function giftItems(gifts?: string | null) {
  return (gifts ?? "")
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function calcMonthlyPayment(principal: number, monthlyRatePercent: number, months: number) {
  if (months <= 0) {
    return 0;
  }
  const rate = monthlyRatePercent / 100;
  if (rate === 0) {
    return principal / months;
  }
  const factor = Math.pow(1 + rate, months);
  return (principal * rate * factor) / (factor - 1);
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
