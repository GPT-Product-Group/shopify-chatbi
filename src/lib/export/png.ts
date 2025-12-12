import html2canvas from "html2canvas";

export async function exportPngFromElement(
  elementId: string,
  fileName = "export.png",
) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("未找到要导出的元素");
  }

  const canvas = await html2canvas(element);
  const dataUrl = canvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}
