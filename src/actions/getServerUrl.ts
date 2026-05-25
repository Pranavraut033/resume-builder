"use server";
import { headers } from "next/headers";

async function getServerUrl() {
  const headersList = await headers();
  const fullUrl = headersList.get("referer");

  return fullUrl;
}

export default getServerUrl;
