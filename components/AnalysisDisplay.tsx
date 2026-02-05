
import React from 'react';

interface AnalysisDisplayProps {
  report: string;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ report }) => {
  const downloadReport = () => {
    // Чистим текст для файла от всех Markdown-артефактов
    const cleanText = report.replace(/[\*\_~`#]/g, '').trim();
    const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Diagnostic_Report_${new Date().toLocaleDateString()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatText = (text: string) => {
    // 1. Очистка от возможных приветствий, если они все же просочились через промпт
    let processedText = text.replace(/^(Как ведущий эксперт|Ниже представлен|Я провел анализ|Проведен анализ|Здравствуйте|Этот отчет).+?\n/i, '');

    return processedText.split('\n').map((line, i) => {
      let trimmed = line.trim();
      
      // Удаляем "одиночные" звездочки, которые часто остаются от списков ИИ
      trimmed = trimmed.replace(/^\s*[\*\-•]\s*/, '• ');

      if (!trimmed || trimmed === '•') return <div key={i} className="h-3 md:h-4"></div>;

      // Рендеринг заголовков (очищаем от знаков #)
      if (trimmed.startsWith('###')) {
        return <h3 key={i} className="text-[10px] md:text-xs font-black text-indigo-500 mt-6 md:mt-10 mb-2 md:mb-3 uppercase tracking-[0.25em]">{trimmed.replace(/#/g, '').trim()}</h3>;
      }
      if (trimmed.startsWith('##')) {
        return <h2 key={i} className="text-xl md:text-2xl font-bold text-slate-900 mt-10 md:mt-14 mb-4 md:mb-6 border-b border-slate-100 pb-3">{trimmed.replace(/#/g, '').trim()}</h2>;
      }
      if (trimmed.startsWith('#')) {
        return <h1 key={i} className="text-2xl md:text-4xl font-black text-slate-900 mb-8 md:mb-10 tracking-tight leading-tight">{trimmed.replace(/#/g, '').trim()}</h1>;
      }
      
      // Списки (улучшенная верстка)
      if (trimmed.startsWith('•')) {
        const content = trimmed.replace('•', '').trim();
        // Рендерим жирный текст внутри списка, очищая от **
        const formatted = content.split('**').map((part, idx) => 
          idx % 2 === 1 ? <strong key={idx} className="text-slate-900 font-bold">{part}</strong> : part
        );
        return (
          <div key={i} className="flex gap-3 md:gap-4 mb-3 md:mb-4 ml-1 md:ml-4">
            <span className="text-indigo-500 shrink-0 font-black text-lg leading-none mt-0.5 md:mt-1">·</span>
            <p className="text-slate-600 text-[14px] md:text-base leading-relaxed">{formatted}</p>
          </div>
        );
      }

      // Обычные параграфы
      // Обрабатываем тайм-коды, делая их более заметными
      const withTimecodes = trimmed.split(/(\[\d{1,2}:\d{2}\])/g).map((part, idx) => {
        if (/^\[\d{1,2}:\d{2}\]$/.test(part)) {
          return <span key={idx} className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] md:text-xs font-bold mx-1 tabular-nums align-middle">{part}</span>;
        }
        
        // Обработка жирного текста внутри параграфа
        return part.split('**').map((subPart, sIdx) => 
          sIdx % 2 === 1 ? <strong key={`${idx}-${sIdx}`} className="text-slate-900 font-bold">{subPart}</strong> : subPart
        );
      });

      return <p key={i} className="text-slate-600 text-[14px] md:text-base leading-relaxed mb-4">{withTimecodes}</p>;
    });
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-2 block">Diagnostic Intelligence</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tighter">Аналитический отчет</h2>
        </div>
        <button
          onClick={downloadReport}
          className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Экспорт отчета
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-20 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] border border-slate-100/50 relative overflow-hidden">
        {/* Премиальный декоративный акцент */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-600 opacity-10"></div>
        
        <div className="max-w-none">
          {formatText(report)}
        </div>
        
        <div className="mt-16 md:mt-32 pt-10 md:pt-16 border-t border-slate-50 flex flex-col items-center text-center gap-4">
           <div className="w-16 h-1.5 bg-slate-50 rounded-full mb-6"></div>
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Deep Multimodal Protocol</p>
           <p className="text-[10px] md:text-xs text-slate-400 font-medium max-w-md leading-relaxed px-6">
             Данный отчет сформирован на основе сквозного анализа видеоряда и методических материалов. 
             Используйте его как первичный протокол для дальнейшей экспертной оценки.
           </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
