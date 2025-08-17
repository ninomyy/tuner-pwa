import React from 'react';

const TuningMeter = ({ cents, isListening }) => {
  // セント値を-50から+50の範囲で正規化
  const normalizedCents = Math.max(-50, Math.min(50, cents));
  const meterPosition = ((normalizedCents + 50) / 100) * 100; // 0-100%

  // 正確性に基づく色の決定
  const getColor = (cents) => {
    const absCents = Math.abs(cents);
    if (absCents <= 5) return '#2ecc71'; // 緑（正確）
    if (absCents <= 15) return '#f39c12'; // オレンジ（やや不正確）
    return '#e74c3c'; // 赤（不正確）
  };

  const meterColor = getColor(cents);

  return (
    <div className="tuning-meter">
      <div className="meter-container">
        {/* 背景のスケール */}
        <div className="meter-scale">
          {[-50, -25, 0, 25, 50].map((value) => (
            <div key={value} className="scale-mark" data-value={value}>
              <div className="scale-line"></div>
              <span className="scale-label">{value > 0 ? `+${value}` : value}</span>
            </div>
          ))}
        </div>
        
        {/* メーターバー */}
        <div className="meter-bar">
          <div className="meter-track"></div>
          {isListening && (
            <div 
              className="meter-indicator"
              style={{ 
                left: `${meterPosition}%`,
                backgroundColor: meterColor,
                boxShadow: `0 0 20px ${meterColor}`
              }}
            ></div>
          )}
          {/* 中央の基準線 */}
          <div className="center-line"></div>
        </div>
        
        {/* 正確性インジケーター */}
        <div className="accuracy-indicator">
          <div 
            className={`accuracy-light ${Math.abs(cents) <= 5 ? 'accurate' : ''}`}
            style={{ backgroundColor: meterColor }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default TuningMeter;

