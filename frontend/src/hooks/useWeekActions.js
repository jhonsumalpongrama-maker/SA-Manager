import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { SCHEDULES } from '../config/constants';
import {
  addAssignment,
  applyDuplicatePlan,
  applyShuffle,
  clearWeek,
  fetchWeek,
  removeAssignment,
  restoreAssignment,
} from '../services/assignmentsRepo';
import { ensureStudent } from '../services/studentsRepo';
import { pickArea } from '../utils/autoAssign';
import { planDuplicate } from '../utils/duplicate';
import { shuffleAssignments } from '../utils/shuffle';
import { validateNewStudent } from '../utils/sanitize';

/**
 * Business operations for the weekly screen. Writes are not awaited: Firestore applies them to the
 * local cache immediately (optimistic UI) and the returned promise only settles once the server
 * confirms, which never happens while offline. Failures surface as toasts and the snapshot
 * listener rolls the UI back automatically.
 */
export function useWeekActions({ weekId, previousWeekId, assignments }) {
  const user = useAppStore((s) => s.user);
  const areas = useAppStore((s) => s.areas);
  const students = useAppStore((s) => s.students);
  const toast = useAppStore((s) => s.toast);
  const actor = user ? user.email : '';

  const fail = useCallback(
    (message) => (err) => toast(`${message}${err && err.code === 'permission-denied' ? ' (you do not have permission)' : ''}`, { type: 'error' }),
    [toast],
  );

  const addStudent = useCallback(
    async ({ name, scheduleType }) => {
      const check = validateNewStudent({
        name,
        scheduleType,
        existingAssignments: assignments,
        validSchedules: Object.keys(SCHEDULES),
      });
      if (!check.ok) return check;

      const scheduleAreas = areas.filter((a) => a.scheduleType === scheduleType);
      const area = pickArea({
        areas: scheduleAreas,
        assignments: assignments.filter((a) => a.scheduleType === scheduleType),
      });
      if (!area) return { ok: false, error: 'This schedule has no active areas. Add one in Manage Areas first.' };

      const student = await ensureStudent(check.name, students);
      addAssignment({ weekId, student, area, scheduleType, createdBy: actor }).catch(fail('Could not save the assignment.'));
      return { ok: true, name: student.fullName, areaName: area.name };
    },
    [areas, assignments, students, weekId, actor, fail],
  );

  const removeStudent = useCallback(
    (assignment) => {
      removeAssignment(weekId, assignment.id).catch(fail('Could not remove the student.'));
      toast(`Removed ${assignment.studentName}`, {
        action: {
          label: 'Undo',
          run: () => restoreAssignment(weekId, assignment, actor).catch(fail('Could not undo the removal.')),
        },
      });
    },
    [weekId, actor, toast, fail],
  );

  /** @returns {{ status: 'empty' | 'no-areas' | 'done', moved?: number }} */
  const shuffle = useCallback(
    async (scheduleType) => {
      const current = assignments.filter((a) => a.scheduleType === scheduleType);
      if (!current.length) return { status: 'empty' };
      const scheduleAreas = areas.filter((a) => a.scheduleType === scheduleType && a.active !== false);
      if (!scheduleAreas.length) return { status: 'no-areas' };

      let previous = [];
      try {
        previous = await fetchWeek(previousWeekId);
      } catch {
        previous = []; // no history available (offline / no permission): shuffle without the constraint
      }
      const prevByStudent = {};
      previous.filter((p) => p.scheduleType === scheduleType).forEach((p) => {
        prevByStudent[p.studentId] = p.areaId;
      });
      const prevByAssignment = {};
      current.forEach((a) => {
        prevByAssignment[a.id] = prevByStudent[a.studentId];
      });

      const result = shuffleAssignments({
        students: current.map((a) => ({ id: a.id })),
        areas: scheduleAreas,
        previousAreaByStudent: prevByAssignment,
      });
      const areaById = new Map(scheduleAreas.map((a) => [a.id, a]));
      const moves = Object.entries(result).map(([id, areaId]) => ({ id, area: areaById.get(areaId) }));
      applyShuffle(weekId, moves, actor, current).catch(fail('Could not save the shuffle.'));
      return { status: 'done', moved: moves.length };
    },
    [assignments, areas, previousWeekId, weekId, actor, fail],
  );

  const clearCurrentWeek = useCallback(async () => {
    const { count, committed } = await clearWeek(weekId);
    committed.catch(fail('Could not clear the week.'));
    return count;
  }, [weekId, fail]);

  /** Loads last week's assignments so the UI can decide between "no records" / merge-or-replace. */
  const loadPrevious = useCallback(() => fetchWeek(previousWeekId), [previousWeekId]);

  const duplicate = useCallback(
    (previous, mode) => {
      const plan = planDuplicate({ previous, current: assignments, areas, mode });
      applyDuplicatePlan(weekId, plan, actor).catch(fail('Could not duplicate last week.'));
      return { created: plan.toCreate.length, skipped: plan.skipped.length, replaced: plan.toDeleteIds.length };
    },
    [assignments, areas, weekId, actor, fail],
  );

  return { addStudent, removeStudent, shuffle, clearCurrentWeek, loadPrevious, duplicate };
}
