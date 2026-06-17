const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('NEXT_PUBLIC_SUPABASE_URL=', url)
if (key) {
  const masked = key.slice(0, 8) + '...' + key.slice(-4)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY (masked)=', masked)
} else {
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=', key)
}
