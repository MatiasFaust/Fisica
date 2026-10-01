/** Datos ficticios para visualizar la plataforma antes de conectar Firebase. */
import { todayLabel } from '../utils/format';

const DAY = 86400000;
const daysAgo = (days, hour = 10) => {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const daysAhead = (days) => daysAgo(-days, 23);

const svgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const gridLines = () => {
  const vertical = Array.from({ length: 11 }, (_, i) => `<line x1="${30 + i * 36}" y1="20" x2="${30 + i * 36}" y2="270"/>`);
  const horizontal = Array.from({ length: 8 }, (_, i) => `<line x1="30" y1="${18 + i * 36}" x2="390" y2="${18 + i * 36}"/>`);
  return vertical.concat(horizontal).join('');
};

const VECTORS_DIAGRAM = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300">
<rect width="420" height="300" fill="#ffffff"/>
<defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#1d4ed8"/></marker>
<marker id="b" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#dc2626"/></marker></defs>
<g stroke="#cbd5e1" stroke-width="1">${gridLines()}</g>
<line x1="30" y1="270" x2="400" y2="270" stroke="#334155" stroke-width="2"/><line x1="30" y1="270" x2="30" y2="10" stroke="#334155" stroke-width="2"/>
<line x1="30" y1="270" x2="210" y2="162" stroke="#1d4ed8" stroke-width="4" marker-end="url(#a)"/>
<line x1="30" y1="270" x2="102" y2="90" stroke="#dc2626" stroke-width="4" marker-end="url(#b)"/>
<text x="130" y="230" font-family="Arial" font-size="20" fill="#1d4ed8" font-weight="bold">A</text>
<text x="45" y="150" font-family="Arial" font-size="20" fill="#dc2626" font-weight="bold">B</text>
<text x="290" y="295" font-family="Arial" font-size="13" fill="#64748b">1 cuadro = 1 unidad</text>
</svg>`);

const INCLINED_PLANE = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
<rect width="480" height="300" fill="#ffffff"/>
<polygon points="40,260 440,260 440,60" fill="#e0ecff" stroke="#0f2a4a" stroke-width="3"/>
<g transform="rotate(-26.6 260 170)"><rect x="220" y="120" width="80" height="50" rx="6" fill="#1d4ed8"/></g>
<line x1="262" y1="150" x2="262" y2="250" stroke="#dc2626" stroke-width="4"/><text x="270" y="245" font-family="Arial" font-size="18" fill="#dc2626">P</text>
<line x1="262" y1="150" x2="222" y2="70" stroke="#16a34a" stroke-width="4"/><text x="200" y="72" font-family="Arial" font-size="18" fill="#16a34a">N</text>
<text x="100" y="250" font-family="Arial" font-size="16" fill="#0f2a4a">&#945;</text>
</svg>`);

/** Arma un objeto de pizarra con valores por defecto. */
let seedCounter = 0;
const obj = (data) => ({ id: `seed-obj-${++seedCounter}`, color: '#0f2a4a', size: 3, authorId: 'prof-martin', ...data });

function mruClassPages() {
  return [
    {
      id: 'page-mru-1',
      objects: [
        obj({ type: 'text', x: 80, y: 60, text: 'MRU — Movimiento Rectilíneo Uniforme', size: 34 }),
        obj({ type: 'text', x: 80, y: 130, text: 'La velocidad es constante → la aceleración es 0', size: 22, color: '#475569' }),
        obj({ type: 'text', x: 80, y: 200, text: 'x(t) = x₀ + v · t', size: 30, color: '#1d4ed8' }),
        obj({ type: 'rect', x1: 66, y1: 190, x2: 340, y2: 245, color: '#1d4ed8', size: 2 }),
        obj({ type: 'arrow', x1: 120, y1: 560, x2: 620, y2: 560, size: 3 }),
        obj({ type: 'arrow', x1: 120, y1: 560, x2: 120, y2: 300, size: 3 }),
        obj({ type: 'text', x: 600, y: 572, text: 't (s)', size: 20 }),
        obj({ type: 'text', x: 80, y: 290, text: 'x (m)', size: 20 }),
        obj({ type: 'line', x1: 120, y1: 500, x2: 560, y2: 330, color: '#dc2626', size: 4 }),
        obj({ type: 'text', x: 300, y: 330, text: 'pendiente = v', size: 20, color: '#dc2626' }),
        obj({ type: 'marker', points: [[700, 222], [760, 218], [840, 224], [990, 220]], color: '#facc15', size: 22 }),
        obj({ type: 'text', x: 700, y: 170, text: 'Ejemplo: v = 5 m/s, x₀ = 10 m', size: 20 }),
        obj({ type: 'text', x: 700, y: 208, text: 'x(4 s) = 10 + 5 · 4 = 30 m', size: 22, color: '#16a34a' }),
      ],
    },
  ];
}

