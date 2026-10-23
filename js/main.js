document.addEventListener('DOMContentLoaded', () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    // ANCHORS — smooth jump to sections
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
        });
    });


    // HERO — letters rise one by one
    let charIndex = 0;
    document.querySelectorAll('.split').forEach(el => {
        const text = el.textContent.trim();
        el.setAttribute('aria-label', text);
        el.textContent = '';
        for (const ch of text) {
            const mask = document.createElement('span');
            mask.className = 'char-mask';
            mask.setAttribute('aria-hidden', 'true');
            const char = document.createElement('span');
            char.className = 'char';
            char.style.setProperty('--i', charIndex++);
            char.textContent = ch;
            mask.appendChild(char);
            el.appendChild(mask);
        }
        el.classList.add('is-split');
    });


    // REVEAL ON ENTER
    const revealer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            revealer.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-reveal]').forEach(el => revealer.observe(el));


    // ABOUT — words light up as you read
    const aboutText = document.getElementById('about-text');
    let words = [];
    if (aboutText && !reduced) {
        const text = aboutText.textContent.replace(/\s+/g, ' ').trim();
        aboutText.textContent = '';
        text.split(' ').forEach((w, i, all) => {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = w;
            aboutText.appendChild(span);
            if (i < all.length - 1) aboutText.appendChild(document.createTextNode(' '));
        });
        words = Array.from(aboutText.querySelectorAll('.word'));
    }

    function updateWords() {
        if (!words.length) return;
        const box = aboutText.getBoundingClientRect();
        const vh = window.innerHeight;
        const start = vh * 0.85;
        const end = vh * 0.35;
        const progress = clamp((start - box.top) / (start - end + box.height * 0.5), 0, 1);
        const lit = progress * words.length;
        words.forEach((w, i) => {
            w.style.opacity = 0.16 + clamp(lit - i, 0, 1) * 0.84;
        });
    }


    // HERO — the two halves drift apart on scroll
    const parallax = Array.from(document.querySelectorAll('[data-parallax]'));

    function updateParallax() {
        if (reduced) return;
        const y = window.scrollY;
        if (y > window.innerHeight * 1.2) return;
        parallax.forEach(el => {
            el.style.transform = `translate3d(0, ${y * parseFloat(el.dataset.parallax)}px, 0)`;
        });
    }


    // SKILLS SPHERE — the one interactive thing
    const sphere = document.getElementById('sphere');
    const items = sphere ? Array.from(sphere.children) : [];
    const nodes = [];
    let rotX = -0.25, rotY = 0;
    let velX = 0, velY = 0.0025;
    const IDLE = 0.0025;
    let radius = 200, cx = 0, cy = 0;
    let dragging = false, lastX = 0, lastY = 0;
    let sphereVisible = false;

    if (sphere && items.length) {
        sphere.classList.add('is-live');
        const golden = Math.PI * (3 - Math.sqrt(5));
        items.forEach((el, i) => {
            const y = 1 - (i / (items.length - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const t = golden * i;
            nodes.push({ el, x: Math.cos(t) * r, y, z: Math.sin(t) * r });
        });

        const fit = () => {
            const box = sphere.getBoundingClientRect();
            cx = box.width / 2;
            cy = box.height / 2;
            radius = Math.min(box.width * 0.4, box.height * 0.34);
        };
        fit();
        window.addEventListener('resize', fit);

        new IntersectionObserver(([entry]) => {
            sphereVisible = entry.isIntersecting;
        }).observe(sphere);

        sphere.addEventListener('pointerdown', e => {
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            sphere.setPointerCapture(e.pointerId);
            sphere.classList.add('is-dragging');
        });
        sphere.addEventListener('pointermove', e => {
            if (!dragging) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            velY = dx * 0.006;
            velX = -dy * 0.006;
        });
        const release = () => {
            dragging = false;
            sphere.classList.remove('is-dragging');
        };
        sphere.addEventListener('pointerup', release);
        sphere.addEventListener('pointercancel', release);
    }

    function updateSphere() {
        if (!nodes.length || !sphereVisible) return;

        if (!dragging) {
            velY += ((reduced ? 0 : IDLE) - velY) * 0.03;
            velX *= 0.95;
        }
        rotY += velY;
        rotX = clamp(rotX + velX, -1.2, 1.2);

        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        const persp = radius * 3;

        for (const n of nodes) {
            const x1 = n.x * cosY - n.z * sinY;
            const z1 = n.x * sinY + n.z * cosY;
            const y2 = n.y * cosX - z1 * sinX;
            const z2 = n.y * sinX + z1 * cosX;

            const scale = persp / (persp - z2 * radius);
            const depth = (z2 + 1) / 2;
            const sx = cx + x1 * radius * scale;
            const sy = cy + y2 * radius * scale;

            n.el.style.transform =
                `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%) scale(${(0.4 + depth * 0.6) * scale})`;
            n.el.style.opacity = (0.08 + depth * depth * 0.92).toFixed(3);
            n.el.style.zIndex = Math.round(depth * 100);
        }
    }


    // ONE LOOP
    function frame() {
        updateParallax();
        updateWords();
        updateSphere();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
});
