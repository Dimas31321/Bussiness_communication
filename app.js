/* Делком: обычный JavaScript, без сборки и библиотек.
   1. Каталог и страницы. 2. Попытка и сохранение. 3. Проверка и результаты.
   Для добавления вопросов меняйте data/*.js, а не этот файл. */
'use strict';
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const main = $('#main');
const categories = {
  all: ['Все тесты', 'Выберите тему и удобный режим. Можно начать с короткой тренировки или пройти общий пробник.'],
  lecture: ['Тесты с лекций', 'Раздел для точного переноса вопросов со скриншотов.'],
  past: ['Прошлый год', 'Отдельные варианты из файла «вопросы_делком».'],
  source: ['Сборник вопросов', '84 вопроса из приложенного файла «тесты делком без ответов». Формулировки сохранены, ключи восстановлены.'],
  author: ['Авторские варианты', '64 новых вопроса по восьми темам лекций: определения, небольшие кейсы и применение теории.']
};
const countWord = (n, forms) => n % 100 >= 11 && n % 100 <= 14 ? forms[2] : n % 10 === 1 ? forms[0] : n % 10 >= 2 && n % 10 <= 4 ? forms[1] : forms[2];
const questionCount = n => `${n} ${countWord(n, ['вопрос','вопроса','вопросов'])}`;
const tests = window.TESTS;
const questionMap = new Map(tests.flatMap(test => test.questions.map(q => [q.id, q])));
const storageKey = 'delcom-v1';
let storageOK = true;
function storageWarning() { storageOK = false; $('#storage-warning').hidden = false; }
function readStorage() { try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { storageWarning(); return {}; } }
const saved = readStorage();
let history = Array.isArray(saved.history) ? saved.history.slice(-40) : [];
let session = saved.session || null;
let showingResultErrors = false;
function validSession(s) {
  return s && ['train','exam'].includes(s.mode) && Array.isArray(s.ids) && s.ids.length > 0 && s.ids.every(id => questionMap.has(id)) &&
    s.answers && typeof s.answers === 'object' && Number.isFinite(s.startedAt) && Number.isFinite(s.index) &&
    s.index >= 0 && s.index < s.ids.length && (s.mode !== 'exam' || Number.isFinite(s.deadline)) &&
    s.ids.every(id => s.answers[id] === undefined || (Array.isArray(s.answers[id]) && s.answers[id].every(n => Number.isInteger(n) && n >= 0 && n < questionMap.get(id).options.length)));
}
if (!validSession(session)) session = null;
if (session) {
  const confirmed = session.confirmed;
  session.confirmed = Object.fromEntries(session.ids.filter(id =>
    (confirmed && confirmed[id] === true) || (!confirmed && session.finished)
  ).map(id => [id, true]));
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ session, history })); }
  catch { storageWarning(); }
}
function isCorrect(q, selected = []) {
  return selected.length === q.answer.length && q.answer.every(n => selected.includes(n));
}
function answeredCount() { return session.ids.filter(id => session.confirmed[id]).length; }
function questions() { return session.ids.map(id => questionMap.get(id)); }
function modeName(mode) { return mode === 'exam' ? 'Экзамен' : 'Тренировка'; }
function linkTo(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function nav(category) {
  return `<nav class="nav" aria-label="Разделы тестов">${Object.entries(categories).map(([key, value]) => `<a href="#${key === 'all' ? 'home' : 'section/'+key}" class="${category === key ? 'active' : ''}" ${category === key ? 'aria-current="page"' : ''}>${value[0]}</a>`).join('')}</nav>`;
}
function bestResult(id) { return history.filter(x => x.testId === id && !x.retry && x.mode === 'exam').sort((a,b) => b.percent - a.percent)[0]; }
function card(test, index) {
  const best = bestResult(test.id);
  return `<article class="card ${test.id === 'mock-40' ? 'featured' : ''}"><div class="card-top"><span class="tag">${categories[test.category]?.[0] || 'Тест'}</span><span class="card-number">${String(index+1).padStart(2,'0')}</span></div><h3>${escapeHTML(test.title)}</h3><p>${escapeHTML(test.description || '')}</p>${best ? `<span class="badge">Лучший экзамен: ${best.percent}%</span>` : ''}<div class="card-bottom"><span class="card-meta">${questionCount(test.questions.length)} · ${test.minutes} мин</span><a href="#test/${encodeURIComponent(test.id)}" aria-label="Открыть: ${escapeHTML(test.title)}">Начать ↗</a></div></article>`;
}
function catalog(category = 'all') {
  const listed = tests.filter(t => category === 'all' || t.category === category);
  const active = session && !session.finished;
  main.innerHTML = `${category === 'all' ? `<section class="hero"><div><p class="eyebrow">Деловые коммуникации / практика</p><h1>Понять.<br>Попробовать.<br>Запомнить.</h1><p class="lead">Готовьтесь по одной теме или проверьте себя на время. После ответа — понятный разбор и указание страницы материала курса.</p><div class="stats"><span><strong>${questionMap.size}</strong> вопросов</span><span><strong>8</strong> тем</span><span><strong>2</strong> режима</span></div></div><div class="hero-art" aria-hidden="true"><span class="mini">От теории к уверенности</span><strong>Хорошая коммуникация<br>начинается<br>с понимания.</strong><div class="steps"><span></span><span></span><span></span><span></span></div></div></section>` : ''}
  ${nav(category)}
  ${active ? `<div class="resume"><div><strong>Продолжить: ${escapeHTML(session.title)}</strong><p>${modeName(session.mode)} · отвечено ${answeredCount()} из ${session.ids.length}${session.mode === 'exam' ? ' · таймер продолжает идти' : ''}</p></div><button data-action="resume">Продолжить →</button></div>` : ''}
  ${session?.finished ? `<div class="resume"><div><strong>Последняя попытка: ${escapeHTML(session.title)}</strong><p>${modeName(session.mode)} ${session.mode === 'train' ? 'завершена' : 'завершён'}${session.timedOut ? ' по таймеру' : ''}.</p></div><button data-action="resume">Открыть результат →</button></div>` : ''}
  <div class="section-head"><div><p class="eyebrow">${category === 'all' ? 'Ваш маршрут подготовки' : 'Каталог'}</p><h2>${categories[category][0]}</h2><p>${categories[category][1]}</p></div><span class="counter">${listed.length} ${countWord(listed.length, ['вариант','варианта','вариантов'])}</span></div>
  ${category === 'source' ? '<div class="notice">Официального ключа в документе нет. Ответы восстановлены по лекциям; неоднозначные и повреждённые задания отмечены в разборе. Результат — ориентир для подготовки.</div>' : ''}
  ${listed.length ? `<div class="grid">${listed.map(card).join('')}</div>` : `<section class="empty"><span class="badge">Ожидает материалов</span><h3 style="margin-top:18px">${category === 'lecture' ? 'Скриншоты пока не добавлены' : 'Файл с прошлогодними вопросами не приложен'}</h3><p>${category === 'lecture' ? 'Среди полученных файлов не было отдельных скриншотов тестов. Здесь будут их варианты с сохранёнными формулировками.' : 'Файл «вопросы_делком» не найден среди материалов. Доступный сборник без ответов размещён отдельно: его принадлежность к прошлому году не подтверждена.'}</p><a href="#section/${category === 'lecture' ? 'author' : 'source'}">${category === 'lecture' ? 'Перейти к авторским вариантам' : 'Открыть доступный сборник'} →</a></section>`}
  ${category === 'all' ? '<div class="notice">«Тесты с лекций» и «Прошлый год» подготовлены для добавления материалов: скриншоты и файл «вопросы_делком» не были приложены. Доступный сборник размещён отдельно.</div>' : ''}`;
}
function detail(id) {
  const test = tests.find(t => t.id === id);
  if (!test) return notFound();
  main.innerHTML = `<section class="detail"><a class="back" href="#section/${test.category}">← К вариантам</a><p class="eyebrow">${categories[test.category]?.[0] || 'Практикум'} · ${questionCount(test.questions.length)}</p><h1>${escapeHTML(test.title)}</h1><p class="lead">${escapeHTML(test.description || '')}</p><div class="modes"><article class="mode"><span class="tag">01 / В своём темпе</span><h2>Тренировка</h2><p>Выберите ответ и нажмите «Готово» для проверки. После проверки ответ нельзя изменить. Без таймера.</p><button data-start="${escapeHTML(test.id)}" data-mode="train">Начать тренировку</button></article><article class="mode exam"><span class="tag">02 / Проверка знаний</span><h2>Экзамен</h2><p>${test.minutes} минут на весь вариант. Проверка каждого задания — по кнопке «Готово». После проверки ответ нельзя изменить. По окончании времени тест сдаётся автоматически.</p><button data-start="${escapeHTML(test.id)}" data-mode="exam">Начать экзамен · ${test.minutes} мин</button></article></div><div class="notice">Один балл за полностью правильный ответ. В заданиях с несколькими вариантами нужно выбрать все правильные и ни одного лишнего. Пропуск — 0 баллов. Это учебная шкала, не официальная оценка курса.</div>${session && !session.finished ? '<p class="history-note">Новая попытка заменит текущую незавершённую. Её можно продолжить с главной страницы.</p>' : ''}</section>`;
}
function start(testId, mode, ids = null) {
  const test = tests.find(t => t.id === testId);
  if (!test) return;
  if (session && !session.finished && !window.confirm('Начать новую попытку? Ответы текущей незавершённой попытки будут заменены.')) return;
  session = { testId, title: test.title, ids: ids || test.questions.map(q => q.id), mode, index: 0, answers: {}, confirmed: {}, startedAt: Date.now(), deadline: mode === 'exam' ? Date.now() + test.minutes * 60000 : null, finished: false, retry: !!ids };
  save(); showingResultErrors = false; linkTo('#run');
}
function explanation(q) {
  return `<p>${escapeHTML(q.explanation)}</p><p><strong>Правильный ответ:</strong> ${q.answer.map(i => escapeHTML(q.options[i])).join('; ')}</p><p class="source">${escapeHTML(q.source)}<br>${escapeHTML(q.status || '')}</p>${q.note ? `<div class="notice">${escapeHTML(q.note)}</div>` : ''}`;
}
function feedback() {
  const q = questions()[session.index], selected = session.answers[q.id] || [];
  const target = $('#feedback'); if (!target) return;
  if (!session.confirmed[q.id]) { target.innerHTML = ''; return; }
  const correct = isCorrect(q, selected);
  target.innerHTML = `<div class="feedback ${correct ? 'good' : 'bad'}" role="status">${correct ? '✓ Правильно' : '✕ Неправильно'}${q.type === 'multiple' ? ' — проверяется весь набор.' : '.'} Ответ зафиксирован, изменить его нельзя.</div><details class="explanation"><summary>Показать правильный ответ и объяснение</summary>${explanation(q)}</details>`;
}
function renderQuiz() {
  if (!session) return catalog();
  if (session.finished) return result();
  const q = questions()[session.index];
  const chosen = session.answers[q.id] || [];
  const locked = !!session.confirmed[q.id];
  main.innerHTML = `<a class="back" href="#home">← К списку тестов (прогресс сохранён)</a><div class="run-head"><div><h1>${escapeHTML(session.title)}</h1><p>${modeName(session.mode)}${session.retry ? ' · работа над ошибками' : ''} · проверка по кнопке «Готово», затем ответ нельзя изменить</p></div>${session.mode === 'exam' ? '<div class="timer" id="timer" role="timer" aria-label="Оставшееся время"></div>' : '<span class="practice-label">Без ограничения времени</span>'}</div><div class="progress" aria-label="Доля вопросов с ответом"><div id="progress-fill" style="width:${answeredCount()/session.ids.length*100}%"></div></div><div class="quiz-layout"><section><article class="question-box ${locked && !isCorrect(q, chosen) ? 'incorrect' : ''}"><p class="question-meta">Вопрос ${session.index+1} / ${session.ids.length}</p><h2 class="question-text" id="question-title">${escapeHTML(q.text)}</h2><fieldset aria-labelledby="question-title" ${locked ? 'disabled' : ''}><legend>${q.type === 'multiple' ? 'Выберите все правильные варианты' : 'Выберите один ответ'}</legend>${q.options.map((opt,i) => `<label class="option ${chosen.includes(i) ? 'selected' : ''}"><input type="${q.type === 'multiple' ? 'checkbox' : 'radio'}" name="answer" value="${i}" ${chosen.includes(i) ? 'checked' : ''}><span class="option-label">${escapeHTML(opt)}</span></label>`).join('')}</fieldset><div class="actions"><button data-action="ready" ${locked || !chosen.length ? 'disabled' : ''}>${locked ? 'Ответ принят' : 'Готово'}</button><button class="quiet" data-action="clear" ${locked ? 'disabled' : ''}>Сбросить ответ на этот вопрос</button></div><div id="feedback"></div></article><div class="question-actions"><button class="secondary" data-move="-1" ${session.index === 0 ? 'disabled' : ''}>← Назад</button>${session.index === session.ids.length-1 ? '<button data-action="finish">Завершить тест</button>' : '<button data-move="1">Следующий →</button>'}</div></section><aside class="sidebar"><h2>Карта вопросов</h2><p id="answered-label">Отвечено ${answeredCount()} из ${session.ids.length}</p><div class="numbers">${session.ids.map((id,i) => `<button data-index="${i}" aria-label="Вопрос ${i+1}" ${i === session.index ? 'aria-current="step"' : ''} class="${i === session.index ? 'current' : ''} ${session.confirmed[id] ? (isCorrect(questionMap.get(id), session.answers[id]) ? 'answered' : 'incorrect') : ''}">${i+1}</button>`).join('')}</div><p>Зелёный — верно, красный — ошибка.<br>Обводка — текущий вопрос.</p><button data-action="finish">Сдать тест</button><p class="history-note">${session.mode === 'exam' ? 'Уход со страницы не останавливает таймер.' : 'Ответы сохраняются в этом браузере.'}</p></aside></div>`;
  feedback(); updateTimer();
}
function chooseAnswer() {
  if (!session || session.finished || location.hash !== '#run') return;
  if (expireIfNeeded()) return;
  const q = questions()[session.index];
  if (session.confirmed[q.id]) return;
  session.answers[q.id] = Array.from(document.querySelectorAll('input[name="answer"]:checked')).map(x => Number(x.value));
  save();
  document.querySelectorAll('.option').forEach(label => label.classList.toggle('selected', label.querySelector('input').checked));
  $('#answered-label').textContent = `Отвечено ${answeredCount()} из ${session.ids.length}`;
  $('#progress-fill').style.width = `${answeredCount()/session.ids.length*100}%`;
  $('[data-action="ready"]').disabled = !session.answers[q.id].length;
}
function confirmAnswer() {
  if (!session || session.finished || location.hash !== '#run' || expireIfNeeded()) return;
  const q = questions()[session.index];
  if (session.confirmed[q.id] || !session.answers[q.id]?.length) return;
  session.confirmed[q.id] = true;
  save();
  renderQuiz();
}

function updateTimer() {
  if (!session || session.mode !== 'exam' || session.finished) return;
  const el = $('#timer'); if (!el) return;
  const seconds = Math.max(0, Math.ceil((session.deadline-Date.now())/1000));
  el.textContent = `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  el.classList.toggle('low', seconds <= 60);
}
function expireIfNeeded() {
  if (session && !session.finished && session.mode === 'exam' && Date.now() >= session.deadline) { finish(true); return true; }
  return false;
}
function finish(timedOut = false) {
  if (!session || session.finished) return;
  session.ids.forEach(id => { if (!session.confirmed[id]) delete session.answers[id]; });
  session.finished = true; session.timedOut = timedOut;
  session.finishedAt = timedOut ? session.deadline : Date.now();
  const correct = questions().filter(q => (session.confirmed[q.id] && isCorrect(q, session.answers[q.id]))).length;
  history.push({ testId: session.testId, mode: session.mode, retry: session.retry, percent: Math.round(correct/session.ids.length*100), date: session.finishedAt });
  history = history.slice(-40); save();
  $('#confirm-dialog').close(); showingResultErrors = false;
  if (location.hash === '#run') result();
}
function confirmFinish() {
  if (expireIfNeeded() || !session || session.finished) return;
  const skipped = session.ids.length - answeredCount();
  $('#confirm-message').textContent = skipped ? `Не подтверждено кнопкой «Готово»: ${skipped}. Они будут засчитаны как ошибки. После сдачи изменить результат этой попытки нельзя.` : 'Все ответы подтверждены. После сдачи откроется подробный разбор.';
  $('#confirm-dialog').returnValue = '';
  $('#confirm-dialog').showModal();
}
function result() {
  if (!session?.finished) return catalog();
  const all = questions(), wrong = all.filter(q => !(session.confirmed[q.id] && isCorrect(q, session.answers[q.id])));
  const correct = all.length - wrong.length, percent = Math.round(correct/all.length*100);
  const elapsed = Math.max(0, Math.round((session.finishedAt-session.startedAt)/1000));
  const reviewed = showingResultErrors ? wrong : all;
  main.innerHTML = `<a class="back" href="#home">← К списку тестов</a><p class="eyebrow">${modeName(session.mode)} ${session.mode === 'train' ? 'завершена' : 'завершён'}</p><h2>${escapeHTML(session.title)}</h2><div class="result-hero"><div class="result-score">${percent}%</div><div><h2>${correct} из ${all.length} правильно</h2><p>${session.timedOut ? 'Время истекло. Тест сдан автоматически.' : 'Попытка завершена.'} Время: ${Math.floor(elapsed/60)} мин ${elapsed%60} с.<br>${session.mode === 'train' ? 'Результат учитывает только ответы, подтверждённые кнопкой «Готово».' : 'Ниже — ваши ответы, правильные варианты и объяснения.'}</p></div></div><div class="actions"><button data-action="retry" ${!wrong.length ? 'disabled' : ''}>Разобрать ошибки · ${wrong.length}</button><button class="secondary" data-action="repeat">Пройти заново</button><button class="secondary" data-action="filter">${showingResultErrors ? 'Показать все вопросы' : 'Показать только ошибки'}</button></div>${all.some(q => q.status === 'Восстановленный ключ') ? '<div class="notice">Ключи сборника восстановлены без официальных ответов. Спорные формулировки отмечены в объяснениях; результат не является официальной оценкой.</div>' : ''}<div class="review-list">${reviewed.map(q => {
    const selected = session.answers[q.id] || [], ok = isCorrect(q, selected);
    return `<details class="review-item"><summary><span>${all.indexOf(q)+1}. ${ok ? '✓ Правильно' : selected.length ? '✕ Неправильно' : '— Без ответа'}</span>${escapeHTML(q.text)}</summary><ul>${q.options.map((opt,i) => `<li class="${q.answer.includes(i) ? 'correct-choice' : selected.includes(i) ? 'wrong-choice' : ''}">${escapeHTML(opt)} ${selected.includes(i) ? '← ваш выбор' : ''} ${q.answer.includes(i) ? '✓ правильный' : ''}</li>`).join('')}</ul><div class="explanation">${explanation(q)}</div></details>`;
  }).join('') || '<p>Ошибок нет. Можно переходить к следующей теме.</p>'}</div>`;
}
function guide() {
  main.innerHTML = `<article class="guide"><a class="back" href="#home">← К тестам</a><p class="eyebrow">Как устроен практикум</p><h1>Учиться с пониманием.</h1><h2>Два режима для каждого варианта</h2><p><strong>Тренировка:</strong> выберите один или несколько вариантов и нажмите «Готово». Только после этого ответ проверяется и блокируется. Ошибка отмечается красным, разбор можно открыть после проверки.</p><p><strong>Экзамен:</strong> ограничение времени и проверка по кнопке «Готово», как в тренировке. Подтверждённый ответ нельзя изменить, даже после перехода к другому вопросу или перезагрузки. Неподтверждённые ответы при завершении считаются пропусками.</p><h2>Оценивание</h2><p>Полностью верный ответ даёт 1 балл, пропуск и неверный набор — 0. Частичных баллов нет. Процент — доля полностью верных ответов. Это упрощённая учебная шкала: в материалах курса встречаются уровни сложности с разными весами.</p><h2>Прогресс и время</h2><p>Ответы, текущий вопрос и последние результаты сохраняются в этом браузере. Можно продолжить после перезагрузки. Открытый экзамен продолжает отсчёт даже при закрытой странице; при возвращении после срока он будет завершён. На другом устройстве прогресса не будет.</p><p>Хранится одна незавершённая попытка. Новая заменяет предыдущую после подтверждения. Работа над ошибками создаёт отдельную тренировку по неверным и пропущенным вопросам.</p><h2>Откуда взяты вопросы</h2><div class="table-scroll"><table><thead><tr><th>Раздел</th><th>Источник и статус</th></tr></thead><tbody><tr><td>Тесты с лекций</td><td>Для скриншотов. Они не были приложены, раздел пока пуст.</td></tr><tr><td>Прошлый год</td><td>Для «вопросы_делком». Этот файл не был приложен.</td></tr><tr><td>Сборник вопросов</td><td>84 задания из «тесты делком без ответов.docx». Ключи восстановлены по лекциям; это не официальный ответ преподавателя.</td></tr><tr><td>Авторские варианты</td><td>64 новых вопроса по восьми блокам лекций. Пробник повторно использует 40 из них.</td></tr></tbody></table></div><p>К каждому вопросу приложены объяснение и номер лекции с указанием страницы или слайда. В сборнике сохранены спорные и оборванные формулировки; замечания показаны в разборе.</p><h2>Материалы курса</h2><ol><li>01 — Введение в деловые коммуникации (PPTX, номера слайдов).</li><li>02 — Влияние, убеждение и активное слушание.</li><li>03 — Каналы, письменное и устное деловое общение.</li><li>04 — Публичные выступления и презентации.</li><li>05 — Команда, конфликты и обратная связь.</li><li>06 — Групповое мышление и коммуникационная стратегия.</li><li>07–08 — Переговоры.</li><li>09 — Кросс-культурная коммуникация.</li></ol><p>Для PDF указаны страницы файла, начиная с первой. В приложенных материалах семинара 1 экзамен описан как 40 вопросов за 40 минут. Общий пробник использует это ограничение времени, но не заявляется точной копией экзамена.</p><h2>Как менять сайт</h2><p>Инструкция с примерами находится в <a href="README.md">README.md</a> внутри архива. Вопросы лежат в папке <code>data</code>, оформление — в <code>styles.css</code>, логика — в <code>app.js</code>. Сайт работает без установки программ и сборки.</p></article>`;
}
function notFound() { main.innerHTML = '<h2>Такой страницы нет</h2><p><a href="#home">Открыть список тестов</a></p>'; }
function render() {
  const route = location.hash.slice(1) || 'home';
  expireIfNeeded();
  if (route === 'home') catalog();
  else if (route.startsWith('section/')) { const category = route.split('/')[1]; categories[category] ? catalog(category) : notFound(); }
  else if (route.startsWith('test/')) detail(decodeURIComponent(route.slice(5)));
  else if (route === 'run') renderQuiz();
  else if (route === 'guide') guide();
  else notFound();
  window.scrollTo(0,0);
}
main.addEventListener('change', event => { if (event.target.matches('input[name="answer"]')) chooseAnswer(); });
main.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.start) return start(button.dataset.start, button.dataset.mode);
  if (button.dataset.index !== undefined || button.dataset.move) {
    if (!session || session.finished || expireIfNeeded()) return;
    session.index = button.dataset.index !== undefined ? Number(button.dataset.index) : session.index + Number(button.dataset.move);
    save(); renderQuiz(); window.scrollTo(0,0); $('#question-title').setAttribute('tabindex','-1'); $('#question-title').focus({preventScroll:true}); return;
  }
  switch (button.dataset.action) {
    case 'resume': linkTo('#run'); break;
    case 'ready': confirmAnswer(); break;
    case 'clear': if (!session || session.finished || expireIfNeeded() || session.confirmed[session.ids[session.index]]) return; document.querySelectorAll('input[name="answer"]').forEach(el => el.checked = false); chooseAnswer(); break;
    case 'finish': confirmFinish(); break;
    case 'filter': showingResultErrors = !showingResultErrors; result(); break;
    case 'repeat': linkTo('#test/'+encodeURIComponent(session.testId)); break;
    case 'retry': { const ids = questions().filter(q => !(session.confirmed[q.id] && isCorrect(q, session.answers[q.id]))).map(q => q.id); if (ids.length) start(session.testId,'train',ids); break; }
  }
});
$('#confirm-dialog').addEventListener('close', () => { if ($('#confirm-dialog').returnValue === 'finish') finish(); });
$('.skip').addEventListener('click', event => { event.preventDefault(); main.focus(); });
window.addEventListener('hashchange', render);
window.addEventListener('pageshow', () => { expireIfNeeded(); updateTimer(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { expireIfNeeded(); updateTimer(); } });
setInterval(() => { expireIfNeeded(); updateTimer(); }, 500);
render();
