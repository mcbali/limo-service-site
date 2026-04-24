const sliderContainer = document.querySelector('.vehicle-slider');

if (sliderContainer) {
  let index = 1;
  let isTransitioning = false;
  let autoSlideInterval;
  let resumeTimeout;

  const slidesWrapper = sliderContainer.querySelector('.slides');
  const images = sliderContainer.querySelectorAll('.slides img');
  const next = sliderContainer.querySelector('.next');
  const dotsContainer = sliderContainer.querySelector('.dots');

  slidesWrapper.style.willChange = 'transform';
  slidesWrapper.style.transform = 'translate3d(0,0,0)';

  // Preload images to avoid rendering lag
  images.forEach(img => {
    const temp = new Image();
    temp.src = img.src;
  });

  // Clone first and last images for infinite looping
  const firstClone = images[0].cloneNode(true);
  const lastClone = images[images.length - 1].cloneNode(true);
  slidesWrapper.appendChild(firstClone);
  slidesWrapper.insertBefore(lastClone, slidesWrapper.firstChild);

  const allImages = sliderContainer.querySelectorAll('.slides img');

  // Initial position
  slidesWrapper.style.transform = `translateX(-${index * 70}%)`;

  // Create dots
  dotsContainer.innerHTML = '';
  images.forEach((img, i) => {
    const dot = document.createElement('span');
    dot.className = 'dot';
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => {
      const targetIndex = i + 1; // account for prepended clone
      showSlide(targetIndex, true);
      pauseAutoSlide(10000);
    });
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.dot');

  function updateDots() {
    dots.forEach(dot => dot.classList.remove('active'));
    let dotIndex = index - 1;
    if (dotIndex < 0) dotIndex = images.length - 1;
    if (dotIndex >= images.length) dotIndex = 0;
    if (dots[dotIndex]) dots[dotIndex].classList.add('active');
  }

  function showSlide(i, ignoreTransition = false) {
    if (isTransitioning && !ignoreTransition) return;
    isTransitioning = true;
    index = i;
    slidesWrapper.style.transition = 'transform 0.5s ease-in-out';
    slidesWrapper.style.transform = `translateX(-${index * 70}%)`;
    updateDots();
  }

  slidesWrapper.addEventListener('transitionend', () => {
    // Handle infinite loop with clones
    if (allImages[index].isSameNode(firstClone)) {
      slidesWrapper.style.transition = 'none';
      index = 1;
      slidesWrapper.style.transform = `translateX(-${index * 70}%)`;
    } else if (allImages[index].isSameNode(lastClone)) {
      slidesWrapper.style.transition = 'none';
      index = allImages.length - 2;
      slidesWrapper.style.transform = `translateX(-${index * 70}%)`;
    }
    isTransitioning = false;
    updateDots();
  });

  // Next button
  next.addEventListener('click', () => {
    showSlide(index + 1);
    pauseAutoSlide(10000);
  });

  // Swipe gestures
  let startX = 0;
  let isSwiping = false;

  slidesWrapper.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isSwiping = true;
  });

  slidesWrapper.addEventListener('touchmove', e => {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - startX;
    const sliderWidth = sliderContainer.querySelector('.slider-wrapper').offsetWidth;
    slidesWrapper.style.transform = `translateX(${-index * 70 + (dx / sliderWidth) * 100}%)`;
  });

  slidesWrapper.addEventListener('touchend', e => {
    if (!isSwiping) return;
    const dx = e.changedTouches[0].clientX - startX;

    // Commit any swipe direction, ignore tiny jitter
    if (dx > 10) {
      showSlide(index - 1);
    } else if (dx < -10) {
      showSlide(index + 1);
    } else {
      // Snap back if almost no movement
      slidesWrapper.style.transition = 'transform 0.3s ease-in-out';
      slidesWrapper.style.transform = `translateX(-${index * 70}%)`;
    }

    isSwiping = false;
    pauseAutoSlide(10000);
  });

  // Enlarge image overlay
  images.forEach((img, i) => {
    img.addEventListener('click', e => {
      e.stopPropagation();
      let currentIndex = i;

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background-color: rgba(0,0,0,0.7);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
      `;
      overlay.addEventListener('click', () => document.body.removeChild(overlay));

      const enlargedImg = document.createElement('img');
      enlargedImg.src = images[currentIndex].src;
      enlargedImg.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        box-shadow: 0 0 20px white;
        transition: opacity 0.3s;
        cursor: default;
      `;
      enlargedImg.addEventListener('click', e => e.stopPropagation());
      overlay.appendChild(enlargedImg);

      // Arrow buttons
      const createArrow = (symbol, side, onClick) => {
        const btn = document.createElement('button');
        btn.innerHTML = symbol;
        btn.style.cssText = `
          position: absolute;
          ${side}: 20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 3rem;
          color: #fff;
          background: transparent;
          border: none;
          cursor: pointer;
          user-select: none;
        `;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          onClick();
        });
        overlay.appendChild(btn);
      };

      createArrow('&#10094;', 'left', () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        enlargedImg.style.opacity = 0;
        setTimeout(() => {
          enlargedImg.src = images[currentIndex].src;
          enlargedImg.style.opacity = 1;
        }, 150);
      });

      createArrow('&#10095;', 'right', () => {
        currentIndex = (currentIndex + 1) % images.length;
        enlargedImg.style.opacity = 0;
        setTimeout(() => {
          enlargedImg.src = images[currentIndex].src;
          enlargedImg.style.opacity = 1;
        }, 150);
      });

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        font-size: 2.5rem;
        color: #fff;
        background: transparent;
        border: none;
        cursor: pointer;
        user-select: none;
      `;
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        document.body.removeChild(overlay);
      });
      overlay.appendChild(closeBtn);

      document.body.appendChild(overlay);
    });
  });

  // Auto-slide
  function startAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => {
      showSlide(index + 1);
    }, 4000);
  }

  function pauseAutoSlide(duration) {
    clearInterval(autoSlideInterval);
    clearTimeout(resumeTimeout);
    resumeTimeout = setTimeout(startAutoSlide, duration);
  }

  startAutoSlide();
}

