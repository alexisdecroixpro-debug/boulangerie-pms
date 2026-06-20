import type { CleaningPlanTask, CleaningTask, HygieneData, RecordStatus } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;
const defaultTime = "08:00";

export function withGeneratedCleaningTasks(data: HygieneData, operatorName: string, now = new Date()) {
  const generated = generateCleaningTasks(data, operatorName, now);
  const updatedExisting = data.cleaningTasks.map((task) => {
    const nextStatus = computeCleaningStatus(task, now);
    return nextStatus === task.status ? task : { ...task, status: nextStatus, updatedAt: now.toISOString(), updatedBy: operatorName };
  });
  if (!generated.length && updatedExisting.every((task, index) => task === data.cleaningTasks[index])) return data;
  return { ...data, cleaningTasks: [...generated, ...updatedExisting] };
}

export function generateCleaningTasks(data: HygieneData, operatorName: string, now = new Date()) {
  const existingKeys = new Set(data.cleaningTasks.map(taskKey));
  return data.cleaningPlanTasks
    .filter((plan) => plan.active && plan.status === "Active")
    .map((plan) => occurrenceFromPlan(plan, operatorName, now))
    .filter((task): task is CleaningTask => Boolean(task))
    .filter((task) => !existingKeys.has(taskKey(task)));
}

export function computeCleaningStatus(task: CleaningTask, now = new Date()): RecordStatus {
  if (["Validée", "Fait", "Non réalisée", "Archivé"].includes(task.status)) return task.status;
  const end = task.duePeriodEnd ? endOfDay(new Date(task.duePeriodEnd)) : endFromFrequency(task, now);
  return end.getTime() < now.getTime() ? "En retard" : "À faire";
}

export function cleaningScope(task: CleaningTask, now = new Date()) {
  const planned = new Date(task.plannedAt);
  if (task.frequency === "Quotidien") return isSameDay(planned, now) ? "today" : "history";
  if (task.frequency === "Hebdomadaire") return isSameWeek(planned, now) ? "week" : "history";
  if (task.frequency === "Mensuel" || task.frequency === "Ponctuel" || task.frequency === "Trimestriel") {
    return isSameMonth(planned, now) ? "month" : "history";
  }
  return "history";
}

function occurrenceFromPlan(plan: CleaningPlanTask, operatorName: string, now: Date): CleaningTask | null {
  const period = periodForPlan(plan, now);
  if (!period) return null;
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: operatorName,
    updatedBy: operatorName,
    status: "À faire",
    planTaskId: plan.id,
    zone: plan.zone,
    title: plan.name,
    materialSurface: plan.materialSurface,
    actionType: plan.actionType,
    frequency: plan.frequency,
    product: plan.product,
    method: plan.method,
    contactTime: "",
    responsible: plan.defaultResponsible || operatorName,
    plannedAt: period.plannedAt,
    duePeriodStart: period.start,
    duePeriodEnd: period.end,
    photoRequired: plan.photoRequired,
  };
}

function periodForPlan(plan: CleaningPlanTask, now: Date) {
  if (plan.frequency === "Quotidien") {
    const day = startOfDay(now);
    return makePeriod(day, day, `${toDateInput(day)}T${defaultTime}`);
  }
  if (plan.frequency === "Hebdomadaire") {
    const start = startOfWeek(now);
    const end = addDays(start, 6);
    const dayIndex = weekdayIndex(plan.suggestedDay);
    const plannedDate = addDays(start, dayIndex);
    return makePeriod(start, end, `${toDateInput(plannedDate)}T${defaultTime}`);
  }
  if (plan.frequency === "Mensuel") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const day = Math.min(Number(plan.suggestedDay || 1), end.getDate());
    const plannedDate = new Date(now.getFullYear(), now.getMonth(), day);
    return makePeriod(start, end, `${toDateInput(plannedDate)}T${defaultTime}`);
  }
  if (plan.frequency === "Ponctuel" && plan.scheduledDate) {
    const plannedDate = new Date(`${plan.scheduledDate}T00:00:00`);
    if (!isSameMonth(plannedDate, now) && plannedDate.getTime() < startOfMonth(now).getTime()) return null;
    return makePeriod(plannedDate, plannedDate, `${plan.scheduledDate}T${defaultTime}`);
  }
  return null;
}

function makePeriod(startDate: Date, endDate: Date, plannedAt: string) {
  return { start: toDateInput(startDate), end: toDateInput(endDate), plannedAt };
}

function taskKey(task: CleaningTask) {
  return `${task.planTaskId || task.id}:${task.duePeriodStart || task.plannedAt.slice(0, 10)}:${task.duePeriodEnd || task.plannedAt.slice(0, 10)}`;
}
function endFromFrequency(task: CleaningTask, now: Date) {
  const planned = new Date(task.plannedAt);
  if (task.frequency === "Hebdomadaire") return endOfDay(addDays(startOfWeek(planned), 6));
  if (task.frequency === "Mensuel" || task.frequency === "Trimestriel") return endOfDay(new Date(planned.getFullYear(), planned.getMonth() + 1, 0));
  return endOfDay(isNaN(planned.getTime()) ? now : planned);
}
function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function endOfDay(date: Date) { const next = new Date(date); next.setHours(23, 59, 59, 999); return next; }
function startOfWeek(date: Date) { const start = startOfDay(date); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return start; }
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addDays(date: Date, days: number) { return new Date(date.getTime() + days * MS_DAY); }
function isSameDay(left: Date, right: Date) { return left.toDateString() === right.toDateString(); }
function isSameWeek(left: Date, right: Date) { return startOfWeek(left).toDateString() === startOfWeek(right).toDateString(); }
function isSameMonth(left: Date, right: Date) { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth(); }
function toDateInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
function weekdayIndex(value?: string) {
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const index = days.indexOf(value || "");
  return index >= 0 ? index : 0;
}
