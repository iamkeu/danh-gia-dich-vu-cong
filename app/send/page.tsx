'use client';
import {useEffect} from 'react';
export default function LegacySendRedirect(){useEffect(()=>{location.replace('/cases')},[]);return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif',background:'#f7f8fc',color:'#19233d'}}><p>Đang mở luồng Hồ sơ hành chính…</p></main>}
