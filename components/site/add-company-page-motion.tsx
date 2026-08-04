"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

/**
 * One restrained motion system for the add-company page. The server-rendered
 * content stays visible without JavaScript; GSAP only orchestrates short
 * transform/opacity entrances after hydration. Reduced-motion users get the
 * complete static composition with no animation at all.
 */
export function AddCompanyPageMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({
          defaults: { duration: 0.36, ease: "power2.out" },
        });

        intro
          .from("[data-add-hero-copy] > *", {
            autoAlpha: 0,
            y: 18,
            stagger: 0.045,
          })
          .from(
            "[data-add-route-panel]",
            { autoAlpha: 0, x: 22, scale: 0.985 },
            "<0.08",
          )
          .from(
            "[data-add-benefit]",
            { autoAlpha: 0, x: 16, stagger: 0.055 },
            "<0.04",
          )
          .from(
            "[data-add-route-marker]",
            { autoAlpha: 0, scale: 0.35 },
            "<0.08",
          );

        const revealElements = gsap.utils.toArray<HTMLElement>(
          "[data-add-reveal]",
        );
        gsap.set(revealElements, { autoAlpha: 0, y: 24 });

        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              observer.unobserve(entry.target);
              gsap.to(entry.target, {
                autoAlpha: 1,
                y: 0,
                duration: 0.38,
                ease: "power2.out",
              });
            }
          },
          { rootMargin: "0px 0px -8%", threshold: 0.08 },
        );

        revealElements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
      });

      return () => media.revert();
    },
    { scope: rootRef },
  );

  return <div ref={rootRef}>{children}</div>;
}
