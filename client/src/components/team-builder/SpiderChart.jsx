import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

function computeScores(squad, format) {
  if (squad.length === 0) return [];

  const scores = {
    Batting: 0, Pace: 0, Spin: 0, Experience: 0, Depth: 0, Fielding: 0,
  };

  let battingTotal = 0, paceCount = 0, spinCount = 0, expTotal = 0;

  squad.forEach((p, i) => {
    // Batting score: weighted by average and strike rate
    const batAvg = p.batting_average || 10;
    const batSR = p.batting_strike_rate || 80;
    // Top-order batsmen contribute more to batting score
    const posWeight = i < 4 ? 1.3 : i < 7 ? 1.0 : 0.6;
    battingTotal += ((batAvg / 50) * 60 + (batSR / 150) * 40) * posWeight;

    // Pace/Spin
    const bStyle = (p.bowling_style || '').toLowerCase();
    const bowlQuality = p.bowling_average ? Math.min(40 / p.bowling_average, 2) : 0;
    if (bStyle.includes('fast') || bStyle.includes('medium') || bStyle.includes('pace')) {
      paceCount++;
      scores.Pace += bowlQuality * 30;
    }
    if (bStyle.includes('spin') || bStyle.includes('orthodox') || bStyle.includes('leg') ||
        bStyle.includes('off break') || bStyle.includes('chinaman') || bStyle.includes('wrist')) {
      spinCount++;
      scores.Spin += bowlQuality * 30;
    }

    // Experience from matches
    const matches = p.batting_matches || p.bowling_matches || 0;
    expTotal += Math.min(matches / 100, 1) * 20;

    // Depth: all-rounders in lower positions boost depth
    if ((p.computed_role === 'all_rounder') && i >= 5) {
      scores.Depth += 20;
    }
    if (p.batting_average > 20 && i >= 6) {
      scores.Depth += 10;
    }
  });

  scores.Batting = Math.min((battingTotal / squad.length) * 1.3, 100);
  scores.Pace = Math.min(scores.Pace + paceCount * 8, 100);
  scores.Spin = Math.min(scores.Spin + spinCount * 8, 100);
  scores.Experience = Math.min((expTotal / squad.length) * 5, 100);
  scores.Depth = Math.min(scores.Depth + squad.length * 3, 100);
  scores.Fielding = Math.min(30 + squad.length * 6, 100); // Base + squad size bonus

  return Object.entries(scores).map(([key, value]) => ({
    subject: key,
    value: Math.round(Math.max(value, 5)),
    fullMark: 100,
  }));
}

export default function SpiderChart({ squad, format }) {
  const data = useMemo(() => computeScores(squad, format), [squad, format]);

  if (squad.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-yorked-muted text-xs">
        Add players to see team composition
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#2d3f52" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Team"
            dataKey="value"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
