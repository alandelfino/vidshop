declare var API_ORIGIN: string;

export function injectStyles() {
    if (document.getElementById("vidshop-embed-css")) return;

    var links = document.getElementsByTagName("link");
    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href") || "";
        if (href.indexOf("vidshop.css") !== -1) return;
    }

    var link = document.createElement("link");
    link.id = "vidshop-embed-css";
    link.rel = "stylesheet";
    link.href = API_ORIGIN + "/embed/vidshop.css";
    document.head.appendChild(link);
}