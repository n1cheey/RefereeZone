
import React from 'react';
import Layout from './Layout';
import { MOCK_NEWS } from '../constants';
import { ExternalLink } from 'lucide-react';

const News: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <Layout title="League News" onBack={onBack}>
      <div className="space-y-6">
        {MOCK_NEWS.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover" />
            <div className="p-5">
              <div className="text-xs font-bold text-[#f97316] uppercase mb-1 tracking-wider">{item.date}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight">{item.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{item.summary}</p>
              <button className="flex items-center gap-2 text-sm font-bold text-[#581c1c] group">
                Read Full Article 
                <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button className="text-sm font-bold text-slate-400 hover:text-slate-600">
          Load older news...
        </button>
      </div>
    </Layout>
  );
};

export default News;
