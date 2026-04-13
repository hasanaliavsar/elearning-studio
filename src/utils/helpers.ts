let counter = 0;

export function generateId(): string {
  counter++;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSlideCount(course: { modules: { lessons: { slides: unknown[] }[] }[] }): number {
  return course.modules.reduce(
    (total, mod) => total + mod.lessons.reduce((lt, lesson) => lt + lesson.slides.length, 0),
    0
  );
}

export function getQuestionCount(course: { modules: { lessons: { slides: { questions: unknown[] }[] }[] }[] }): number {
  return course.modules.reduce(
    (total, mod) =>
      total +
      mod.lessons.reduce(
        (lt, lesson) => lt + lesson.slides.reduce((st, slide) => st + slide.questions.length, 0),
        0
      ),
    0
  );
}

export function getEstimatedDuration(course: { modules: { lessons: { slides: { duration: number }[] }[] }[] }): number {
  return course.modules.reduce(
    (total, mod) =>
      total +
      mod.lessons.reduce(
        (lt, lesson) => lt + lesson.slides.reduce((st, slide) => st + slide.duration, 0),
        0
      ),
    0
  );
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
