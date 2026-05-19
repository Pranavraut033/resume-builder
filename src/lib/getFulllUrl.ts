import { headers } from "next/headers";

async function getFullUrl() {
  if (typeof window === "undefined") {
    const headersList = await headers();
    const fullUrl = headersList.get("referer") || "";

    return fullUrl;
  }
  return window.location.href;
}

export default getFullUrl;
