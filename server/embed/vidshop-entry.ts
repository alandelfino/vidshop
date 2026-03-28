import { injectStyles } from "./styles";
import { build3DCard } from "./layout-3d-card";
import { buildSlider } from "./layout-slider";
import { buildStories } from "./layout-stories";
import { buildShowcaseProduct } from "./layout-showcase-product";
import { applyLayoutStyles } from "./utils";
import "./vidshop.css";

declare var API_ORIGIN: string;

(function () {
  function injectCarouselSkeleton(el: HTMLElement) {
    el.innerHTML = '<div class="vidshop-skeleton-carousel">' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '</div>';
  }

  function injectStoriesSkeleton(el: HTMLElement) {
    const item = '<div class="vidshop-skeleton-item">' +
      '<div class="vidshop-skeleton-circle vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-text vidshop-shimmer"></div>' +
      '</div>';
    el.innerHTML = '<div class="vidshop-skeleton-stories">' +
      item + item + item + item + item + item + item +
      '</div>';
  }

  function buildCarousel(el: HTMLElement, data: any) {
    el.innerHTML = "";
    el.classList.add("vidshop-fade-in");
    applyLayoutStyles(el, data.carousel);
    const layout = data.carousel.layout || "3d-card";
    if (layout === "3d-card") {
      build3DCard(el, data);
    } else if (layout === "slider") {
      buildSlider(el, data);
    } else if (layout === "showcase-product") {
      buildShowcaseProduct(el, data);
    }
  }

  function getValueByPath(obj: any, path: string) {
    if (!path || !obj) return obj;
    // Normalize path: ignore leading 'window.', 'dataLayer.' or 'window.dataLayer.' with/without spaces
    const cleanPath = path.replace(/^(window\.)?(dataLayer|datalayer)\s*\.?\s*/i, "").trim();
    if (!cleanPath) return obj;

    // Convert [0].type -> 0.type
    const parts = cleanPath.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.').filter(p => p !== "");

    return parts.reduce((acc, part) => {
      if (!acc) return undefined;

      // If result is an array and part is a number string
      if (Array.isArray(acc) && /^\d+$/.test(part)) {
        return acc[parseInt(part)];
      }

      // Case-insensitive property lookup
      if (typeof acc === 'object') {
        const keys = Object.keys(acc);
        const insensitiveKey = keys.find(k => k.toLowerCase() === part.toLowerCase());
        return insensitiveKey ? acc[insensitiveKey] : undefined;
      }

      return undefined;
    }, obj);
  }

  function checkConditions(conditions: any[]) {
    if (!conditions || conditions.length === 0) {
      return true;
    }
    const url = window.location.href;
    return conditions.every(c => {
      const val = (c.value || "").trim().toLowerCase();

      if (c.data === "dataLayer") {
        const dl = (window as any).dataLayer;
        if (!dl) {
          console.warn("[VidShop] dataLayer not defined on window");
          return false;
        }

        const checkMatch = (target: any, expected: string) => {
          const actualValue = String(target === undefined || target === null ? "" : target).trim().toLowerCase();
          let matched = false;
          if (c.operator === "equals") matched = actualValue === expected;
          else if (c.operator === "not_equals") matched = actualValue !== expected;
          else if (c.operator === "contains") matched = actualValue.indexOf(expected) !== -1;
          else if (c.operator === "not_contains") matched = actualValue.indexOf(expected) === -1;

          if (!matched) {
            console.log(`[VidShop] Condição dataLayer FALHOU: esperado "${expected}", recebido "${actualValue}" (${c.operator})`);
          } else {
            console.log(`[VidShop] Condição dataLayer OK: "${actualValue}" ${c.operator} "${expected}"`);
          }
          return matched;
        };

        if (c.key) {
          const foundValue = getValueByPath(dl, c.key);
          return checkMatch(foundValue, val);
        }

        // Fallback: search in all objects
        const [key, expectedValue] = val.split("=").map((s: any) => s.trim());
        const searchInObj = (obj: any) => {
          if (typeof obj !== 'object' || obj === null) return false;

          const keys = Object.keys(obj);
          const actualKey = keys.find(k => k.toLowerCase() === key.toLowerCase());
          if (!actualKey) return false;

          const actualValue = String(obj[actualKey] || "").toLowerCase();
          if (!expectedValue) return true; // key exists
          return checkMatch(actualValue, expectedValue);
        };

        if (Array.isArray(dl)) {
          return dl.some(searchInObj);
        } else {
          return searchInObj(dl);
        }
      }

      const current = url.toLowerCase();
      const matched = (() => {
        if (c.operator === "equals") return current === val;
        if (c.operator === "not_equals") return current !== val;
        if (c.operator === "contains") return current.indexOf(val) !== -1;
        if (c.operator === "not_contains") return current.indexOf(val) === -1;
        return true;
      })();
      if (!matched) {
        console.log(`[VidShop] Condição URL FALHOU: "${current}" ${c.operator} "${val}"`);
      }
      return matched;
    });
  }

  function autoInject(widgets: any[], type: "carousel" | "story"): number {
    let count = 0;
    widgets.forEach(w => {
      if (w.integrationMode !== "selector" || !w.selector) return;
      if (!checkConditions(w.conditions)) return;

      const target = document.querySelector(w.selector);
      if (!target) {
        return;
      }

      const idAttr = type === "carousel" ? "data-vidshop-carousel" : "data-vidshop-story";
      if (document.querySelector(`[${idAttr}="${w.id}"]`)) {
        count++;
        return;
      }

      const div = document.createElement("div");
      div.setAttribute(idAttr, w.id);

      const method = w.insertionMethod || "after";
      if (method === "before") target.parentNode?.insertBefore(div, target);
      else if (method === "after") target.parentNode?.insertBefore(div, target.nextSibling);
      else if (method === "prepend") target.insertBefore(div, target.firstChild);
      else if (method === "append") target.appendChild(div);
      console.info(`[VidShop] Injetado ${type} #${w.id} no seletor ${w.selector}`);
      count++;
    });
    return count;
  }

  // Ensure dataLayer exists to avoid "undefined" errors
  if (typeof window !== 'undefined') {
    (window as any).dataLayer = (window as any).dataLayer || [];
  }

  function processWidgets(config: any) {
    if (!config) return;

    // 1. Auto Injection
    autoInject(config.carousels || [], "carousel");
    autoInject(config.stories || [], "story");

    // 2. Manual Elements
    const elsCarousels = document.querySelectorAll("[data-vidshop-carousel], [data-onstore-carousel]");
    elsCarousels.forEach((elNode) => {
      const el = elNode as HTMLElement;
      if (el.dataset.vidshopLoaded) return;
      const cid = el.getAttribute("data-vidshop-carousel") || el.getAttribute("data-onstore-carousel");
      const configWidget = (config.carousels || []).find((c: any) => c.id == cid);
      if (configWidget && !checkConditions(configWidget.conditions)) return;

      el.dataset.vidshopLoaded = "1";
      injectCarouselSkeleton(el);
      fetch(`${API_ORIGIN}/api/public/carousels/${cid}`).then(r => r.json()).then(data => {
        if (data.error) throw new Error(data.error);
        buildCarousel(el, data);
      }).catch(e => console.warn(`[Vidshop] Error carousel #${cid}`, e));
    });

    const elsStories = document.querySelectorAll("[data-vidshop-story]");
    elsStories.forEach((elNode) => {
      const el = elNode as HTMLElement;
      if (el.dataset.vidshopLoaded) return;
      const sid = el.getAttribute("data-vidshop-story");
      const configWidget = (config.stories || []).find((s: any) => s.id == sid);
      if (configWidget && !checkConditions(configWidget.conditions)) return;

      el.dataset.vidshopLoaded = "1";
      injectStoriesSkeleton(el);
      fetch(`${API_ORIGIN}/api/public/stories/${sid}`).then(r => r.json()).then(data => {
        if (data.error) throw new Error(data.error);
        el.innerHTML = "";
        el.classList.add("vidshop-fade-in");
        applyLayoutStyles(el, data);
        buildStories(el, data);
      }).catch(e => console.warn(`[Vidshop] Error story #${sid}`, e));
    });
  }

  function init() {
    console.log("[VidShop] Script de integração carregado.");
    injectStyles();

    const scriptTag = document.currentScript as HTMLScriptElement;
    const forceStoreId = scriptTag?.getAttribute("data-store-id");
    const queryParams = forceStoreId ? `?storeId=${forceStoreId}` : "";

    fetch(`${API_ORIGIN}/api/public/store-config${queryParams}`)
      .then(r => r.json())
      .then(config => {
        if (config.error) {
          console.error("[VidShop] Erro de configuração:", config.error);
          return;
        }

        console.log(`[VidShop] Configuração carregada: ${config.carousels?.length || 0} carrosséis, ${config.stories?.length || 0} stories.`);

        let attempts = 0;
        const maxAttempts = 15;

        const tryProcessing = () => {
          attempts++;
          processWidgets(config);

          if (attempts < maxAttempts) {
            setTimeout(tryProcessing, 1000);
          }
        };

        tryProcessing();
      })
      .catch(e => console.error("[VidShop] Falha ao carregar configuração", e));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
