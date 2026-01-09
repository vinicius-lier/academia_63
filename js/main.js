const defaultConfig = {
  headline: 'O Caminho da Força\nComeça com Disciplina',
  subheadline: 'Judô como base filosófica. Formação de caráter, respeito e evolução pessoal através das artes marciais.',
  cta_text: 'Fale Conosco no WhatsApp',
  judo_title: '柔道 — O Caminho Suave',
  judo_text: 'O Judô é mais que uma arte marcial — é um caminho de educação física, mental e moral. Fundado por Jigoro Kano, seus princípios de "máxima eficiência com mínimo esforço" e "prosperidade e benefício mútuos" guiam nossa academia.',
  final_cta_title: 'Comece Sua Jornada',
  whatsapp_number: '(24) 99847-9444',
  background_color: '#f5f5f5',
  text_color: '#0a0a0a',
  accent_color: '#8B1A1A',
  surface_color: '#ffffff',
  secondary_color: '#374151',
  font_family: 'Noto Serif JP',
  font_size: 16
};

async function onConfigChange(config) {
  // Update headline
  const headlineEl = document.getElementById('headline');
  if (headlineEl) {
    const headlineText = config.headline || defaultConfig.headline;
    headlineEl.innerHTML = headlineText.replace(/\n/g, '<br/>');
  }

  // Update subheadline
  const subheadlineEl = document.getElementById('subheadline');
  if (subheadlineEl) {
    subheadlineEl.textContent = config.subheadline || defaultConfig.subheadline;
  }

  // Update CTA text
  const ctaTextEl = document.getElementById('cta-text');
  if (ctaTextEl) {
    ctaTextEl.textContent = config.cta_text || defaultConfig.cta_text;
  }

  // Update Judo section title
  const judoTitleEl = document.getElementById('judo-title');
  if (judoTitleEl) {
    judoTitleEl.textContent = config.judo_title || defaultConfig.judo_title;
  }

  // Update Judo text
  const judoTextEl = document.getElementById('judo-text');
  if (judoTextEl) {
    judoTextEl.textContent = config.judo_text || defaultConfig.judo_text;
  }

  // Update final CTA title
  const finalCtaTitleEl = document.getElementById('final-cta-title');
  if (finalCtaTitleEl) {
    finalCtaTitleEl.textContent = config.final_cta_title || defaultConfig.final_cta_title;
  }

  // Update WhatsApp number
  const whatsappEl = document.getElementById('whatsapp-number');
  if (whatsappEl) {
    whatsappEl.textContent = config.whatsapp_number || defaultConfig.whatsapp_number;
  }

  // Apply colors
  const accentColor = config.accent_color || defaultConfig.accent_color;
  const textColor = config.text_color || defaultConfig.text_color;
  const bgColor = config.background_color || defaultConfig.background_color;
  const surfaceColor = config.surface_color || defaultConfig.surface_color;
  const secondaryColor = config.secondary_color || defaultConfig.secondary_color;

  document.documentElement.style.setProperty('--color-red', accentColor);
  document.documentElement.style.setProperty('--color-black', textColor);
  document.documentElement.style.setProperty('--color-gray-light', bgColor);
  document.documentElement.style.setProperty('--color-white', surfaceColor);

  // Update accent colored elements
  document.querySelectorAll('.bg-red-900').forEach(el => {
    el.style.backgroundColor = accentColor;
  });
  document.querySelectorAll('.text-red-900').forEach(el => {
    el.style.color = accentColor;
  });
  document.querySelectorAll('.border-red-900').forEach(el => {
    el.style.borderColor = accentColor;
  });
  document.querySelectorAll('.text-red-700').forEach(el => {
    el.style.color = accentColor;
  });
  document.querySelectorAll('.border-red-700').forEach(el => {
    el.style.borderColor = accentColor;
  });
  document.querySelectorAll('.text-red-600').forEach(el => {
    el.style.color = accentColor;
  });

  // Update text colors
  document.querySelectorAll('.text-gray-900').forEach(el => {
    el.style.color = textColor;
  });
  document.querySelectorAll('.text-gray-600').forEach(el => {
    el.style.color = secondaryColor;
  });

  // Update backgrounds
  document.querySelectorAll('.bg-white').forEach(el => {
    el.style.backgroundColor = surfaceColor;
  });
  document.querySelectorAll('.bg-gray-50').forEach(el => {
    el.style.backgroundColor = bgColor;
  });

  // Update btn-primary gradient
  document.querySelectorAll('.btn-primary').forEach(el => {
    el.style.background = `linear-gradient(135deg, ${accentColor} 0%, ${adjustColor(accentColor, -20)} 100%)`;
  });

  // Apply font
  const fontFamily = config.font_family || defaultConfig.font_family;
  const baseFontStack = 'serif';
  document.querySelectorAll('.font-serif-jp').forEach(el => {
    el.style.fontFamily = `${fontFamily}, ${baseFontStack}`;
  });

  // Apply font size scaling
  const baseSize = config.font_size || defaultConfig.font_size;
  document.body.style.fontSize = `${baseSize}px`;
}

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function mapToCapabilities(config) {
  return {
    recolorables: [
      {
        get: () => config.background_color || defaultConfig.background_color,
        set: (value) => {
          config.background_color = value;
          window.elementSdk.setConfig({ background_color: value });
        }
      },
      {
        get: () => config.surface_color || defaultConfig.surface_color,
        set: (value) => {
          config.surface_color = value;
          window.elementSdk.setConfig({ surface_color: value });
        }
      },
      {
        get: () => config.text_color || defaultConfig.text_color,
        set: (value) => {
          config.text_color = value;
          window.elementSdk.setConfig({ text_color: value });
        }
      },
      {
        get: () => config.accent_color || defaultConfig.accent_color,
        set: (value) => {
          config.accent_color = value;
          window.elementSdk.setConfig({ accent_color: value });
        }
      },
      {
        get: () => config.secondary_color || defaultConfig.secondary_color,
        set: (value) => {
          config.secondary_color = value;
          window.elementSdk.setConfig({ secondary_color: value });
        }
      }
    ],
    borderables: [],
    fontEditable: {
      get: () => config.font_family || defaultConfig.font_family,
      set: (value) => {
        config.font_family = value;
        window.elementSdk.setConfig({ font_family: value });
      }
    },
    fontSizeable: {
      get: () => config.font_size || defaultConfig.font_size,
      set: (value) => {
        config.font_size = value;
        window.elementSdk.setConfig({ font_size: value });
      }
    }
  };
}

function mapToEditPanelValues(config) {
  return new Map([
    ['headline', config.headline || defaultConfig.headline],
    ['subheadline', config.subheadline || defaultConfig.subheadline],
    ['cta_text', config.cta_text || defaultConfig.cta_text],
    ['judo_title', config.judo_title || defaultConfig.judo_title],
    ['judo_text', config.judo_text || defaultConfig.judo_text],
    ['final_cta_title', config.final_cta_title || defaultConfig.final_cta_title],
    ['whatsapp_number', config.whatsapp_number || defaultConfig.whatsapp_number]
  ]);
}

// Initialize SDK
if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange,
    mapToCapabilities,
    mapToEditPanelValues
  });
}
