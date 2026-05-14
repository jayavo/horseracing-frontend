import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRaces, triggerRefresh } from '../utils/api';

const C = {
  bg: '#0f1117', card: '#1a1d27', border: '#2a2d3e',
  text: '#e8eaf0', muted: '#7a7d8e', accent: '#1d9e75',
  warn: '#ef9f27', danger: '#e24b4a', purple: '#7f77dd', blue: '#378add'
};

function todayString() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function goingColor(going) {
  if (!going) return C.muted;
  const g = going.toLowerCase();
  if (g.includes('heavy') || g.includes('soft')) return C.blue;
  if (g.includes('good to soft') || g.includes('good')) return C.accent;
  if (g.includes('firm')) return C.warn;
  return C.muted;
}

const UK_COURSES = ['Fontwell','Perth','Salisbury','York','Kempton','Ascot','Cheltenham','Newmarket','Haydock','Sandown','Goodwood','Leicester','Wolverhampton','Lingfield','Southwell','Chester','Nottingham','Windsor','Epsom','Doncaster','Newbury','Thirsk','Catterick','Carlisle','Musselburgh','Hamilton','Ayr','Beverley','Redcar','Ripon','Pontefract','Chepstow','Ffos Las','Ludlow','Stratford','Warwick','Worcester','Exeter','Newton Abbot','Taunton','Wincanton','Plumpton','Huntingdon','Market Rasen','Bangor','Uttoxeter'];
const isUKCourse = (name) => UK_COURSES.some(c => (name||'').includes(c));

