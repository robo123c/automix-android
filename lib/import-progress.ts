export type ImportProgress = {
  completed: number;
  total: number;
  currentFile: string;
};

export function importProgressLabel(progress?: ImportProgress) {
  if (!progress || progress.total < 1) return "Opening files…";
  const current = Math.min(progress.completed + 1, progress.total);
  return `Copying ${current} of ${progress.total}`;
}
