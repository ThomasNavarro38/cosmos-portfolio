import { useStore } from './engine/store';
import AccessibilityLayer from './components/dom/AccessibilityLayer';
import { useScrollEngine } from './hooks/useScrollEngine';
import { useInteractionBridge } from './hooks/useInteractionBridge';

function App() {
  const resumeData = useStore((state) => state.resumeData);
  const isLoading = useStore((state) => state.isLoading);
  const error = useStore((state) => state.error);
  const hoveredId = useStore((state) => state.hoveredId);
  const scrollProgress = useStore((state) => state.scrollProgress);
  const generateProxyId = useStore((state) => state.generateProxyId);
  const { handlePointerEnter, handlePointerLeave, handleClick } = useInteractionBridge();

  useScrollEngine();

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center w-full min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        <p className="mt-4 text-white font-mono">Loading Cosmic Data...</p>
      </main>
    );
  }

  if (error && !resumeData) {
    return (
      <main className="flex flex-col items-center justify-center w-full min-h-screen bg-black p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Critical Initialization Error</h1>
        <p className="text-gray-400 font-mono mb-4 text-center">Failed to load even the fallback data.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center w-full min-h-screen bg-black text-white p-8">
      <AccessibilityLayer />
      
      {/* Debug Overlay */}
      {import.meta.env.DEV && (
        <div className="fixed top-4 right-4 z-[9999] bg-black/80 border border-purple-500/50 p-3 rounded font-mono text-[10px] pointer-events-none">
          <div>Hovered: <span className="text-purple-400">{hoveredId || 'none'}</span></div>
          <div>Scroll: <span className="text-pink-400">{(scrollProgress * 100).toFixed(1)}%</span></div>
        </div>
      )}

      <div className="max-w-4xl w-full">
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-2 rounded mb-8 text-sm font-mono flex justify-between items-center">
            <span>Warning: Using fallback data. {error.includes('Zod') ? 'Schema validation failed.' : error}</span>
            <button onClick={() => window.location.reload()} className="underline ml-4">Retry</button>
          </div>
        )}
        
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            {resumeData?.contact.name}
          </h1>
          <p className="text-xl text-gray-400 font-mono italic">{resumeData?.contact.title}</p>
          
          <div className="mt-4 flex justify-center gap-4">
            {resumeData?.contact.socials.map(social => (
              <a 
                key={social.platform} 
                href={social.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors text-sm font-mono"
              >
                [{social.platform}]
              </a>
            ))}
          </div>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-800 pb-2">Magical Intent</h2>
          <p className="text-lg leading-relaxed text-gray-300">{resumeData?.summary}</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-800 pb-2">Sorceries (Skills)</h2>
            <ul className="space-y-4">
              {resumeData?.skills.map((skill) => {
                const id = generateProxyId(skill.name);
                return (
                  <li 
                    key={skill.name}
                    onPointerEnter={() => handlePointerEnter(id)}
                    onPointerLeave={handlePointerLeave}
                    onClick={() => handleClick(id)}
                    className="cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-300 group-hover:text-purple-300 transition-colors">{skill.name}</span>
                      <span className="text-xs font-mono px-2 py-1 bg-gray-900 rounded text-purple-400">
                        {skill.category}
                      </span>
                    </div>
                    <div className="w-full bg-gray-900 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full transition-all duration-1000 group-hover:bg-purple-400" 
                        style={{ width: `${skill.proficiency * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-800 pb-2">Impact Spheres</h2>
            <div className="space-y-6">
              {resumeData?.impactAreas.map((area) => {
                const id = generateProxyId(area.title);
                return (
                  <div 
                    key={area.title}
                    onPointerEnter={() => handlePointerEnter(id)}
                    onPointerLeave={handlePointerLeave}
                    onClick={() => handleClick(id)}
                    className="cursor-pointer group"
                  >
                    <h3 className="font-bold text-purple-400 text-lg group-hover:text-purple-300 transition-colors">{area.title}</h3>
                    <p className="text-sm text-gray-300 mb-2">{area.description}</p>
                    {area.metrics && (
                      <div className="flex flex-wrap gap-2">
                        {area.metrics.map(metric => (
                          <span key={metric} className="text-[10px] font-mono bg-purple-900/30 border border-purple-500/30 px-2 py-0.5 rounded text-purple-200">
                            {metric}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-800 pb-2">Constellations (Projects)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resumeData?.projects.map(project => (
              <div 
                key={project.id} 
                onPointerEnter={() => handlePointerEnter(project.id)}
                onPointerLeave={handlePointerLeave}
                onClick={() => handleClick(project.id)}
                className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-purple-500/50 transition-colors cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">{project.title}</h3>
                <p className="text-sm text-gray-400 mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.map(tech => (
                    <span key={tech} className="text-[10px] font-mono bg-black px-2 py-1 rounded text-gray-400">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4">
                  {project.repo && (
                    <a href={project.repo} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-purple-400 hover:text-purple-300">
                      SOURCE_CODE
                    </a>
                  )}
                  {project.url && (
                    <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-pink-400 hover:text-pink-300">
                      LIVE_VIEW
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-gray-400 text-sm font-mono border-t border-gray-900 pt-8">
          {resumeData?.contact.location} • {resumeData?.contact.email}
        </footer>
      </div>
    </main>
  );
}

export default App;
