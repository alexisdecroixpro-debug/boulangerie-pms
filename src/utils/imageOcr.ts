import { extractStructuredLabel } from "../domain/localOcr";
import type { LabelOcrResult } from "../domain/ocr";

export async function analyzeLabelPhotos(
  files: File[],
  onProgress?: (progress: number, status: string) => void,
): Promise<LabelOcrResult> {
  const { createWorker, PSM } = await import("tesseract.js");
  let currentPhoto = 0;
  const worker = await createWorker(["fra", "eng"], 1, {
    logger: (message) => {
      if (message.status !== "recognizing text") return;
      const progress = (currentPhoto + message.progress) / files.length;
      onProgress?.(Math.round(progress * 100), `Lecture de la photo ${currentPhoto + 1}/${files.length}`);
    },
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });
    const texts: string[] = [];
    const confidences: number[] = [];
    for (currentPhoto = 0; currentPhoto < files.length; currentPhoto += 1) {
      const image = await prepareOcrImage(files[currentPhoto]);
      const recognition = await worker.recognize(image);
      texts.push(recognition.data.text);
      confidences.push(recognition.data.confidence);
    }
    const confidence = confidences.length
      ? confidences.reduce((total, value) => total + value, 0) / confidences.length
      : 0;
    onProgress?.(100, "Structuration des informations");
    return extractStructuredLabel(texts.join("\n"), confidence);
  } finally {
    await worker.terminate();
  }
}

async function prepareOcrImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 2200;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Préparation de l’image impossible.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const grey = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (grey - 128) * 1.35 + 128));
    image.data[index] = contrasted;
    image.data[index + 1] = contrasted;
    image.data[index + 2] = contrasted;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
