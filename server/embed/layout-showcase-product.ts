import { escAttr } from "./utils";

export function buildShowcaseProduct(el: any, data: any) {
    try {
        var videos = data.videos || [];
        if (!videos.length) return;

        var originalVideos = videos.slice();
        var extendedVideos = originalVideos.slice();
        while (extendedVideos.length < 15) {
            extendedVideos = extendedVideos.concat(originalVideos);
        }
        var finalVideos = extendedVideos.concat(extendedVideos, extendedVideos);

        var uid = "vshowcase-" + Math.floor(Math.random() * 1000000);
        el.classList.add("vidshop-showcase-carousel", uid);

        var headerHtml = '';
        if (data.carousel.title || data.carousel.subtitle) {
            headerHtml += '<div style="text-align: center; margin-bottom: 24px; padding: 0 16px; width: 100%;">';
            if (data.carousel.title) headerHtml += '<h2 style="margin: 0 0 8px 0; font-family: inherit; font-size: 28px; font-weight: 700; color: ' + escAttr(data.carousel.titleColor || '#000000') + ';">' + escAttr(data.carousel.title) + '</h2>';
            if (data.carousel.subtitle) headerHtml += '<p style="margin: 0; font-family: inherit; font-size: 16px; color: ' + escAttr(data.carousel.subtitleColor || '#666666') + ';">' + escAttr(data.carousel.subtitle) + '</p>';
            headerHtml += '</div>';
        }

        var html = headerHtml + '<div class="frc-showcase-root"><div class="frc-showcase-container">';
        
        var bw = data.carousel.cardBorderWidth ? data.carousel.cardBorderWidth + 'px' : '0px';
        var bc = data.carousel.cardBorderColor || '#000000';
        var br = data.carousel.cardBorderRadius != null ? data.carousel.cardBorderRadius + 'px' : '12px';
        var videoWrapperStyle = 'border-radius: ' + br + '; border: ' + bw + ' solid ' + escAttr(bc) + ';';

        finalVideos.forEach(function (v: any, idx: number) {
            html += '<div class="frc-showcase-slide" data-original-index="' + (idx % videos.length) + '">';
            html += '  <div class="frc-showcase-video-wrapper" style="' + videoWrapperStyle + '">';
            var loopAttr = data.carousel.previewTime === 0 ? '' : 'loop';
            html += '    <video muted playsinline ' + loopAttr + ' preload="metadata" draggable="false" poster="' + (v.thumbnailUrl ? escAttr(v.thumbnailUrl) : '') + '">';
            html += '      <source src="' + escAttr(v.mediaUrl) + '" type="video/mp4">';
            html += '    </video>';
            html += '    <div class="vidshop-controls">';
            html += '      <button class="vidshop-btn vidshop-mute-btn" aria-label="Mute/Unmute">';
            html += '        <svg class="icon-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            html += '        <svg class="icon-unmute" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            html += '      </button>';
            html += '      <button class="vidshop-btn vidshop-play-btn" aria-label="Play/Pause">';
            html += '        <svg class="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
            html += '        <svg class="icon-play" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            html += '      </button>';
            html += '    </div>';
            html += '  </div>';

            if (data.carousel.showProducts && v.productsList && v.productsList.length > 0) {
                var p = v.productsList[0]; 
                var priceHtml = p.price ? '<p class="frc-showcase-product-price">' + escAttr(p.price) + '</p>' : '';
                html += '  <div class="frc-showcase-product-card">';
                html += '    <div class="frc-showcase-product-img">' + (p.imageLink ? '<img src="' + escAttr(p.imageLink) + '" alt=""/>' : '<div style="background:#eee;width:40px;height:40px;border-radius:4px;"></div>') + '</div>';
                html += '    <div class="frc-showcase-product-info"><h3 class="frc-showcase-product-title">' + escAttr(p.title) + '</h3>' + priceHtml + '</div>';
                html += '    <a href="' + (p.link ? escAttr(p.link) : '#') + '" target="_blank" class="frc-showcase-product-btn">Ver</a>';
                html += '  </div>';
            } else html += '  <div class="frc-showcase-product-card" style="visibility:hidden"></div>';
            html += '</div>';
        });

        html += '</div></div>';
        el.innerHTML = html;

        initShowcaseLogic(el, data, extendedVideos.length);
    } catch (err) { console.error("[Vidshop] buildShowcaseProduct error:", err); }
}

