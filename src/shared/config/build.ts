export type FrontendBuildMeta = {
  scriptSrc: string;
};

export function getCurrentFrontendBuildMeta(): FrontendBuildMeta {
  if (typeof document === "undefined") {
    return { scriptSrc: "" };
  }

  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return {
    scriptSrc: script?.src || ""
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
    scriptSrc
  };
}
