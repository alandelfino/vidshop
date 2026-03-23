export const embedStyles =
    function injectStyles() {
        if (document.getElementById("vidshop-frc-styles")) return;
        var style = document.createElement("style");
        style.id = "vidshop-frc-styles";
        style.textContent =
            ".fashion-reels-carousel { box-sizing: border-box; width: 100%; overflow: hidden; display: flex; flex-direction: column; align-items: center; padding: 60px 0; padding-top: 0px; contain: layout paint style; background-color: transparent; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } " +
            ".fashion-reels-carousel * { box-sizing: border-box; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; } " +
            ".fashion-reels-carousel .frc-carousel { position: relative; width: 100%; height: 500px; display: flex; align-items: center; justify-content: center; isolation: isolate; perspective: 1200px; } " +
            ".fashion-reels-carousel .frc-slide { position: absolute; width: auto; height: 100%; aspect-ratio: 9 / 16; border-radius: 24px; overflow: hidden; opacity: 0; transform: translateX(0) scale(.8) rotateY(0deg); transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s ease, box-shadow 0.6s ease; will-change: transform, opacity; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: #fff; pointer-events: none; box-shadow: 0 10px 30px rgba(0,0,0,0.1); } " +
            ".fashion-reels-carousel .frc-slide video { width: 100%; height: 100%; object-fit: cover; display: block; background: #fff; transition: filter 0.6s ease; filter: brightness(0.6); } " +
            ".fashion-reels-carousel .frc-slide.is-center { transform: translateX(0) scale(1) rotateY(0deg); opacity: 1; z-index: 5; pointer-events: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); } " +
            ".fashion-reels-carousel .frc-slide.is-center video { filter: brightness(1); } " +
            ".fashion-reels-carousel .frc-slide.is-left-1 { transform: translateX(-85%) scale(.85) rotateY(12deg); opacity: .8; z-index: 4; } " +
            ".fashion-reels-carousel .frc-slide.is-right-1 { transform: translateX(85%) scale(.85) rotateY(-12deg); opacity: .8; z-index: 4; } " +
            ".fashion-reels-carousel .frc-slide.is-left-2 { transform: translateX(-160%) scale(.7) rotateY(20deg); opacity: .4; z-index: 3; } " +
            ".fashion-reels-carousel .frc-slide.is-right-2 { transform: translateX(160%) scale(.7) rotateY(-20deg); opacity: .4; z-index: 3; } " +
            ".fashion-reels-carousel .frc-slide.is-hidden-left { transform: translateX(-220%) scale(.6) rotateY(25deg); opacity: 0; z-index: 1; } " +
            ".fashion-reels-carousel .frc-slide.is-hidden-right { transform: translateX(220%) scale(.6) rotateY(-25deg); opacity: 0; z-index: 1; } " +
            "@media (max-width: 900px) { .fashion-reels-carousel .frc-carousel { height: 450px; } } " +
            "@media (max-width: 600px) { " +
            "  .fashion-reels-carousel { padding: 50px 0; } " +
            "  .fashion-reels-carousel .frc-carousel { height: calc(76vw * 16 / 9); max-height: 85vh; min-height: 380px; perspective: 800px; } " +
            "  .fashion-reels-carousel .frc-slide { width: 76%; max-width: calc(85vh * 9 / 16); height: auto; aspect-ratio: 9 / 16; border-radius: 18px; } " +
            "  .fashion-reels-carousel .frc-slide.is-left-1 { transform: translateX(-65%) scale(.85) rotateY(20deg); opacity: 0.9; } " +
            "  .fashion-reels-carousel .frc-slide.is-right-1 { transform: translateX(65%) scale(.85) rotateY(-20deg); opacity: 0.9; } " +
            "  .fashion-reels-carousel .frc-slide.is-left-2 { transform: translateX(-110%) scale(.7) rotateY(30deg); opacity: 0.5; } " +
            "  .fashion-reels-carousel .frc-slide.is-right-2 { transform: translateX(110%) scale(.7) rotateY(-30deg); opacity: 0.5; } " +
            "  .fashion-reels-carousel .frc-slide.is-hidden-left { transform: translateX(-160%) scale(.6) rotateY(35deg); opacity: 0; } " +
            "  .fashion-reels-carousel .frc-slide.is-hidden-right { transform: translateX(160%) scale(.6) rotateY(-35deg); opacity: 0; } " +
            "} " +
            "@media (prefers-reduced-motion: reduce) { .fashion-reels-carousel .frc-slide { transition: none; } } " +
            ".fashion-reels-carousel .frc-controls { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 8px; opacity: 0; transition: opacity 0.3s ease; z-index: 10; pointer-events: none; } " +
            ".fashion-reels-carousel .frc-slide.is-center .frc-controls { opacity: 1; pointer-events: auto; } " +
            ".fashion-reels-carousel .frc-btn { background: transparent; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: background 0.2s, transform 0.2s; } " +
            ".fashion-reels-carousel .frc-btn:active { transform: scale(0.9); } " +
            ".fashion-reels-carousel .frc-btn:hover { background: rgba(0, 0, 0, 0.7); } " +
            ".fashion-reels-carousel .frc-btn svg { width: 20px; height: 20px; } " +
            ".vidshop-slider-carousel { width: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 0; font-family: inherit; -webkit-user-select: none; user-select: none; } " +
            ".vidshop-slider-track { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 16px 20px; width: 100%; scrollbar-width: none; -webkit-overflow-scrolling: touch; } " +
            ".vidshop-slider-track::-webkit-scrollbar { display: none; } " +
            ".vidshop-slider-slide { position: relative; flex: 0 0 calc(16.666% - 13.33px); aspect-ratio: 9/16; border-radius: 16px; overflow: hidden; scroll-snap-align: start; background: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.1); isolation: isolate; cursor: pointer; } " +
            "@media (max-width: 1400px) { .vidshop-slider-slide { flex: 0 0 calc(20% - 12.8px); } } " +
            "@media (max-width: 1100px) { .vidshop-slider-slide { flex: 0 0 calc(25% - 12px); } } " +
            "@media (max-width: 900px) { .vidshop-slider-slide { flex: 0 0 calc(40% - 13px); } } " +
            "@media (max-width: 600px) { " +
            "  .vidshop-slider-track { padding: 12px 5%; gap: 12px; } " +
            "  .vidshop-slider-slide { flex: 0 0 82%; scroll-snap-align: center; border-radius: 12px; } " +
            "} " +
            ".vidshop-slider-slide video { width: 100%; height: 100%; object-fit: cover; display: block; } " +
            ".vidshop-slider-play-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); z-index: 10; pointer-events: none; opacity: 1; transition: opacity 0.3s; } " +
            ".vidshop-slider-slide.is-playing .vidshop-slider-play-overlay { opacity: 0; } " +
            ".vidshop-slider-play-overlay svg { width: 48px; height: 48px; fill: white; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); } " +
            ".fashion-reels-carousel .frc-product-card, .vidshop-slider-slide .frc-product-card { position: absolute; bottom: 20px; left: 16px; right: 16px; border-radius: 12px; padding: 10px; display: flex; align-items: center; gap: 12px; color: #fff; z-index: 20; opacity: 0; pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease; transform: translateY(10px); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.15); background: transparent; } " +
            ".fashion-reels-carousel .frc-product-card.is-active, .vidshop-slider-slide .frc-product-card.is-active { opacity: 1; pointer-events: auto; transform: translateY(0); } " +
            ".fashion-reels-carousel .frc-product-img, .vidshop-slider-slide .frc-product-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; background: #fff; flex-shrink: 0; } " +
            ".fashion-reels-carousel .frc-product-info, .vidshop-slider-slide .frc-product-info { flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: center; } " +
            ".fashion-reels-carousel .frc-product-title, .vidshop-slider-slide .frc-product-title { margin: 0 0 2px 0; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; font-family: sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.5); } " +
            ".fashion-reels-carousel .frc-product-price, .vidshop-slider-slide .frc-product-price { margin: 0; font-size: 14px; font-weight: 700; color: #fff; font-family: sans-serif; text-shadow: 0 1px 2px rgba(0,0,0,0.5); } " +
            ".fashion-reels-carousel .frc-product-btn, .vidshop-slider-slide .frc-product-btn { width: auto; height: auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; transition: transform 0.2s; color: #fff; padding: 3px; } " +
            ".fashion-reels-carousel .frc-product-btn:hover, .vidshop-slider-slide .frc-product-btn:hover { transform: scale(1.05); } " +
            ".fashion-reels-carousel .frc-product-btn svg, .vidshop-slider-slide .frc-product-btn svg { width: 16px; height: 16px; stroke-width: 2.5; } " +
            "@media (max-width: 600px) { " +
            "  .fashion-reels-carousel .frc-product-card, .vidshop-slider-slide .frc-product-card { bottom: 12px; left: 10px; right: 10px; padding: 8px; gap: 8px; border-radius: 10px; } " +
            "  .fashion-reels-carousel .frc-product-img, .vidshop-slider-slide .frc-product-img { width: 36px; height: 36px; border-radius: 6px; } " +
            "  .fashion-reels-carousel .frc-product-title, .vidshop-slider-slide .frc-product-title { font-size: 11px; margin-bottom: 2px; } " +
            "  .fashion-reels-carousel .frc-product-price, .vidshop-slider-slide .frc-product-price { font-size: 13px; } " +
            "  .fashion-reels-carousel .frc-product-btn svg, .vidshop-slider-slide .frc-product-btn svg { width: 14px; height: 14px; } " +
            "}";
        document.head.appendChild(style);
    }

    ;