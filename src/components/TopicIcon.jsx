import { Atom, Gauge, Move, MoveUpRight, Zap } from 'lucide-react';

const ICONS = { cinematica: Gauge, dinamica: Move, vectores: MoveUpRight, energia: Zap };

export default function TopicIcon({ topic, size = 22 }) {
  const Icon = ICONS[topic?.id] ?? Atom;
  return (
    <span className="topic-icon" style={{ '--topic-color': topic?.color ?? '#2563eb' }}>
      <Icon size={size} />
    </span>
  );
}
