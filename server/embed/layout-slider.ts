declare function escAttr(s: any): string;

export const layoutSlider = 
  function buildSlider(el: any, data: any) {
    var videos = data.videos || [];
    if (!videos.length) return;

    if (videos.length < 6) {
        var original = videos.slice();
        while (videos.length < 6) {
            videos = videos.concat(original);
        }
    }

    var previewTime = data.carousel.previewTime ?? 4;
    var previewMs = previewTime === 0 ? 0 : previewTime * 1000;

    var uid = "vslider-" + Math.floor(Math.random() * 1000000);
    el.classList.add("vidshop-slider-carousel", uid);
    el.setAttribute("data-preview-time", String(previewMs));

    var headerHtml = '';
    if (data.carousel.title || data.carousel.subtitle) {
        headerHtml += '<div style="text-align: center; margin-bottom: 24px; padding: 0 16px; width: 100%;">';
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
    var bw = data.carousel.cardBorderWidth ? data.carousel.cardBorderWidth + 'px' : '0px';
    var bc = data.carousel.cardBorderColor || '#000000';
    var br = data.carousel.cardBorderRadius != null ? data.carousel.cardBorderRadius + 'px' : '12px';
    var slideStyle = 'border-radius: ' + br + '; border: ' + bw + ' solid ' + escAttr(bc) + '; overflow: hidden;';

    videos.forEach(function(v: any) {
      html += '<div class="vidshop-slider-slide" style="' + slideStyle + '">';
      var loopAttr = previewTime === 0 ? '' : 'loop';
      html += '<video ' + loopAttr + ' playsinline preload="metadata" poster="' + (v.thumbnailUrl ? escAttr(v.thumbnailUrl) : '') + '">';
      html += '<source src="' + escAttr(v.mediaUrl) + '" type="video/mp4">';
      html += '</video>';
      
      // Control buttons (unified)
      html += '<div class="vidshop-controls">';
      html += '  <button class="vidshop-btn vidshop-mute-btn" aria-label="Mute/Unmute">';
      html += '    <svg class="icon-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
      html += '    <svg class="icon-unmute" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
      html += '  </button>';
      html += '  <button class="vidshop-btn vidshop-play-btn" aria-label="Play/Pause">';
      html += '    <svg class="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      html += '    <svg class="icon-play" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      html += '  </button>';
      html += '</div>';

      html += '<div class="vidshop-slider-play-overlay">' + playIcon + '</div>';
      
      if (data.carousel.showProducts && v.productsList && v.productsList.length > 0) {
        v.productsList.forEach(function(p: any) {
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

    function initSliderLogic(root: any) {
      if (root.dataset.vsSliderInitialized === "true") return;
      root.dataset.vsSliderInitialized = "true";

      var slides = Array.from(root.querySelectorAll(".vidshop-slider-slide"));
      var videos = slides.map(function(s: any) { return s.querySelector("video"); });
      var track = root.querySelector(".vidshop-slider-track");
      var previewTime = Number(root.dataset.previewTime || 3000);
      
      var isManualPause = false;
      var isViewMode = false;
      var currentPreview = -1;
      var previewTimer: any = null;
      var observer: any = null;
      var isVisible = false;

      function updateSlider() {
          videos.forEach(function (video: any, index: number) {
              var slide = slides[index] as any;
              if (index === currentPreview) {
                  slide.classList.add("is-playing");
                  if (isViewMode) {
                      slide.classList.add("is-view-mode");
                      video.muted = false;
                  } else {
                      slide.classList.remove("is-view-mode");
                      video.muted = true;
                  }

                  // Sync UI Icons
                  var muteBtn = slide.querySelector('.vidshop-mute-btn');
                  if (muteBtn) {
                      muteBtn.querySelector('.icon-mute').style.display = video.muted ? 'block' : 'none';
                      muteBtn.querySelector('.icon-unmute').style.display = video.muted ? 'none' : 'block';
                  }
                  var playBtn = slide.querySelector('.vidshop-play-btn');
                  if (playBtn) {
                      playBtn.querySelector('.icon-pause').style.display = !video.paused ? 'block' : 'none';
                      playBtn.querySelector('.icon-play').style.display = !video.paused ? 'none' : 'block';
                  }
                  
                  if (video.paused && isVisible && !isManualPause) {
                      var p = video.play();
                      if (p && p.catch) p.catch(function () { });
                  }
              } else {
                  video.pause();
                  slide.classList.remove("is-playing", "is-view-mode");
              }
          });
      }

      function playPreview(index: number) {
          if (isManualPause) return;
          currentPreview = index;
          if (!isViewMode) {
              videos[index].currentTime = 0;
          }
          updateSlider();
          
          clearTimeout(previewTimer);
          if (previewTime > 0 && !isViewMode) {
              previewTimer = setTimeout(function() {
                  if (!isViewMode && !isManualPause) advanceToNext(index);
              }, previewTime);
          }
      }

      function advanceToNext(fromIndex: number) {
          if (isManualPause) return;
          var nextIndex = (fromIndex + 1) % videos.length;
          var nextSlide = slides[nextIndex] as any;
          
          var maxScroll = track.scrollWidth - track.clientWidth;
          var targetScroll = nextSlide.offsetLeft - track.offsetLeft;
          
          if (nextIndex === 0) {
              track.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
              var boundedScroll = Math.min(targetScroll, maxScroll);
              track.scrollTo({ left: boundedScroll, behavior: 'smooth' });
          }
          
          setTimeout(function() { 
              if (isViewMode) {
                   currentPreview = nextIndex;
                   videos[nextIndex].currentTime = 0;
                   updateSlider();
              } else {
                   playPreview(nextIndex); 
              }
          }, 400); 
      }

      if (window.IntersectionObserver) {
          observer = new IntersectionObserver(function(entries) {
              entries.forEach(function(entry) {
                  if (entry.isIntersecting) {
                      isVisible = true;
                      if (!isManualPause && currentPreview === -1) {
                          playPreview(0); // start auto-play cycle
                      } else {
                          updateSlider();
                      }
                  } else {
                      isVisible = false;
                      clearTimeout(previewTimer);
                      videos.forEach(function(v: any) { v.pause(); });
                  }
              });
          }, { threshold: 0.3 });
          observer.observe(root);
      } else {
          isVisible = true;
          setTimeout(function() { playPreview(0); }, 500);
      }

      videos.forEach(function(video: any, index: number) {
          var slide = slides[index] as any;
          var productCards = Array.from(slide.querySelectorAll(".frc-product-card"));
          
          video.addEventListener("ended", function() {
              if (index === currentPreview && !isManualPause) {
                  advanceToNext(index);
              }
          });

          video.addEventListener('play', function () {
              var playBtn = slide.querySelector('.vidshop-play-btn');
              if (playBtn) {
                  playBtn.querySelector('.icon-pause').style.display = 'block';
                  playBtn.querySelector('.icon-play').style.display = 'none';
              }
          });
          video.addEventListener('pause', function () {
              var playBtn = slide.querySelector('.vidshop-play-btn');
              if (playBtn) {
                  playBtn.querySelector('.icon-pause').style.display = 'none';
                  playBtn.querySelector('.icon-play').style.display = 'block';
              }
          });
          video.addEventListener('volumechange', function () {
              var muteBtn = slide.querySelector('.vidshop-mute-btn');
              if (muteBtn) {
                  muteBtn.querySelector('.icon-mute').style.display = video.muted ? 'block' : 'none';
                  muteBtn.querySelector('.icon-unmute').style.display = video.muted ? 'none' : 'block';
              }
          });

          var muteBtn = slide.querySelector('.vidshop-mute-btn');
          var playBtn = slide.querySelector('.vidshop-play-btn');

          muteBtn?.addEventListener('click', function(e: any) {
              e.stopPropagation();
              video.muted = !video.muted;
          });

          playBtn?.addEventListener('click', function(e: any) {
              e.stopPropagation();
              if (video.paused) {
                  isManualPause = false;
                  video.play();
              } else {
                  isManualPause = true;
                  video.pause();
                  clearTimeout(previewTimer);
              }
          });

          if (productCards.length > 0) {
              video.addEventListener("timeupdate", function() {
                  var ct = video.currentTime;
                  productCards.forEach(function(card: any) {
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

          slide.addEventListener("click", function(e: any) {
              if (e.target.closest('.frc-product-card') || e.target.closest('.vidshop-controls')) return;
              
              if (!isViewMode) {
                  isViewMode = true;
                  currentPreview = index;
                  isManualPause = false;
                  clearTimeout(previewTimer);
                  video.currentTime = 0;
                  updateSlider();
              } else {
                  if (index === currentPreview) {
                      isViewMode = false;
                      isManualPause = false;
                      playPreview(index);
                  } else {
                      currentPreview = index;
                      isManualPause = false;
                      video.currentTime = 0;
                      updateSlider();
                  }
              }
          });
      });
  }   // end initSliderLogic
}   // end buildSlider

;