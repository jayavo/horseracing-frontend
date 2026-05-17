import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRaceDetail, triggerAnalysis, horseDeepDive } from '../utils/api';

const C = {
  bg: '#0f1117', card: '#1a1d27', border: '#2a2d3e', border2: '#1e2235',
  text: '#e8eaf0', muted: '#7a7d8e', accent: '#1d9e75',
  warn: '#ef9f27', danger: '#e24b4a', purple: '#7f77dd', blue: '#378add',
};

function getColor(v) { return v >= 70 ? C.accent : v >= 50 ? C.warn : C.danger; }
function getBg(v) { return v >= 70 ? '#0e2b20' : v >= 50 ? '#2b1e0a' : '#2b0e0e'; }

function ScoreRing({ score, size = 52 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = getColor(score);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${filled.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: size > 48 ? 14 : 11, fontWeight: 600, color }}>
        {score}
      </div>
    </div>
  );
}

function FactorBar({ label, value }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: getColor(value), fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 5, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: getColor(value), borderRadius: 99, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function FormDot({ pos }) {
  const map = { 1: [C.accent, '#0e2b20'], 2: ['#639922', '#1a2b0e'], 3: [C.warn, '#2b1e0a'] };
  const [col, bg] = map[pos] || [C.danger, '#2b0e0e'];
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, color: col, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {pos === 1 ? 'W' : pos}
    </div>
  );
}

function Badge({ text, type = 'neutral' }) {
  const typeMap = {
    green: { bg: '#0e2b20', color: C.accent },
    blue: { bg: '#0e1b2b', color: C.blue },
    warn: { bg: '#2b1e0a', color: C.warn },
    red: { bg: '#2b0e0e', color: C.danger },
    purple: { bg: '#1a1535', color: C.purple },
    neutral: { bg: C.border2, color: C.muted }
  };
  const s = typeMap[type] || typeMap.neutral;
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500, background: s.bg, color: s.color }}>{text}</span>;
}

