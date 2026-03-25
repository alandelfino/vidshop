declare var API_ORIGIN: string;

export function injectStyles() {
    if (document.getElementById("vidshop-embed-css")) return;
    var link = document.createElement("link");
    link.id = "vidshop-embed-css";
    link.rel = "stylesheet";
    link.href = API_ORIGIN + "/embed/vidshop.css";
    document.head.appendChild(link);
}