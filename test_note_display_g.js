// 音階表示のテスト
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function frequencyToNote(freq) {
  if (freq <= 0) return { noteName: "", cents: 0 };

  // A4 = 440Hz を基準とする
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75); // C0の周波数

  if (freq > C0) {
    const h = Math.round(12 * Math.log2(freq / C0));
    const octave = Math.floor(h / 12);
    const n = h % 12;
    const noteName = octave + noteNames[n];
    
    // セント値の計算
    const expectedFreq = C0 * Math.pow(2, h / 12);
    const cents = Math.round(1200 * Math.log2(freq / expectedFreq));
    
    return { noteName, cents };
  }
  
  return { noteName: "", cents: 0 };
}

// テスト用の周波数
const testFrequencies = [
  { freq: 392.00, expected: "4G" }, // G4
  { freq: 415.30, expected: "4G#" }, // G#4
  { freq: 196.00, expected: "3G" }, // G3
  { freq: 783.99, expected: "5G" }, // G5
];

console.log("音階表示テスト結果:");
console.log("周波数 -> 期待値 | 実際の値");
console.log("------------------------");

testFrequencies.forEach(test => {
  const result = frequencyToNote(test.freq);
  const match = result.noteName === test.expected ? "✓" : "✗";
  console.log(`${test.freq}Hz -> ${test.expected} | ${result.noteName} ${match}`);
});

