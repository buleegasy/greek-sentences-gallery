import { texts } from './data.js';

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Smooth Scrolling (Lenis)
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical', 
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Sync GSAP with Lenis
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // 2. Render Data
  const wrapper = document.querySelector('.gallery-wrapper');
  
  texts.forEach((text, index) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    const exhibitNo = (index + 1).toString().padStart(2, '0');
    
    // Using the new Editorial Layout
    slide.innerHTML = `
      <div class="editorial-frame gsap-reveal">
        <div class="watermark-number en-text" data-speed="0.8">${exhibitNo}</div>
        
        <div class="meta-column" data-speed="1.05">
          <div class="meta-top">
            <span class="exhibit-label en-text">Exhibit No. ${exhibitNo}</span>
            <h2 class="chapter-title">${text.chapter}</h2>
            <h3 class="chapter-subtitle">${text.subtitle}</h3>
          </div>
          <div class="meta-bottom en-text">
            <span>${text.year}</span><br>
            <span style="font-style: italic;">${text.author} Collection</span>
          </div>
        </div>
        
        <div class="content-column" data-speed="0.95">
          <p class="artwork-text">${text.content}</p>
        </div>
      </div>
    `;
    
    const finSlide = document.querySelector('.fin-slide');
    wrapper.insertBefore(slide, finSlide);
  });

  // 3. Setup GSAP Animations
  gsap.registerPlugin(ScrollTrigger);

  const gallerySection = document.querySelector('.gallery-section');
  const slides = gsap.utils.toArray('.slide');
  
  let mm = gsap.matchMedia();

  mm.add("(min-width: 769px)", () => {
    // DESKTOP: Horizontal Scroll
    let scrollTween = gsap.to(slides, {
      xPercent: -100 * (slides.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: gallerySection,
        pin: true,
        scrub: 1, 
        snap: 1 / (slides.length - 1),
        end: () => "+=" + wrapper.offsetWidth
      }
    });

    // Intro Reveal
    gsap.fromTo('.intro-slide .title-content', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" }
    );

    slides.forEach((slide, i) => {
      if(i === 0) return;
      
      const frame = slide.querySelector('.gsap-reveal');
      if (frame) {
        // Master Reveal for the frame
        gsap.fromTo(frame,
          { opacity: 0, filter: 'blur(10px)' },
          { 
            opacity: 1, 
            filter: 'blur(0px)',
            duration: 1.5, 
            ease: "power2.out",
            visibility: 'visible',
            scrollTrigger: {
              trigger: slide,
              containerAnimation: scrollTween,
              start: "left 70%",
              toggleActions: "play none none reverse"
            }
          }
        );

        // Parallax elements
        const parallaxElements = slide.querySelectorAll('[data-speed]');
        parallaxElements.forEach((el) => {
          const speed = parseFloat(el.getAttribute('data-speed'));
          const xOffset = (1 - speed) * 400; // The amount of parallax drift
          
          gsap.fromTo(el,
            { x: xOffset },
            {
              x: -xOffset,
              ease: "none",
              scrollTrigger: {
                trigger: slide,
                containerAnimation: scrollTween,
                start: "left right",
                end: "right left",
                scrub: true
              }
            }
          );
        });
      }
    });
  });

  mm.add("(max-width: 768px)", () => {
    // MOBILE: Vertical Fallback
    gsap.fromTo('.intro-slide .title-content', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" }
    );
    
    slides.forEach((slide) => {
      const frame = slide.querySelector('.gsap-reveal');
      if (frame) {
        gsap.fromTo(frame,
          { opacity: 0, y: 40 },
          { 
            opacity: 1, 
            y: 0, 
            duration: 1.2, 
            ease: "power2.out",
            visibility: 'visible',
            scrollTrigger: {
              trigger: slide,
              start: "top 80%",
              toggleActions: "play none none reverse"
            }
          }
        );
      }
    });
  });

  document.querySelector('.back-to-top').addEventListener('click', (e) => {
    e.preventDefault();
    lenis.scrollTo(0, { duration: 1.5 });
  });

});
