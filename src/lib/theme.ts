// Light or dark mode: shared settings for the switch in the header
// (src/components/ThemeToggle.tsx) and the page layout.
//
// The choice is a data-theme="light|dark" attribute on <html>; the colours for
// each live in src/app/globals.css. Before you pick, the app follows your
// device's setting. Once you flip the switch, your choice is remembered in
// this browser.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "studysprint:theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before the page is drawn, so it never flashes the wrong
 * colours: your saved choice, else your device's setting.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("${DARK_QUERY}").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
