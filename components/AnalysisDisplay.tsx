
import React from 'react';

interface AnalysisDisplayProps {
  report: string;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ report }) => {
  const downloadReport = () => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Diagnostic_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Результат анализа</h2>
        <button
          onClick={downloadReport}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          Скачать отчет (.txt)
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm prose prose-blue max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {report}
      </div>
    </div>
  );
};

export default AnalysisDisplay;
