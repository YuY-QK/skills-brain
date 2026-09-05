import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Skills Brain · 技能大脑',description:'连接本地技能，发现新的能力。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" className="dark"><body>{children}</body></html>}
