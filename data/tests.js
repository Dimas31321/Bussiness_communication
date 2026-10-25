// Каталог. Обычно редактировать этот файл не нужно: вопросы лежат отдельно.
window.TESTS = [
  ...window.MOCK_TESTS,
  ...window.LECTURE_TESTS,
  ...window.PAST_YEAR_TESTS,
  ...Array.from({ length: Math.ceil(window.SOURCE_QUESTIONS.length / 21) }, (_, i) => ({
    id: `source-${i + 1}`, category: 'source',
    title: `Сборник · часть ${i + 1}`, minutes: 25,
    description: 'Исходные формулировки из «тесты делком без ответов». Ключи восстановлены по материалам курса.',
    questions: window.SOURCE_QUESTIONS.slice(i * 21, (i + 1) * 21)
  })),
  ...[...new Set(window.AUTHOR_QUESTIONS.map(q => q.topic))].map((topic, i) => ({
    id: `author-${i + 1}`, category: 'author', title: topic, minutes: 10,
    description: 'Короткая тренировка по одной теме: понятия, применение и небольшие кейсы.',
    questions: window.AUTHOR_QUESTIONS.filter(q => q.topic === topic)
  })),
  {
    id: 'mock-40', category: 'mock', title: 'Общий пробник · 40 вопросов', minutes: 40,
    description: 'Все восемь тем курса. Учебный вариант на 40 минут; распределение сложности не повторяет официальный экзамен.',
    questions: [...new Set(window.AUTHOR_QUESTIONS.map(q => q.topic))].flatMap(topic => window.AUTHOR_QUESTIONS.filter(q => q.topic === topic).slice(0, 5)).slice(0, 40)
  }
];
