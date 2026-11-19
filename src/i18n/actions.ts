"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, localeCookie } from "./config";

export async function setLocale(value: string) {
  if (!isLocale(value)) return;
  (await cookies()).set(localeCookie, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
