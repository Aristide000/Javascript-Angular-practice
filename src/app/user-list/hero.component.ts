import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

@Component({
  selector: 'app-hero',
  templateUrl: 'hero.component.html',
  styleUrls: ['hero.component.css']
})
export class HeroComponent implements AfterViewInit, OnDestroy {

  private triggers: ScrollTrigger[] = [];
  private autoplayTimeline: any = null;
  private philosophyScrollTrigger: any = null;
  private sectionTransition: any = null;
  private lenisInstance: any = null;
  private lenisRafId: number | null = null;

  ngAfterViewInit(): void {
    this.animateHero();
    this.animateBackground();
    this.setupHomeActiveState();
    this.setupPhilosophyScroll();
    this.setupAboutAutoplay();
    this.setupSectionTransition();
  }

  ngOnDestroy(): void {
    this.triggers.forEach(trigger => trigger.kill());
    this.triggers = [];
    if (this.autoplayTimeline) {
      try { this.autoplayTimeline.kill(); } catch (err) {}
      this.autoplayTimeline = null;
    }
    if (this.sectionTransition) {
      try { this.sectionTransition.scrollTrigger && this.sectionTransition.scrollTrigger.kill(); } catch (err) {}
      try { this.sectionTransition.kill(); } catch (err) {}
      this.sectionTransition = null;
    }
    // cleanup lenis RAF if used
    if (this.lenisRafId) {
      try { cancelAnimationFrame(this.lenisRafId); } catch (e) {}
      this.lenisRafId = null;
    }
    if (this.lenisInstance && typeof this.lenisInstance.destroy === 'function') {
      try { this.lenisInstance.destroy(); } catch (e) {}
      this.lenisInstance = null;
    }
  }

  /* =========================
     HERO CONTENT ANIMATIONS
  ========================= */
  private animateHero(): void {

    gsap.from('.hero-name', {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    });

    gsap.from('.hero-line', {
      y: 40,
      opacity: 0,
      duration: 1,
      delay: 0.3,
      ease: 'power3.out'
    });

    gsap.from('.portfolio-text', {
      x: '-120%',
      duration: 1.2,
      delay: 0.6,
      ease: 'power3.out'
    });

    gsap.fromTo(
      '.notice-line',
      { y: 24, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.6,
        delay: 1.4,
        ease: 'power3.out'
      }
    );

    /* SCROLL CAPTION */
    gsap.fromTo(
      '.scroll-text',
      { opacity: 0, y: 6 },
      {
        opacity: 0.7,
        y: 0,
        duration: 1.6,
        delay: 1.8,
        ease: 'power2.out'
      }
    );

    gsap.to('.scroll-text', {
      opacity: 0.3,
      duration: 3.8,
      repeat: -1,
      yoyo: true,
      delay: 3,
      ease: 'sine.inOut'
    });

    gsap.from('.scroll-line', {
      opacity: 0,
      y: -10,
      duration: 0.8,
      delay: 2,
      ease: 'power2.out'
    });
  }

