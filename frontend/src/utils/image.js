// Redimensionne et recompresse une photo côté navigateur avant l'envoi : limite le poids (le serveur refuse au-delà de 3 Mo).
export const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function resizeImage(file, maxSide = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED.includes(file.type)) return reject(new Error("format"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("format")); };
    img.src = url;
  });
}

/** Logo : redimensionné (400 px max) en PNG pour garder la transparence. */
export function resizeLogo(file, maxSide = 400) {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED.includes(file.type)) return reject(new Error("format"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("format")); };
    img.src = url;
  });
}
