/* Адрес приёмника заявок. Пока пустой — заявки никуда не уходят,
   человек всё равно видит экран «принято». Как получить адрес —
   в _backend/apps-script.gs, там пошаговая инструкция. */
var FORM_ENDPOINT = '';

/* Маркетинг-неотложка — поведение лендинга.
   Четыре вещи: вкладки услуг, модалки, листание кейсов, мобильное меню. */
(function () {
  'use strict';

  /* ---------- вкладки услуг ---------- */
  var tabs = document.querySelectorAll('[data-tab]');
  function showTab(id) {
    document.querySelectorAll('[data-tab]').forEach(function (t) {
      var on = t.dataset.tab === id;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('is-active', p.id === id);
    });
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showTab(t.dataset.tab); });
  });
  // ссылки на услуги из подвала открывают нужную вкладку
  document.querySelectorAll('[data-tab-link]').forEach(function (a) {
    a.addEventListener('click', function () { showTab(a.dataset.tabLink); });
  });

  /* ---------- модалки ---------- */
  var overlay = document.querySelector('[data-overlay]');
  var CASES = ['case-01', 'case-02', 'case-03', 'case-04', 'case-05'];
  var current = null;

  function openModal(name) {
    var target = overlay.querySelector('[data-modal="' + name + '"]');
    if (!target) return;
    overlay.querySelectorAll('.modal').forEach(function (m) { m.classList.remove('is-open'); });
    target.classList.add('is-open');
    overlay.hidden = false;
    document.body.classList.add('is-locked');
    overlay.scrollTop = 0;
    current = name;
    var focusable = target.querySelector('input, button, a');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.classList.remove('is-locked');
    overlay.querySelectorAll('.modal').forEach(function (m) { m.classList.remove('is-open'); });
    current = null;
  }

  /* Пробел и Enter на элементах с role=button: без этого с клавиатуры
     не открывается ни одна модалка и ни один кейс. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest('[data-modal-open],[data-menu-open],[data-menu-close],[data-close]');
    if (!el || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT') return;
    e.preventDefault();
    el.click();
  });

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-modal-open]');
    if (opener) { e.preventDefault(); openModal(opener.dataset.modalOpen); return; }

    // закрываем только по крестику, кнопке «Закрыть» и клику по затемнению —
    // клик внутри карточки модалку не закрывает
    if (e.target.closest('[data-close]')) { closeModal(); return; }

    var prev = e.target.closest('[data-prev]');
    var next = e.target.closest('[data-next]');
    if ((prev || next) && current && CASES.indexOf(current) > -1) {
      var i = CASES.indexOf(current);
      var step = next ? 1 : -1;
      openModal(CASES[(i + step + CASES.length) % CASES.length]);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (overlay.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (current && CASES.indexOf(current) > -1) {
      var i = CASES.indexOf(current);
      if (e.key === 'ArrowRight') openModal(CASES[(i + 1) % CASES.length]);
      if (e.key === 'ArrowLeft') openModal(CASES[(i - 1 + CASES.length) % CASES.length]);
    }
  });

  /* ---------- мобильное меню ---------- */
  var menu = document.querySelector('[data-menu]');
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-menu-open]')) { menu.hidden = false; document.body.classList.add('is-locked'); }
    if (e.target.closest('[data-menu-close]')) { menu.hidden = true; document.body.classList.remove('is-locked'); }
  });

  /* ---------- формы ----------
     Данные уходят POST-запросом в Google Apps Script: он пишет строку в
     таблицу и присылает уведомление в Telegram. Токен бота живёт там, а не
     здесь, — в статике его увидел бы любой.
     Запрос простой (urlencoded), поэтому браузер не делает предварительный
     OPTIONS и CORS не мешает. Ответ не ждём: человеку важно увидеть
     подтверждение сразу, а потерянную заявку всё равно видно в журнале. */
  function send(form) {
    if (!FORM_ENDPOINT) return;
    var body = new URLSearchParams();
    body.append('form', form.dataset.form);
    body.append('page', location.href);
    new FormData(form).forEach(function (value, key) { body.append(key, value); });
    fetch(FORM_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    }).catch(function (e) { console.warn('Заявка не ушла:', e); });
  }

  document.querySelectorAll('[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var box = form.querySelector('.check input');
      var lab = form.querySelector('.check');
      if (lab) lab.classList.toggle('is-error', !!(box && !box.checked));
      if (!form.reportValidity()) return;
      send(form);
      form.reset();
      openModal('otpravleno');
    });
  });
  /* тень у шапки, когда страница сдвинута — иначе она срезает контент кромкой */
  var header = document.querySelector('.header');
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
