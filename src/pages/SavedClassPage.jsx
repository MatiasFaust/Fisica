import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Maximize, Presentation } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useToast } from '../context/ToastContext';
import Whiteboard from '../components/whiteboard/Whiteboard';
import { exportPageToBlob } from '../components/whiteboard/renderer';
import { formatDate } from '../utils/format';

/** Repaso de una clase guardada: solo lectura, con zoom y desplazamiento. */
export default function SavedClassPage() {
  const { classId } = useParams();
  const state = useStore();
  const toast = useToast();
  const boardRef = useRef(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const savedClass = state.savedClasses.find((item) => item.id === classId);
  const page = savedClass?.pages[pageIndex];

  // Encuadra el contenido de la hoja al abrirla.
  useEffect(() => {
    const timer = setTimeout(() => boardRef.current?.fitToContent(), 50);
    return () => clearTimeout(timer);
  }, [pageIndex, classId]);

  if (!savedClass) {
    return (
      <div className="board-message">
        <div className="board-message__card">
          <span className="board-message__icon">
            <Presentation size={28} />
          </span>
          <h1>Clase no encontrada</h1>
          <p>Puede que se haya eliminado.</p>
          <Link to="/repositorio/clases-guardadas" className="btn btn--primary">
            Ver clases guardadas
          </Link>
        </div>
      </div>
    );
  }

  const topic = state.topics.find((t) => t.id === savedClass.topicId);

  const handleDownload = async () => {
    const blob = await exportPageToBlob(page);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${savedClass.title} - hoja ${pageIndex + 1}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.info('Descargando imagen de la hoja');
  };

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header__left">
          <Link to="/repositorio/clases-guardadas" className="icon-btn" aria-label="Volver">
            <ArrowLeft size={20} />
          </Link>
          <div className="board-header__title">
            <h1>
              {savedClass.title} - {formatDate(savedClass.savedAt)}
            </h1>
            <span>Clase guardada{topic ? ` · ${topic.name}` : ''} · solo lectura</span>
          </div>
        </div>
        <div className="board-header__right">
          <div className="page-nav">
            <button className="icon-btn icon-btn--sm" onClick={() => setPageIndex(pageIndex - 1)} disabled={pageIndex === 0} aria-label="Hoja anterior">
              <ChevronLeft size={18} />
            </button>
            <span>
              Hoja {pageIndex + 1}/{savedClass.pages.length}
            </span>
            <button
              className="icon-btn icon-btn--sm"
              onClick={() => setPageIndex(pageIndex + 1)}
              disabled={pageIndex === savedClass.pages.length - 1}
              aria-label="Hoja siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="btn btn--soft btn--sm" onClick={handleDownload}>
            <Download size={17} /> <span className="hide-md">Descargar imagen</span>
          </button>
        </div>
      </header>

      <div className="board-stage">
        <Whiteboard ref={boardRef} page={page} tool="hand" color="#000" size={4} readOnly onZoomChange={setZoom} />
        <div className="wb-toolbar wb-toolbar--mini">
          <div className="wb-toolbar__group">
            <button className="wb-tool" onClick={() => boardRef.current?.zoomOut()} aria-label="Alejar">
              <ZoomOut size={19} />
            </button>
            <span className="wb-zoom">{Math.round(zoom * 100)}%</span>
            <button className="wb-tool" onClick={() => boardRef.current?.zoomIn()} aria-label="Acercar">
              <ZoomIn size={19} />
            </button>
            <button className="wb-tool" onClick={() => boardRef.current?.fitToContent()} aria-label="Ver todo" title="Ver todo">
              <Maximize size={19} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