function fallClassPages() {
  return [
    {
      id: 'page-caida-1',
      objects: [
        obj({ type: 'text', x: 80, y: 60, text: 'Caída libre', size: 34 }),
        obj({ type: 'text', x: 80, y: 120, text: 'Es un MRUV con a = g ≈ 9,8 m/s² (hacia abajo)', size: 22, color: '#475569' }),
        obj({ type: 'text', x: 80, y: 190, text: 'v = v₀ − g · t', size: 26, color: '#1d4ed8' }),
        obj({ type: 'text', x: 80, y: 240, text: 'y = y₀ + v₀ · t − ½ · g · t²', size: 26, color: '#1d4ed8' }),
        obj({ type: 'ellipse', x1: 620, y1: 120, x2: 670, y2: 170, color: '#dc2626', size: 3 }),
        obj({ type: 'arrow', x1: 645, y1: 180, x2: 645, y2: 330, color: '#dc2626', size: 4 }),
        obj({ type: 'text', x: 660, y: 245, text: 'g', size: 24, color: '#dc2626' }),
        obj({ type: 'line', x1: 540, y1: 420, x2: 760, y2: 420, size: 4 }),
      ],
    },
  ];
}

function forcesClassPages() {
  return [
    {
      id: 'page-fuerzas-1',
      objects: [
        obj({ type: 'text', x: 80, y: 60, text: 'Fuerzas — Diagrama de cuerpo libre', size: 34 }),
        obj({ type: 'rect', x1: 360, y1: 260, x2: 480, y2: 360, color: '#1d4ed8', size: 3 }),
        obj({ type: 'arrow', x1: 420, y1: 360, x2: 420, y2: 500, color: '#dc2626', size: 4 }),
        obj({ type: 'text', x: 432, y: 460, text: 'P = m · g', size: 20, color: '#dc2626' }),
        obj({ type: 'arrow', x1: 420, y1: 260, x2: 420, y2: 130, color: '#16a34a', size: 4 }),
        obj({ type: 'text', x: 432, y: 130, text: 'N', size: 22, color: '#16a34a' }),
        obj({ type: 'arrow', x1: 480, y1: 310, x2: 640, y2: 310, size: 4 }),
        obj({ type: 'text', x: 600, y: 272, text: 'F', size: 22 }),
        obj({ type: 'arrow', x1: 360, y1: 310, x2: 260, y2: 310, color: '#f97316', size: 4 }),
        obj({ type: 'text', x: 250, y: 272, text: 'Froz', size: 22, color: '#f97316' }),
        obj({ type: 'text', x: 80, y: 570, text: 'ΣF = m · a', size: 30, color: '#1d4ed8' }),
      ],
    },
  ];
}

const pdf = (title, sections) => ({ kind: 'pdf', title, sections });

/**
 * Contenido inicial para un proyecto de Firebase vacío: carpetas, temas, archivos
 * de ejemplo, ejercicios y clases guardadas (sin usuarios ni entregas ficticias).
 */
export function createCloudSeed(teacherId) {
  const data = createSeedData();
  const own = (item) => ({ ...item, ownerId: teacherId });
  return {
    folders: data.folders,
    topics: data.topics,
    files: data.files.map(own),
    exercises: data.exercises,
    savedClasses: data.savedClasses.map(own),
  };
}

