import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import PageHeader from '../components/ui/PageHeader';
import FilterChips from '../components/ui/FilterChips';
import EmptyState from '../components/ui/EmptyState';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseFormModal from '../components/modals/ExerciseFormModal';
import { createExercise, getSubmission } from '../services/exerciseService';
import { daysUntil } from '../utils/format';

export default function ExercisesPage() {
  const state = useStore();
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('todos');
  const [creating, setCreating] = useState(false);
  const students = state.users.filter((u) => u.role === 'student');

  const deliveredCount = (exercise) => state.submissions.filter((s) => s.exerciseId === exercise.id).length;

  // Para el alumno: su propio estado. Para el profesor: si ya entregaron todos.
  const isDone = (exercise) => (isTeacher ? deliveredCount(exercise) >= students.length : Boolean(getSubmission(state, exercise.id, user.id)));

  const statusFor = (exercise) => {
    if (isTeacher) return undefined;
    if (isDone(exercise)) return 'completado';
    return daysUntil(exercise.dueDate) < 0 ? 'vencido' : 'pendiente';
  };

  const sorted = useMemo(() => [...state.exercises].sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [state.exercises]);

  const filtered = sorted.filter((exercise) => {
    if (filter === 'todos') return true;
    if (filter === 'pendientes') return !isDone(exercise);
    if (filter === 'completados') return isDone(exercise);
    return exercise.topicId === filter;
  });

  const options = [
    { value: 'todos', label: 'Todos', count: sorted.length },
    { value: 'pendientes', label: 'Pendientes', count: sorted.filter((e) => !isDone(e)).length },
    { value: 'completados', label: 'Completados', count: sorted.filter(isDone).length },
    ...state.topics.map((topic) => ({ value: topic.id, label: topic.name })),
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Física"
        title="Ejercicios"
        subtitle={isTeacher ? 'Publicá ejercicios y seguí las entregas de tus alumnos.' : 'Abrí un ejercicio, resolvelo y marcá tu entrega.'}
        actions={
          isTeacher && (
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              <Plus size={18} /> Nuevo ejercicio
            </button>
          )
        }
      />

      <FilterChips options={options} value={filter} onChange={setFilter} />

      {filtered.length ? (
        <div className="grid grid--exercises">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              topic={state.topics.find((t) => t.id === exercise.topicId)}
              status={statusFor(exercise)}
              completedCount={deliveredCount(exercise)}
              totalStudents={students.length}
              onClick={() => navigate(`/ejercicios/${exercise.id}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No hay ejercicios en esta vista" text="Probá con otro filtro." />
      )}

      <ExerciseFormModal
        open={creating}
        topics={state.topics}
        onClose={() => setCreating(false)}
        onSubmit={async (form) => {
          try {
            await createExercise({ ...form, topicFolderId: state.topics.find((t) => t.id === form.topicId)?.folderId }, user);
            toast.success('Ejercicio publicado');
          } catch (error) {
            toast.error(error.message);
          }
        }}
      />
    </div>
  );
}
