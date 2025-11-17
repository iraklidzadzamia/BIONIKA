// ============================================================
// LANGUAGE DETECTOR FOR VETIBOT
// Определяет: Georgian (script), Georgian (translit), Russian, English
// ManyChat НЕ используется, детектор работает самостоятельно
// ============================================================

// ---- 0) Извлечение текста
let textRaw = '';

// Извлекаем из chatGptRequest если есть
if ($json.chatGptRequest) {
  const parts = $json.chatGptRequest.split("User's Message:");
  if (parts.length > 1) {
    textRaw = parts[1].trim();
  }
}

// Если не нашли, пробуем стандартные поля
if (!textRaw) {
  textRaw = String(
    $json?.message?.text ??
    $json?.text ??
    $json?.last_input_text ??
    ''
  ).trim();
}

// ---- 1) Если текста НЕТ вообще - фолбэк на ManyChat (редкий случай)
if (!textRaw || textRaw.length === 0) {
  const language_from_manychat = $json.language_code ?? $json.language ?? null;
  let fallback_lang = null;

  if (language_from_manychat) {
    const normalized = String(language_from_manychat).toLowerCase();
    if (normalized === 'en' || normalized === 'english') {
      fallback_lang = 'en';
    } else if (normalized === 'ru' || normalized === 'russian') {
      fallback_lang = 'ru';
    } else if (normalized === 'ka' || normalized === 'georgian') {
      fallback_lang = 'ka';
    }
  }

  return {
    ...$json,
    text: '',
    lang_hint: fallback_lang,
    language_code: fallback_lang,
  };
}

// ---- 2) У нас ЕСТЬ текст - анализируем его сами
const lower = textRaw.toLowerCase();

// Подсчёт символов по алфавитам
const georgianChars = (textRaw.match(/[\u10A0-\u10FF]/g) || []).length; // ქართული
const cyrillicChars = (textRaw.match(/[\u0400-\u04FF]/g) || []).length;  // кириллица
const latinChars    = (textRaw.match(/[A-Za-z]/g)       || []).length;   // латиница

// ---- 3) ПРИОРИТЕТ 1: Грузинская письменность
if (georgianChars > 0) {
  return {
    ...$json,
    text: textRaw,
    lang_hint: 'ka',
    language_code: 'ka',
  };
}

// ---- 4) ПРИОРИТЕТ 2: Грузинский транслит
const wordsCore = [
  'gamarjoba','rogor','karg','madlob','ara','ki','tu','ra','ramdeni','romel','rato','sad',
  'dges','dghe','gushin','xval','saat','saatze','saatamde','ghame','dila','shua','kvira','kvirashi','tve','tveshi',
  'shegidzli','sheidzleba','ginda','mind','unda','aris',
  'movide','movedi','mivdivar','mivigot','gadavide','gavaketo','gakhdeba',
  'dzaghli','dzagli','kata','k\'ata','vet','klinika','vakcin','chip','pasport','gruming','konsult',
  'tbilisi','isani','vake','saburtalo','gldani','didube','chugureti'
];
const days    = ['orshabati','samshabati','otxshabati','xutshabati','paraskevi','shabati','kvira'];
const months  = ['ianvari','tebervali','marti','aprili','maisi','ivnisi','ivlisi','avgusti','septemberi','oktomberi','noemberi','dekemberi'];
const postpos = ['shi','ze','dan','amde','tan','sken','gan','tvis','ze-s','shi-s'];
const clusters = /(tqv|tkv|shv|dz|ts|kh|xv|gh|q'|qv|cx|sx|chv|zhv)/g;
const translitAnchors = /\b(sad|mdebar|rodis|saati|sheidzleba|gamarjoba|madloba|dzagli|dzaghli|k'at|k'ata)\b/i;

const countHits = (arr) => arr.reduce((a,w)=> a + (lower.includes(w) ? 1 : 0), 0);
const wordsHits = countHits(wordsCore) + countHits(days) + countHits(months);

const tokens = lower.split(/[^a-z\u10a0-\u10ff]+/).filter(Boolean);
let postHits = 0;
for (const t of tokens) {
  for (const p of postpos) {
    if (t.endsWith(p)) { postHits++; break; }
  }
}

const clusterHits = (lower.match(clusters) || []).length;
const translitBonus = translitAnchors.test(lower) ? 2 : 0;

const score = wordsHits*3 + postHits*2 + clusterHits + translitBonus;

const STRICT_TH = 6;  // Уверенно грузинский транслит
const BIAS_TH   = 3;  // Вероятно грузинский транслит

const strongTranslit = score >= STRICT_TH;
const weakButLikely  = score >= BIAS_TH;

if (strongTranslit) {
  // Уверенно грузинский транслит
  return {
    ...$json,
    text: textRaw,
    lang_hint: 'ka',
    language_code: 'ka',
  };
}

if (weakButLikely) {
  // Вероятно транслит, но проверим нет ли английских стоп-слов
  const enStop = /\b(what|where|why|how|when|please|thanks?|sorry|can|could|would|should|will|my|our|your|we|you|they|dog|cat|problem|address|are|is|am|the|and|or|to|for|with|at|in|on|by|from|help|need|want)\b/i;

  if (!enStop.test(lower)) {
    // Нет английских стоп-слов → скорее всего транслит
    return {
      ...$json,
      text: textRaw,
      lang_hint: 'ka',
      language_code: 'ka',
    };
  }
}

// ---- 5) ПРИОРИТЕТ 3: Кириллица = Русский
if (cyrillicChars > 0) {
  // Даже если есть латиница, кириллица важнее
  return {
    ...$json,
    text: textRaw,
    lang_hint: 'ru',
    language_code: 'ru',
  };
}

// ---- 6) ПРИОРИТЕТ 4: Латиница без грузинских маркеров = Английский
if (latinChars > 0) {
  return {
    ...$json,
    text: textRaw,
    lang_hint: 'en',
    language_code: 'en',
  };
}

// ---- 7) EDGE CASE: Только цифры/эмодзи/пунктуация
// Оставляем lang_hint как был (обычно из state.lang в AI Agent)
return {
  ...$json,
  text: textRaw,
  lang_hint: $json.lang_hint ?? null,
  language_code: $json.language_code ?? null,
};