function HorseCard({ runner, rank, raceId, raceDetail }) {
  const [open, setOpen] = useState(rank === 1);
  const [tab, setTab] = useState('factors');
  const [deepDive, setDeepDive] = useState('');
  const [loadingDD, setLoadingDD] = useState(false);

  const s = runner.scores || {};
  const isTopPick = rank === 1;
  const formHistory = runner.form_history || [];
  const lastFive = formHistory.slice(0, 5).map(f => parseInt(f.position)).filter(p => !isNaN(p));

  const trainerSR = runner.trainer_stats?.find(t => t.period === '30d')?.strike_rate;
  const jockeySR = runner.jockey_stats?.find(j => j.period === '30d')?.strike_rate;
  const pWins = formHistory.filter(f => f.jockey === runner.jockey && parseInt(f.position) === 1).length;
  const pRuns = formHistory.filter(f => f.jockey === runner.jockey).length;

  // Class analysis
  const classHistory = formHistory.reduce((acc, f) => {
    const cls = f.race_class || 'Unknown';
    if (!acc[cls]) acc[cls] = { wins: 0, runs: 0 };
    acc[cls].runs++;
    if (parseInt(f.position) === 1) acc[cls].wins++;
    return acc;
  }, {});

  const usualClass = Object.entries(classHistory).sort((a, b) => b[1].runs - a[1].runs)[0]?.[0] || '—';
  const todayClass = raceDetail?.race_class || '—';
  const classMap = { 'Grade 1': 1, 'Group 1': 1, 'Grade 2': 2, 'Group 2': 2, 'Grade 3': 3, 'Group 3': 3, 'Listed': 4, 'Class 1': 5, 'Class 2': 6, 'Class 3': 7, 'Class 4': 8, 'Class 5': 9, 'Class 6': 10 };
  const usualVal = classMap[usualClass] || 6;
  const todayVal = classMap[todayClass] || 6;
  const classDrop = usualVal < todayVal ? 'drop' : usualVal > todayVal ? 'step' : 'same';

  // Odds display
  const oddsDisplay = runner.odds?.odds_fractional || runner.odds?.odds_decimal?.toFixed(0) + '/1' || null;
  const oddsDecimal = runner.odds?.odds_decimal ? `(${parseFloat(runner.odds.odds_decimal).toFixed(2)})` : '';

  async function doDeepDive() {
    setLoadingDD(true);
    setTab('deepdive');
    try {
      const res = await horseDeepDive(raceId, runner.horse_name);
      setDeepDive(res.data.analysis);
    } catch (err) {
      setDeepDive('Deep dive failed. Please try again.');
    } finally {
      setLoadingDD(false);
    }
  }

  const groundScore = s.ground_suit || 0;
  const showGroundSuits = groundScore >= 70;
  const showGroundConcern = groundScore < 45;

  return (
    <div style={{ ...styles.horseCard, borderColor: isTopPick ? C.accent : C.border, borderWidth: isTopPick ? 2 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={styles.rankBadge}>{rank}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={styles.horseName}>{runner.horse_name}</span>
            {isTopPick && <Badge text="⭐ Top pick" type="green" />}
            {classDrop === 'drop' && <Badge text="↓ Class drop" type="green" />}
            {classDrop === 'step' && <Badge text="↑ Step up" type="red" />}
            {parseFloat(trainerSR) >= 25 && <Badge text="🔥 Hot yard" type="green" />}
            {parseFloat(jockeySR) >= 25 && <Badge text="🎯 Top jockey" type="purple" />}
            {(s.handicap_position || 0) >= 75 && <Badge text="Fav weight" type="blue" />}
            {showGroundSuits && <Badge text="Ground suits" type="green" />}
            {showGroundConcern && <Badge text="Ground concern" type="red" />}
            {runner.jockey === 'NON-RUNNER' && <Badge text="NON-RUNNER" type="red" />}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            {runner.trainer} · {runner.jockey} · Age {runner.age} · OR {runner.official_rating} · {runner.weight_carried}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
            Usually runs: <strong style={{ color: C.text }}>{usualClass}</strong>
            {classDrop === 'drop' && <span style={{ color: C.accent }}> → Class drop today</span>}
            {classDrop === 'step' && <span style={{ color: C.danger }}> → Step up today</span>}
            {classDrop === 'same' && <span style={{ color: C.muted }}> → Same level</span>}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {lastFive.map((p, i) => <FormDot key={i} pos={p} />)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{oddsDisplay || '—'}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{oddsDecimal || 'odds'}</div>
          </div>
          <ScoreRing score={s.overall_score || 50} />
          <div style={{ color: C.muted, fontSize: 16, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</div>
        </div>
      </div>

      {open && (
        <div style={styles.detail}>
          <div style={styles.detailTabs}>
            {[['factors','Factors'],['class','Class & type'],['form','Form history'],['tj','Trainer & jockey'],['deepdive','AI deep dive']].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); if (id === 'deepdive' && !deepDive) doDeepDive(); }}
                style={{ ...styles.dtab, ...(tab === id ? styles.dtabActive : {}) }}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'factors' && (
            <div style={styles.factorsGrid}>
              {[
                ['Ground suitability', s.ground_suit],
                ['Handicap position', s.handicap_position],
                ['Recent form', s.form_score],
                ['Class fit', s.class_fit],
                ['Distance suit.', s.distance_suit],
                ['Trainer form', s.trainer_form],
                ['Jockey form', s.jockey_form],
                ['Partnership', s.partnership_score],
                ['Hcap experience', s.handicap_experience],
              ].map(([label, val]) => (
                <FactorBar key={label} label={label} value={val || 0} />
              ))}
            </div>
          )}

          {tab === 'class' && (
            <div>
              <div style={styles.classGrid}>
                {[
                  ['Usual class', usualClass],
                  ['Today class', todayClass],
                  ['vs usual', classDrop === 'drop' ? '↓ Drop' : classDrop === 'step' ? '↑ Step up' : '→ Same'],
                  ['Hcap runs', formHistory.filter(f => f.race_type?.toLowerCase().includes('handicap')).length],
                  ['Non-hcap', formHistory.filter(f => !f.race_type?.toLowerCase().includes('handicap')).length],
                  ['Class fit score', `${s.class_fit || 0}/100`]
                ].map(([lbl, val]) => (
                  <div key={lbl} style={styles.classCell}>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{lbl}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: val === '↓ Drop' ? C.accent : val === '↑ Step up' ? C.danger : C.text }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: C.muted, marginBottom: 8 }}>Class history (wins/runs)</div>
              {Object.entries(classHistory).sort((a, b) => b[1].runs - a[1].runs).map(([cls, d]) => (
                <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: cls === todayClass ? C.text : C.muted, minWidth: 100, fontWeight: cls === todayClass ? 600 : 400 }}>
                    {cls}{cls === todayClass ? ' ★' : ''}
                  </div>
                  <div style={{ flex: 1, height: 16, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (d.runs / Math.max(...Object.values(classHistory).map(x => x.runs))) * 100)}%`, background: cls === todayClass ? C.accent : C.border2, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                      {d.runs > 0 && <span style={{ fontSize: 9, color: '#fff', whiteSpace: 'nowrap' }}>{d.wins}W/{d.runs}R</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'form' && (
            <div>
              {formHistory.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13 }}>No form data available yet.</div>
              ) : (
                <table style={styles.formTable}>
                  <thead>
                    <tr style={{ fontSize: 11, color: C.muted }}>
                      {['Date', 'Course', 'Dist', 'Going', 'Class', 'Pos', 'OR', 'Jockey'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formHistory.map((f, i) => (
                      <tr key={i} style={{ fontSize: 12, borderTop: `1px solid ${C.border}` }}>
                        <td style={styles.td}>{f.race_date?.split('T')[0] || '—'}</td>
                        <td style={styles.td}>{f.course || '—'}</td>
                        <td style={styles.td}>{f.distance || '—'}</td>
                        <td style={styles.td}>{f.going || '—'}</td>
                        <td style={styles.td}>{f.race_class || '—'}</td>
                        <td style={{ ...styles.td, fontWeight: 600, color: parseInt(f.position) === 1 ? C.accent : parseInt(f.position) <= 3 ? C.warn : C.text }}>
                          {f.position || '—'}/{f.runners || '—'}
                        </td>
                        <td style={styles.td}>{f.official_rating || '—'}</td>
                        <td style={styles.td}>{f.jockey || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'tj' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { title: runner.trainer, sub: 'Trainer', sr: trainerSR, stats: runner.trainer_stats },
                { title: runner.jockey, sub: 'Jockey', sr: jockeySR, stats: runner.jockey_stats, extra: `Partnership: ${pWins}W from ${pRuns} runs together` }
              ].map(({ title, sub, sr, stats, extra }) => (
                <div key={sub} style={styles.tjCard}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{sub}</div>
                  {(stats || []).map(s => (
                    <div key={s.period} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: C.muted }}>{s.period} strike rate</span>
                      <span style={{ fontWeight: 600, color: getColor(parseFloat(s.strike_rate) * 2.5) }}>
                        {parseFloat(s.strike_rate).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, display: 'flex', gap: 3 }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: i < Math.round((parseFloat(sr) || 0) / 10) ? getColor((parseFloat(sr) || 0) * 2.5) : C.border }} />
                    ))}
                  </div>
                  {extra && <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{extra}</div>}
                </div>
              ))}
            </div>
          )}

          {tab === 'deepdive' && (
            <div>
              {loadingDD ? (
                <div style={{ color: C.muted, fontSize: 13, padding: '20px 0' }}>
                  🤖 Claude is analysing {runner.horse_name}...
                </div>
              ) : deepDive ? (
                <div style={styles.aiBox}>
                  {deepDive.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: '4px 0', lineHeight: 1.7 }}>{line}</p>
                  ))}
                </div>
              ) : (
                <button onClick={doDeepDive} style={styles.aiBtn}>
                  Get AI deep dive on {runner.horse_name}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RaceDetail() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getRaceDetail(decodeURIComponent(raceId))
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load race'))
      .finally(() => setLoading(false));
  }, [raceId]);

  async function runAnalysis() {
    setAnalysing(true);
    try {
      const res = await triggerAnalysis(decodeURIComponent(raceId));
      setData(prev => ({ ...prev, aiAnalysis: res.data.analysis, scored: res.data.scored }));
    } catch (err) {
      alert('Analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setAnalysing(false); }
  }

  if (loading) return <div style={{ ...styles.page, color: C.muted, textAlign: 'center', paddingTop: 100 }}>Loading race data...</div>;
  if (error) return <div style={{ ...styles.page, color: C.danger, textAlign: 'center', paddingTop: 100 }}>{error}</div>;

  const race = data?.race;
  const scored = data?.scored || [];
  const aiAnalysis = data?.aiAnalysis;

  const seen = new Set();
  const orderedRunners = scored.map(s => {
    const runner = (race?.runners || []).find(r => r.horse_name === s.horse_name);
    return runner ? { ...runner, scores: s.scores } : null;
  }).filter(Boolean).filter(r => {
    if (seen.has(r.horse_name)) return false;
    seen.add(r.horse_name);
    return true;
  });

  const seenUnscored = new Set(orderedRunners.map(r => r.horse_name));
  const unscored = (race?.runners || []).filter(r => !seenUnscored.has(r.horse_name));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={styles.raceTitle}>{race?.race_name || race?.course}</div>
          <div style={styles.raceMeta}>
            {race?.course} · {race?.distance} · {race?.going} · {race?.race_class} · {race?.race_type}
            {race?.prize_money ? ` · £${parseInt(race.prize_money).toLocaleString()}` : ''}
          </div>
        </div>
        <button onClick={runAnalysis} disabled={analysing} style={styles.analyseBtn}>
          {analysing ? '🤖 Analysing...' : '🤖 Run AI Analysis'}
        </button>
      </div>

      <div style={styles.body}>
        {aiAnalysis && (
          <div style={styles.aiSection}>
            <div style={styles.aiHeader}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>AI Race Analysis</div>
                <div style={{ fontSize: 12, color: C.muted }}>Claude's expert verdict on this race</div>
              </div>
              {aiAnalysis.selection && (
                <div style={styles.selectionBox}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Selection</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>{aiAnalysis.selection}</div>
                  {aiAnalysis.confidence && <div style={{ fontSize: 11, color: C.muted }}>Confidence: {aiAnalysis.confidence}%</div>}
                </div>
              )}
            </div>
            <div style={styles.aiText}>
              {(aiAnalysis.analysis || '').split('\n').map((line, i) => (
                <p key={i} style={{ margin: '5px 0', lineHeight: 1.75, color: line.includes('MY SELECTION') ? C.accent : line.startsWith('#') || /^\d+\./.test(line.trim()) ? C.text : C.muted }}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {!aiAnalysis && (
          <div style={styles.noAnalysis}>
            <div style={{ fontSize: 32 }}>🤖</div>
            <div style={{ color: C.muted, marginTop: 8 }}>
              No AI analysis yet. Click "Run AI Analysis" to get Claude's expert verdict.
            </div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Runners — ranked by analysis score
          </div>
          {orderedRunners.map((runner, i) => (
            <HorseCard key={runner.horse_name} runner={runner} rank={i + 1} raceId={decodeURIComponent(raceId)} raceDetail={race} />
          ))}
          {unscored.map((runner, i) => (
            <HorseCard key={runner.horse_name} runner={runner} rank={orderedRunners.length + i + 1} raceId={decodeURIComponent(raceId)} raceDetail={race} />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.text },
  header: { background: C.card, borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100 },
  backBtn: { padding: '7px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 },
  raceTitle: { fontSize: 18, fontWeight: 600 },
  raceMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  analyseBtn: { padding: '8px 16px', background: C.accent, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' },
  body: { maxWidth: 960, margin: '0 auto', padding: '20px 16px' },
  aiSection: { background: C.card, border: `1px solid ${C.accent}40`, borderRadius: 14, padding: '18px 20px', marginBottom: 20 },
  aiHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  selectionBox: { marginLeft: 'auto', background: '#0e2b20', border: `1px solid ${C.accent}50`, borderRadius: 10, padding: '10px 16px', textAlign: 'center' },
  aiText: { fontSize: 13, lineHeight: 1.75 },
  noAnalysis: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 40, textAlign: 'center' },
  horseCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 },
  detail: { marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` },
  detailTabs: { display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' },
  dtab: { fontSize: 12, padding: '5px 11px', borderRadius: 8, border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer' },
  dtabActive: { background: C.border2, color: C.text, fontWeight: 500 },
  factorsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px 20px' },
  classGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 },
  classCell: { background: C.bg, borderRadius: 8, padding: '8px 10px' },
  formTable: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  td: { padding: '7px 8px', color: C.muted },
  tjCard: { background: C.bg, borderRadius: 10, padding: '12px 14px' },
  aiBox: { background: C.bg, borderRadius: 10, padding: '14px 16px', fontSize: 13, lineHeight: 1.75, color: C.muted },
  aiBtn: { width: '100%', padding: '10px', background: C.border2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: 'pointer', fontSize: 13 },
  rankBadge: { width: 28, height: 28, borderRadius: '50%', background: C.border, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  horseName: { fontSize: 16, fontWeight: 600 },
};
