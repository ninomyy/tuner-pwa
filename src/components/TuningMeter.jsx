import React from 'react';

const TuningMeter = ({ cents, isListening }) => {
  // セント値を-50から+50の範囲で正規化
  const normalizedCents = Math.max(-50, Math.min(50, cents));
  const meterPosition = ((normalizedCents + 50) / 100) * 100; // 0-100%

  return (
    <div className="tuning-meter">
      <div className="meter-container">
        {/* 背景の基準線 */}
        <div className="center-line"></div>
        
        {/* スケールラベル */}
        {[-50, -25, 0, 25, 50].map((value) => (
          <div 
            key={value} 
            className="scale-mark" 
            style={{ left: `${((value + 50) / 100) * 100}%` }}
          >
            <span className="scale-label">{value > 0 ? `+${value}` : value}</span>
          </div>
        ))}

        {/* メーターのトラック */}
        <div className="meter-track"></div>
        
        {/* 動くインジケーター */}
        {isListening && (
          <div 
            className="meter-indicator"
            style={{ 
              left: `${meterPosition}%`,
            }}
          ></div>
        )}
      </div>
      
      {/* クラシックテーマ用の正確性インジケーター (赤い丸) */}
      <div className="accuracy-indicator">
        <div className="accuracy-light"></div>
      </div>
    </div>
  );
};

export default TuningMeter;
