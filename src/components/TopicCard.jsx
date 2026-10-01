import { FileText, ClipboardList, ArrowRight } from 'lucide-react';
import TopicIcon from './TopicIcon';

export default function TopicCard({ topic, fileCount, exerciseCount, onClick }) {
  return (
    <button className="topic-card" onClick={onClick} style={{ '--topic-color': topic.color }}>
      <div className="topic-card__head">
        <TopicIcon topic={topic} />
        <ArrowRight size={18} className="topic-card__arrow" />
      </div>
      <h3 className="topic-card__title">{topic.name}</h3>
      <p className="topic-card__summary">{topic.summary}</p>
      <div className="topic-card__stats">
        <span>
          <FileText size={14} /> {fileCount} archivos
        </span>
        <span>
          <ClipboardList size={14} /> {exerciseCount} ejercicios
        </span>
      </div>
    </button>
  );
}