export function createSeedData() {
  seedCounter = 0;

  const users = [
    { id: 'prof-martin', name: 'Martín', displayName: 'Profesor Martín', role: 'teacher', email: 'martin@fisica.edu', color: '#0f2a4a' },
    { id: 'alu-matias', name: 'Matías', displayName: 'Matías', role: 'student', email: 'matias@alumnos.edu', color: '#2563eb' },
    { id: 'alu-juan', name: 'Juan', displayName: 'Juan', role: 'student', email: 'juan@alumnos.edu', color: '#0891b2' },
    { id: 'alu-sofia', name: 'Sofía', displayName: 'Sofía', role: 'student', email: 'sofia@alumnos.edu', color: '#7c3aed' },
    { id: 'alu-lucas', name: 'Lucas', displayName: 'Lucas', role: 'student', email: 'lucas@alumnos.edu', color: '#db2777' },
  ];

  const folders = [
    { id: 'root', name: 'Física', parentId: null, createdAt: daysAgo(60) },
    { id: 'f-cinematica', name: 'Cinemática', parentId: 'root', topicId: 'cinematica', createdAt: daysAgo(50) },
    { id: 'f-mru', name: 'MRU', parentId: 'f-cinematica', createdAt: daysAgo(50) },
    { id: 'f-mruv', name: 'MRUV', parentId: 'f-cinematica', createdAt: daysAgo(45) },
    { id: 'f-caida', name: 'Caída libre', parentId: 'f-cinematica', createdAt: daysAgo(40) },
    { id: 'f-dinamica', name: 'Dinámica', parentId: 'root', topicId: 'dinamica', createdAt: daysAgo(35) },
    { id: 'f-newton', name: 'Leyes de Newton', parentId: 'f-dinamica', createdAt: daysAgo(35) },
    { id: 'f-fuerza', name: 'Fuerza', parentId: 'f-dinamica', createdAt: daysAgo(33) },
    { id: 'f-rozamiento', name: 'Rozamiento', parentId: 'f-dinamica', createdAt: daysAgo(30) },
    { id: 'f-vectores', name: 'Vectores', parentId: 'root', topicId: 'vectores', createdAt: daysAgo(55) },
    { id: 'f-energia', name: 'Energía', parentId: 'root', topicId: 'energia', createdAt: daysAgo(20) },
    { id: 'f-practicos', name: 'Prácticos', parentId: 'root', createdAt: daysAgo(58) },
  ];

  const topics = [
    {
      id: 'cinematica',
      name: 'Cinemática',
      summary: 'Movimiento, velocidad y aceleración.',
      folderId: 'f-cinematica',
      color: '#2563eb',
      createdAt: daysAgo(50),
      explanation: [
        'La cinemática estudia el movimiento de los cuerpos sin preguntarse por sus causas. Describe dónde está un objeto, qué tan rápido se mueve y cómo cambia su velocidad con el tiempo.',
        'Trabajamos con tres casos: el Movimiento Rectilíneo Uniforme (velocidad constante), el Movimiento Rectilíneo Uniformemente Variado (aceleración constante) y la caída libre, que es un MRUV con la aceleración de la gravedad.',
      ],
      formulas: ['x = x₀ + v · t', 'v = v₀ + a · t', 'x = x₀ + v₀ · t + ½ · a · t²', 'v² = v₀² + 2 · a · Δx'],
    },
    {
      id: 'dinamica',
      name: 'Dinámica',
      summary: 'Fuerzas y Leyes de Newton.',
      folderId: 'f-dinamica',
      color: '#0891b2',
      createdAt: daysAgo(35),
      explanation: [
        'La dinámica explica por qué se mueven los cuerpos. Relaciona las fuerzas que actúan sobre un objeto con los cambios en su movimiento.',
        'La herramienta principal es el diagrama de cuerpo libre: dibujamos el cuerpo aislado y todas las fuerzas que actúan sobre él (peso, normal, rozamiento, tensiones) y aplicamos la segunda ley de Newton.',
      ],
      formulas: ['ΣF = m · a', 'P = m · g', 'Froz = μ · N'],
    },
    {
      id: 'vectores',
      name: 'Vectores',
      summary: 'Operaciones con vectores.',
      folderId: 'f-vectores',
      color: '#7c3aed',
      createdAt: daysAgo(55),
      explanation: [
        'Un vector es una magnitud que tiene módulo, dirección y sentido. Las fuerzas, las velocidades y los desplazamientos son vectores.',
        'Vamos a sumar vectores de forma gráfica (método del paralelogramo y poligonal) y analítica (descomponiendo en componentes x e y).',
      ],
      formulas: ['|A| = √(Ax² + Ay²)', 'Ax = |A| · cos α', 'Ay = |A| · sen α', 'A + B = (Ax + Bx ; Ay + By)'],
    },
    {
      id: 'energia',
      name: 'Energía',
      summary: 'Trabajo, energía y potencia.',
      folderId: 'f-energia',
      color: '#16a34a',
      createdAt: daysAgo(20),
      explanation: [
        'La energía es la capacidad de un sistema para realizar trabajo. Estudiamos la energía cinética, la potencial gravitatoria y cómo se conserva la energía mecánica cuando no hay rozamiento.',
        'También vemos la potencia: qué tan rápido se realiza un trabajo.',
      ],
      formulas: ['W = F · d · cos α', 'Ec = ½ · m · v²', 'Ep = m · g · h', 'P = W / t'],
    },
  ];

  const files = [
    {
      id: 'file-mru-teoria', name: 'MRU - Teoría.pdf', folderId: 'f-mru', type: 'pdf', category: 'teoria', size: 248000, uploadedAt: daysAgo(12), ownerId: 'prof-martin',
      sample: pdf('MRU - Teoría', [
        { heading: 'Definición', lines: ['El Movimiento Rectilíneo Uniforme (MRU) es aquel en el que un cuerpo se desplaza en línea recta con velocidad constante.', 'Como la velocidad no cambia, la aceleración es nula.'] },
        { heading: 'Ecuación horaria', lines: ['x(t) = x0 + v · t', 'x0: posición inicial (m)    v: velocidad (m/s)    t: tiempo (s)'] },
        { heading: 'Gráficos', lines: ['Posición en función del tiempo: una recta cuya pendiente es la velocidad.', 'Velocidad en función del tiempo: una recta horizontal.'] },
      ]),
    },
    {
      id: 'file-mru-ejercicios', name: 'Ejercicios MRU.pdf', folderId: 'f-mru', type: 'pdf', category: 'ejercicios', size: 182000, uploadedAt: daysAgo(10), ownerId: 'prof-martin',
      sample: pdf('Ejercicios MRU', [
        { heading: 'Ejercicio 1', lines: ['Un auto viaja a 72 km/h. ¿Qué distancia recorre en 15 minutos?'] },
        { heading: 'Ejercicio 2', lines: ['Un ciclista parte de x0 = 20 m con v = 5 m/s. Escribí su ecuación horaria y calculá su posición a los 8 s.'] },
        { heading: 'Ejercicio 3', lines: ['Dos móviles parten de ciudades separadas 300 km, uno hacia el otro, a 80 km/h y 70 km/h. ¿Cuándo y dónde se encuentran?'] },
      ]),
    },
    {
      id: 'file-newton', name: 'Leyes de Newton.pdf', folderId: 'f-newton', type: 'pdf', category: 'teoria', size: 312000, uploadedAt: daysAgo(6), ownerId: 'prof-martin',
      sample: pdf('Leyes de Newton', [
        { heading: 'Primera ley (Inercia)', lines: ['Todo cuerpo permanece en reposo o en MRU si la suma de fuerzas sobre él es cero.'] },
        { heading: 'Segunda ley (Masa)', lines: ['La suma de fuerzas es igual a la masa por la aceleración: SF = m · a'] },
        { heading: 'Tercera ley (Acción y reacción)', lines: ['Si un cuerpo A ejerce una fuerza sobre B, B ejerce sobre A una fuerza igual y opuesta.'] },
      ]),
    },
    {
      id: 'file-vectores-p1', name: 'Vectores - Práctico 1.pdf', folderId: 'f-vectores', type: 'pdf', category: 'ejercicios', size: 205000, uploadedAt: daysAgo(2), ownerId: 'prof-martin',
      sample: pdf('Vectores - Práctico 1', [
        { heading: '1. Componentes', lines: ['Hallá las componentes de un vector de módulo 10 que forma 30° con el eje x.'] },
        { heading: '2. Suma gráfica', lines: ['Sumá gráficamente A = (3 ; 2) y B = (1 ; 4) con el método del paralelogramo.'] },
        { heading: '3. Módulo y dirección', lines: ['Calculá el módulo y el ángulo de la resultante del ejercicio anterior.'] },
      ]),
    },
    {
      id: 'file-mruv-formulas', name: 'MRUV - Fórmulas.pdf', folderId: 'f-mruv', type: 'pdf', category: 'teoria', size: 96000, uploadedAt: daysAgo(8), ownerId: 'prof-martin',
      sample: pdf('MRUV - Fórmulas', [
        { heading: 'Ecuaciones', lines: ['v = v0 + a · t', 'x = x0 + v0 · t + 1/2 · a · t²', 'v² = v0² + 2 · a · (x - x0)'] },
      ]),
    },
    {
      id: 'file-plano', name: 'Plano inclinado - Diagrama.svg', folderId: 'f-fuerza', type: 'image', category: 'complementario', size: 14000, uploadedAt: daysAgo(4), ownerId: 'prof-martin',
      sample: { kind: 'image', src: INCLINED_PLANE },
    },
    {
      id: 'file-practico-1', name: 'Práctico 1 - Cinemática.pdf', folderId: 'f-practicos', type: 'pdf', category: 'ejercicios', size: 158000, uploadedAt: daysAgo(14), ownerId: 'prof-martin',
      sample: pdf('Práctico 1 - Cinemática', [
        { heading: 'Consignas', lines: ['Resolvé los ejercicios mostrando el planteo, las ecuaciones y las unidades.', 'Fecha de entrega: próxima clase.'] },
      ]),
    },
  ];

  const exercises = [
    {
      id: 'ex-vectores-suma', title: 'Suma de vectores en el plano', topicId: 'vectores', difficulty: 'media', dueDate: daysAhead(2), createdAt: daysAgo(1),
      statement: 'Observá los vectores A y B del gráfico. Escribí sus componentes, calculá la resultante A + B y su módulo. Dibujá la resultante con el método del paralelogramo.',
      imageUrl: VECTORS_DIAGRAM, fileId: 'file-vectores-p1',
    },
    {
      id: 'ex-mru-auto', title: 'Distancia recorrida por un auto', topicId: 'cinematica', difficulty: 'facil', dueDate: daysAhead(4), createdAt: daysAgo(5),
      statement: 'Un auto viaja a velocidad constante de 72 km/h. ¿Qué distancia recorre en 15 minutos? Expresá el resultado en metros y en kilómetros.',
      fileId: 'file-mru-ejercicios',
    },
    {
      id: 'ex-encuentro', title: 'Encuentro de dos móviles', topicId: 'cinematica', difficulty: 'dificil', dueDate: daysAhead(6), createdAt: daysAgo(3),
      statement: 'Dos trenes parten al mismo tiempo de dos estaciones separadas 300 km, uno hacia el otro, con velocidades de 80 km/h y 70 km/h. Planteá las ecuaciones horarias y calculá cuándo y dónde se encuentran.',
    },
    {
      id: 'ex-newton-caja', title: 'Caja empujada sobre el piso', topicId: 'dinamica', difficulty: 'media', dueDate: daysAhead(9), createdAt: daysAgo(2),
      statement: 'Una caja de 20 kg es empujada con una fuerza horizontal de 120 N. El coeficiente de rozamiento es 0,3. Hacé el diagrama de cuerpo libre y calculá la aceleración de la caja (g = 9,8 m/s²).',
    },
    {
      id: 'ex-energia-montana', title: 'Conservación de la energía', topicId: 'energia', difficulty: 'media', dueDate: daysAhead(12), createdAt: daysAgo(1),
      statement: 'Un carrito de 50 kg parte del reposo desde 20 m de altura en una montaña rusa sin rozamiento. ¿Con qué velocidad llega al punto más bajo?',
    },
    {
      id: 'ex-caida-pelota', title: 'Pelota en caída libre', topicId: 'cinematica', difficulty: 'facil', dueDate: daysAgo(2, 23), createdAt: daysAgo(9),
      statement: 'Se deja caer una pelota desde 45 m de altura. ¿Cuánto tarda en llegar al suelo y con qué velocidad impacta? (g = 10 m/s²)',
    },
  ];

  const submissions = [
    { id: 'sub-1', exerciseId: 'ex-caida-pelota', studentId: 'alu-matias', answer: 't = 3 s y v = 30 m/s.', submittedAt: daysAgo(3, 18) },
    { id: 'sub-2', exerciseId: 'ex-mru-auto', studentId: 'alu-matias', answer: '72 km/h = 20 m/s. En 900 s recorre 18 000 m = 18 km.', submittedAt: daysAgo(1, 20) },
    { id: 'sub-3', exerciseId: 'ex-caida-pelota', studentId: 'alu-sofia', answer: 'Tarda 3 s. Llega a 30 m/s.', submittedAt: daysAgo(4, 17) },
    { id: 'sub-4', exerciseId: 'ex-caida-pelota', studentId: 'alu-juan', answer: 'h = ½ g t² → t = 3 s; v = g·t = 30 m/s', submittedAt: daysAgo(2, 21) },
    { id: 'sub-5', exerciseId: 'ex-mru-auto', studentId: 'alu-sofia', answer: '18 km', submittedAt: daysAgo(0, 9) },
  ];

  const sessions = [
    { id: 'clase-vectores', title: `Clase - Vectores ${todayLabel()}`, topicId: 'vectores', ownerId: 'prof-martin', createdAt: daysAgo(0, 8), active: true },
  ];

  const savedClasses = [
    { id: 'saved-mru', title: 'Clase MRU', topicId: 'cinematica', savedAt: daysAgo(9, 12), ownerId: 'prof-martin', pages: mruClassPages() },
    { id: 'saved-caida', title: 'Clase Caída libre', topicId: 'cinematica', savedAt: daysAgo(6, 12), ownerId: 'prof-martin', pages: fallClassPages() },
    { id: 'saved-fuerzas', title: 'Clase Fuerzas', topicId: 'dinamica', savedAt: daysAgo(2, 12), ownerId: 'prof-martin', pages: forcesClassPages() },
  ];

  const activity = [
    { id: 'act-1', userId: 'prof-martin', type: 'upload', text: 'subió «Vectores - Práctico 1.pdf»', link: '/repositorio/f-vectores', at: daysAgo(2) },
    { id: 'act-2', userId: 'prof-martin', type: 'class', text: 'guardó la clase «Clase Fuerzas»', link: '/clases/saved-fuerzas', at: daysAgo(2, 12) },
    { id: 'act-3', userId: 'alu-juan', type: 'submission', text: 'resolvió «Pelota en caída libre»', link: '/ejercicios/ex-caida-pelota', at: daysAgo(2, 21) },
    { id: 'act-4', userId: 'prof-martin', type: 'exercise', text: 'publicó el ejercicio «Caja empujada sobre el piso»', link: '/ejercicios/ex-newton-caja', at: daysAgo(2, 9) },
    { id: 'act-5', userId: 'alu-matias', type: 'submission', text: 'resolvió «Distancia recorrida por un auto»', link: '/ejercicios/ex-mru-auto', at: daysAgo(1, 20) },
    { id: 'act-6', userId: 'prof-martin', type: 'exercise', text: 'publicó el ejercicio «Suma de vectores en el plano»', link: '/ejercicios/ex-vectores-suma', at: daysAgo(1, 9) },
    { id: 'act-7', userId: 'prof-martin', type: 'class', text: 'inició la clase en vivo «Clase - Vectores»', link: '/pizarra/clase-vectores', at: daysAgo(0, 8) },
    { id: 'act-8', userId: 'alu-sofia', type: 'submission', text: 'resolvió «Distancia recorrida por un auto»', link: '/ejercicios/ex-mru-auto', at: daysAgo(0, 9) },
  ];

  return {
    version: 1,
    users,
    folders,
    topics,
    files,
    exercises,
    submissions,
    sessions,
    savedClasses,
    activity,
  };
}
