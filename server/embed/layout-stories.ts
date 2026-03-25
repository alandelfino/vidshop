import { escAttr } from "./utils";

export function buildStories(el: any, data: any) {
  var story = data;
  var videos = data.videos || [];
  if (!videos.length) return;

  var bubbleWidth = story.bubbleWidth || '80px';
  var bubbleHeight = story.bubbleHeight || '80px';
  var borderRadius = story.borderRadius !== undefined ? story.borderRadius + 'px' : '50%';
  var innerRadius = story.borderRadius !== undefined ? Math.max(0, story.borderRadius - 2) + 'px' : '50%';

  var containerStyle = [
    '--vstory-width: ' + bubbleWidth,
    '--vstory-height: ' + bubbleHeight,
    '--vstory-radius: ' + borderRadius,
    '--vstory-inner-radius: ' + innerRadius
  ].join('; ');

  var html = '<div class="vidshop-stories-container" style="' + containerStyle + '">';
  videos.forEach(function(v: any, i: number) {
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

  // Fullscreen Player Implementation
  var activeIdx = 0;
  var modal: any = null;

  el.querySelectorAll('.vidshop-story-item').forEach(function(item: any) {
    item.onclick = function() {
      activeIdx = parseInt(this.getAttribute('data-index'));
      openPlayer();
    };
  });

  function openPlayer() {
    if (modal) return;
    
    modal = document.createElement('div');
    modal.className = 'vidshop-story-player-overlay';
    modal.innerHTML = `
      <div class="vidshop-story-player-header">
         <div class="vidshop-story-progress-container"></div>
         <div class="vidshop-story-user">
            ${videos[activeIdx].thumbnailUrl ? '<img src="' + videos[activeIdx].thumbnailUrl + '" class="vidshop-story-user-thumb">' : '<div class="vidshop-story-user-thumb" style="background:#333"></div>'}
            <span class="vidshop-story-user-name">${videos[activeIdx].title}</span>
         </div>
         <button class="vidshop-story-close">&times;</button>
      </div>
      
      <div class="vidshop-story-player-wrapper">
        <div class="vidshop-story-player-content">
           <video id="vidshop-story-video" src="${videos[activeIdx].mediaUrl}" playsinline autoplay></video>
           <div class="vidshop-story-nav vidshop-story-nav-prev"></div>
           <div class="vidshop-story-nav vidshop-story-nav-next"></div>
           <div class="vidshop-story-products-container"></div>
        </div>
      </div>
    `;
    
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

    var animationId: any = null;
    function startProgressLoop() {
      if (animationId) cancelAnimationFrame(animationId);
      function loop() {
         if (!video.paused && video.duration) {
           var p = (video.currentTime / video.duration) * 100;
           if (progressFills[activeIdx]) (progressFills[activeIdx] as HTMLElement).style.width = p + '%';
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
      progressFills.forEach(function(fill: any, i: number) {
        if (i < activeIdx) fill.style.width = '100%';
        else fill.style.width = '0%';
      });
      productsContainer.innerHTML = '';
      lastActiveIds = "";
      startProgressLoop();
    }

    var lastActiveIds = "";
    function renderProducts(time: number) {
      var products = videos[activeIdx].products || [];
      var activeOnes = products.filter(function(p: any) {
        return time >= (p.startTime || 0) && time <= (p.endTime || 9999);
      });

      var currentIds = activeOnes.map(function(p: any){ return p.id; }).join(',');
      if (currentIds === lastActiveIds) return;
      lastActiveIds = currentIds;

      if (activeOnes.length === 0) {
        productsContainer.innerHTML = '';
        return;
      }

      var html = '';
      activeOnes.forEach(function(p: any) {
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
}
