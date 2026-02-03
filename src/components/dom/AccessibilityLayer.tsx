import { useStore } from '../../engine/store';
import { useInteractionBridge } from '../../hooks/useInteractionBridge';

const AccessibilityLayer = () => {
  const resumeData = useStore((state) => state.resumeData);
  const generateProxyId = useStore((state) => state.generateProxyId);
  const { handlePointerEnter, handlePointerLeave, handleClick } = useInteractionBridge();

  if (!resumeData) return null;

  const { contact, summary, skills, impactAreas, projects } = resumeData;

  return (
    <div id="accessibility-layer" className="sr-only">
      <p role="status" className="sr-only">
        Accessible resume content loaded.
      </p>

      <nav aria-label="Skip links">
        <ul>
          <li>
            <a
              href="#summary"
              className="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded focus:ring-2 focus:ring-purple-500"
            >
              Skip to summary
            </a>
          </li>
          <li>
            <a
              href="#skills"
              className="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded focus:ring-2 focus:ring-purple-500"
            >
              Skip to skills
            </a>
          </li>
          <li>
            <a
              href="#impact-areas"
              className="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded focus:ring-2 focus:ring-purple-500"
            >
              Skip to impact areas
            </a>
          </li>
          <li>
            <a
              href="#projects"
              className="sr-only focus:not-sr-only focus:fixed focus:z-[1000] focus:top-2 focus:left-2 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded focus:ring-2 focus:ring-purple-500"
            >
              Skip to projects
            </a>
          </li>
        </ul>
      </nav>

      <header role="banner">
        <div role="heading" aria-level={1}>
          {contact.name}
        </div>
        <p>{contact.title}</p>
        <p>Location: {contact.location}</p>
        <p>
          Email: <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
        {contact.socials && contact.socials.length > 0 && (
          <ul aria-label="Social media links">
            {contact.socials.map((social) => (
              <li key={social.platform}>
                <a href={social.url} target="_blank" rel="noopener noreferrer">
                  {social.platform}
                </a>
              </li>
            ))}
          </ul>
        )}
      </header>

      <main>
        <section id="summary" tabIndex={-1} aria-labelledby="summary-h">
          <h2 id="summary-h">Professional Summary</h2>
          <p>{summary}</p>
        </section>

        <section id="skills" tabIndex={-1} aria-labelledby="skills-h">
          <h2 id="skills-h">Skills</h2>
          <ul>
            {skills.map((skill) => {
              const id = generateProxyId(skill.name);
              return (
                <li 
                  key={skill.name} 
                  id={id}
                  onPointerEnter={() => handlePointerEnter(id)}
                  onPointerLeave={handlePointerLeave}
                  onClick={() => handleClick(id)}
                >
                  <h3>{skill.name}</h3>
                  <p>Category: {skill.category}</p>
                  <p>Proficiency: {Math.round(skill.proficiency * 100)}%</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="impact-areas" tabIndex={-1} aria-labelledby="impact-h">
          <h2 id="impact-h">Impact Areas</h2>
          {impactAreas.map((area) => {
            const id = generateProxyId(area.title);
            return (
              <article 
                key={area.title} 
                id={id}
                onPointerEnter={() => handlePointerEnter(id)}
                onPointerLeave={handlePointerLeave}
                onClick={() => handleClick(id)}
              >
                <h3>{area.title}</h3>
                <p>{area.description}</p>
                {area.metrics && area.metrics.length > 0 && (
                  <ul>
                    {area.metrics.map((metric) => (
                      <li key={metric}>{metric}</li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </section>

        <section id="projects" tabIndex={-1} aria-labelledby="projects-h">
          <h2 id="projects-h">Projects</h2>
          {projects.map((project) => (
            <article 
              key={project.id} 
              id={project.id}
              onPointerEnter={() => handlePointerEnter(project.id)}
              onPointerLeave={handlePointerLeave}
              onClick={() => handleClick(project.id)}
            >
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <p>Technologies used: {project.technologies.join(', ')}</p>
              {project.impact && project.impact.length > 0 && (
                <ul>
                  {project.impact.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
              <nav aria-label={`Links for ${project.title}`}>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View live demo for ${project.title}`}
                  >
                    Live Demo
                  </a>
                )}
                {project.repo && (
                  <a
                    href={project.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View source code for ${project.title}`}
                  >
                    Source Code
                  </a>
                )}
              </nav>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default AccessibilityLayer;
