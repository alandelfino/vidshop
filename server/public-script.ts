import { embedStyles } from "./embed/styles.js";
import { layout3DCard } from "./embed/layout-3d-card.js";
import { layoutSlider } from "./embed/layout-slider.js";
import { layoutStories } from "./embed/layout-stories.js";

export const publicScript = `
(function() {
  var API_ORIGIN = "__API_ORIGIN__";

  function escAttr(s) { return String(s).replace(/"/g,"&quot;"); }
  var __name = function(n, t) { return n; };

${embedStyles}

${layout3DCard}

${layoutSlider}

${layoutStories}

  function applyLayoutStyles(el, item) {
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
    if (item.maxWidth && item.maxWidth !== "100%" && (!item.marginLeft || item.marginLeft === "0px") && (!item.marginRight || item.marginRight === "0px")) {
      el.style.marginLeft = "auto";
      el.style.marginRight = "auto";
    }
  }

  function injectCarouselSkeleton(el) {
    el.innerHTML = '<div class="vidshop-skeleton-carousel">' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-card vidshop-shimmer"></div>' +
      '</div>';
  }

  function injectStoriesSkeleton(el) {
    var item = '<div class="vidshop-skeleton-item">' +
      '<div class="vidshop-skeleton-circle vidshop-shimmer"></div>' +
      '<div class="vidshop-skeleton-text vidshop-shimmer"></div>' +
      '</div>';
    el.innerHTML = '<div class="vidshop-skeleton-stories">' +
      item + item + item + item + item + item + item +
      '</div>';
  }

  function buildCarousel(el, data) {
    el.innerHTML = ""; // Clear skeleton
    el.classList.add("vidshop-fade-in");
    applyLayoutStyles(el, data.carousel);
    var layout = data.carousel.layout || "3d-card";
    if (layout === "3d-card") {
      build3DCard(el, data);
    } else if (layout === "slider") {
      buildSlider(el, data);
    } else {
      console.warn("[Vidshop] Modelo de carrossel não suportado:", layout);
    }
  }

  function init() {
    injectStyles();
    
    // Initialize Carousels
    var elsCarousels = document.querySelectorAll("[data-vidshop-carousel], [data-onstore-carousel]");
    elsCarousels.forEach(function(el) {
      var cid = el.getAttribute("data-vidshop-carousel") || el.getAttribute("data-onstore-carousel");
      if (!cid || el.dataset.vidshopLoaded) return;
      el.dataset.vidshopLoaded = "1";
      
      injectCarouselSkeleton(el);
      
      fetch(API_ORIGIN + "/api/public/carousels/" + cid)
        .then(function(r) { return r.json(); })
        .then(function(data) { 
          if (data.error) throw new Error(data.error);
          buildCarousel(el, data); 
        })
        .catch(function(e) { 
          el.innerHTML = ""; // Clear on error
          console.warn("[Vidshop] Erro carrossel #" + cid, e); 
        });
    });

    // Initialize Stories
    var elsStories = document.querySelectorAll("[data-vidshop-story]");
    elsStories.forEach(function(el) {
      var sid = el.getAttribute("data-vidshop-story");
      if (!sid || el.dataset.vidshopLoaded) return;
      el.dataset.vidshopLoaded = "1";

      injectStoriesSkeleton(el);

      fetch(API_ORIGIN + "/api/public/stories/" + sid)
        .then(function(r) { return r.json(); })
        .then(function(data) { 
          if (data.error) throw new Error(data.error);
          el.innerHTML = ""; // Clear skeleton
          el.classList.add("vidshop-fade-in");
          applyLayoutStyles(el, data);
          buildStories(el, data); 
        })
        .catch(function(e) { 
          el.innerHTML = ""; // Clear on error
          console.warn("[Vidshop] Erro story #" + sid, e); 
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`;