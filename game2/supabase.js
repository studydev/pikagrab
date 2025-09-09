// supabase-js 라이브러리 로드 필요 (index.html에서 CDN으로 추가)
const SUPABASE_URL = 'https://mnfgyybsjvpvorlvfqpo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZmd5eWJzanZwdm9ybHZmcXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTE5NzQsImV4cCI6MjA3Mjk4Nzk3NH0.qCnsif87uT4TZ-3QUmP_bhtczTLnR-79obyIBhCAdaQ';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 점수 upsert
async function upsertScore(name, score) {
    const { data, error } = await supabase
        .from('rankings')
        .upsert([{ name, score }]);
    return { data, error };
}

// Top 10 랭킹 가져오기
async function fetchTop10() {
    const { data, error } = await supabase
        .from('rankings')
        .select('name, score')
        .order('score', { ascending: false })
        .limit(10);
    return { data, error };
}

window.upsertScore = upsertScore;
window.fetchTop10 = fetchTop10;
