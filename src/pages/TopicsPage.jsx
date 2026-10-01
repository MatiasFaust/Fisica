import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStore } from '../hooks/useStore';
import PageHeader from '../components/ui/PageHeader';
import TopicCard from '../components/TopicCard';
import TopicFormModal from '../components/modals/TopicFormModal';
import { createTopic, getFilesForTopic } from '../services/repositoryService';

export default function TopicsPage() {
  const state = useStore();
  const { user, isTeacher } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Física"
        title="Temas"
        subtitle="Elegí un tema para ver la explicación, el material y los ejercicios."
        actions={
          isTeacher && (
            <button className="btn btn--primary" onClick={() => setCreating(true)}>
              <BookPlus size={18} /> Nuevo tema
            </button>
          )
        }
      />

      <div className="grid grid--cards">
        {state.topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            fileCount={getFilesForTopic(state, topic).filter((f) => f.visibility !== 'private').length}
            exerciseCount={state.exercises.filter((e) => e.topicId === topic.id).length}
            onClick={() => navigate(`/temas/${topic.id}`)}
          />
        ))}
      </div>

      <TopicFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (form) => {
          const topic = await createTopic(form, user);
          toast.success(`Tema «${topic.name}» creado`);
        }}
      />
    </div>
  );
}
