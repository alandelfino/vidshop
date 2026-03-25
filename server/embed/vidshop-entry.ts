import { injectStyles } from "./styles";
import { build3DCard } from "./layout-3d-card";
import { buildSlider } from "./layout-slider";
import { buildStories } from "./layout-stories";
import { applyLayoutStyles } from "./utils";

declare var API_ORIGIN: string;

(function() {
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
    }
  }

  function checkConditions(conditions: any[]) {
    if (!conditions || conditions.length === 0) return true;
    const url = window.location.href;
    return conditions.every(c => {
      const val = (c.value || "").toLowerCase();
      const current = url.toLowerCase();
      if (c.operator === "equals") return current === val;
      if (c.operator === "not_equals") return current !== val;
      if (c.operator === "contains") return current.indexOf(val) !== -1;
      if (c.operator === "not_contains") return current.indexOf(val) === -1;
      return true;
    });
  }

  function autoInject(widgets: any[], type: "carousel" | "story") {
    widgets.forEach(w => {
      if (w.integrationMode !== "selector" || !w.selector) return;
      if (!checkConditions(w.conditions)) return;

      const target = document.querySelector(w.selector);
      if (!target) return;

      const idAttr = type === "carousel" ? "data-vidshop-carousel" : "data-vidshop-story";
      if (document.querySelector(`[${idAttr}="${w.id}"]`)) return; // Already injected

      const div = document.createElement("div");
      div.setAttribute(idAttr, w.id);

      const method = w.insertionMethod || "after";
      if (method === "before") target.parentNode?.insertBefore(div, target);
      else if (method === "after") target.parentNode?.insertBefore(div, target.nextSibling);
      else if (method === "prepend") target.insertBefore(div, target.firstChild);
      else if (method === "append") target.appendChild(div);
    });
  }

  function init() {
    injectStyles();

    fetch(API_ORIGIN + "/api/public/store-config")
      .then(r => r.json())
      .then(config => {
        if (config.carousels) autoInject(config.carousels, "carousel");
        if (config.stories) autoInject(config.stories, "story");

        // Initialize Carousels
        const elsCarousels = document.querySelectorAll("[data-vidshop-carousel], [data-onstore-carousel]");
        elsCarousels.forEach((elNode) => {
          const el = elNode as HTMLElement;
          const cid = el.getAttribute("data-vidshop-carousel") || el.getAttribute("data-onstore-carousel");
          if (!cid || el.dataset.vidshopLoaded) return;

          // Check conditions if it was a manual placement
          const configWidget = config.carousels?.find((c: any) => c.id == cid);
          if (configWidget && !checkConditions(configWidget.conditions)) {
            el.style.display = "none";
            return;
          }

          el.dataset.vidshopLoaded = "1";
          injectCarouselSkeleton(el);
          
          fetch(API_ORIGIN + "/api/public/carousels/" + cid)
            .then(r => r.json())
            .then(data => { 
              if (data.error) throw new Error(data.error);
              buildCarousel(el, data); 
            })
            .catch(e => { 
              el.innerHTML = "";
              console.warn("[Vidshop] Erro carrossel #" + cid, e); 
            });
        });

        // Initialize Stories
        const elsStories = document.querySelectorAll("[data-vidshop-story]");
        elsStories.forEach((elNode) => {
          const el = elNode as HTMLElement;
          const sid = el.getAttribute("data-vidshop-story");
          if (!sid || el.dataset.vidshopLoaded) return;

          // Check conditions
          const configWidget = config.stories?.find((s: any) => s.id == sid);
          if (configWidget && !checkConditions(configWidget.conditions)) {
            el.style.display = "none";
            return;
          }

          el.dataset.vidshopLoaded = "1";
          injectStoriesSkeleton(el);

          fetch(API_ORIGIN + "/api/public/stories/" + sid)
            .then(r => r.json())
            .then(data => { 
              if (data.error) throw new Error(data.error);
              el.innerHTML = "";
              el.classList.add("vidshop-fade-in");
              applyLayoutStyles(el, data);
              buildStories(el, data); 
            })
            .catch(e => { 
              el.innerHTML = "";
              console.warn("[Vidshop] Erro story #" + sid, e); 
            });
        });
      })
      .catch(e => console.error("[Vidshop] Config load error", e));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