function RaceCard({ race, onClick }) {
  const raw = race.raw_data || {};
  const offTime = raw.off_time || '—';
  const going = race.going || raw.going || raw.going_detailed || '';
  const raceClass = race.race_class || raw.race_class || '';
  const raceType = race.race_type || raw.type || '';
  const prize = race.prize_money ? `£${parseInt(race.prize_money).toLocaleString()}` : raw.prize || '';

  return (
    <div onClick={onClick} style={styles.raceCard}>
      <div style={styles.raceTime}>{offTime}</div>
      <div style={{flex:1}}>
        <div style={styles.raceName}>{race.race_name || race.course}</div>
        <div style={styles.raceMeta}>
          {raw.distance_round || race.distance || ''}{(raw.distance_round||race.distance) ? ' · ' : ''}{race.num_runners || 0} runners{prize ? ` · ${prize}` : ''}
        </div>
        <div style={{display:'flex',gap:5,marginTop:5,flexWrap:'wrap'}}>
          {raceClass && <span style={{...styles.pill,background:'#0e2b20',color:C.accent}}>{raceClass}</span>}
          {going && <span style={{...styles.pill,background:'#0e1b2b',color:goingColor(going)}}>{going}</span>}
          {raceType && <span style={{...styles.pill,background:'#1a1535',color:C.purple}}>{raceType}</span>}
        </div>
      </div>
      <div style={{color:C.muted,fontSize:18,alignSelf:'center'}}>→</div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  const loadRaces = useCallback(async (date) => {
    setLoading(true); setError('');
    try {
      const res = await getRaces(date);
      setRaces(res.data?.races || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load: ' + (err.response?.data?.error || err.message));
      setRaces([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRaces(selectedDate); }, [selectedDate, loadRaces]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await triggerRefresh();
      setTimeout(() => { loadRaces(selectedDate); setRefreshing(false); }, 6000);
    } catch { setRefreshing(false); }
  }

  // Group by course
  const grouped = races.reduce((acc, r) => {
    const k = r.course || 'Unknown';
    if (!acc[k]) acc[k] = [];
    acc[k].push(r); return acc;
  }, {});

  const sortedCourses = Object.keys(grouped).sort((a,b) => {
    const aUK = isUKCourse(a), bUK = isUKCourse(b);
    if (aUK && !bUK) return -1;
    if (!aUK && bUK) return 1;
    return a.localeCompare(b);
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:24}}>🏇</span>
          <div>
            <div style={styles.headerTitle}>Race Analyser</div>
            <div style={styles.headerSub}>UK Racing · {new Date(selectedDate+'T12:00:00').toDateString()}{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString()}` : ''}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={styles.dateInput}/>
          <button onClick={()=>setSelectedDate(todayString())} style={styles.todayBtn}>Today</button>
          <button onClick={handleRefresh} disabled={refreshing} style={styles.refreshBtn}>{refreshing?'⟳ Fetching...':'⟳ Refresh'}</button>
          <button onClick={logout} style={styles.logoutBtn}>{user?.username||'User'} · Logout</button>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.statsBar}>
          {[
            {val: races.length, label: "Today's races"},
            {val: races.reduce((a,r)=>a+(r.num_runners||0),0), label: "Total runners"},
            {val: sortedCourses.filter(c=>isUKCourse(c)).length, label: "UK venues"},
            {val: sortedCourses.length, label: "All venues"},
          ].map(s=>(
            <div key={s.label} style={styles.statItem}>
              <div style={styles.statVal}>{s.val}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {error && <div style={{background:'#2b0e0e',border:`1px solid ${C.danger}50`,borderRadius:10,padding:'12px 16px',color:C.danger,marginBottom:16,fontSize:13}}>{error}</div>}

        {loading ? (
          <div style={styles.center}>
            <div style={{fontSize:36,marginBottom:12}}>🏇</div>
            Loading races for {selectedDate}...
          </div>
        ) : races.length === 0 ? (
          <div style={styles.center}>
            <div style={{fontSize:40,marginBottom:12}}>🏇</div>
            <div style={{color:C.muted,marginBottom:20}}>No races found for {selectedDate}</div>
            <button onClick={handleRefresh} disabled={refreshing} style={styles.refreshBtn}>
              {refreshing ? '⟳ Fetching...' : '⟳ Fetch races now'}
            </button>
          </div>
        ) : (
          sortedCourses.map(course => (
            <div key={course} style={styles.courseGroup}>
              <div style={styles.courseHeader}>
                <span>{isUKCourse(course)?'🇬🇧':'🌍'}</span>
                <span style={styles.courseName}>{course}</span>
                <span style={styles.courseCount}>{grouped[course].length} races</span>
              </div>
              {grouped[course]
                .sort((a,b)=>(a.raw_data?.off_time||'').localeCompare(b.raw_data?.off_time||''))
                .map(race => (
                  <RaceCard key={race.race_id} race={race} onClick={()=>navigate(`/race/${encodeURIComponent(race.race_id)}`)}/>
                ))
              }
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page:{minHeight:'100vh',background:C.bg,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',color:C.text},
  header:{background:C.card,borderBottom:`1px solid ${C.border}`,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,position:'sticky',top:0,zIndex:100},
  headerTitle:{fontSize:18,fontWeight:600},
  headerSub:{fontSize:12,color:C.muted,marginTop:2},
  dateInput:{padding:'6px 10px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13},
  todayBtn:{padding:'6px 12px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:12,cursor:'pointer'},
  refreshBtn:{padding:'6px 14px',background:C.accent,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer'},
  logoutBtn:{padding:'6px 12px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:12,cursor:'pointer'},
  body:{maxWidth:860,margin:'0 auto',padding:'20px 16px'},
  statsBar:{display:'flex',gap:24,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 20px',marginBottom:20,flexWrap:'wrap'},
  statItem:{display:'flex',flexDirection:'column',gap:2},
  statVal:{fontSize:22,fontWeight:600},
  statLabel:{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:'0.4px'},
  center:{textAlign:'center',color:C.muted,padding:80},
  courseGroup:{marginBottom:22},
  courseHeader:{display:'flex',alignItems:'center',gap:8,marginBottom:8},
  courseName:{fontSize:16,fontWeight:600},
  courseCount:{fontSize:11,color:C.muted,background:C.card,border:`1px solid ${C.border}`,borderRadius:99,padding:'2px 8px'},
  raceCard:{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer',marginBottom:6},
  raceTime:{fontSize:15,fontWeight:600,color:C.accent,minWidth:40,paddingTop:2},
  raceName:{fontSize:14,fontWeight:500,marginBottom:2},
  raceMeta:{fontSize:11,color:C.muted},
  pill:{fontSize:10,padding:'2px 7px',borderRadius:99,fontWeight:500},
};
