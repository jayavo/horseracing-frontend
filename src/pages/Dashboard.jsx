import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRaces, getStats, triggerRefresh } from '../utils/api';

const C = {
  bg: '#0f1117', card: '#1a1d27', border: '#2a2d3e',
  text: '#e8eaf0', muted: '#7a7d8e', accent: '#1d9e75',
  warn: '#ef9f27', danger: '#e24b4a', purple: '#7f77dd', blue: '#378add'
};

function classOf(race) {
  return race.race_class || race.raw_data?.class || '—';
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function goingColor(going) {
  if (!going) return C.muted;
  const g = going.toLowerCase();
  if (g.includes('heavy') || g.includes('soft')) return '#378add';
  if (g.includes('good to soft')) return C.accent;
  if (g.includes('good')) return C.accent;
  if (g.includes('firm')) return C.warn;
  return C.muted;
}

function RaceCard({ race, onClick }) {
  return (
    <div onClick={() => onClick(race)} style={styles.raceCard}>
      <div style={styles.raceCardTime}>{formatTime(race.race_datetime)}</div>
      <div style={{ flex: 1 }}>
        <div style={styles.raceCardName}>{race.race_name || race.course}</div>
        <div style={styles.raceCardMeta}>
          {race.course} · {race.distance} · {race.num_runners} runners
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ ...styles.pill, background: '#1a2e26', color: C.accent }}>{classOf(race)}</span>
          <span style={{ ...styles.pill, background: '#1a1f2e', color: goingColor(race.going) }}>{race.going || 'Going TBC'}</span>
          {race.race_type && <span style={{ ...styles.pill, background: '#251a2e', color: C.purple }}>{race.race_type}</span>}
        </div>
      </div>
      <div style={styles.raceCardArrow}>→</div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadRaces = useCallback(async () => {
    setLoading(true);
    try {
      const [racesRes, statsRes] = await Promise.allSettled([
        getRaces(selectedDate),
        getStats()
      ]);
      if (racesRes.status === 'fulfilled') {
        setRaces(racesRes.value.data.races || []);
        setLastUpdated(new Date());
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadRaces(); }, [loadRaces]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await triggerRefresh(); setTimeout(loadRaces, 3000); }
    catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  }

  // Group races by course
  const grouped = races.reduce((acc, r) => {
    const key = r.course || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🏇</span>
          <div>
            <div style={styles.headerTitle}>Race Analyser</div>
            <div style={styles.headerSub}>UK Racing · {new Date(selectedDate).toDateString()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={styles.dateInput} />
          <button onClick={handleRefresh} disabled={refreshing} style={styles.refreshBtn}>
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          <button onClick={logout} style={styles.logoutBtn}>{user?.username} · Logout</button>
        </div>
      </div>

      <div style={styles.body}>
        {/* Stats bar */}
        {stats && (
          <div style={styles.statsBar}>
            {[
              { label: "Today's races", val: stats.todaysRaces },
              { label: "Horses in DB", val: stats.horsesInDB?.toLocaleString() },
              { label: "AI analyses run", val: stats.aiAnalyses },
              { label: "Live odds records", val: stats.recentOddsRecords }
            ].map(s => (
              <div key={s.label} style={styles.statItem}>
                <div style={styles.statVal}>{s.val ?? '—'}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
            {lastUpdated && <div style={{ ...styles.statItem, borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
              <div style={{ ...styles.statVal, fontSize: 12, color: C.muted }}>Last updated</div>
              <div style={styles.statLabel}>{lastUpdated.toLocaleTimeString()}</div>
            </div>}
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>Loading races...</div>
        ) : races.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 48 }}>🏇</div>
            <div style={{ color: C.muted, marginTop: 12 }}>No races found for this date. Try refreshing data.</div>
            <button onClick={handleRefresh} style={{ ...styles.refreshBtn, marginTop: 16 }}>Fetch today's races</button>
          </div>
        ) : (
          Object.entries(grouped).map(([course, courseRaces]) => (
            <div key={course} style={styles.courseGroup}>
              <div style={styles.courseHeader}>
                <span style={styles.courseIcon}>📍</span>
                <span style={styles.courseName}>{course}</span>
                <span style={styles.courseCount}>{courseRaces.length} races</span>
              </div>
              {courseRaces.map(race => (
                <RaceCard
                  key={race.race_id}
                  race={race}
                  onClick={() => navigate(`/race/${race.race_id}`)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: C.text },
  header: { background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, position: 'sticky', top: 0, zIndex: 100 },
  headerTitle: { fontSize: 20, fontWeight: 600, color: C.text },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  dateInput: { padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 },
  refreshBtn: { padding: '7px 14px', background: C.accent, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  logoutBtn: { padding: '7px 14px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 13, cursor: 'pointer' },
  body: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  statsBar: { display: 'flex', gap: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 20px', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  statItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  statVal: { fontSize: 20, fontWeight: 600, color: C.text },
  statLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' },
  loading: { textAlign: 'center', color: C.muted, padding: 60, fontSize: 16 },
  empty: { textAlign: 'center', padding: 80, color: C.muted },
  courseGroup: { marginBottom: 28 },
  courseHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  courseIcon: { fontSize: 16 },
  courseName: { fontSize: 17, fontWeight: 600, color: C.text },
  courseCount: { fontSize: 12, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 99, padding: '2px 8px' },
  raceCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', marginBottom: 8, transition: 'border-color 0.15s' },
  raceCardTime: { fontSize: 16, fontWeight: 600, color: C.accent, minWidth: 44, paddingTop: 2 },
  raceCardName: { fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 3 },
  raceCardMeta: { fontSize: 12, color: C.muted },
  raceCardArrow: { color: C.muted, fontSize: 18, marginLeft: 'auto', alignSelf: 'center' },
  pill: { fontSize: 10, padding: '3px 8px', borderRadius: 99, fontWeight: 500 }
};
