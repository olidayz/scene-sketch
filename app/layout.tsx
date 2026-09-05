import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Scene Sketch — your video sketchbook',description:'Explore a scene. Find the shot. Fast video drafts with MiniMax H3 Max.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" className="dark"><body>{children}</body></html>;}
