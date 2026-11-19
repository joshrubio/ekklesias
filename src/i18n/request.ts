import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  isLocale,
  localeCookie,
  pickFromAcceptLanguage,
  type Locale,
} from "./config";

export default getRequestConfig(async () => {
  const stored = (await cookies()).get(localeCookie)?.value;
  const locale: Locale = isLocale(stored)
    ? stored
    : pickFromAcceptLanguage((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
