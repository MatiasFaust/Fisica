import { updateState } from './store';
import { withActivity } from './activityService';
import { uploadFiles, ROOT_FOLDER_ID } from './repositoryService';
import { imageFileToDataUrl } from '../utils/image';
import { uid } from '../utils/id';

export const DIFFICULTIES = {
  facil: { label: 'Fácil', tone: 'success' },
  media: { label: 'Media', tone: 'warning' },
  dificil: { label: 'Difícil', tone: 'danger' },
};

export function getSubmission(state, exerciseId, studentId) {
  return state.submissions.find((sub) => sub.exerciseId === exerciseId && sub.studentId === studentId);
}

export async function createExercise({ title, topicId, statement, difficulty, dueDate, imageFile, pdfFile, topicFolderId }, user) {
  const exercise = {
    id: uid('ex-'),
    title: title.trim(),
    topicId,
    statement: statement.trim(),
    difficulty,
    dueDate: new Date(`${dueDate}T23:00:00`).toISOString(),
    createdAt: new Date().toISOString(),
  };
  if (imageFile) exercise.imageUrl = await imageFileToDataUrl(imageFile);
  if (pdfFile) {
    const [uploaded] = await uploadFiles([pdfFile], { folderId: topicFolderId || ROOT_FOLDER_ID, category: 'ejercicios' }, user);
    exercise.fileId = uploaded.id;
  }
  updateState((state) =>
    withActivity(
      { ...state, exercises: [exercise, ...state.exercises] },
      { userId: user.id, type: 'exercise', text: `publicó el ejercicio «${exercise.title}»`, link: `/ejercicios/${exercise.id}` },
    ),
  );
  return exercise;
}

export async function deleteExercise(exerciseId) {
  updateState((state) => ({
    ...state,
    exercises: state.exercises.filter((exercise) => exercise.id !== exerciseId),
    submissions: state.submissions.filter((sub) => sub.exerciseId !== exerciseId),
  }));
}

export async function submitAnswer(exercise, answer, user) {
  updateState((state) => {
    const others = state.submissions.filter((sub) => !(sub.exerciseId === exercise.id && sub.studentId === user.id));
    const submission = { id: uid('sub-'), exerciseId: exercise.id, studentId: user.id, answer: answer.trim(), submittedAt: new Date().toISOString() };
    return withActivity(
      { ...state, submissions: [...others, submission] },
      { userId: user.id, type: 'submission', text: `resolvió «${exercise.title}»`, link: `/ejercicios/${exercise.id}` },
    );
  });
}

export async function reopenExercise(exerciseId, studentId) {
  updateState((state) => ({
    ...state,
    submissions: state.submissions.filter((sub) => !(sub.exerciseId === exerciseId && sub.studentId === studentId)),
  }));
}
