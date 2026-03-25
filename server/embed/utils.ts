export function escAttr(s: any): string {
    return String(s).replace(/"/g, "&quot;");
}

export function applyLayoutStyles(el: HTMLElement, item: any) {
    if (!item) return;
    if (item.maxWidth) el.style.maxWidth = item.maxWidth;
    if (item.marginTop) el.style.marginTop = item.marginTop;
    if (item.marginRight) el.style.marginRight = item.marginRight;
    if (item.marginBottom) el.style.marginBottom = item.marginBottom;
    if (item.marginLeft) el.style.marginLeft = item.marginLeft;
    if (item.paddingTop) el.style.paddingTop = item.paddingTop;
    if (item.paddingRight) el.style.paddingRight = item.paddingRight;
    if (item.paddingBottom) el.style.paddingBottom = item.paddingBottom;
    if (item.paddingLeft) el.style.paddingLeft = item.paddingLeft;
    
    if (item.maxWidth && item.maxWidth !== "100%" && 
        (!item.marginLeft || item.marginLeft === "0px") && 
        (!item.marginRight || item.marginRight === "0px")) {
        el.style.marginLeft = "auto";
        el.style.marginRight = "auto";
    }
}
