export const publicScript = `
(function() {
  var API_ORIGIN = "__API_ORIGIN__";

  function injectStyles() {
    if (document.getElementById("vidshop-frc-styles")) return;
    var style = document.createElement("style");
    style.id = "vidshop-frc-styles";
    style.textContent = " \\
        .fashion-reels-carousel { width: 100%; overflow: hidden; display: flex; flex-direction: column; align-items: center; padding: 60px 0; padding-top: 0px; contain: layout paint style; background-color: transparent; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } \\
        .fashion-reels-carousel * { box-sizing: border-box; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } \\
        .fashion-reels-carousel .frc-carousel { position: relative; width: 100%; max-width: 1200px; height: 500px; display: flex; align-items: center; justify-content: center; isolation: isolate; perspective: 1200px; } \\
        .fashion-reels-carousel .frc-slide { position: absolute; width: auto; height: 100%; aspect-ratio: 9 / 16; border-radius: 24px; overflow: hidden; opacity: 0; transform: translateX(0) scale(.8) rotateY(0deg); transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease, box-shadow 0.6s ease; will-change: transform, opacity; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: #fff; pointer-events: none; box-shadow: 0 10px 30px rgba(0,0,0,0.1); } \\
        .fashion-reels-carousel .frc-slide video { width: 100%; height: 100%; object-fit: cover; display: block; background: #fff; transition: filter 0.6s ease; filter: brightness(0.6); } \\
        .fashion-reels-carousel .frc-slide.is-center { transform: translateX(0) scale(1) rotateY(0deg); opacity: 1; z-index: 5; pointer-events: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); } \\
        .fashion-reels-carousel .frc-slide.is-center video { filter: brightness(1); } \\
        .fashion-reels-carousel .frc-slide.is-left-1 { transform: translateX(-85%) scale(.85) rotateY(12deg); opacity: .8; z-index: 4; } \\
        .fashion-reels-carousel .frc-slide.is-right-1 { transform: translateX(85%) scale(.85) rotateY(-12deg); opacity: .8; z-index: 4; } \\
        .fashion-reels-carousel .frc-slide.is-left-2 { transform: translateX(-160%) scale(.7) rotateY(20deg); opacity: .4; z-index: 3; } \\
        .fashion-reels-carousel .frc-slide.is-right-2 { transform: translateX(160%) scale(.7) rotateY(-20deg); opacity: .4; z-index: 3; } \\
        .fashion-reels-carousel .frc-slide.is-hidden-left { transform: translateX(-220%) scale(.6) rotateY(25deg); opacity: 0; z-index: 1; } \\
        .fashion-reels-carousel .frc-slide.is-hidden-right { transform: translateX(220%) scale(.6) rotateY(-25deg); opacity: 0; z-index: 1; } \\
        @media (max-width: 900px) { .fashion-reels-carousel .frc-carousel { height: 450px; } } \\
        @media (max-width: 600px) { \\
            .fashion-reels-carousel { padding: 50px 0; } \\
            .fashion-reels-carousel .frc-carousel { height: calc(76vw * 16 / 9); max-height: 85vh; min-height: 380px; perspective: 800px; } \\
            .fashion-reels-carousel .frc-slide { width: 76%; max-width: calc(85vh * 9 / 16); height: auto; aspect-ratio: 9 / 16; border-radius: 18px; } \\
            .fashion-reels-carousel .frc-slide.is-left-1 { transform: translateX(-65%) scale(.85) rotateY(20deg); opacity: 0.9; } \\
            .fashion-reels-carousel .frc-slide.is-right-1 { transform: translateX(65%) scale(.85) rotateY(-20deg); opacity: 0.9; } \\
            .fashion-reels-carousel .frc-slide.is-left-2 { transform: translateX(-110%) scale(.7) rotateY(30deg); opacity: 0.5; } \\
            .fashion-reels-carousel .frc-slide.is-right-2 { transform: translateX(110%) scale(.7) rotateY(-30deg); opacity: 0.5; } \\
            .fashion-reels-carousel .frc-slide.is-hidden-left { transform: translateX(-160%) scale(.6) rotateY(35deg); opacity: 0; } \\
            .fashion-reels-carousel .frc-slide.is-hidden-right { transform: translateX(160%) scale(.6) rotateY(-35deg); opacity: 0; } \\
        } \\
        @media (prefers-reduced-motion: reduce) { .fashion-reels-carousel .frc-slide { transition: none; } } \\
        .fashion-reels-carousel .frc-controls { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 8px; opacity: 0; transition: opacity 0.3s ease; z-index: 10; pointer-events: none; } \\
        .fashion-reels-carousel .frc-slide.is-center .frc-controls { opacity: 1; pointer-events: auto; } \\
        .fashion-reels-carousel .frc-btn { background: transparent; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: background 0.2s, transform 0.2s; } \\
        .fashion-reels-carousel .frc-btn:active { transform: scale(0.9); } \\
        .fashion-reels-carousel .frc-btn:hover { background: rgba(0, 0, 0, 0.7); } \\
        .fashion-reels-carousel .frc-btn svg { width: 20px; height: 20px; } \\
        .vidshop-slider-carousel { width: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 0; font-family: inherit; -webkit-user-select: none; user-select: none; } \\
        .vidshop-slider-track { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 16px 20px; width: 100%; max-width: 1200px; scrollbar-width: none; -webkit-overflow-scrolling: touch; } \\
        .vidshop-slider-track::-webkit-scrollbar { display: none; } \\
        .vidshop-slider-slide { position: relative; flex: 0 0 calc(25% - 12px); max-width: 300px; min-width: 200px; aspect-ratio: 9/16; border-radius: 16px; overflow: hidden; scroll-snap-align: start; background: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.1); isolation: isolate; cursor: pointer; } \\
        @media (max-width: 900px) { .vidshop-slider-slide { flex: 0 0 calc(40% - 13px); } } \\
        @media (max-width: 600px) { .vidshop-slider-slide { flex: 0 0 70%; min-width: 180px; } } \\
        .vidshop-slider-slide video { width: 100%; height: 100%; object-fit: cover; display: block; } \\
        .vidshop-slider-play-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); z-index: 10; pointer-events: none; opacity: 1; transition: opacity 0.3s; } \\
        .vidshop-slider-slide.is-playing .vidshop-slider-play-overlay { opacity: 0; } \\
        .vidshop-slider-play-overlay svg { width: 48px; height: 48px; fill: white; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); } \\
        .fashion-reels-carousel .frc-product-card, .vidshop-slider-slide .frc-product-card { position: absolute; bottom: 20px; left: 16px; right: 16px; border-radius: 12px; padding: 10px; display: flex; align-items: center; gap: 12px; color: #fff; z-index: 20; opacity: 0; pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease; transform: translateY(10px); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 4px 12px rgb(0 0 0 / 5%); background: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6)); } \\
        .fashion-reels-carousel .frc-product-card.is-active, .vidshop-slider-slide .frc-product-card.is-active { opacity: 1; pointer-events: auto; transform: translateY(0); } \\
        .fashion-reels-carousel .frc-product-img, .vidshop-slider-slide .frc-product-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; background: #fff; flex-shrink: 0; } \\
        .fashion-reels-carousel .frc-product-info, .vidshop-slider-slide .frc-product-info { flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: center; } \\
        .fashion-reels-carousel .frc-product-title, .vidshop-slider-slide .frc-product-title { margin: 0 0 2px 0; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; font-family: sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.5); } \\
        .fashion-reels-carousel .frc-product-price, .vidshop-slider-slide .frc-product-price { margin: 0; font-size: 14px; font-weight: 700; color: #fff; font-family: sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.5); } \\
        .fashion-reels-carousel .frc-product-btn, .vidshop-slider-slide .frc-product-btn { width: auto; height: auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; transition: transform 0.2s; color: #fff; padding: 3px; } \\
        .fashion-reels-carousel .frc-product-btn:hover, .vidshop-slider-slide .frc-product-btn:hover { transform: scale(1.05); } \\
        .fashion-reels-carousel .frc-product-btn svg, .vidshop-slider-slide .frc-product-btn svg { width: 16px; height: 16px; stroke-width: 2.5; } \\
    ";
    document.head.appendChild(style);
  }

  function buildCarousel(el, data) {
    var layout = data.carousel.layout || "3d-card";
    if (layout === "3d-card") {
      build3DCard(el, data);
    } else if (layout === "slider") {
      buildSlider(el, data);
    } else {
      console.warn("[Vidshop] Modelo de carrossel não suportado:", layout);
    }
  }

  function build3DCard(el, data) {
    var originalVideos = data.videos || [];
    if (!originalVideos.length) return;

    // Pad videos array if less than 6
    var videos = [];
    if (originalVideos.length < 6 && originalVideos.length > 0) {
      var i = 0;
      while (videos.length < 6) {
        videos.push(originalVideos[i % originalVideos.length]);
        i++;
      }
    } else {
      videos = originalVideos;
    }

    el.classList.add("fashion-reels-carousel");
    el.setAttribute("data-autoplay", "6000");

    var headerHtml = '';
    if (data.carousel.title || data.carousel.subtitle) {
        headerHtml += '<div style="text-align: center; margin-bottom: 24px; padding: 0 16px; width: 100%; max-width: 1200px;">';
        if (data.carousel.title) {
            headerHtml += '<h2 style="margin: 0 0 8px 0; font-family: inherit; font-size: 28px; font-weight: 700; color: ' + escAttr(data.carousel.titleColor || '#000000') + ';">' + escAttr(data.carousel.title) + '</h2>';
        }
        if (data.carousel.subtitle) {
            headerHtml += '<p style="margin: 0; font-family: inherit; font-size: 16px; color: ' + escAttr(data.carousel.subtitleColor || '#666666') + ';">' + escAttr(data.carousel.subtitle) + '</p>';
        }
        headerHtml += '</div>';
    }

    var html = headerHtml + '<div class="frc-carousel">';
    videos.forEach(function(v) {
      html += '<div class="frc-slide">';
      html += '<video muted playsinline loop preload="none" poster="' + (v.thumbnailUrl ? escAttr(v.thumbnailUrl) : '') + '">';
      html += '<source src="' + escAttr(v.mediaUrl) + '" type="video/mp4">';
      html += '</video>';
      
      if (data.carousel.showProducts && v.productsList && v.productsList.length > 0) {
        v.productsList.forEach(function(p) {
            var priceHtml = p.price ? '<p class="frc-product-price">' + escAttr(p.price) + '</p>' : '';
            var imgHtml = p.imageLink ? '<img class="frc-product-img" src="' + escAttr(p.imageLink) + '" alt=""/>' : '<div class="frc-product-img" style="background: #333;"></div>';
            var cartIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
            var link = p.link ? escAttr(p.link) : '#';
            html += '<div class="frc-product-card" data-start="' + p.startTime + '" data-end="' + p.endTime + '">' +
                imgHtml +
                '<div class="frc-product-info">' +
                    '<h3 class="frc-product-title">' + escAttr(p.title) + '</h3>' +
                    priceHtml +
                '</div>' +
                '<a href="' + link + '" target="_blank" class="frc-product-btn" aria-label="Comprar">' + cartIcon + '</a>' +
            '</div>';
        });
      }

      html += '</div>';
    });
    html += '</div>';

    el.innerHTML = html;
    init3DCardLogic(el);
  }

  function buildSlider(el, data) {
    var videos = data.videos || [];
    if (!videos.length) return;

    el.classList.add("vidshop-slider-carousel");

    var headerHtml = '';
    if (data.carousel.title || data.carousel.subtitle) {
        headerHtml += '<div style="text-align: center; margin-bottom: 24px; padding: 0 16px; width: 100%; max-width: 1200px;">';
        if (data.carousel.title) {
            headerHtml += '<h2 style="margin: 0 0 8px 0; font-family: inherit; font-size: 28px; font-weight: 700; color: ' + escAttr(data.carousel.titleColor || '#000000') + ';">' + escAttr(data.carousel.title) + '</h2>';
        }
        if (data.carousel.subtitle) {
            headerHtml += '<p style="margin: 0; font-family: inherit; font-size: 16px; color: ' + escAttr(data.carousel.subtitleColor || '#666666') + ';">' + escAttr(data.carousel.subtitle) + '</p>';
        }
        headerHtml += '</div>';
    }

    var playIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

    var html = headerHtml + '<div class="vidshop-slider-track">';
    videos.forEach(function(v) {
      html += '<div class="vidshop-slider-slide">';
      html += '<video loop playsinline preload="metadata" poster="' + (v.thumbnailUrl ? escAttr(v.thumbnailUrl) : '') + '">';
      html += '<source src="' + escAttr(v.mediaUrl) + '" type="video/mp4">';
      html += '</video>';
      html += '<div class="vidshop-slider-play-overlay">' + playIcon + '</div>';
      
      if (data.carousel.showProducts && v.productsList && v.productsList.length > 0) {
        v.productsList.forEach(function(p) {
            var priceHtml = p.price ? '<p class="frc-product-price">' + escAttr(p.price) + '</p>' : '';
            var imgHtml = p.imageLink ? '<img class="frc-product-img" src="' + escAttr(p.imageLink) + '" alt=""/>' : '<div class="frc-product-img" style="background: #333;"></div>';
            var cartIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
            var link = p.link ? escAttr(p.link) : '#';
            html += '<div class="frc-product-card" data-start="' + p.startTime + '" data-end="' + p.endTime + '">' +
                imgHtml +
                '<div class="frc-product-info">' +
                    '<h3 class="frc-product-title">' + escAttr(p.title) + '</h3>' +
                    priceHtml +
                '</div>' +
                '<a href="' + link + '" target="_blank" class="frc-product-btn" aria-label="Comprar">' + cartIcon + '</a>' +
            '</div>';
        });
      }

      html += '</div>';
    });
    html += '</div>';

    el.innerHTML = html;
    initSliderLogic(el);
  }

  function initSliderLogic(root) {
      if (root.dataset.vsSliderInitialized === "true") return;
      root.dataset.vsSliderInitialized = "true";

      var slides = Array.from(root.querySelectorAll(".vidshop-slider-slide"));
      var videos = slides.map(function(s) { return s.querySelector("video"); });
      
      videos.forEach(function(video, index) {
          var slide = slides[index];
          var productCards = Array.from(slide.querySelectorAll(".frc-product-card"));
          
          if (productCards.length > 0) {
              video.addEventListener("timeupdate", function() {
                  var ct = video.currentTime;
                  productCards.forEach(function(card) {
                      var start = Number(card.dataset.start);
                      var end = Number(card.dataset.end);
                      if (ct >= start && ct <= end) {
                          if (!card.classList.contains("is-active")) card.classList.add("is-active");
                      } else {
                          if (card.classList.contains("is-active")) card.classList.remove("is-active");
                      }
                  });
              });
          }

          slide.addEventListener("click", function(e) {
              if (e.target.closest('.frc-product-card')) return;
              
              if (video.paused) {
                  videos.forEach(function(v) { if (v !== video) v.pause(); });
                  slides.forEach(function(s) { if (s !== slide) s.classList.remove("is-playing"); });
                  
                  video.muted = false;
                  var p = video.play();
                  if (p && p.catch) p.catch(function(){});
                  slide.classList.add("is-playing");
              } else {
                  video.pause();
                  slide.classList.remove("is-playing");
              }
          });
          
          video.addEventListener("ended", function() {
             video.currentTime = 0;
             var p = video.play();
             if (p && p.catch) p.catch(function(){});
             slide.classList.add("is-playing");
          });
      });
  }

  function escAttr(s) { return String(s).replace(/"/g,"&quot;"); }

  function init3DCardLogic(root) {
      if (root.dataset.frcInitialized === "true") return;
      root.dataset.frcInitialized = "true";

      var slides = Array.from(root.querySelectorAll(".frc-slide"));
      var videos = slides.map(function(slide) { return slide.querySelector("video"); });
      var autoplayDelay = Number(root.dataset.autoplay || 6000);

      // Product timeline logic
      videos.forEach(function(video, index) {
          var slide = slides[index];
          var productCards = Array.from(slide.querySelectorAll(".frc-product-card"));
          if (!productCards.length) return;
          
          video.addEventListener("timeupdate", function() {
              var ct = video.currentTime;
              productCards.forEach(function(card) {
                  var start = Number(card.dataset.start);
                  var end = Number(card.dataset.end);
                  if (ct >= start && ct <= end) {
                      if (!card.classList.contains("is-active")) card.classList.add("is-active");
                  } else {
                      if (card.classList.contains("is-active")) card.classList.remove("is-active");
                  }
              });
          });
      });

      var current = Math.floor(slides.length / 2);
      var timer = null;
      var isVisible = false;
      var isPageVisible = !document.hidden;
      var lastCurrent = -1;
      var isManualPause = false;
      
      var touchStartX = 0;
      var touchEndX = 0;

      function getOffset(index, active, total) {
          var offset = index - active;
          if (offset > total / 2) offset -= total;
          if (offset < -total / 2) offset += total;
          return offset;
      }

      function applyClasses() {
          var total = slides.length;
          slides.forEach(function(slide, index) {
              slide.className = "frc-slide";
              var offset = getOffset(index, current, total);
              if (offset === 0) slide.classList.add("is-center");
              else if (offset === -1) slide.classList.add("is-left-1");
              else if (offset === 1) slide.classList.add("is-right-1");
              else if (offset === -2) slide.classList.add("is-left-2");
              else if (offset === 2) slide.classList.add("is-right-2");
              else if (offset < 0) slide.classList.add("is-hidden-left");
              else slide.classList.add("is-hidden-right");
          });
      }

      function pauseAllVideos() {
          videos.forEach(function(video) {
              try { video.pause(); } catch (e) { }
          });
      }

      function playCurrentVideo() {
          if (isManualPause) {
              pauseAllVideos();
              return;
          }
          videos.forEach(function(video, index) {
              if (index === current && isVisible && isPageVisible) {
                  if (lastCurrent !== current) {
                      try { video.currentTime = 0; } catch (e) { }
                  }
                  var playPromise = video.play();
                  if (playPromise && typeof playPromise.catch === "function") {
                      playPromise.catch(function() { });
                  }
              } else {
                  try { video.pause(); } catch (e) { }
              }
          });
          lastCurrent = current;
      }

      function update() {
          isManualPause = false; // Reset pauser override on slide change
          applyClasses();
          playCurrentVideo();
      }

      function next() {
          current = (current + 1) % slides.length;
          update();
      }
      
      function prev() {
          current = (current - 1 + slides.length) % slides.length;
          update();
      }

      function startTimer() {
          if (timer || !isVisible || !isPageVisible || isManualPause) return;
          timer = window.setInterval(next, autoplayDelay);
      }

      function stopTimer() {
          if (!timer) return;
          window.clearInterval(timer);
          timer = null;
      }
      
      function resetTimer() {
          stopTimer();
          startTimer();
      }

      if (window.IntersectionObserver) {
          var observer = new IntersectionObserver(function(entries) {
              entries.forEach(function(entry) {
                  isVisible = entry.isIntersecting && entry.intersectionRatio > 0.2;
                  if (isVisible) {
                      if (!isManualPause) {
                          update();
                          startTimer();
                      }
                  } else {
                      stopTimer();
                      pauseAllVideos();
                  }
              });
          }, { threshold: [0, 0.2, 0.6] });
          observer.observe(root);
      } else {
          isVisible = true; // Fallback
      }

      document.addEventListener("visibilitychange", function() {
          isPageVisible = !document.hidden;
          if (isPageVisible && isVisible) {
              if (!isManualPause) {
                  playCurrentVideo();
                  startTimer();
              }
          } else {
              stopTimer();
              pauseAllVideos();
          }
      });

      var touchStartY = 0;
      var isSwipingHorizontal = null;

      root.addEventListener('touchstart', function(e) {
          touchStartX = e.changedTouches[0].screenX;
          touchStartY = e.changedTouches[0].screenY;
          isSwipingHorizontal = null;
          root.dataset.isDragging = "true";
      }, { passive: true });

      root.addEventListener('touchmove', function(e) {
          if (!root.dataset.isDragging) return;
          var touchCurrentX = e.changedTouches[0].screenX;
          var touchCurrentY = e.changedTouches[0].screenY;
          var dx = Math.abs(touchCurrentX - touchStartX);
          var dy = Math.abs(touchCurrentY - touchStartY);
          if (isSwipingHorizontal === null) {
              if (dx > dy && dx > 5) isSwipingHorizontal = true;
              else if (dy > dx && dy > 5) isSwipingHorizontal = false;
          }
          if (isSwipingHorizontal) {
              if (e.cancelable) e.preventDefault();
          }
      }, { passive: false });

      root.addEventListener('touchend', function(e) {
          root.dataset.isDragging = "";
          if (isSwipingHorizontal === false) return;
          
          touchEndX = e.changedTouches[0].screenX;
          var swipeThreshold = 40;
          if (touchEndX < touchStartX - swipeThreshold) {
              next();
              resetTimer();
          } else if (touchEndX > touchStartX + swipeThreshold) {
              prev();
              resetTimer();
          }
      }, { passive: true });

      var isDragging = false;
      var mouseStart = 0;
      root.addEventListener('mousedown', function(e) {
          isDragging = true;
          mouseStart = e.screenX;
      });
      
      root.addEventListener('mouseup', function(e) {
          if (!isDragging) return;
          isDragging = false;
          var touchEnd = e.screenX;
          var swipeThreshold = 40;
          if (touchEnd < mouseStart - swipeThreshold) {
              next();
              resetTimer();
          } else if (touchEnd > mouseStart + swipeThreshold) {
              prev();
              resetTimer();
          }
          root.dataset.lastDragDist = Math.abs(touchEnd - mouseStart);
          setTimeout(function() { root.dataset.lastDragDist = '0'; }, 50);
      });
      
      root.addEventListener('mouseleave', function() {
          isDragging = false;
      });

      videos.forEach(function(video, index) {
          video.muted = true;
          video.addEventListener('play', function() {
              var slide = slides[index];
              var playBtn = slide.querySelector('.frc-play-btn');
              if (playBtn) {
                  playBtn.querySelector('.icon-pause').style.display = 'block';
                  playBtn.querySelector('.icon-play').style.display = 'none';
              }
          });
          video.addEventListener('pause', function() {
              var slide = slides[index];
              var playBtn = slide.querySelector('.frc-play-btn');
              if (playBtn) {
                  playBtn.querySelector('.icon-pause').style.display = 'none';
                  playBtn.querySelector('.icon-play').style.display = 'block';
              }
          });
          video.addEventListener('volumechange', function() {
              var slide = slides[index];
              var muteBtn = slide.querySelector('.frc-mute-btn');
              if (muteBtn) {
                  muteBtn.querySelector('.icon-mute').style.display = video.muted ? 'block' : 'none';
                  muteBtn.querySelector('.icon-unmute').style.display = video.muted ? 'none' : 'block';
              }
          });
      });

      slides.forEach(function(slide, index) {
          var controls = document.createElement('div');
          controls.className = 'frc-controls';
          controls.innerHTML = [
            '<button class="frc-btn frc-mute-btn" aria-label="Mute/Unmute">',
            '    <svg class="icon-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
            '    <svg class="icon-unmute" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
            '</button>',
            '<button class="frc-btn frc-play-btn" aria-label="Play/Pause">',
            '    <svg class="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
            '    <svg class="icon-play" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
            '</button>'
          ].join("");
          slide.appendChild(controls);

          var video = videos[index];
          var muteBtn = controls.querySelector('.frc-mute-btn');
          var playBtn = controls.querySelector('.frc-play-btn');

          muteBtn.addEventListener('click', function(e) {
              e.stopPropagation(); // prevent triggering the slide click
              var setMuted = !video.muted;
              videos.forEach(function(v) { v.muted = setMuted; });
          });

          playBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              if (video.paused) {
                  isManualPause = false;
                  video.play();
                  startTimer();
              } else {
                  isManualPause = true;
                  video.pause();
                  stopTimer();
              }
          });
          
          slide.addEventListener("click", function(e) {
              if (Number(root.dataset.lastDragDist) > 40) return;
              if (index === current) {
                  // Toggle audio if center slide clicked
                  var setMuted = !video.muted;
                  videos.forEach(function(v) { v.muted = setMuted; });
              } else {
                  current = index;
                  update();
                  resetTimer();
              }
          });
      });

      update();
  }

  function init() {
    injectStyles();
    var els = document.querySelectorAll("[data-vidshop-carousel], [data-onstore-carousel]");
    els.forEach(function(el) {
      var cid = el.getAttribute("data-vidshop-carousel") || el.getAttribute("data-onstore-carousel");
      if (!cid || el.dataset.vidshopLoaded) return;
      el.dataset.vidshopLoaded = "1";
      fetch(API_ORIGIN + "/api/public/carousels/" + cid)
        .then(function(r) { return r.json(); })
        .then(function(data) { buildCarousel(el, data); })
        .catch(function(e) { console.warn("[Vidshop] Erro carrossel #" + cid, e); });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`