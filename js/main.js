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

const findTariffCard = (input) => input.closest('.tariff');

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
  const cards = document.querySelectorAll('.tariff[data-brand]');
  if (!buttons.length || !cards.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const brand = button.dataset.brand;

      buttons.forEach((other) => {
        const active = other === button;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });

      cards.forEach((card) => {
        const visible = brand === 'all' || card.dataset.brand === brand;
        card.hidden = !visible;
        if (visible) card.classList.add('is-in');
      });
    });
  });
};

/* ===== переключатель планов 8/12 проверок ===== */

const updateCardPrice = (card, plan) => {
  const price = getCardPrice(card.dataset.tariff, plan);
  if (!price) return;

  const value = card.querySelector('.tariff__price-value');
  if (value) value.textContent = formatNumber(price.current);
};

const initPlans = () => {
  const inputs = document.querySelectorAll('.plan-pill__input');
  if (!inputs.length) return;

  inputs.forEach((input) => {
    input.addEventListener('change', () => {
      const card = findTariffCard(input);
      if (card) updateCardPrice(card, input.value);
    });
  });
};

/* ===== запуск ===== */

const init = () => {
  [initMenu, initReveals, initCounters, initStages, initFilters, initPlans]
    .forEach((feature) => feature());
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
