import Link from "next/link";
import { ArrowRight, Box, CalendarDays, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-pure-black)] text-[var(--text-primary)] selection:bg-white selection:text-black">
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-screen border-tech-b flex flex-col px-6 md:px-12 py-8 overflow-hidden">
        {/* Tech Grid Background */}
        <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none" />
        
        {/* Top Minimal Nav */}
        <nav className="relative z-10 w-full flex justify-between items-center text-xs tracking-[0.2em] text-[var(--text-secondary)] uppercase">
          <div>ASSETFLOW_V2</div>
          <div className="hidden md:flex gap-12">
            <Link href="#measure" className="hover:text-white transition-colors">Measure</Link>
            <Link href="#analyze" className="hover:text-white transition-colors">Analyze</Link>
            <Link href="#implement" className="hover:text-white transition-colors">Implement</Link>
          </div>
          <div className="flex gap-6 items-center">
            <Link href="/login" className="hover:text-white transition-colors">SYS_LOGIN</Link>
            <Link href="/signup" className="text-white border-tech px-4 py-2 hover:bg-white hover:text-black transition-all">INITIATE</Link>
          </div>
        </nav>

        {/* Central Abstract Element (CSS Chrome Blob imitation) */}
        <div className="flex-1 flex items-center justify-center relative z-0 mt-12 mb-20">
          <div className="relative w-64 h-64 md:w-96 md:h-96">
            {/* CSS Wireframes */}
            <div className="wireframe-wave w-[150%] h-[150%] -left-[25%] -top-[25%] border-t-0 animate-[spin_20s_linear_infinite]" />
            <div className="wireframe-wave w-[120%] h-[120%] -left-[10%] -top-[10%] border-r-0 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="wireframe-wave w-full h-full animate-[spin_25s_linear_infinite]" />
            
            {/* Center "Chrome" Element */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white via-[#888] to-[#111] blur-[2px] opacity-80" style={{ boxShadow: 'inset -10px -10px 40px rgba(0,0,0,0.8), inset 10px 10px 40px rgba(255,255,255,0.8)' }}>
              <div className="absolute inset-8 rounded-full bg-gradient-to-tl from-[#222] to-[#eee] blur-[4px]" />
              <div className="absolute inset-16 rounded-full bg-gradient-to-tr from-[#111] to-[#fff] blur-[1px]" />
            </div>
          </div>
          
          {/* Tracker marks */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex gap-1">
            <div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" />
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-1">
            <div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" />
          </div>
          <div className="absolute left-0 right-0 top-1/2 h-px bg-[var(--tech-border)] -z-10" />
        </div>

        {/* Massive Bottom Text */}
        <div className="relative z-10 w-full text-center mt-auto">
          <h1 className="font-wide text-4xl md:text-6xl lg:text-[5.5rem] leading-[1.1] tracking-tighter">
            ENTERPRISE ASSET<br />
            <span className="text-[var(--text-secondary)]">OPTIMIZATION</span>
          </h1>
        </div>
      </section>

      {/* 2. DATA IMPACT SECTION */}
      <section id="measure" className="w-full flex flex-col lg:flex-row border-tech-b">
        
        {/* Left Panel */}
        <div className="w-full lg:w-1/2 p-12 md:p-24 border-tech-b lg:border-tech-b-0 lg:border-tech-r relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full border border-[var(--tech-border)] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full border border-[var(--tech-border)] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          
          <div className="flex justify-between text-xs tracking-widest text-[var(--text-secondary)] mb-24 uppercase">
            <span>Measure</span>
            <span>Analyze</span>
            <span>Implement</span>
          </div>

          <div>
            <h2 className="font-wide text-3xl md:text-5xl leading-[1.2] mb-12 uppercase">
              VISIBILITY<br />
              ACROSS ALL<br />
              PHYSICAL<br />
              OPERATIONS
            </h2>
            
            <div className="flex gap-1 mb-8">
              <div className="w-1.5 h-1.5 bg-white" /><div className="w-1.5 h-1.5 bg-white" /><div className="w-1.5 h-1.5 bg-white" />
            </div>

            <p className="text-[var(--text-secondary)] max-w-md text-sm md:text-base leading-relaxed border-t border-[var(--tech-border)] pt-8">
              Centralized asset lifecycle management and conflict-free resource scheduling to eliminate loss, prevent downtime, and maximize utilization across your entire organization.
            </p>
          </div>
        </div>

        {/* Right Panel (Split) */}
        <div className="w-full lg:w-1/2 flex flex-col sm:flex-row">
          
          {/* Stat 1 */}
          <div className="w-full sm:w-1/2 bg-[var(--bg-panel-1)] p-12 md:p-16 border-tech-b sm:border-tech-b-0 sm:border-tech-r flex flex-col relative">
            <div className="absolute inset-0 tech-grid opacity-10" />
            <h3 className="font-wide text-6xl md:text-7xl mb-4 mt-24">98<span className="text-4xl">%</span></h3>
            <div className="h-px w-full bg-[var(--tech-border)] mb-4" />
            <p className="text-[var(--text-secondary)] text-sm max-w-[200px]">reduction in average asset loss rate per quarter</p>
            
            <div className="mt-auto flex justify-end">
               <div className="flex gap-1">
                <div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" />
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="w-full sm:w-1/2 bg-[var(--bg-panel-2)] p-12 md:p-16 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 border border-[var(--tech-border)] rounded-full translate-x-1/4 -translate-y-1/4 opacity-20" />
            
            <div className="flex justify-end text-xs tracking-widest text-[var(--text-secondary)] mb-24">
              <span>MORE</span>
            </div>

            <div className="mt-auto">
              <h3 className="font-wide text-6xl md:text-7xl mb-4">35<span className="text-4xl">%</span></h3>
              <div className="h-px w-full bg-[var(--tech-border)] mb-4" />
              <p className="text-[var(--text-secondary)] text-sm max-w-[200px]">increase in overall resource utilization efficiency</p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. FEATURES / PROJECT SECTION */}
      <section id="analyze" className="w-full flex flex-col lg:flex-row border-tech-b">
        
        {/* Left Panel */}
        <div className="w-full lg:w-1/2 p-12 md:p-24 border-tech-b lg:border-tech-b-0 lg:border-tech-r relative overflow-hidden">
           {/* Abstract lines bottom left */}
           <div className="absolute bottom-0 left-0 w-full h-full opacity-30 pointer-events-none">
             <div className="absolute bottom-[-20%] left-[-10%] w-[150%] h-[150%] border border-[var(--tech-border)] rounded-[40%] animate-[spin_40s_linear_infinite]" />
             <div className="absolute bottom-[-15%] left-[-5%] w-[140%] h-[140%] border border-[var(--tech-border)] rounded-[45%] animate-[spin_35s_linear_infinite_reverse]" />
           </div>

           <div className="flex justify-between text-xs tracking-widest text-[var(--text-secondary)] mb-32 uppercase relative z-10">
            <span>Measure</span>
            <span>Analyze</span>
            <span>Implement</span>
          </div>

          <h2 className="font-wide text-3xl md:text-5xl leading-[1.2] mb-12 uppercase relative z-10">
            COMPLETE<br />
            CONTROL OVER<br />
            INFRASTRUCTURE
          </h2>
        </div>

        {/* Right Panel (Table) */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="flex justify-end text-xs tracking-widest text-[var(--text-secondary)] p-8 border-tech-b">
            <span>MORE</span>
          </div>

          {/* Table Row 1 */}
          <div className="flex w-full border-tech-b group hover:bg-[var(--bg-panel-1)] transition-colors">
            <div className="w-24 md:w-32 bg-[var(--bg-panel-2)] border-tech-r flex items-center justify-center p-6 text-sm">
              <Box size={20} className="text-[var(--text-secondary)] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 p-6 md:p-8 flex items-center justify-between">
              <span className="text-sm md:text-base tracking-wide">Asset Tracking & Audits</span>
              <div className="flex gap-1 opacity-50"><div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" /></div>
            </div>
          </div>

          {/* Table Row 2 */}
          <div className="flex w-full border-tech-b group hover:bg-[var(--bg-panel-1)] transition-colors">
            <div className="w-24 md:w-32 bg-[var(--bg-panel-3)] border-tech-r flex items-center justify-center p-6 text-sm">
               <CalendarDays size={20} className="text-[var(--text-secondary)] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 p-6 md:p-8 flex items-center justify-between">
              <span className="text-sm md:text-base tracking-wide">Conflict-Free Booking System</span>
              <div className="flex gap-1 opacity-50"><div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" /></div>
            </div>
          </div>

          {/* Table Row 3 */}
          <div className="flex w-full border-tech-b group hover:bg-[var(--bg-panel-1)] transition-colors">
            <div className="w-24 md:w-32 bg-[var(--bg-panel-2)] border-tech-r flex items-center justify-center p-6 text-sm">
               <ShieldCheck size={20} className="text-[var(--text-secondary)] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 p-6 md:p-8 flex items-center justify-between">
              <span className="text-sm md:text-base tracking-wide">Predictive Maintenance Workflows</span>
              <div className="flex gap-1 opacity-50"><div className="w-1 h-1 bg-white" /><div className="w-1 h-1 bg-white" /></div>
            </div>
          </div>

          {/* Table Row 4 */}
          <div className="flex w-full group hover:bg-[var(--bg-panel-1)] transition-colors">
            <div className="w-24 md:w-32 bg-[var(--bg-panel-3)] border-tech-r flex items-center justify-center p-6 text-sm h-32">
              <span className="font-wide text-lg text-[var(--text-secondary)]">SYS</span>
            </div>
            <div className="flex-1 p-6 md:p-8 flex items-center justify-between">
              <span className="text-sm md:text-base tracking-wide max-w-sm text-[var(--text-secondary)]">
                Granular role-based access controls and detailed activity logs for absolute accountability.
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. CTA SECTION */}
      <section id="implement" className="w-full flex flex-col items-center justify-center py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none" />
        
        <h2 className="font-wide text-3xl md:text-5xl lg:text-7xl mb-12 relative z-10 text-center uppercase">
          INITIATE OPTIMIZATION
        </h2>
        
        <div className="relative z-10 flex flex-col sm:flex-row gap-6">
          <Link href="/signup" className="btn-tech-solid px-12 py-5 text-lg">
            DEPLOY WORKSPACE
          </Link>
          <Link href="/login" className="btn-tech px-12 py-5 text-lg">
            ACCESS TERMINAL
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full border-tech-t p-6 md:p-12 flex flex-col md:flex-row items-center justify-between text-xs tracking-widest text-[var(--text-secondary)] uppercase bg-[var(--bg-pure-black)] z-10">
        <div>&copy; {new Date().getFullYear()} ASSETFLOW SYSTEMS INC.</div>
        <div className="flex gap-8 mt-6 md:mt-0">
          <Link href="#" className="hover:text-white transition-colors">PRIVACY</Link>
          <Link href="#" className="hover:text-white transition-colors">TERMS</Link>
        </div>
        <div className="mt-6 md:mt-0 hidden md:block">
          STATUS: ONLINE
        </div>
      </footer>

    </div>
  );
}
