/** Triggers a client-side download of `content` as a file named `filename`. */
export function downloadFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    `data:${mimeType};charset=utf-8,` + encodeURIComponent(content)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
