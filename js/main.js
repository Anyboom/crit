/* критфактор — интерактив лендинга: без зависимостей, только браузерные API.
   Появление при скролле, счётчики, этапы, фильтр тарифов, переключение планов. */

/* ===== цены и тарифы — единственное место, где они правятся ===== */
const PRICES = {
  currency: '₽',

  // Разовые услуги. Ключ = data-tariff карточки.
  oneoff: {
    'dodo-rs': { price: 3900, label: '1 проверка' }
  },

  // Тарифы с планами проверок. Ключ = data-tariff, значение = план -> цена.
  // Скидка «−10%» на плане 12 показывается прямо в пилюле плана (index.html).
  tariffs: {
    'dodo-gc':       { '8': { current: 8500 },  '12': { current: 11500 } },
    'dodo-full':     { '8': { current: 15000 }, '12': { current: 20250 } },
    'drinkit-gc':    { '8': { current: 7500 },  '12': { current: 10100 } },
    'drinkit-full':  { '8': { current: 12000 }, '12': { current: 16200 } }
  }
};

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===== утилиты ===== */

const formatNumber = (value) => value.toLocaleString('ru-RU');

const getCardPrice = (tariffKey, plan) => {
  const planPrices = PRICES.tariffs[tariffKey];
  return planPrices ? planPrices[plan] : null;
};

/* ===== мобильное меню ===== */

const initMenu = () => {
  const button = document.querySelector('.header__menu');
  const sheet = document.getElementById('menu-sheet');
  if (!button || !sheet) return;

  const setExpanded = (expanded) => {
    button.setAttribute('aria-expanded', String(expanded));
    sheet.hidden = !expanded;
  };

  button.addEventListener('click', () => {
    setExpanded(button.getAttribute('aria-expanded') !== 'true');
  });

  sheet.addEventListener('click', (event) => {
    if (event.target.closest('a')) setExpanded(false);
  });
};

/* ===== появление секций при скролле ===== */

const initReveals = () => {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
  }, { threshold: 0.15 });

  items.forEach((item) => observer.observe(item));
};

/* ===== счётчики статистики ===== */

const renderCounter = (element, value, suffix) => {
  element.textContent = formatNumber(value) + (suffix || '');
};

const animateCounter = (element) => {
  const target = Number(element.dataset.count);
  const suffix = element.dataset.suffix || '';
  if (REDUCED_MOTION) {
    renderCounter(element, target, suffix);
    return;
  }

  const duration = 1200;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    renderCounter(element, Math.round(target * eased), suffix);
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const initCounters = () => {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  if (!('IntersectionObserver' in window)) {
    counters.forEach((element) => {
      renderCounter(element, Number(element.dataset.count), element.dataset.suffix || '');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
  }, { threshold: 0.4 });

  counters.forEach((element) => observer.observe(element));
};

/* ===== этапы «как это работает» ===== */

const initStages = () => {
  const chips = document.querySelectorAll('.chip[data-stage]');
  if (!chips.length) return;

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((other) => {
        const active = other === chip;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
        const stage = document.getElementById(other.dataset.stage);
        if (stage) stage.hidden = !active;
      });
    });
  });
};

/* ===== фильтр тарифов по брендам ===== */

const initFilters = () => {
  const buttons = document.querySelectorAll('.filter-btn[data-brand]');
  const rows = document.querySelectorAll('.tariff-row[data-brand]');
  if (!buttons.length || !rows.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const brand = button.dataset.brand;

      buttons.forEach((other) => {
        const active = other === button;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });

      rows.forEach((row) => {
        const visible = brand === 'all' || row.dataset.brand === brand;
        row.hidden = !visible;
        if (visible) row.classList.add('is-in');
      });
    });
  });
};

/* ===== глобальный переключатель планов 8/12 ===== */

const updateRowPrice = (row, plan) => {
  const price = getCardPrice(row.dataset.tariff, plan);
  if (!price) return;

  const value = row.querySelector('.tariff-row__value');
  if (value) value.textContent = formatNumber(price.current);
};

const initPlans = () => {
  const inputs = document.querySelectorAll('.plan-switch .plan-pill__input');
  const planRows = document.querySelectorAll('.tariff-row[data-tariff]');
  if (!inputs.length || !planRows.length) return;

  inputs.forEach((input) => {
    input.addEventListener('change', () => {
      planRows.forEach((row) => updateRowPrice(row, input.value));
    });
  });
};

/* ===== калькулятор стоимости сети ===== */

const CALC_POINTS_MIN = 1;
const CALC_POINTS_MAX = 10;

const CALC_FORMATS = {
  'dodo-full': 'Додо — вся пиццерия',
  'dodo-gc': 'Додо — камера ГЦ',
  'drinkit-full': 'Дринкит — вся кофейня',
  'drinkit-gc': 'Дринкит — камера бара'
};

const plural = (n, one, few, many) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const getCalcPoints = (root) => Math.min(
  CALC_POINTS_MAX,
  Math.max(CALC_POINTS_MIN, Number(root.dataset.points) || 1)
);

const getCalcCheckedValue = (root, name) => {
  const input = root.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : null;
};

const calcTotal = (tariff, plan, points) => {
  const price = getCardPrice(tariff, plan);
  return price ? price.current * points : null;
};

/* итог пересчитывается плавным счётчиком от прежнего значения */
const animateTotal = (element, target) => {
  const from = Number(element.dataset.value) || 0;
  element.dataset.value = String(target);
  if (REDUCED_MOTION || from === target) {
    element.textContent = formatNumber(target);
    return;
  }

  const duration = 500;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatNumber(Math.round(from + (target - from) * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const updateCalc = (root) => {
  const points = getCalcPoints(root);
  const tariff = getCalcCheckedValue(root, 'calc-tariff');
  const plan = getCalcCheckedValue(root, 'calc-plan');
  const total = calcTotal(tariff, plan, points);
  if (!total) return;

  const setText = (key, text) => {
    const el = root.querySelector(`[data-calc="${key}"]`);
    if (el) el.textContent = text;
  };

  setText('format', CALC_FORMATS[tariff] || tariff);
  setText('points', `${formatNumber(points)} ${plural(points, 'точка', 'точки', 'точек')}`);
  setText('checks', `${plan} проверок/мес на точку`);

  const totalEl = root.querySelector('.calc__total');
  if (totalEl) animateTotal(totalEl, total);
};

const setCalcPoints = (root, points) => {
  const next = Math.min(CALC_POINTS_MAX, Math.max(CALC_POINTS_MIN, points));
  if (next === getCalcPoints(root)) {
    updateCalc(root);
    return;
  }
  root.dataset.points = String(next);
  const valueEl = root.querySelector('.calc__points-value');
  if (valueEl) valueEl.textContent = String(next);
  updateCalc(root);
};

const initCalc = () => {
  const root = document.querySelector('.calc-panel');
  if (!root) return;

  root.addEventListener('change', (event) => {
    if (event.target.matches('input[type="radio"]')) updateCalc(root);
  });

  const minus = root.querySelector('.calc__step--minus');
  const plus = root.querySelector('.calc__step--plus');
  if (minus) minus.addEventListener('click', () => setCalcPoints(root, getCalcPoints(root) - 1));
  if (plus) plus.addEventListener('click', () => setCalcPoints(root, getCalcPoints(root) + 1));

  updateCalc(root);
};

/* ===== запуск ===== */

const init = () => {
  [initMenu, initReveals, initCounters, initStages, initFilters, initPlans, initCalc]
    .forEach((feature) => feature());
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