function initShowcaseLogic(root: any, data: any, setLength: number) {
    if (root.dataset.vsShowcaseInitialized === "true") return;
    root.dataset.vsShowcaseInitialized = "true";

    var container = root.querySelector(".frc-showcase-container");
    var slides = Array.from(root.querySelectorAll(".frc-showcase-slide"));
    var videos = slides.map(function (s: any) { return s.querySelector("video"); });
    
    var current = setLength; 
    var isDragging = false;
    var mouseStart = 0;
    var startTranslate = 0;
    var isViewMode = false;
    var previewTime = (data.carousel.previewTime || 4) * 1000;
    var timer: any = null;
    var isManualPause = false;

    // Cache metrics
    var cachedFullWidth = 0;
    var cachedRootWidth = 0;

    function updateMetrics() {
        var first = slides[0] as HTMLElement;
        if (!first) return;
        var style = window.getComputedStyle(first);
        cachedFullWidth = first.offsetWidth + (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
        var showcaseRoot = root.querySelector('.frc-showcase-root');
        cachedRootWidth = showcaseRoot ? (showcaseRoot as HTMLElement).offsetWidth : root.offsetWidth;
    }

    function getTranslateForIndex(idx: number) {
        return -idx * cachedFullWidth + (cachedRootWidth / 2) - (cachedFullWidth / 2);
    }

    function updateClasses() {
        slides.forEach(function (slide: any, index: number) {
            var diff = index - current;
            slide.classList.remove("is-center", "is-left", "is-right", "is-left-2", "is-right-2", "is-hidden-left", "is-hidden-right", "is-playing");
            
            if (diff === 0) slide.classList.add("is-center", "is-playing");
            else if (diff === -1) slide.classList.add("is-left");
            else if (diff === 1) slide.classList.add("is-right");
            else if (diff === -2) slide.classList.add("is-left-2");
            else if (diff === 2) slide.classList.add("is-right-2");
            else if (diff < -2) slide.classList.add("is-hidden-left");
            else slide.classList.add("is-hidden-right");

            var video = videos[index];
            if (video) {
                if (index === current) {
                    if (!isManualPause && video.paused) {
                        try { video.play().catch(function(){}); } catch(e){}
                    }
                    if (isManualPause && !video.paused) {
                        try { video.pause(); } catch(e){}
                    }
                    video.muted = !isViewMode;
                    if (isViewMode) slide.classList.add("is-view-mode");
                    else slide.classList.remove("is-view-mode");
                } else {
                    if (!video.paused) try { video.pause(); } catch(e){}
                    video.muted = true;
                    slide.classList.remove("is-view-mode");
                }

                // Sync UI Icons for center video
                if (index === current) {
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
                }
            }
        });
    }

    function goTo(idx: number, noAnim?: boolean) {
        current = idx;
        if (noAnim) container.style.transition = 'none';
        else container.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        
        container.style.transform = "translateX(" + getTranslateForIndex(current) + "px)";
        updateClasses();
        if (noAnim) container.offsetHeight; 
    }

    function checkBounds() {
        if (current >= setLength * 2) goTo(current - setLength, true);
        else if (current < setLength) goTo(current + setLength, true);
    }

    container.addEventListener('transitionend', function() {
        if (!isDragging) checkBounds();
    });

    function next() {
        isViewMode = false;
        goTo(current + 1);
        resetTimer();
    }

    function resetTimer() {
        clearTimeout(timer);
        if (previewTime > 0 && !isViewMode && !isManualPause) {
            timer = setTimeout(next, previewTime);
        }
    }

    // Interaction
    function onStart(x: number) {
        isDragging = true;
        updateMetrics();
        mouseStart = x;
        startTranslate = getTranslateForIndex(current);
        container.style.transition = 'none';
        clearTimeout(timer);
    }

    function onMove(x: number) {
        if (!isDragging) return;
        var diff = x - mouseStart;
        var tx = startTranslate + diff;
        container.style.transform = "translateX(" + tx + "px)";
        var centerOffset = (cachedRootWidth / 2) - (cachedFullWidth / 2);
        var approxCurrent = Math.round((centerOffset - tx) / cachedFullWidth);
        if (approxCurrent !== current && approxCurrent >= 0 && approxCurrent < slides.length) {
            current = approxCurrent;
            updateClasses();
        }
        if (current >= setLength * 2) {
            current -= setLength;
            startTranslate -= setLength * cachedFullWidth;
            updateClasses();
        } else if (current < setLength) {
            current += setLength;
            startTranslate += setLength * cachedFullWidth;
            updateClasses();
        }
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        goTo(current); 
        resetTimer();
    }

    root.addEventListener('mousedown', function(e: any) { if(e.button === 0) onStart(e.screenX); });
    window.addEventListener('mousemove', function(e: any) { onMove(e.screenX); });
    window.addEventListener('mouseup', onEnd);
    root.addEventListener('touchstart', function(e: any) { onStart(e.touches[0].screenX); }, { passive: true });
    root.addEventListener('touchmove', function(e: any) { onMove(e.touches[0].screenX); }, { passive: true });
    root.addEventListener('touchend', onEnd);

    slides.forEach(function (slide: any, index: number) {
        slide.addEventListener("click", function (e: any) {
            if (e.target.closest('.frc-showcase-product-card') || e.target.closest('.vidshop-controls')) return;
            var video = videos[index];
            if (index === current) {
                isViewMode = !isViewMode;
                video.muted = !isViewMode;
                if (isViewMode) {
                    isManualPause = false;
                    clearTimeout(timer);
                } else resetTimer();
                updateClasses();
            } else {
                isViewMode = false;
                isManualPause = false;
                goTo(index);
                resetTimer();
            }
        });

        slide.querySelector('.vidshop-mute-btn')?.addEventListener('click', function (e: any) {
            e.stopPropagation();
            var video = videos[index];
            video.muted = !video.muted;
            isViewMode = !video.muted;
            if (isViewMode) clearTimeout(timer); else resetTimer();
            updateClasses();
        });

        slide.querySelector('.vidshop-play-btn')?.addEventListener('click', function (e: any) {
            e.stopPropagation();
            var video = videos[index];
            if (video.paused) {
                isManualPause = false;
                video.play().catch(function(){});
                resetTimer();
            } else {
                isManualPause = true;
                video.pause();
                clearTimeout(timer);
            }
            updateClasses();
        });
    });

    window.addEventListener('resize', function() { updateMetrics(); goTo(current, true); });
    updateMetrics();
    setTimeout(function() { goTo(current, true); }, 100);
    resetTimer();
}
