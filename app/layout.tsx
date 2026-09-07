import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Spacecadet — Test my scene',description:'Quick, low-cost scene tests. Explore the look before the final render.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" className="dark"><body>{children}</body></html>;}