  /* =========================
     HOME LINK ACTIVE STATE
  ========================= */
  private setupHomeActiveState(): void {

    const homeLink = document.querySelector<HTMLAnchorElement>(
      '.nav-link[data-section="home"]'
    );

    const heroSection = document.querySelector<HTMLElement>('.hero');

    if (!homeLink || !heroSection) return;

    const trigger = ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: 'bottom top',
      onEnter: () => homeLink.classList.add('active'),
      onEnterBack: () => homeLink.classList.add('active'),
      onLeave: () => homeLink.classList.remove('active')
    });

    this.triggers.push(trigger);
  }

  /* =========================
     SECTION 2 — PHILOSOPHY
     (PIN + SCRUB)
  ========================= */
  private setupPhilosophyScroll(): void {
    const items = gsap.utils.toArray<HTMLElement>('.philosophy-item');
    const section = document.querySelector('.philosophy');

    if (!items.length || !section) return;

    // Initial hidden state for each card
    gsap.set(items, { opacity: 0, y: 30, scale: 0.995 });

    // Create a ScrollTrigger for each card that reveals it when scrolled into view.
    items.forEach(item => {
      const trig = ScrollTrigger.create({
        trigger: item,
        start: 'top 85%',
        onEnter: () => {
          gsap.to(item, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power2.out' });
        },
        once: true
      });
      this.triggers.push(trig);
    });
  }

  private setupAboutAutoplay(): void {

    const aboutLink = document.querySelector<HTMLAnchorElement>('.nav-link[data-section="about"]');
    const section = document.querySelector<HTMLElement>('.philosophy');
    const items = gsap.utils.toArray<HTMLElement>('.philosophy-item');

    if (!aboutLink || !section || !items.length) return;

    aboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Smoothly animate the window scroll to the philosophy section using GSAP ScrollToPlugin
      try {
        gsap.to(window, { duration: 1, scrollTo: { y: section, autoKill: false }, ease: 'power2.inOut' });
      } catch (err) {
        // fallback to native smooth scroll if plugin isn't available for some reason
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // If a scroll-trigger exists for the philosophy section, kill it so autoplay is not blocked.
      if (this.philosophyScrollTrigger) {
        try { this.philosophyScrollTrigger.kill(); } catch (err) {}
        this.triggers = this.triggers.filter(t => t !== this.philosophyScrollTrigger);
        this.philosophyScrollTrigger = null;
      }

      if (this.autoplayTimeline) {
        try { this.autoplayTimeline.kill(); } catch (err) {}
        this.autoplayTimeline = null;
      }

      // Reset state
      gsap.set(items, { opacity: 0, y: 40 });

      // Play each item in sequence in the same view (no scrolling required).
      const tl = gsap.timeline();
      items.forEach((item) => {
        tl.to(item, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
          .to(item, { opacity: 0, y: -40, duration: 0.6, ease: 'power2.in' }, '+=1');
      });

      this.autoplayTimeline = tl;
    });
  }

  

  /* =========================
     AMBIENT BACKGROUND MOTION
  ========================= */
  private animateBackground(): void {

    // Reduce travel distances and durations so blobs remain visually within the hero
    gsap.to('.blob-1', {
      x: 80,
      y: 60,
      duration: 28,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gsap.to('.blob-2', {
      x: -100,
      y: 70,
      duration: 36,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gsap.to('.blob-3', {
      x: 90,
      y: -80,
      duration: 44,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  /* =========================
     STICKY SECTION TRANSITION
     Pins the about section and animates hero -> about
  ========================= */
  private async setupSectionTransition(): Promise<void> {
    const hero = document.querySelector<HTMLElement>('.hero');
    const about = document.querySelector<HTMLElement>('.philosophy');
    const items = gsap.utils.toArray<HTMLElement>('.philosophy-item');
    const separator = document.querySelector<HTMLElement>('.section-separator');

    if (!hero || !about || !separator) return;

    // Try to dynamically import Lenis for smooth scrolling. This is optional — code will continue if import fails.
    try {
      const mod = await import('@studio-freight/lenis');
      const Lenis = (mod && (mod.default || mod.Lenis)) || mod;
      if (Lenis) {
        this.lenisInstance = new Lenis({ duration: 1.2, lerp: 0.08, smooth: true });

        const onRaf = (time: number) => {
          try { this.lenisInstance.raf(time); } catch (e) {}
          this.lenisRafId = requestAnimationFrame(onRaf);
        };

        this.lenisRafId = requestAnimationFrame(onRaf);

        // Let ScrollTrigger know that Lenis will handle scrolling
        ScrollTrigger.scrollerProxy(document.scrollingElement || document.documentElement, {
          scrollTop(value?: number) {
            if (arguments.length) {
              // when setting, delegate to Lenis
              try { (window as any).lenis && (window as any).lenis.scrollTo(value); } catch (e) {}
            }
            // when getting, return current scroll position
            return (document.scrollingElement || document.documentElement).scrollTop;
          },
          getBoundingClientRect() {
            return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
          }
        });
      }
    } catch (err) {
      // Lenis not available; continue without it
    }

    // Create scrubbed timeline pinned to the About section.
    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: {
        trigger: about,
        start: 'top top',
        end: '+=100% ',
        scrub: 0.7,
        pin: true,
        anticipatePin: 1
      }
    });

    // Separator: animate CSS variables used by pseudo elements to create a "doorway" effect
    gsap.set(separator, { '--sep-line-width': '64%', '--sep-blur': '8px', '--sep-line-color': 'rgba(255,176,0,0.18)' });

    tl.to('.hero-content', { y: -120, opacity: 0, duration: 0.9 }, 0)
      .to('.hero-notice', { y: 40, opacity: 0, duration: 0.9 }, 0)
      .to(separator, { duration: 0.8, '--sep-line-width': '120%', '--sep-blur': '2px', '--sep-line-color': 'rgba(60,160,255,0.14)' }, 0.1)
      .to(separator, { duration: 0.9, opacity: 1 }, 0.1)
      .fromTo('.philosophy-header', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.35)
      .fromTo(items, { y: 36, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.16, duration: 0.9 }, 0.5);

    this.sectionTransition = tl;
  }
}
