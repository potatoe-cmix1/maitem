// 1. Target Element Selection (HTML -> JS)
const yearSpan = document.getElementById('year');
const themeBtn = document.getElementById('theme-btn');
const contactBtn = document.getElementById('contact-btn');
const contactForm = document.getElementById('contact-form');
const toastRegion = document.getElementById('toast-region');

// 2. Dynamic Content Injection (JS -> HTML)
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// 3. Event Handling and Class Toggling (JS -> HTML/CSS)
// Restore the saved theme (storage can be unavailable, so it is wrapped)
try {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
} catch (e) { /* ignore */ }

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    // Toggles .dark-mode defined in style.css on the <body> tag
    const isDark = document.body.classList.toggle('dark-mode');
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
  });
}

// 4. Custom notification system (replaces alert())
function notify(message, { type = 'info', title = '', duration = 5000 } = {}) {
  if (!toastRegion) return;

  const titles = { success: 'Success', error: 'Please check the form', info: 'Notice' };
  const icons = { success: '\u2713', error: '!', info: 'i' };

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.style.setProperty('--duration', duration + 'ms');

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = icons[type] || 'i';

  const body = document.createElement('div');
  const heading = document.createElement('div');
  heading.className = 'toast-title';
  heading.textContent = title || titles[type] || 'Notice';
  const text = document.createElement('div');
  text.className = 'toast-text';
  text.textContent = message;
  body.append(heading, text);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.innerHTML = '&times;';

  const bar = document.createElement('div');
  bar.className = 'toast-bar';

  toast.append(icon, body, close, bar);
  toastRegion.appendChild(toast);

  let removed = false;
  let remaining = duration;
  let startedAt = Date.now();
  let timer = null;

  const dismiss = () => {
    if (removed) return;
    removed = true;
    clearTimeout(timer);
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 200);
  };

  // The timer lives in JS so pause/resume is reliable; the bar only mirrors it.
  const resume = () => {
    if (removed || timer) return;
    startedAt = Date.now();
    timer = setTimeout(dismiss, remaining);
    bar.style.animationPlayState = 'running';
  };
  const pause = () => {
    if (removed || !timer) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
    bar.style.animationPlayState = 'paused';
  };

  close.addEventListener('click', dismiss);
  toast.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(); });
  // Mouse only: touch "hover" would stay stuck and keep the toast open forever
  toast.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pause(); });
  toast.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') resume(); });
  toast.addEventListener('focusin', pause);
  toast.addEventListener('focusout', resume);

  resume();

  // Keep the stack short on small screens
  while (toastRegion.children.length > 4) toastRegion.firstChild.remove();
}

// 5. Contact form: validation and feedback
function setError(input, message) {
  const field = input.closest('.field');
  let err = field.querySelector('.field-error');
  if (!err) {
    err = document.createElement('div');
    err.className = 'field-error';
    err.id = input.id + '-error';
    field.appendChild(err);
  }
  err.textContent = message;
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

function validate(form) {
  const name = form.elements.name;
  const email = form.elements.email;
  const message = form.elements.message;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const problems = [];

  setError(name, name.value.trim() ? '' : 'Enter your name.');
  setError(email, emailPattern.test(email.value.trim()) ? '' : 'Enter a valid email address.');
  setError(message, message.value.trim().length >= 10 ? '' : 'Write at least 10 characters.');

  [name, email, message].forEach((el) => { if (el.hasAttribute('aria-invalid')) problems.push(el); });
  return problems;
}

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const problems = validate(contactForm);
    if (problems.length) {
      notify('Fix the highlighted fields and send again.', { type: 'error' });
      problems[0].focus();
      return;
    }
    const name = contactForm.elements.name.value.trim();
    // Contact form has no server yet, so the message is not actually sent.
    notify('Thank you for reaching out, ' + name + '! Your message is ready to send once the contact service is connected.', {
      type: 'success',
      title: 'Message received'
    });
    contactForm.reset();
  });

  // Clear an error as soon as the visitor fixes the field
  contactForm.addEventListener('input', (e) => {
    if (e.target.hasAttribute('aria-invalid')) setError(e.target, '');
  });
}
