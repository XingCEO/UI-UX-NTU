document.addEventListener("DOMContentLoaded", () => {
  const hasGSAP = typeof gsap !== "undefined";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (hasGSAP) document.body.classList.add("gsap-ready");

  // ── Instant reveal if no animation ──
  if (reducedMotion || !hasGSAP) {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("revealed"));
    if (!hasGSAP) return;
  }

  // ── Hero entrance (GSAP timeline, one-shot, no ScrollTrigger) ──
  if (!reducedMotion) {
    const tl = gsap.timeline({ defaults: { ease: "power1.out", duration: 0.32 } });
    tl.delay(0.1);

    const q = s => document.querySelector(s);
    const eyebrow = q(".hero-eyebrow");
    const title = q(".hero-title");
    const subtitle = q(".hero-subtitle");
    const mission = q(".hero-mission");
    const cta = q(".hp-hero-actions");
    const phone = q(".hp-phone");
    const rings = document.querySelectorAll(".hp-hero-ring");

    if (eyebrow) tl.fromTo(eyebrow, { opacity: 0, y: 8 }, { opacity: 1, y: 0 });
    if (title) tl.fromTo(title, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.36 }, "-=0.2");
    if (subtitle) tl.fromTo(subtitle, { opacity: 0, y: 8 }, { opacity: 1, y: 0 }, "-=0.22");
    if (mission) tl.fromTo(mission, { opacity: 0, y: 8 }, { opacity: 1, y: 0 }, "-=0.22");
    if (cta) tl.fromTo(cta, { opacity: 0, y: 8 }, { opacity: 1, y: 0 }, "-=0.18");
    if (phone) tl.fromTo(phone, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.42 }, "-=0.24");
    if (rings.length) tl.fromTo(rings, { opacity: 0 }, { opacity: 1, duration: 0.34, stagger: 0.05 }, "-=0.2");

    if (phone) {
      gsap.to(phone, {
        y: -4,
        duration: 2.6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }
  }

  // ── Scroll reveals via native IntersectionObserver (zero scroll-listener overhead) ──
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      io.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  // ── Counter animation via IO (no ScrollTrigger) ──
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const counter = entry.target;
      counterIO.unobserve(counter);
      const target = parseFloat(counter.getAttribute("data-target")) || 0;
      if (!hasGSAP) { counter.textContent = target.toLocaleString(); return; }
      const obj = { val: 0 };
      let last = -1;
      gsap.to(obj, {
        val: target, duration: 1, ease: "power2.out",
        onUpdate: () => {
          const r = Math.round(obj.val);
          if (r !== last) { counter.textContent = r.toLocaleString(); last = r; }
        },
      });
    });
  }, { threshold: 0.3 });

  document.querySelectorAll(".gsap-counter").forEach(c => counterIO.observe(c));

  // ── i18n language change: re-init counters ──
  new MutationObserver(mutations => {
    if (!mutations.some(m => m.attributeName === "lang")) return;
    document.querySelectorAll(".gsap-counter").forEach(c => {
      c.dataset.animated = "";
      counterIO.observe(c);
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
});
