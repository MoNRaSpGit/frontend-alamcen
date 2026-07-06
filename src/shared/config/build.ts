export type FrontendBuildMeta = {
  bundleId: string;
};

function extractBundleId(rawValue: string) {
  const normalizedValue = String(rawValue || "").trim();
  if (!normalizedValue) {
    return "";
  }

  const match = normalizedValue.match(/index-([A-Za-z0-9_-]+)\.js/i);
  return match ? match[1] : "";
}

export function getCurrentFrontendBuildMeta(): FrontendBuildMeta {
  if (typeof document === "undefined") {
    return { bundleId: "" };
  }

  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return {
    bundleId: extractBundleId(script?.src || "")
  };
}

export async function fetchPublishedFrontendBuildMeta() {
  const response = await fetch(`${import.meta.env.BASE_URL}index.html?ts=${Date.now()}`, {
    cache: "no-store",
    headers: {
      Accept: "text/html"
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar metadata del frontend");
  }

  const html = await response.text();
  const scriptSrc = html.match(/<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/i)?.[1] || "";

  return {
    bundleId: extractBundleId(scriptSrc)
  };
}
