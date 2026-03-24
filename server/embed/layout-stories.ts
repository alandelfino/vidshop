export const layoutStories = `
  function buildStories(el, data) {
    var story = data;
    var videos = data.videos || [];
    if (!videos.length) return;

    var html = '<div class="vidshop-stories-container">';
    videos.forEach(function(v, i) {
      var shapeClass = 'vidshop-story-shape-' + (story.shape || 'round');
      var borderStyle = story.borderEnabled ? 'background: ' + story.borderGradient : '';
      var posterAttr = v.thumbnailUrl ? ' poster="' + escAttr(v.thumbnailUrl) + '"' : '';
      
      html += '<div class="vidshop-story-item" data-index="' + i + '">';
      html += '  <div class="vidshop-story-bubble" style="' + borderStyle + '">';
      html += '    <div class="vidshop-story-inner">';
      html += '      <video src="' + escAttr(v.mediaUrl) + '"' + posterAttr + ' muted playsinline preload="metadata"></video>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="vidshop-story-label">' + escAttr(v.title) + '</div>';
      html += '</div>';
    });
    html += '</div>';

    el.innerHTML = html;

    // Styles for bubbles
    var style = document.createElement('style');
    style.innerHTML = \`
      .vidshop-stories-container {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        padding: 10px 0;
        scrollbar-width: none;
      }
      .vidshop-stories-container::-webkit-scrollbar { display: none; }
      
      .vidshop-story-item {
        flex: 0 0 auto;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        width: calc(\${story.bubbleWidth || '80px'} + 4px);
      }
      
      .vidshop-story-bubble {
        width: \${story.bubbleWidth || '80px'};
        height: \${story.bubbleHeight || '80px'};
        border-radius: \${story.borderRadius !== undefined ? story.borderRadius + 'px' : '50%'};
        padding: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s ease;
      }
      .vidshop-story-item:active .vidshop-story-bubble { transform: scale(0.95); }
      
      .vidshop-story-inner {
        width: 100%;
        height: 100%;
        background: #000;
        border: 2px solid #fff;
        border-radius: \${story.borderRadius !== undefined ? Math.max(0, story.borderRadius - 2) + 'px' : '50%'};
        overflow: hidden;
      }
      
      .vidshop-story-inner img, 
      .vidshop-story-inner video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .vidshop-story-label {
        font-size: 11px;
        color: #333;
        font-weight: 500;
        text-align: center;
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    \`;
    document.head.appendChild(style);

    // Fullscreen Player Implementation
    var activeIdx = 0;
    var modal = null;

    el.querySelectorAll('.vidshop-story-item').forEach(function(item) {
      item.onclick = function() {
        activeIdx = parseInt(this.getAttribute('data-index'));
        openPlayer();
      };
    });

    function openPlayer() {
      if (modal) return;
      
      modal = document.createElement('div');
      modal.className = 'vidshop-story-player-overlay';
      modal.innerHTML = \`
        <div class="vidshop-story-player-header">
           <div class="vidshop-story-progress-container"></div>
           <div class="vidshop-story-user">
              \${videos[activeIdx].thumbnailUrl ? '<img src="' + videos[activeIdx].thumbnailUrl + '" class="vidshop-story-user-thumb">' : '<div class="vidshop-story-user-thumb" style="background:#333"></div>'}
              <span class="vidshop-story-user-name">\${videos[activeIdx].title}</span>
           </div>
           <button class="vidshop-story-close">&times;</button>
        </div>
        
        <div class="vidshop-story-player-wrapper">
          <div class="vidshop-story-player-content">
             <video id="vidshop-story-video" src="\${videos[activeIdx].mediaUrl}" playsinline autoplay></video>
             <div class="vidshop-story-nav vidshop-story-nav-prev"></div>
             <div class="vidshop-story-nav vidshop-story-nav-next"></div>
             <div class="vidshop-story-products-container"></div>
          </div>
        </div>
      \`;
      
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      var progressContainer = modal.querySelector('.vidshop-story-progress-container');
      for (var i = 0; i < videos.length; i++) {
        var bg = document.createElement('div');
        bg.className = 'vidshop-story-progress-bg';
        bg.innerHTML = '<div class="vidshop-story-progress-fill"></div>';
        progressContainer.appendChild(bg);
      }

      var video = modal.querySelector('#vidshop-story-video');
      var progressFills = modal.querySelectorAll('.vidshop-story-progress-fill');
      var productsContainer = modal.querySelector('.vidshop-story-products-container');

      // Add close logic
      modal.querySelector('.vidshop-story-close').onclick = closePlayer;

      // Nav logic
      modal.querySelector('.vidshop-story-nav-prev').onclick = function() {
        if (activeIdx > 0) {
          activeIdx--;
          updatePlayer();
        } else {
          closePlayer();
        }
      };
      
      modal.querySelector('.vidshop-story-nav-next').onclick = function() {
        if (activeIdx < videos.length - 1) {
          activeIdx++;
          updatePlayer();
        } else {
          closePlayer();
        }
      };

      video.onended = function() {
        if (activeIdx < videos.length - 1) {
           activeIdx++;
           updatePlayer();
        } else {
           closePlayer();
        }
      };

      var animationId = null;
      function startProgressLoop() {
        if (animationId) cancelAnimationFrame(animationId);
        function loop() {
           if (!video.paused && video.duration) {
             var p = (video.currentTime / video.duration) * 100;
             if (progressFills[activeIdx]) progressFills[activeIdx].style.width = p + '%';
           }
           animationId = requestAnimationFrame(loop);
        }
        animationId = requestAnimationFrame(loop);
      }

      video.onplay = startProgressLoop;
      video.onpause = function() {
        if (animationId) cancelAnimationFrame(animationId);
      };

      video.ontimeupdate = function() {
         if (story.showProducts !== false) {
           renderProducts(video.currentTime);
         } else {
           productsContainer.innerHTML = '';
         }
      };

      function updatePlayer() {
        var v = videos[activeIdx];
        video.src = v.mediaUrl;
        video.play();
        var userThumb = modal.querySelector('.vidshop-story-user-thumb');
        if (userThumb) {
          if (v.thumbnailUrl) {
            userThumb.src = v.thumbnailUrl;
            userThumb.style.display = 'block';
          } else {
            userThumb.style.display = 'none';
          }
        }
        modal.querySelector('.vidshop-story-user-name').innerText = v.title;
        progressFills.forEach(function(fill, i) {
          if (i < activeIdx) fill.style.width = '100%';
          else fill.style.width = '0%';
        });
        productsContainer.innerHTML = '';
        lastActiveIds = "";
        startProgressLoop();
      }

      var lastActiveIds = "";
      function renderProducts(time) {
        var products = videos[activeIdx].products || [];
        var activeOnes = products.filter(function(p) {
          return time >= (p.startTime || 0) && time <= (p.endTime || 9999);
        });

        var currentIds = activeOnes.map(function(p){ return p.id; }).join(',');
        if (currentIds === lastActiveIds) return;
        lastActiveIds = currentIds;

        if (activeOnes.length === 0) {
          productsContainer.innerHTML = '';
          return;
        }

        var html = '';
        activeOnes.forEach(function(p) {
          var imgHtml = p.imageLink ? '<img class="vidshop-story-product-img" src="' + p.imageLink + '">' : '<div class="vidshop-story-product-img" style="background:#333"></div>';
          var cartIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
          
          html += '<a href="' + p.link + '" target="_blank" class="vidshop-story-product-card">';
          html += imgHtml;
          html += '  <div class="vidshop-story-product-info">';
          html += '    <div class="vidshop-story-product-title">' + p.title + '</div>';
          html += '    <div class="vidshop-story-product-price">' + (p.price || '') + '</div>';
          html += '  </div>';
          html += '  <div class="vidshop-story-product-btn">' + cartIcon + '</div>';
          html += '</a>';
        });
        productsContainer.innerHTML = html;
      }

      function closePlayer() {
        if (modal) {
          modal.remove();
          modal = null;
          document.body.style.overflow = '';
        }
      }
    }

    // Modal Styles
    var modalStyle = document.createElement('style');
    modalStyle.innerHTML = \`
      .vidshop-story-player-overlay {
        position: fixed;
        inset: 0;
        background: #000;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      
      .vidshop-story-player-header {
        position: absolute;
        top: 0; left: 0; right: 0;
        padding: 24px 16px 16px;
        background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .vidshop-story-progress-bar {
        position: absolute;
        top: 8px; left: 8px; right: 8px;
        height: 2px;
        background: #fff;
        width: 0%;
        transition: width 0.1s linear;
        border-radius: 2px;
        opacity: 0.8;
      }
      
      .vidshop-story-user {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .vidshop-story-progress-container {
        position: absolute;
        top: 10px; left: 10px; right: 10px;
        height: 2px;
        display: flex;
        gap: 6px;
        z-index: 20;
      }
      
      .vidshop-story-progress-bg {
        flex: 1;
        height: 100%;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .vidshop-story-progress-fill {
        height: 100%;
        background: #fff;
        width: 0%;
        transition: width 0.1s linear;
      }

      .vidshop-story-user-thumb {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid #fff;
        object-fit: cover;
      }
      
      .vidshop-story-user-name {
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }
      
      .vidshop-story-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 32px;
        cursor: pointer;
        padding: 0 10px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }
      
      .vidshop-story-player-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
        overflow: hidden;
      }
      
      .vidshop-story-player-content {
        position: relative;
        height: 100%;
        aspect-ratio: 9 / 16;
        max-width: 100%;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .vidshop-story-player-content video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .vidshop-story-nav {
        position: absolute;
        top: 0; bottom: 0;
        width: 30%;
        cursor: pointer;
        z-index: 5;
      }
      .vidshop-story-nav-prev { left: 0; }
      .vidshop-story-nav-next { right: 0; }
      
      .vidshop-story-products-container {
        position: absolute;
        bottom: 20px; left: 16px; right: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 20;
      }
      
      .vidshop-story-product-card {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-radius: 12px;
        padding: 10px;
        display: flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
        color: #fff;
        animation: vidshop-slide-up 0.3s ease-out;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      }
      
      .vidshop-story-product-img {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        object-fit: cover;
        background: #fff;
        flex-shrink: 0;
      }
      
      .vidshop-story-product-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      
      .vidshop-story-product-title {
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
        margin-bottom: 2px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }
      
      .vidshop-story-product-price {
        font-size: 14px;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }
      
      .vidshop-story-product-btn {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }
      
      @keyframes vidshop-slide-up {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @media (max-width: 600px) {
        .vidshop-story-player-content {
          width: 100%;
          height: 100%;
          border-radius: 0;
        }
        .vidshop-story-product-card {
          bottom: 12px; left: 10px; right: 10px;
          padding: 8px;
          gap: 8px;
        }
        .vidshop-story-product-img {
          width: 36px;
          height: 36px;
        }
        .vidshop-story-product-title { font-size: 11px; }
        .vidshop-story-product-price { font-size: 13px; }
      }
    \`;
    document.head.appendChild(modalStyle);
  }
`;
