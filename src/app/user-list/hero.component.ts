import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';
import { gsap } from 'gsap';

interface SolariTile {
  el: HTMLElement;
  current: string;
  htop: HTMLElement;
  hbot: HTMLElement;
  ftop: HTMLElement;
  fbot: HTMLElement;
  ftopc: HTMLElement;
  fbotc: HTMLElement;
  busy: boolean;
  glitchTimer: number | null;
}

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: 'hero.component.html',
  styleUrls: ['hero.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);

  private readonly solariTarget = 'PORTFOLIO';
  private readonly solariIntroWords = ['WELCOME', 'TO', 'MY', 'PORTFOLIO'];
  private readonly solariChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private readonly solariGlitchChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%*+!?';
  private readonly solariFlipMs = 105;

  private get solariFlipTotal(): number {
    return this.solariFlipMs * 2 + 25;
  }

  private perfLite = false;
  private isDestroyed = false;
  private heroAnimationsStarted = false;
  private solariBoardInitialized = false;
  private animations: gsap.core.Animation[] = [];
  private cleanupFns: Array<() => void> = [];
  private solariTiles: SolariTile[] = [];
  private solariTimers = new Set<number>();
  private solariRunId = 0;
  private solariScopeAttr: string | null = null;
  private solariIntroInProgress = false;
  private localTimeTimer: number | null = null;
  private localTimeAligner: number | null = null;

  private triggerMobileNotesAnimation: (() => void) | null = null;

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.perfLite = this.isPerformanceModeEnabled();
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      this.applyPerformanceClasses();
      this.setupSolariBoard();
      this.setupLocalTime();
      this.setupNotesWidget();
      this.setupNavScrolling();
      this.setupAboutReveal();

      this.playLandingLoader().finally(() => {
        if (this.isDestroyed) return;
        this.startHeroAnimations();
      });
    });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;

    this.animations.forEach((animation) => {
      try { animation.kill(); } catch (_) {}
    });
    this.animations = [];

    this.cleanupFns.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    this.cleanupFns = [];

    this.clearSolariTimers();
  }

  // ---------------------------------------------------------------------------
  // About Section — scroll-triggered box expansion
  // ---------------------------------------------------------------------------

  private setupAboutReveal(): void {
    const section = document.querySelector<HTMLElement>('.about-section');
    const box     = document.querySelector<HTMLElement>('.about-reveal-box');

    if (!section || !box) return;

    const platform   = box.querySelector<HTMLElement>('.about-platform');
    const label      = box.querySelector<HTMLElement>('.about-box-label');
    const labelInner = box.querySelector<HTMLElement>('.about-box-label-inner');
    const titleWord  = box.querySelector<HTMLElement>('.about-title-word');
    const toggle     = box.querySelector<HTMLButtonElement>('.about-panel-toggle');

    let revealed = false;
    let revealTimeline: gsap.core.Timeline | null = null;
    let isFullScreen = false;
    let panelToggleTimeline: gsap.core.Timeline | null = null;

    const setPlatformState = (expanded: boolean): void => {
      if (!platform) return;
      const states = this.getAboutPlatformStates(box, labelInner);
      const targetState = expanded
        ? (isFullScreen ? states.fullscreen : states.expanded)
        : states.compact;
      gsap.set(platform, {
        ...targetState,
      });
      if (toggle) gsap.set(toggle, this.getAboutTogglePlacement(box, targetState));
    };

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !revealed) {
            revealed = true;
            revealTimeline = this.revealAboutPlatform(
              box,
              platform,
              label,
              labelInner,
              titleWord,
              toggle
            );

            revealObserver.disconnect();
          }
        }
      },
      { threshold: 0.42 }
    );

    gsap.set(box, {
      opacity  : 0,
      clipPath : 'inset(0px 0px 0px 0px)',
    });
    setPlatformState(false);
    if (platform) {
      gsap.set(platform, {
        autoAlpha                 : 1,
        '--about-platform-bg'     : '#0b0e13',
        '--about-platform-wash'   : 'rgba(0, 0, 0, 0)',
        '--about-platform-border' : 'rgba(255, 255, 255, 0)',
        '--about-platform-shadow' : 'rgba(0, 0, 0, 0)',
      });
    }
    if (label) gsap.set(label, { autoAlpha: 1 });
    if (labelInner) gsap.set(labelInner, { opacity: 0, y: 20, scale: 1 });
    if (toggle) gsap.set(toggle, { autoAlpha: 0, scale: 0.96, pointerEvents: 'none' });
    if (titleWord) {
      gsap.set(titleWord, {
        color     : '#f3eee5',
        textShadow: '0 0 26px rgba(255, 232, 187, 0.22), 0 18px 46px rgba(0, 0, 0, 0.34)',
      });
    }

    const onResize = (): void => {
      setPlatformState(revealed);
    };

    const onTogglePanel = (): void => {
      if (!revealed || !platform || !toggle) return;

      isFullScreen = !isFullScreen;
      const states = this.getAboutPlatformStates(box, labelInner);
      const targetState = isFullScreen ? states.fullscreen : states.expanded;

      toggle.classList.toggle('is-fullscreen', isFullScreen);
      toggle.setAttribute('aria-label', isFullScreen ? 'Collapse about panel' : 'Expand about panel');
      toggle.setAttribute('aria-pressed', String(isFullScreen));

      try { panelToggleTimeline?.kill(); } catch (_) {}
      panelToggleTimeline = gsap.timeline({ defaults: { duration: 0.7, ease: 'power3.inOut' } });
      panelToggleTimeline
        .to(platform, { ...targetState }, 0)
        .to(toggle, { ...this.getAboutTogglePlacement(box, targetState) }, 0);
    };

    window.addEventListener('resize', onResize);
    if (toggle) toggle.addEventListener('click', onTogglePanel);
    revealObserver.observe(section);

    this.cleanupFns.push(() => {
      revealObserver.disconnect();
      window.removeEventListener('resize', onResize);
      if (toggle) toggle.removeEventListener('click', onTogglePanel);
      try { revealTimeline?.kill(); } catch (_) {}
      try { panelToggleTimeline?.kill(); } catch (_) {}
    });
  }

  private revealAboutPlatform(
    box: HTMLElement,
    platform: HTMLElement | null,
    label: HTMLElement | null,
    labelInner: HTMLElement | null,
    titleWord: HTMLElement | null,
    toggle: HTMLButtonElement | null
  ): gsap.core.Timeline {
    const speed  = 1;
    const states = this.getAboutPlatformStates(box, labelInner);
    const tl     = this.track(gsap.timeline({ defaults: { ease: 'power3.out' } }));

    tl.set(box, { opacity: 1 }, 0);
    if (platform) {
      tl.set(platform, {
        ...states.compact,
        autoAlpha                 : 1,
        '--about-platform-bg'     : '#0b0e13',
        '--about-platform-wash'   : 'rgba(0, 0, 0, 0)',
        '--about-platform-border' : 'rgba(255, 255, 255, 0)',
        '--about-platform-shadow' : 'rgba(0, 0, 0, 0)',
      }, 0);
    }
    if (label) tl.set(label, { autoAlpha: 1 }, 0);

    if (this.prefersReducedMotion()) {
      if (platform) {
        tl.set(platform, {
          ...states.expanded,
          autoAlpha                 : 1,
          '--about-platform-bg'     : '#f3eee5',
          '--about-platform-wash'   : 'rgba(255, 176, 0, 0.08)',
          '--about-platform-border' : 'rgba(255, 255, 255, 0.72)',
          '--about-platform-shadow' : 'rgba(0, 0, 0, 0.42)',
        }, 0);
      }
      if (toggle) {
        tl.set(toggle, {
          ...this.getAboutTogglePlacement(box, states.expanded),
          autoAlpha    : 1,
          scale        : 1,
          pointerEvents: 'auto',
        }, 0);
      }
      if (label) tl.set(label, { autoAlpha: 0 }, 0);
      return tl;
    }

    // ── Phase 1: label fades in ───────────────────────────────────────────────
    if (labelInner) {
      tl.to(labelInner, {
        opacity : 1,
        y       : 0,
        duration: 0.72 * speed,
        ease    : 'power3.out',
      }, 0);
    }

    // ── Phase 2: platform warms up (dark → slightly lighter) ─────────────────
    if (platform) {
      tl.to(platform, {
        '--about-platform-bg'     : '#211f1a',
        '--about-platform-border' : 'rgba(255, 255, 255, 0.14)',
        '--about-platform-shadow' : 'rgba(0, 0, 0, 0.12)',
        duration                  : 0.46 * speed,
        ease                      : 'none',
      }, 0.88 * speed);

      // ── Phase 3: platform flips to light ───────────────────────────────────
      tl.to(platform, {
        '--about-platform-bg'     : '#f3eee5',
        '--about-platform-wash'   : 'rgba(255, 176, 0, 0.08)',
        '--about-platform-border' : 'rgba(255, 255, 255, 0.72)',
        '--about-platform-shadow' : 'rgba(0, 0, 0, 0.42)',
        duration                  : 0.9 * speed,
        ease                      : 'sine.inOut',
      }, 1.18 * speed);
    }

    // ── Phase 4: title word colour shifts ─────────────────────────────────────
    if (titleWord) {
      tl.to(titleWord, {
        color     : '#18120a',
        textShadow: '0 1px 0 rgba(255, 255, 255, 0.55), 0 18px 46px rgba(0, 0, 0, 0.14)',
        duration  : 0.62 * speed,
        ease      : 'power2.out',
      }, 1.16 * speed);
    }

    // ── Phase 5: label exits upward — shorter, accelerates out ───────────────
    if (labelInner) {
      tl.to(labelInner, {
        opacity : 0,
        y       : -14,          // exits upward so it feels purposeful
        duration: 0.44 * speed, // was 0.58 — snappier exit
        ease    : 'power2.in',  // accelerates out (was power3.inOut — sluggish start)
      }, 2.02 * speed);         // was 2.16 — starts a beat earlier
    }

    // ── Phase 6: expand — overlaps label exit so there's zero dead gap ────────
    if (platform) {
      tl.to(platform, {
        ...states.expanded,
        '--about-platform-bg'     : '#f3eee5',
        '--about-platform-wash'   : 'rgba(255, 176, 0, 0.08)',
        '--about-platform-border' : 'rgba(255, 255, 255, 0.72)',
        '--about-platform-shadow' : 'rgba(0, 0, 0, 0.42)',
        duration                  : 0.88 * speed, // was 1.18 — tighter
        ease                      : 'power3.inOut', // was expo.inOut — starts moving immediately
      }, 2.32 * speed);          // was 2.88 — bridges dead gap; overlaps label exit
    }

    if (label) tl.set(label, { autoAlpha: 0 }, '>');
    if (toggle) {
      tl.set(toggle, {
        ...this.getAboutTogglePlacement(box, states.expanded),
        pointerEvents: 'auto',
      }, '>-0.08');
      tl.to(toggle, {
        autoAlpha: 1,
        scale    : 1,
        duration : 0.24 * speed,
        ease     : 'power2.out',
      }, '>');
    }

    return tl;
  }

  private getAboutPlatformStates(box: HTMLElement, _labelInner: HTMLElement | null) {
    const boxRect      = box.getBoundingClientRect();
    const compactPadX  = Math.min(Math.max(window.innerWidth * 0.03, 26), 62);
    const compactPadY  = Math.min(Math.max(window.innerHeight * 0.024, 22), 44);
    const safeWidth    = Math.max(0, boxRect.width - 32);
    const safeHeight   = Math.max(0, boxRect.height - 32);

    // Derive from boxRect proportions — never read from a possibly-hidden
    // labelInner whose getBoundingClientRect() returns wrong values when the
    // element has opacity:0 / a y-transform applied.
    const labelWidth   = Math.min(boxRect.width  * 0.64, 960);
    const labelHeight  = Math.min(boxRect.height * 0.22, 220);

    const compactWidth   = Math.min(safeWidth,  labelWidth  + compactPadX * 2);
    const compactHeight  = Math.min(safeHeight, labelHeight + compactPadY * 2);
    const expandedInsetX = Math.min(Math.max(window.innerWidth  * 0.035, 12), 68);
    const expandedInsetY = Math.min(Math.max(window.innerHeight * 0.05, 36), 62);

    return {
      compact: {
        left        : '50%',
        top         : '50%',
        right       : 'auto',
        bottom      : 'auto',
        xPercent    : -50,
        yPercent    : -50,
        width       : compactWidth,
        height      : compactHeight,
        clipPath    : 'none',
        borderRadius: 24,
        transformOrigin: '50% 50%',
      },
      expanded: {
        left        : '50%',
        top         : '50%',
        right       : 'auto',
        bottom      : 'auto',
        xPercent    : -50,
        yPercent    : -50,
        width       : Math.max(0, boxRect.width - expandedInsetX * 2),
        height      : Math.max(0, boxRect.height - expandedInsetY * 2),
        clipPath    : 'none',
        borderRadius: 24,
        transformOrigin: '50% 50%',
      },
      fullscreen: {
        left        : '50%',
        top         : '50%',
        right       : 'auto',
        bottom      : 'auto',
        xPercent    : -50,
        yPercent    : -50,
        width       : Math.max(0, boxRect.width),
        height      : Math.max(0, boxRect.height),
        clipPath    : 'none',
        borderRadius: 0,
        transformOrigin: '50% 50%',
      },
    };
  }

  private getAboutTogglePlacement(
    box: HTMLElement,
    panelState: { width: number; height: number }
  ): { top: number; right: number } {
    const boxRect = box.getBoundingClientRect();
    const inset = window.innerWidth <= 700 ? 14 : 18;
    return {
      top  : Math.max(12, (boxRect.height - panelState.height) / 2 + inset),
      right: Math.max(12, (boxRect.width - panelState.width) / 2 + inset),
    };
  }

  // ---------------------------------------------------------------------------
  // Nav smooth scroll
  // ---------------------------------------------------------------------------

  private setupNavScrolling(): void {
    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.nav-link[data-section]')
    );

    const onClick = (e: Event): void => {
      const link    = e.currentTarget as HTMLAnchorElement;
      const section = link.dataset['section'];
      if (!section) return;

      const target = document.getElementById(section);
      if (!target) return;

      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    navLinks.forEach(link => link.addEventListener('click', onClick));
    this.cleanupFns.push(() => {
      navLinks.forEach(link => link.removeEventListener('click', onClick));
    });
  }

  public scrollToNextSection(): void {
    const next = document.getElementById('about');
    if (!next) return;
    next.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------------------
  // Notes widget — sequential card pop-in + per-card typewriter
  // ---------------------------------------------------------------------------

  private setupNotesWidget(): void {
    const widget = document.querySelector<HTMLElement>('.notes-widget');
    const panel  = document.querySelector<HTMLElement>('.notes-widget-panel');
    if (!widget || !panel) return;

    const cards   = Array.from(panel.querySelectorAll<HTMLElement>('.notice-card'));
    const textEls = cards.map(c => c.querySelector<HTMLElement>('.notice-text'));

    const originalTexts = textEls.map(t => t?.textContent?.trim() ?? '');
    textEls.forEach(t => { if (t) t.textContent = ''; });

    gsap.set(cards, { opacity: 0, y: 10, scale: 0.94 });

    let typingTimers: number[] = [];
    let isOpen      = false;
    let isAnimating = false;

    const clearTypingTimers = (): void => {
      typingTimers.forEach(id => window.clearTimeout(id));
      typingTimers = [];
    };

    const resetCards = (): void => {
      clearTypingTimers();
      isAnimating = false;
      gsap.killTweensOf(cards);
      gsap.set(cards, { opacity: 0, y: 10, scale: 0.94 });
      textEls.forEach(t => { if (t) t.textContent = ''; });
    };

    const typeText = (el: HTMLElement, text: string, onComplete: () => void): void => {
      el.textContent = '';
      let i = 0;
      const charSpeed = 18;

      const tick = (): void => {
        if (!isOpen && !isMobile()) { el.textContent = ''; return; }
        if (i < text.length) {
          el.textContent += text[i++];
          typingTimers.push(window.setTimeout(tick, charSpeed));
        } else {
          onComplete();
        }
      };

      typingTimers.push(window.setTimeout(tick, 0));
    };

    const animateCard = (index: number): void => {
      if (index >= cards.length) { isAnimating = false; return; }
      if (!isOpen && !isMobile()) return;

      gsap.to(cards[index], {
        opacity : 1,
        y       : 0,
        scale   : 1,
        duration: 0.34,
        ease    : 'back.out(1.5)',
        onComplete: () => {
          if (!isOpen && !isMobile()) return;
          const el = textEls[index];
          if (el) {
            typeText(el, originalTexts[index], () => {
              typingTimers.push(window.setTimeout(() => animateCard(index + 1), 180));
            });
          } else {
            animateCard(index + 1);
          }
        },
      });
    };

    const startSequence = (): void => {
      if (isAnimating) return;
      isAnimating = true;
      typingTimers.push(window.setTimeout(() => animateCard(0), 60));
    };

    const isMobile = (): boolean => window.innerWidth <= 1100;

    if (isMobile()) {
      isOpen = true;
      this.triggerMobileNotesAnimation = () => startSequence();
    } else {
      const openPanel = (): void => {
        if (isOpen) return;
        isOpen = true;
        panel.classList.add('notes-widget-panel--visible');
        resetCards();
        startSequence();
      };

      const closePanel = (): void => {
        if (!isOpen) return;
        isOpen = false;
        panel.classList.remove('notes-widget-panel--visible');
        resetCards();
      };

      widget.addEventListener('mouseenter', openPanel);
      widget.addEventListener('mouseleave', closePanel);
      widget.addEventListener('focusin',    openPanel);
      widget.addEventListener('focusout',   (e: FocusEvent) => {
        if (!widget.contains(e.relatedTarget as Node)) closePanel();
      });

      this.cleanupFns.push(() => {
        widget.removeEventListener('mouseenter', openPanel);
        widget.removeEventListener('mouseleave', closePanel);
      });
    }

    this.cleanupFns.push(() => clearTypingTimers());
  }

  // ---------------------------------------------------------------------------
  // Performance + helpers
  // ---------------------------------------------------------------------------

  private isPerformanceModeEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smallViewport = window.innerWidth <= 900;
    const cores         = navigator.hardwareConcurrency ?? 8;
    const deviceMemory  = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    return reducedMotion || smallViewport || cores <= 4 || deviceMemory <= 4;
  }

  private applyPerformanceClasses(): void {
    const pageCanvas = document.querySelector<HTMLElement>('.page-canvas');
    if (pageCanvas) pageCanvas.classList.toggle('perf-lite', this.perfLite);
  }

  private track<T extends gsap.core.Animation>(animation: T): T {
    this.animations.push(animation);
    return animation;
  }

  private startHeroAnimations(): void {
    if (this.heroAnimationsStarted) return;
    this.heroAnimationsStarted = true;
    this.animateHero();
    this.animateBackground();
  }

  private playLandingLoader(): Promise<void> {
    const loader       = document.querySelector<HTMLElement>('.landing-loader');
    const loaderText   = document.querySelector<HTMLElement>('.landing-loader-text');
    const loaderRound  = document.querySelector<HTMLElement>('.landing-loader-round');
    const welcomeTexts = gsap.utils.toArray<HTMLElement>('.landing-welcome-text');

    if (loader && this.prefersReducedMotion()) {
      try { loader.remove(); } catch (_) {}
      return Promise.resolve();
    }

    if (!loader || !loaderText || !loaderRound || welcomeTexts.length === 0) {
      return Promise.resolve();
    }

    const speed            = this.perfLite ? 0.82 : 1;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    gsap.set(welcomeTexts, { autoAlpha: 0 });
    gsap.set(loaderText,   { y: 0, autoAlpha: 1, force3D: false });
    gsap.set(loaderRound,  { scaleY: 1 });

    return new Promise((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        document.body.style.overflow = previousOverflow;
        try { loader.remove(); } catch (_) {}
        resolve();
      };

      this.cleanupFns.push(settle);

      const timeline = this.track(
        gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          onComplete : settle,
          onInterrupt: settle,
        })
      );

      welcomeTexts.forEach((text, index) => {
        const isFirst    = index === 0;
        const isLast     = index === welcomeTexts.length - 1;
        const holdTime   = (isFirst || isLast ? 0.6 : 0.12) * speed;

        if (isFirst) {
          timeline.to(text, {
            autoAlpha: 1,
            duration : 0.6 * speed,
            ease     : 'power2.out',
            delay    : 0.8 * speed,
          });
        } else {
          timeline.set(text, { autoAlpha: 1 });
        }

        if (!isLast) timeline.set(text, { autoAlpha: 0 }, `+=${holdTime}`);
      });

      timeline
        .call(() => loader.classList.add('is-exiting'), undefined, `+=${0.28 * speed}`)
        .to(loaderText, { y: -44, autoAlpha: 0, duration: 0.34 * speed, ease: 'power3.inOut', force3D: false })
        .call(() => { if (this.isDestroyed) return; this.startHeroAnimations(); })
        .to(loader, { yPercent: -110, duration: 0.86 * speed, ease: 'expo.inOut', force3D: true }, '-=0.08');
    });
  }

  private animateHero(): void {
    const baseDuration = this.perfLite ? 0.74 : 1;
    const tl = this.track(gsap.timeline({ defaults: { ease: 'power3.out' } }));

    tl.from('.hero-nav',       { y: -20, autoAlpha: 0, duration: 0.8  * baseDuration })
      .from('.hero-name',      { y: 48,  autoAlpha: 0, duration: 1.05 * baseDuration }, '-=0.28')
      .from('.hero-professions',{ y: 20, autoAlpha: 0, duration: 0.82 * baseDuration }, '-=0.68')
      .fromTo(
        '.solari-tile',
        { autoAlpha: 0, rotateX: 90 },
        {
          autoAlpha      : 1,
          rotateX        : 0,
          duration       : this.perfLite ? 0.42 : 0.5,
          stagger        : this.perfLite ? 0.06 : 0.08,
          ease           : 'power4.out',
          transformOrigin: 'center center',
        },
        '+=0.02'
      )
      .call(() => {
        if (this.prefersReducedMotion()) { this.showSolariTarget(); return; }
        this.queueSolariTimer(() => this.playSolariIntroSequence(), 0);
      })
      .from('.notes-widget',    { x: 26, autoAlpha: 0, duration: 0.9  * baseDuration }, '-=0.24')
      .call(() => {
        if (this.triggerMobileNotesAnimation) {
          this.triggerMobileNotesAnimation();
          this.triggerMobileNotesAnimation = null;
        }
      })
      .from('.hero-local-time', { y: 18, autoAlpha: 0, duration: 0.74 * baseDuration }, '-=0.46')
      .from('.scroll-text',     { y: 12, autoAlpha: 0, duration: 0.74 * baseDuration }, '-=0.42')
      .from('.scroll-line',     { y: -10,autoAlpha: 0, duration: 0.7  * baseDuration }, '-=0.48');
  }

  // ---------------------------------------------------------------------------
  // Solari board
  // ---------------------------------------------------------------------------

  private injectSolariKeyframes(): void {
    if (document.querySelector('#hero-solari-keyframes')) return;

    const style = document.createElement('style');
    style.id = 'hero-solari-keyframes';
    style.textContent = `
      @keyframes solariFlapDown {
        from { transform: rotateX(0deg); }
        to { transform: rotateX(-90deg); }
      }

      @keyframes solariFlapUp {
        from { transform: rotateX(90deg); }
        to { transform: rotateX(0deg); }
      }
    `;
    document.head.appendChild(style);
  }

  private setupSolariBoard(): void {
    this.injectSolariKeyframes();
    const board = document.querySelector<HTMLElement>('.solari-board');

    if (!board) return;

    this.solariScopeAttr ??= this.getAngularScopeAttribute(board);

    if (!this.solariBoardInitialized) {
      this.buildSolariBoard(board);
      this.solariBoardInitialized = true;
    }

    if (this.prefersReducedMotion()) this.showSolariTarget();
  }

  private buildSolariBoard(board: HTMLElement): void {
    board.replaceChildren();
    this.solariTiles = [];
    const enableHoverGlitch = !this.perfLite && this.canUseHoverEffects();

    this.solariTarget.split('').forEach(() => {
      const tile = document.createElement('div');
      tile.className = 'solari-tile';
      tile.innerHTML = `
        <div class="solari-half solari-half--top"><span class="solari-char">.</span></div>
        <div class="solari-half solari-half--bottom"><span class="solari-char">.</span></div>
        <div class="solari-flap solari-flap--top"><span class="solari-char">.</span></div>
        <div class="solari-flap solari-flap--bottom"><span class="solari-char">.</span></div>
        <div class="solari-divider"></div>
      `;

      this.applyScopeAttribute(tile);
      board.appendChild(tile);
      tile.classList.add('is-dot');

      this.solariTiles.push({
        el    : tile,
        current: '.',
        htop  : tile.querySelector<HTMLElement>('.solari-half--top .solari-char')!,
        hbot  : tile.querySelector<HTMLElement>('.solari-half--bottom .solari-char')!,
        ftop  : tile.querySelector<HTMLElement>('.solari-flap--top')!,
        fbot  : tile.querySelector<HTMLElement>('.solari-flap--bottom')!,
        ftopc : tile.querySelector<HTMLElement>('.solari-flap--top .solari-char')!,
        fbotc : tile.querySelector<HTMLElement>('.solari-flap--bottom .solari-char')!,
        busy  : false,
        glitchTimer: null,
      });

      const created = this.solariTiles[this.solariTiles.length - 1];
      this.resetSolariTile(created, '.');

      if (enableHoverGlitch) {
        const onMouseEnter = () => this.startSolariGlitch(created);
        const onMouseLeave = () => this.stopSolariGlitch(created);
        created.el.addEventListener('mouseenter', onMouseEnter);
        created.el.addEventListener('mouseleave', onMouseLeave);
        this.cleanupFns.push(() => {
          try {
            created.el.removeEventListener('mouseenter', onMouseEnter);
            created.el.removeEventListener('mouseleave', onMouseLeave);
          } catch (_) {}
          this.stopSolariGlitch(created, false);
        });
      }
    });

    const onBoardClick = () => {
      if (this.solariIntroInProgress) return;
      if (this.prefersReducedMotion()) { this.showSolariTarget(); return; }
      this.replaySolariBoard();
    };

    board.addEventListener('click', onBoardClick);
    this.cleanupFns.push(() => board.removeEventListener('click', onBoardClick));
  }

  private getAngularScopeAttribute(element: HTMLElement): string | null {
    return element.getAttributeNames().find(name => name.startsWith('_ngcontent-')) ?? null;
  }

  private canUseHoverEffects(): boolean {
    return typeof window !== 'undefined'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  private applyScopeAttribute(root: HTMLElement): void {
    if (!this.solariScopeAttr) return;
    root.setAttribute(this.solariScopeAttr, '');
    root.querySelectorAll<HTMLElement>('*').forEach(node =>
      node.setAttribute(this.solariScopeAttr!, '')
    );
  }

  private getSolariGlitchChar(): string {
    return this.solariGlitchChars.charAt(
      Math.floor(Math.random() * this.solariGlitchChars.length)
    );
  }

  private syncSolariGlyph(tile: SolariTile, character: string): void {
    tile.htop.textContent  = character;
    tile.hbot.textContent  = character;
    tile.ftopc.textContent = character;
    tile.fbotc.textContent = character;
  }

  private startSolariGlitch(tile: SolariTile): void {
    if (tile.busy || this.solariIntroInProgress || this.prefersReducedMotion()) return;
    if (tile.current === '.' || tile.glitchTimer !== null) return;

    tile.el.classList.add('is-glitching');

    const tick = () => {
      if (this.isDestroyed || tile.busy || this.solariIntroInProgress) {
        this.stopSolariGlitch(tile);
        return;
      }
      this.syncSolariGlyph(tile, this.getSolariGlitchChar());
      const baseDelay = this.perfLite ? 72 : 34;
      const spread    = this.perfLite ? 120 : 74;
      tile.glitchTimer = window.setTimeout(tick, baseDelay + Math.floor(Math.random() * spread));
    };

    tile.glitchTimer = window.setTimeout(tick, 0);
  }

  private stopSolariGlitch(tile: SolariTile, restore = true): void {
    if (tile.glitchTimer !== null) {
      window.clearTimeout(tile.glitchTimer);
      tile.glitchTimer = null;
    }
    tile.el.classList.remove('is-glitching');
    if (restore && !tile.busy) this.syncSolariGlyph(tile, tile.current);
  }

  private replaySolariBoard(): void {
    if (!this.solariTiles.length) return;
    this.solariRunId += 1;
    this.solariIntroInProgress = false;
    this.clearSolariTimers();
    this.resetSolariBoard();
    const runId = this.solariRunId;
    this.solariTarget.split('').forEach((letter, index) => {
      this.runSolariSequence(this.solariTiles[index], letter, 140 + index * 115, runId);
    });
  }

  private playSolariIntroSequence(): void {
    if (!this.solariTiles.length) return;
    this.solariRunId += 1;
    this.solariIntroInProgress = true;
    this.clearSolariTimers();
    this.resetSolariBoard('.');

    const runId      = this.solariRunId;
    const tileStagger = this.perfLite ? 42 : 56;
    const wordHold   = this.perfLite ? 420 : 560;
    const wordRun    = this.solariFlipTotal + (this.solariTiles.length - 1) * tileStagger;
    let wordStart    = 90;

    this.solariIntroWords.forEach((word, wordIndex) => {
      const slots = this.getSolariWordSlots(word);
      slots.forEach((character, index) => {
        this.queueSolariTimer(() => {
          if ((runId !== 0 && runId !== this.solariRunId) || this.isDestroyed) return;
          this.flipSolariTile(this.solariTiles[index], character, runId);
        }, wordStart + index * tileStagger);
      });

      wordStart += wordRun + wordHold;

      if (wordIndex === this.solariIntroWords.length - 1) {
        this.queueSolariTimer(() => {
          if ((runId !== 0 && runId !== this.solariRunId) || this.isDestroyed) return;
          this.solariIntroInProgress = false;
        }, wordStart + 120);
      }
    });
  }

  private getSolariWordSlots(word: string): string[] {
    const tileCount = this.solariTiles.length || this.solariTarget.length;
    const slots     = Array.from({ length: tileCount }, () => '.');
    const letters   = Array.from(word.toUpperCase()).slice(0, tileCount);
    const start     = Math.max(0, Math.floor((tileCount - letters.length) / 2));
    letters.forEach((letter, index) => { slots[start + index] = letter; });
    return slots;
  }

  private runSolariSequence(
    tile: SolariTile, target: string, startDelay: number, runId: number
  ): void {
    const totalFlips = 18 + Math.floor(Math.random() * 8);

    const gap = (step: number): number => {
      const p = step / totalFlips;
      return 80 + Math.pow(p, 2.4) * 300;
    };

    let step = 0;

    const next = (): void => {
      if (runId !== this.solariRunId || this.isDestroyed) return;
      const isLast = step === totalFlips - 1;
      const char   = isLast
        ? target
        : this.solariChars.charAt(Math.floor(Math.random() * this.solariChars.length));

      const tryFlip = (): void => {
        if (runId !== this.solariRunId || this.isDestroyed) return;
        if (tile.busy) { this.queueSolariTimer(tryFlip, 16); return; }
        this.flipSolariTile(tile, char, runId);
        step++;
        if (!isLast) this.queueSolariTimer(next, gap(step) + this.solariFlipMs);
      };

      tryFlip();
    };

    this.queueSolariTimer(next, startDelay);
  }

  private flipSolariTile(tile: SolariTile, newChar: string, runId: number): void {
    if ((runId !== 0 && runId !== this.solariRunId) || this.isDestroyed) return;

    if (tile.busy) {
      this.queueSolariTimer(() => this.flipSolariTile(tile, newChar, runId), 16);
      return;
    }

    if (tile.current === newChar) {
      this.updateSolariPlaceholderState(tile, newChar);
      return;
    }

    tile.busy = true;
    const oldChar = tile.current;
    tile.current  = newChar;
    this.updateSolariPlaceholderState(tile, newChar);

    tile.htop.textContent = newChar;
    tile.hbot.textContent = oldChar;

    tile.ftopc.textContent    = oldChar;
    tile.ftop.style.animation = 'none';
    tile.fbot.style.animation = 'none';
    void tile.ftop.offsetWidth;
    tile.ftop.style.animation = `solariFlapDown ${this.solariFlipMs}ms ease-in forwards`;

    tile.fbotc.textContent = newChar;
    this.queueSolariTimer(() => {
      if (this.isDestroyed) return;
      void tile.fbot.offsetWidth;
      tile.fbot.style.animation = `solariFlapUp ${this.solariFlipMs}ms ease-out forwards`;
    }, Math.round(this.solariFlipMs * 0.40));

    this.queueSolariTimer(() => {
      if (this.isDestroyed) return;
      tile.hbot.textContent     = newChar;
      tile.ftop.style.animation = 'none';
      tile.fbot.style.animation = 'none';
      void tile.ftop.offsetWidth;
      tile.ftop.style.transform  = '';
      tile.fbot.style.transform  = 'rotateX(90deg)';
      tile.ftopc.textContent     = newChar;
      tile.fbotc.textContent     = newChar;
      tile.el.classList.remove('is-flipping');
      this.updateSolariPlaceholderState(tile, newChar);
      tile.busy = false;
    }, this.solariFlipMs * 2 + 20);
  }

  private resetSolariBoard(character = '.'): void {
    this.solariTiles.forEach(tile => this.resetSolariTile(tile, character));
  }

  private showSolariTarget(): void {
    this.clearSolariTimers();
    this.solariRunId += 1;
    this.solariIntroInProgress = false;
    this.solariTarget.split('').forEach((letter, index) => {
      const tile = this.solariTiles[index];
      if (!tile) return;
      this.resetSolariTile(tile, letter);
    });
  }

  private resetSolariTile(tile: SolariTile, character: string): void {
    this.stopSolariGlitch(tile, false);
    tile.current           = character;
    tile.htop.textContent  = character;
    tile.hbot.textContent  = character;
    tile.ftopc.textContent = character;
    tile.fbotc.textContent = character;
    tile.ftop.style.animation = 'none';
    tile.fbot.style.animation = 'none';
    tile.ftop.style.transform = '';
    tile.fbot.style.transform = 'rotateX(90deg)';
    tile.el.classList.remove('is-flipping');
    this.updateSolariPlaceholderState(tile, character);
    tile.busy = false;
  }

  private updateSolariPlaceholderState(tile: SolariTile, character: string): void {
    tile.el.classList.toggle('is-dot', character.trim() === '' || character === '.');
  }

  private queueSolariTimer(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.solariTimers.delete(timer);
      callback();
    }, delay);
    this.solariTimers.add(timer);
  }

  private clearSolariTimers(): void {
    this.solariTimers.forEach(timer => window.clearTimeout(timer));
    this.solariTimers.clear();
    this.solariTiles.forEach(tile => {
      this.stopSolariGlitch(tile, false);
      try { tile.el.classList.remove('is-flipping'); } catch (_) {}
    });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private setupLocalTime(): void {
    const el = document.querySelector<HTMLElement>('.local-time-value');
    if (!el) return;

    const pad  = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      const t = new Date();
      el.textContent = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
    };

    tick();

    const msToNextSecond = 1000 - (Date.now() % 1000);
    this.localTimeAligner = window.setTimeout(() => {
      tick();
      this.localTimeTimer  = window.setInterval(tick, 1000);
      this.localTimeAligner = null;
    }, msToNextSecond);

    this.cleanupFns.push(() => {
      if (this.localTimeAligner !== null) {
        window.clearTimeout(this.localTimeAligner);
        this.localTimeAligner = null;
      }
      if (this.localTimeTimer !== null) {
        window.clearInterval(this.localTimeTimer);
        this.localTimeTimer = null;
      }
    });
  }

  private animateBackground(): void {
    if (this.perfLite) {
      gsap.set('.blob-1', { x: 0, y: 0 });
      gsap.set('.blob-2', { x: 0, y: 0 });
      gsap.set('.blob-3', { x: 0, y: 0 });
      return;
    }

    this.track(gsap.to('.blob-1', { x: 56,  y: 42,  duration: 36, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
    this.track(gsap.to('.blob-2', { x: -66, y: 48,  duration: 44, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
    this.track(gsap.to('.blob-3', { x: 60,  y: -56, duration: 52, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
  }
}
