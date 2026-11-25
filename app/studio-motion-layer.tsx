"use client";

import { useEffect } from "react";

/**
 * Lightweight site-wide motion layer.
 * Decorative SVG paths live behind content; reveal observers only add classes.
 * No animation library or runtime dependency is required.
 */
export default function StudioMotionLayer() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches || !("IntersectionObserver" in window)) return;

    const selector = [
      "main > section",
      "main > article",
      ".studio-feature",
      ".gallery-card",
      ".home-quick-submit",
      ".honor-micro-card",
      ".cinema-home-star-card",
      ".museum-teaser-card",
      ".site-menu-group",
      ".dashboard-card",
      ".assignment-card",
      ".submission-card"
    ].join(",");

    const reveal = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        if (element.dataset.motionReady === "1") return;
        element.dataset.motionReady = "1";
        element.classList.add("motion-reveal");
        element.style.setProperty("--motion-order", String(Math.min(index % 6, 5)));
        observer.observe(element);
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("motion-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -28px 0px" });

    reveal();
    const mutation = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.matches(selector)) reveal(node.parentElement ?? document);
          else reveal(node);
        }
      }));
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutation.disconnect();
      observer.disconnect();
    };
  }, []);

  return (
    <div className="studio-motion-layer" aria-hidden="true">
      <svg className="studio-motion-svg" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMin slice">
        <defs>
          <linearGradient id="studio-gold-path" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#C59B27" stopOpacity=".02" />
            <stop offset=".48" stopColor="#C59B27" stopOpacity=".22" />
            <stop offset="1" stopColor="#94A3B8" stopOpacity=".05" />
          </linearGradient>
        </defs>
        <path className="studio-path-base" d="M-100 170 C180 20 300 330 560 180 S930 40 1120 210 S1370 390 1540 180" />
        <path className="studio-path-trace studio-path-one" d="M-100 170 C180 20 300 330 560 180 S930 40 1120 210 S1370 390 1540 180" />
        <path className="studio-path-base studio-path-second" d="M-120 690 C140 520 330 850 570 680 S930 510 1130 700 S1370 850 1550 650" />
        <path className="studio-path-trace studio-path-two" d="M-120 690 C140 520 330 850 570 680 S930 510 1130 700 S1370 850 1550 650" />
        <circle r="4" className="studio-path-orb">
          <animateMotion dur="34s" repeatCount="indefinite" path="M-100 170 C180 20 300 330 560 180 S930 40 1120 210 S1370 390 1540 180" />
        </circle>
        <circle r="3" className="studio-path-orb studio-path-orb-muted">
          <animateMotion dur="42s" begin="-18s" repeatCount="indefinite" path="M-120 690 C140 520 330 850 570 680 S930 510 1130 700 S1370 850 1550 650" />
        </circle>
      </svg>
      <span className="studio-motion-grain" />
    </div>
  );
}
