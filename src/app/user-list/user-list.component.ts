import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements AfterViewInit {

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.initAnimations();
  }

  goNext() {
    this.router.navigate(['/']);
  }

  private initAnimations(): void {

    /* =========================
       HERO CONTENT ANIMATION
    ========================= */
    gsap.fromTo(
      '.hero-content h1',
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out'
      }
    );

    gsap.fromTo(
      '.hero-description',
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.3,
        ease: 'power3.out'
      }
    );

    gsap.fromTo(
      '.hero-content button',
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.6,
        ease: 'power3.out'
      }
    );

    /* =========================
       HERO GLASS CARDS (ENTER ONCE)
    ========================= */
    gsap.fromTo(
      '.glass-card',
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        clearProps: 'transform' // IMPORTANT: locks final position
      }
    );

    /* =========================
       FEATURE CARD (SLIGHT DELAY)
    ========================= */
    gsap.fromTo(
      '.feature-card',
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        delay: 1.1,
        ease: 'power3.out',
        clearProps: 'transform'
      }
    );

    /* =========================
       ABOUT SECTION SCROLL ANIMATION
    ========================= */
    gsap.from('.about', {
      scrollTrigger: {
        trigger: '.about',
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 80,
      duration: 1.2,
      ease: 'power3.out'
    });

    gsap.from('.about h2, .about p', {
      scrollTrigger: {
        trigger: '.about',
        start: 'top 85%'
      },
      opacity: 0,
      y: 40,
      stagger: 0.2,
      duration: 1,
      ease: 'power3.out'
    });
  }
}
