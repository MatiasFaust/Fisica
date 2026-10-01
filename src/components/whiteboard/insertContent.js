/** Convierte ejercicios, archivos, temas e imágenes en objetos de pizarra. */
import { getFileBlob, getTopicForFolder } from '../../services/repositoryService';
import { imageFileToDataUrl, loadImageSize } from '../../utils/image';
import { layoutCard } from './renderer';
import { uid } from '../../utils/id';

const MAX_IMAGE_WIDTH = 520;

async function imageObject(src, x, y, authorId) {
  const { width, height } = await loadImageSize(src);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / width);
  return { id: uid('o-'), type: 'image', src, x, y, w: Math.round(width * scale), h: Math.round(height * scale), authorId };
}

function card(data, center, authorId) {
  const obj = { id: uid('o-'), type: 'card', authorId, ...data };
  obj.x = Math.round(center.x - obj.w / 2);
  obj.y = Math.round(center.y - layoutCard(obj).height / 2);
  return obj;
}

/**
 * @param item   { kind: 'exercise' | 'file' | 'topic' | 'deviceImage', id?, file? }
 * @param center punto del mundo donde ubicar el contenido
 */
export async function buildInsertObjects(item, center, state, user) {
  if (item.kind === 'deviceImage') {
    const src = await imageFileToDataUrl(item.file);
    const img = await imageObject(src, 0, 0, user.id);
    return [{ ...img, x: Math.round(center.x - img.w / 2), y: Math.round(center.y - img.h / 2) }];
  }

  if (item.kind === 'exercise') {
    const exercise = state.exercises.find((ex) => ex.id === item.id);
    if (!exercise) throw new Error('El ejercicio ya no existe');
    const topic = state.topics.find((t) => t.id === exercise.topicId);
    const exerciseCard = card(
      { w: 560, tag: `Ejercicio · ${topic?.name ?? 'Física'}`, title: exercise.title, body: exercise.statement, accent: topic?.color, exerciseId: exercise.id },
      center,
      user.id,
    );
    const cardHeight = layoutCard(exerciseCard).height;
    if (!exercise.imageUrl) {
      exerciseCard.y = Math.round(center.y - cardHeight / 2);
      return [exerciseCard];
    }
    // Tarjeta + imagen debajo, centradas juntas en la vista.
    const img = await imageObject(exercise.imageUrl, exerciseCard.x, 0, user.id);
    exerciseCard.y = Math.round(center.y - (cardHeight + 20 + img.h) / 2);
    img.y = exerciseCard.y + cardHeight + 20;
    return [exerciseCard, img];
  }

  if (item.kind === 'file') {
    const file = state.files.find((f) => f.id === item.id);
    if (!file) throw new Error('El archivo ya no existe');
    if (file.type === 'image') {
      const src = file.sample?.src ?? file.url ?? (await imageFileToDataUrl(await getFileBlob(file)));
      const img = await imageObject(src, 0, 0, user.id);
      return [{ ...img, x: Math.round(center.x - img.w / 2), y: Math.round(center.y - img.h / 2) }];
    }
    const topic = getTopicForFolder(state, file.folderId);
    return [
      card(
        {
          w: 420,
          tag: `${file.type === 'pdf' ? 'PDF' : 'Documento'} · ${topic?.name ?? 'Repositorio'}`,
          title: file.name,
          body: file.sample?.sections?.map((section) => section.heading).join(' · ') ?? '',
          hint: 'Tocá con la herramienta Mover para abrirlo ↗',
          accent: topic?.color ?? '#dc2626',
          fileId: file.id,
        },
        center,
        user.id,
      ),
    ];
  }

  if (item.kind === 'topic') {
    const topic = state.topics.find((t) => t.id === item.id);
    if (!topic) throw new Error('El tema ya no existe');
    const body = [topic.summary, ...(topic.formulas ?? [])].join('\n');
    return [card({ w: 480, tag: 'Tema', title: topic.name, body, accent: topic.color, topicId: topic.id }, center, user.id)];
  }

  return [];
}
