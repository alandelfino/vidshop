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
      html += '  <div class="vidshop-story-bubble ' + shapeClass + '" style="' + borderStyle + '">';
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
        width: 76px;
      }
      
      .vidshop-story-bubble {
        width: 72px;
        height: 72px;
        padding: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s ease;
      }
      .vidshop-story-item:active .vidshop-story-bubble { transform: scale(0.95); }
      
      .vidshop-story-shape-round { border-radius: 50%; }
      .vidshop-story-shape-round .vidshop-story-inner { border-radius: 50%; }
      
      .vidshop-story-shape-rect-9-16 { border-radius: 12px; height: 100px; }
      .vidshop-story-shape-rect-9-16 .vidshop-story-inner { border-radius: 10px; }
      
      .vidshop-story-shape-square-9-16 { border-radius: 0; height: 100px; }
      .vidshop-story-shape-square-9-16 .vidshop-story-inner { border-radius: 0; }
      
      .vidshop-story-inner {
        width: 100%;
        height: 100%;
        background: #000;
        border: 2px solid #fff;
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
           <div class="vidshop-story-progress-bar"></div>
           <div class="vidshop-story-user">
              \${videos[activeIdx].thumbnailUrl ? '<img src="' + videos[activeIdx].thumbnailUrl + '" class="vidshop-story-user-thumb">' : '<div class="vidshop-story-user-thumb" style="background:#333"></div>'}
              <span class="vidshop-story-user-name">\${videos[activeIdx].title}</span>
           </div>
           <button class="vidshop-story-close">&times;</button>
        </div>
        
        <div class="vidshop-story-player-content">
           <video id="vidshop-story-video" src="\${videos[activeIdx].mediaUrl}" playsinline autoplay></video>
           <div class="vidshop-story-nav vidshop-story-nav-prev"></div>
           <div class="vidshop-story-nav vidshop-story-nav-next"></div>
        </div>

        <div class="vidshop-story-products-container"></div>
      \`;
      
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      var video = modal.querySelector('#vidshop-story-video');
      var progressBar = modal.querySelector('.vidshop-story-progress-bar');
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

      video.ontimeupdate = function() {
         var p = (video.currentTime / video.duration) * 100;
         progressBar.style.width = p + '%';
         renderProducts(video.currentTime);
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
        progressBar.style.width = '0%';
        productsContainer.innerHTML = '';
      }

      function renderProducts(time) {
        var products = videos[activeIdx].products || [];
        var activeOnes = products.filter(function(p) {
          return time >= (p.startTime || 0) && time <= (p.endTime || 9999);
        });

        var html = '';
        activeOnes.forEach(function(p) {
          var imgHtml = p.imageLink ? '<img src="' + p.imageLink + '">' : '<div style="width:60px;height:60px;background:#eee;border-radius:8px"></div>';
          html += '<a href="' + p.link + '" target="_blank" class="vidshop-story-product-card">';
          html += imgHtml;
          html += '  <div class="vidshop-story-product-info">';
          html += '    <div class="vidshop-story-product-title">' + p.title + '</div>';
          html += '    <div class="vidshop-story-product-price">' + (p.price || '') + '</div>';
          html += '    <div class="vidshop-story-product-btn">Ver Produto</div>';
          html += '  </div>';
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
      
      .vidshop-story-player-content {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .vidshop-story-player-content video {
        max-width: 100%;
        max-height: 100%;
        height: 100vh;
        width: 100vw;
        object-fit: contain;
      }
      
      .vidshop-story-nav {
        position: absolute;
        top: 0; bottom: 0;
        width: 40%;
        cursor: pointer;
        z-index: 5;
      }
      .vidshop-story-nav-prev { left: 0; }
      .vidshop-story-nav-next { right: 0; }
      
      .vidshop-story-products-container {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 20px;
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 50%;
        overflow-y: auto;
      }
      
      .vidshop-story-product-card {
        background: #fff;
        border-radius: 12px;
        padding: 8px;
        display: flex;
        gap: 12px;
        text-decoration: none;
        color: #000;
        animation: vidshop-slide-up 0.3s ease-out;
      }
      
      .vidshop-story-product-card img {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        object-fit: cover;
      }
      
      .vidshop-story-product-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      
      .vidshop-story-product-title {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.2;
        margin-bottom: 2px;
      }
      
      .vidshop-story-product-price {
        font-size: 12px;
        color: #e11d48;
        font-weight: 700;
      }
      
      .vidshop-story-product-btn {
        margin-top: 4px;
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 800;
        color: #2563eb;
      }
      
      @keyframes vidshop-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Mobile adjustments */
      @media (max-width: 600px) {
        .vidshop-story-player-content video {
           object-fit: cover;
        }
      }
    \`;
    document.head.appendChild(modalStyle);
  }
`;
