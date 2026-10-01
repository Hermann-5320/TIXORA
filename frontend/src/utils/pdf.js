import QRCode from "qrcode";
import { assetUrl } from "../api/http";
import { readableOn, rgbOf, shade } from "./color";

/** Charge le logo en PNG (jsPDF ne lit pas WebP) ; renvoie null si indisponible : le billet est alors généré sans logo. */
async function loadLogo(path) {
  const url = assetUrl(path);
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob);
    const ratio = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * ratio);
    c.height = Math.round(bmp.height * ratio);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return { data: c.toDataURL("image/png"), w: c.width, h: c.height };
  } catch {
    return null;
  }
}

/** Génère le billet PDF aux couleurs de l'organisateur (gabarit, couleur, logo, message). Chargé à la demande. */
export async function downloadTicketPdf(ticket, labels, fmt) {
  const { jsPDF } = await import("jspdf");
  const d = ticket.design || {};
  const color = d.color || "#f24e12";
  const template = d.template || "CLASSIC";
  const [qr, logo] = await Promise.all([QRCode.toDataURL(ticket.code, { margin: 1, width: 400, errorCorrectionLevel: "M" }), loadLogo(d.logo)]);

  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  const fill = (hex) => doc.setFillColor(...rgbOf(hex));
  const ink = (hex) => doc.setTextColor(...rgbOf(hex));
  const place = [ticket.venue, ticket.city].filter(Boolean).join(", ");
  const drawLogo = (x, y, maxH, maxW = 40) => {
    if (!logo) return 0;
    const k = Math.min(maxH / logo.h, maxW / logo.w);
    doc.addImage(logo.data, "PNG", x, y, logo.w * k, logo.h * k);
    return logo.w * k;
  };

  const festival = template === "FESTIVAL";
  if (festival) {
    for (let i = 0; i < 40; i++) { fill(shade(color, 0.1 - (i / 40) * 0.6)); doc.rect(0, (h / 40) * i, w, h / 40 + 0.5, "F"); }
  }
  const text = festival ? "#ffffff" : "#0f172a";
  const muted = festival ? "#e2e8f0" : "#5b6478";

  // En-tête
  if (template === "CLASSIC") { fill(color); doc.rect(0, 0, w, 30, "F"); ink(readableOn(color)); }
  else if (template === "MODERN") { fill(color); doc.rect(0, 0, 14, h, "F"); fill(shade(color, -0.35)); doc.rect(0, 0, 14, 30, "F"); ink(text); }
  else if (template === "MINIMAL") { fill(color); doc.rect(0, 0, w, 3, "F"); ink(text); }
  else ink(text);

  const left = template === "MODERN" ? 22 : 12;
  const logoW = drawLogo(left, 6, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(template === "CLASSIC" ? 13 : 11);
  if (template === "CLASSIC") ink(readableOn(color));
  doc.text(ticket.organizerName || "Tixora", left + (logoW ? logoW + 4 : 0), 17);

  let y = template === "CLASSIC" ? 44 : 40;
  ink(text);
  doc.setFontSize(festival ? 22 : 17);
  const title = doc.splitTextToSize(festival ? ticket.eventTitle.toUpperCase() : ticket.eventTitle, w - left - 12);
  doc.text(title, left, y);
  y += title.length * (festival ? 9 : 7) + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  ink(muted);
  doc.text(fmt.date(ticket.startsAt), left, y); y += 6;
  doc.text(doc.splitTextToSize(place, w - left - 12), left, y); y += 10;
  ink(text);
  doc.setFont("helvetica", "bold");
  doc.text(`${ticket.categoryName}  ·  ${fmt.price(ticket.price)}`, left, y); y += 8;
  if (d.message) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    ink(muted);
    const lines = doc.splitTextToSize(d.message, w - left - 12);
    doc.text(lines, left, y); y += lines.length * 5 + 2;
  }

  // QR code sur fond blanc
  const qrSize = 62, qx = (w + (template === "MODERN" ? 14 : 0) - qrSize) / 2, qy = Math.max(y + 4, 100);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qx - 4, qy - 4, qrSize + 8, qrSize + 8, 3, 3, "F");
  doc.addImage(qr, "PNG", qx, qy, qrSize, qrSize);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  ink(festival ? "#ffffff" : "#64748b");
  doc.text(`${labels.code} : ${ticket.code.slice(0, 8).toUpperCase()}  ·  ${labels.title}`, (w + (template === "MODERN" ? 14 : 0)) / 2, qy + qrSize + 10, { align: "center" });
  doc.save(`tixora-${ticket.code.slice(0, 8)}.pdf`);
}
