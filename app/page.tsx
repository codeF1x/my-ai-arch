
'use client';
import { useState ,useEffect} from "react";
const sentimentConfig = {
  positive: { color: 'bg-green-100 border-green-500 text-green-700', icon: '✅', label: '积极' },
  negative: { color: 'bg-red-100 border-red-500 text-red-700', icon: '🚨', label: '消极' },
  neutral:  { color: 'bg-blue-100 border-blue-500 text-blue-700', icon: 'ℹ️', label: '中性' },
};

export default function AnalysisPage() {
  const [text,setText] = useState('');
  const [analysis,setAnalysis] = useState<any>(null);
  const [loading,setLoading] = useState(false);
// 2. 增加历史记录状态
  const [history, setHistory] = useState<any[]>([]);

  // 3. 封装一个获取历史记录的函数
  const fetchHistory = async () => {
    const res = await fetch('/api/analyze');
    const data = await res.json();
    setHistory(data);
  };

  // 4. 页面首次加载时自动获取历史
  useEffect(() => {
    fetchHistory();
  }, []);

  const handleAnalyze = async () => {
   setLoading(true);
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setAnalysis(data); // 存储后端返回的整个对象（包含 id 和 result）
    setLoading(false);
    // 5. 分析成功后，刷新历史列表
      fetchHistory();
  };

// 根据后端返回的情感，提取 UI 配置
  const config = analysis ? sentimentConfig[analysis.result.sentiment as keyof typeof sentimentConfig] : null;
  
return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">智能故障分析器</h1>
        
        <textarea 
          className="w-full p-4 h-32 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
          placeholder="请输入设备故障描述，例如：屏幕有横纹，太糟糕了..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button 
          onClick={handleAnalyze}
          disabled={loading || !text}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all disabled:bg-gray-400"
        >
          {loading ? '专家正在诊断中...' : '提交专家分析'}
        </button>

        {/* ✅ 5. 动态渲染“变色龙”卡片 */}
        
        {analysis && config && (
          <div className={`p-6 border-l-8 rounded-xl shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 ${config.color}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{config.icon}</span>
                <h2 className="font-bold text-lg">{config.label} (任务 #{analysis.id})</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-white/50 rounded-full">
                置信度: {(analysis.result.score * 100).toFixed(0)}%
              </span>
            </div>
            <p className="leading-relaxed text-sm lg:text-base">
              {analysis.result.summary}
            </p>
          </div>
        )}
        {/* 6. 历史记录列表部分 */}
        <div className="pt-10 border-t border-gray-200">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            📜 历史分析存证
          </h2>
          
          <div className="space-y-4">
            {history.map((item) => {
              // 同样复用之前的颜色配置
              const itemConfig = sentimentConfig[item.result.sentiment as keyof typeof sentimentConfig];
              
              return (
                <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-start gap-4">
                  <span className="text-2xl">{itemConfig?.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-800 line-clamp-1">{item.content}</p>
                      <span className="text-xs text-gray-400">
                        #{item.id} · {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{item.result.summary}</p>
                  </div>
                </div>
              );
            })}
            
            {history.length === 0 && (
              <p className="text-center text-gray-400 py-10">暂无历史记录，开始你的第一次分析吧！</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
