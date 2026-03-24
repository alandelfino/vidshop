declare function escAttr(s: any): string;

export const layout3DCard =
    function build3DCard(el: any, data: any) {
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
        var autoplayMs = (data.carousel.previewTime === 0) ? 0 : ((data.carousel.previewTime || 6) * 1000);
        el.setAttribute("data-autoplay", String(autoplayMs));

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

        var html = headerHtml + '<div class="frc-carousel">';
        var bw = data.carousel.cardBorderWidth ? data.carousel.cardBorderWidth + 'px' : '0px';
        var bc = data.carousel.cardBorderColor || '#000000';
        var br = data.carousel.cardBorderRadius != null ? data.carousel.cardBorderRadius + 'px' : '12px';
        var slideStyle = 'border-radius: ' + br + '; border: ' + bw + ' solid ' + escAttr(bc) + '; overflow: hidden;';
        
        videos.forEach(function (v: any) {
            html += '<div class="frc-slide" style="' + slideStyle + '">';
            var loopAttr = data.carousel.previewTime === 0 ? '' : 'loop';
            html += '<video muted playsinline ' + loopAttr + ' preload="metadata" poster="' + (v.thumbnailUrl ? escAttr(v.thumbnailUrl) : '') + '">';
            html += '<source src="' + escAttr(v.mediaUrl) + '" type="video/mp4">';
            html += '</video>';

            if (data.carousel.showProducts && v.productsList && v.productsList.length > 0) {
                v.productsList.forEach(function (p: any) {
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

    function init3DCardLogic(root: any) {
    if (root.dataset.frcInitialized === "true") return;
    root.dataset.frcInitialized = "true";

    var slides = Array.from(root.querySelectorAll(".frc-slide"));
    var videos = slides.map(function (slide: any) { return slide.querySelector("video"); });
    var autoplayRaw = Number(root.dataset.autoplay || 3);
    if (autoplayRaw === 0) autoplayRaw = 4;
    var autoplayDelay = autoplayRaw * 1000;

    // Product timeline logic
    videos.forEach(function (video: any, index: number) {
        var slide = slides[index] as any;
        var productCards = Array.from(slide.querySelectorAll(".frc-product-card"));
        if (!productCards.length) return;

        video.addEventListener("timeupdate", function () {
            var ct = video.currentTime;
            productCards.forEach(function (card: any) {
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
    var timer: any = null;
    var isVisible = false;
    var isPageVisible = !document.hidden;
    var lastCurrent = -1;
    var isManualPause = false;
    var isViewMode = false;

    var touchStartX = 0;
    var touchEndX = 0;

    function getOffset(index: number, active: number, total: number) {
        var offset = index - active;
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;
        return offset;
    }

    function applyClasses() {
        var total = slides.length;
        slides.forEach(function (slide: any, index: number) {
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
        videos.forEach(function (video: any) {
            try { video.pause(); } catch (e) { }
        });
    }

    function playCurrentVideo() {
        if (isManualPause) {
            pauseAllVideos();
            return;
        }
        videos.forEach(function (video: any, index: number) {
            if (index === current && isVisible && isPageVisible) {
                if (lastCurrent !== current) {
                    try { video.currentTime = 0; } catch (e) { }
                }
                if (!isViewMode) {
                    video.muted = true;
                } else {
                    video.muted = false;
                }

                // Sync UI Icons
                var slide = slides[index] as any;
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

                var playPromise = video.play();
                if (playPromise && typeof playPromise.catch === "function") {
                    playPromise.catch(function () { });
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
        if (timer || !isVisible || !isPageVisible || isManualPause || isViewMode) return;
        if (autoplayDelay > 0) {
            timer = window.setInterval(next, Math.max(autoplayDelay, 2000));
        }
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
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
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

    document.addEventListener("visibilitychange", function () {
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
    var isSwipingHorizontal: boolean | null = null;

    root.addEventListener('touchstart', function (e: any) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        isSwipingHorizontal = null;
        root.dataset.isDragging = "true";
    }, { passive: true });

    root.addEventListener('touchmove', function (e: any) {
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

    root.addEventListener('touchend', function (e: any) {
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
    root.addEventListener('mousedown', function (e: any) {
        isDragging = true;
        mouseStart = e.screenX;
    });

    root.addEventListener('mouseup', function (e: any) {
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
        setTimeout(function () { root.dataset.lastDragDist = '0'; }, 50);
    });

    root.addEventListener('mouseleave', function () {
        isDragging = false;
    });

    videos.forEach(function (video: any, index: number) {
        video.muted = true;

        video.addEventListener('click', function (e: any) {
            e.preventDefault();
            if (e.target.closest('.frc-product-card') || e.target.closest('.vidshop-controls')) return;

            if (index !== current) {
                current = index;
                update();
                return;
            }

            if (!isViewMode) {
                isViewMode = true;
                video.className = video.className.replace("is-preview", "") + " is-active";
                slides[index].classList.add("is-view-mode");
                stopTimer();
                video.muted = false;
                video.currentTime = 0;
                var p = video.play();
                if (p && p.catch) p.catch(function(){});
                isManualPause = false;
            } else {
                isViewMode = false;
                slides[index].classList.remove("is-view-mode");
                video.muted = true;
                startTimer();
            }
        });

        video.addEventListener('ended', function () {
            if (isViewMode) {
                if (!isManualPause) next();
            } else {
                video.currentTime = 0;
                var p = video.play();
                if (p && p.catch) p.catch(function(){});
            }
        });

        video.addEventListener('play', function () {
            var slide = slides[index] as any;
            var playBtn = slide.querySelector('.vidshop-play-btn');
            if (playBtn) {
                playBtn.querySelector('.icon-pause').style.display = 'block';
                playBtn.querySelector('.icon-play').style.display = 'none';
            }
        });
        video.addEventListener('pause', function () {
            var slide = slides[index] as any;
            var playBtn = slide.querySelector('.vidshop-play-btn');
            if (playBtn) {
                playBtn.querySelector('.icon-pause').style.display = 'none';
                playBtn.querySelector('.icon-play').style.display = 'block';
            }
        });
        video.addEventListener('volumechange', function () {
            var slide = slides[index] as any;
            var muteBtn = slide.querySelector('.vidshop-mute-btn');
            if (muteBtn) {
                muteBtn.querySelector('.icon-mute').style.display = video.muted ? 'block' : 'none';
                muteBtn.querySelector('.icon-unmute').style.display = video.muted ? 'none' : 'block';
            }
        });
    });

    slides.forEach(function (slide: any, index: number) {
        var controls = document.createElement('div');
        controls.className = 'vidshop-controls';
        controls.innerHTML = [
            '<button class="vidshop-btn vidshop-mute-btn" aria-label="Mute/Unmute">',
            '    <svg class="icon-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
            '    <svg class="icon-unmute" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
            '</button>',
            '<button class="vidshop-btn vidshop-play-btn" aria-label="Play/Pause">',
            '    <svg class="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
            '    <svg class="icon-play" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
            '</button>'
        ].join("");
        slide.appendChild(controls);

        var video = videos[index];
        var muteBtn = controls.querySelector('.vidshop-mute-btn') as any;
        var playBtn = controls.querySelector('.vidshop-play-btn') as any;

        muteBtn.addEventListener('click', function (e: any) {
            e.stopPropagation(); // prevent triggering the slide click
            var setMuted = !video.muted;
            videos.forEach(function (v: any) { v.muted = setMuted; });
        });

        playBtn.addEventListener('click', function (e: any) {
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

        slide.addEventListener("click", function (e: any) {
            if (Number(root.dataset.lastDragDist) > 40) return;
            if (e.target.closest('.vidshop-controls') || e.target.closest('.frc-product-card')) return;

            if (index === current) {
                // Clicking center slide in preview mode should activate View Mode
                if (!isViewMode) {
                    isViewMode = true;
                    stopTimer();
                    video.muted = false;
                    video.currentTime = 0;
                    video.play();
                    isManualPause = false;
                    slides[index].classList.add("is-view-mode");
                } else {
                    // Clicking in view mode toggles audio
                    isViewMode = false;
                    video.muted = true;
                    startTimer();
                    slides[index].classList.remove("is-view-mode");
                }
            } else {
                current = index;
                update();
                resetTimer();
            }
        });
    });

    update();
    }   // end init3DCardLogic
}   // end build3DCard

;