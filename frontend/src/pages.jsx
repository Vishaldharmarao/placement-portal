import React, { useEffect, useState } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


/* =========================================================
   COMMON UI
========================================================= */

export const Card = ({ children, className = '' }) => (
  <section className={`card ${className}`}>
    {children}
  </section>
);

export const Meter = ({ value, color = '#16806f' }) => (
  <div className="meter">
    <i
      style={{
        width: `${Math.max(
          0,
          Math.min(100, Number(value) || 0)
        )}%`,
        background: color,
      }}
    />
  </div>
);


/* =========================================================
   STUDENT PROFILE
========================================================= */

export function Profile({ notify }) {
  const [profile, setProfile] = useState({});
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [internships, setInternships] = useState([]);

  const [loading, setLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [certificationLoading, setCertificationLoading] = useState(false);
  const [internshipLoading, setInternshipLoading] = useState(false);

  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    technologies: '',
    github_url: '',
  });

  const [certificationForm, setCertificationForm] = useState({
    name: '',
    issuing_organization: '',
    issue_date: '',
    credential_url: '',
  });

  const [internshipForm, setInternshipForm] = useState({
    company: '',
    role: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadProfile = async () => {
    try {
      const response = await api.get('/students/profile');
      setProfile(response.data.data || {});
    } catch (error) {
      console.error('Profile loading error:', error);
    }
  };

  const loadSkills = async () => {
    try {
      const response = await api.get('/students/skills');
      setSkills(response.data.data || []);
    } catch (error) {
      console.error('Skills loading error:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await api.get('/students/projects');
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Projects loading error:', error);
    }
  };

  const loadCertifications = async () => {
    try {
      const response = await api.get('/students/certifications');
      setCertifications(response.data.data || []);
    } catch (error) {
      console.error('Certifications loading error:', error);
    }
  };

  const loadInternships = async () => {
    try {
      const response = await api.get('/students/internships');
      setInternships(response.data.data || []);
    } catch (error) {
      console.error('Internships loading error:', error);
    }
  };

  useEffect(() => {
    loadProfile();
    loadSkills();
    loadProjects();
    loadCertifications();
    loadInternships();
  }, []);

  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  const saveProfile = async () => {
    try {
      setLoading(true);

      await api.put('/students/profile', profile);

      await loadProfile();

      notify('Profile saved successfully');
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Could not save profile'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     PROJECTS
  ========================================================= */

  const addProject = async () => {
    if (!projectForm.title.trim()) {
      notify('Project title is required');
      return;
    }

    try {
      setProjectLoading(true);

      await api.post('/students/projects', {
        title: projectForm.title.trim(),
        description:
          projectForm.description.trim() || null,
        technologies:
          projectForm.technologies.trim() || null,
        github_url:
          projectForm.github_url.trim() || null,
      });

      notify('Project added successfully');

      setProjectForm({
        title: '',
        description: '',
        technologies: '',
        github_url: '',
      });

      await loadProjects();
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Could not add project'
      );
    } finally {
      setProjectLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await api.delete(
        `/students/projects/${projectId}`
      );

      setProjects((current) =>
        current.filter(
          (project) => project.id !== projectId
        )
      );

      notify('Project removed successfully');
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Could not remove project'
      );
    }
  };

  /* =========================================================
     CERTIFICATIONS
  ========================================================= */

  const addCertification = async () => {
    if (!certificationForm.name.trim()) {
      notify('Certification name is required');
      return;
    }

    try {
      setCertificationLoading(true);

      await api.post(
        '/students/certifications',
        {
          name:
            certificationForm.name.trim(),

          issuing_organization:
            certificationForm.issuing_organization.trim() ||
            null,

          issue_date:
            certificationForm.issue_date ||
            null,

          credential_url:
            certificationForm.credential_url.trim() ||
            null,
        }
      );

      notify(
        'Certification added successfully'
      );

      setCertificationForm({
        name: '',
        issuing_organization: '',
        issue_date: '',
        credential_url: '',
      });

      await loadCertifications();
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Could not add certification'
      );
    } finally {
      setCertificationLoading(false);
    }
  };

  const deleteCertification =
    async (certificationId) => {
      try {
        await api.delete(
          `/students/certifications/${certificationId}`
        );

        setCertifications((current) =>
          current.filter(
            (certification) =>
              certification.id !==
              certificationId
          )
        );

        notify(
          'Certification removed successfully'
        );
      } catch (error) {
        notify(
          error.response?.data?.message ||
            'Could not remove certification'
        );
      }
    };

  /* =========================================================
     INTERNSHIPS
  ========================================================= */

  const addInternship = async () => {
    if (!internshipForm.company.trim()) {
      notify('Company name is required');
      return;
    }

    if (!internshipForm.role.trim()) {
      notify('Internship role is required');
      return;
    }

    try {
      setInternshipLoading(true);

      await api.post(
        '/students/internships',
        {
          company:
            internshipForm.company.trim(),

          role:
            internshipForm.role.trim(),

          description:
            internshipForm.description.trim() ||
            null,

          start_date:
            internshipForm.start_date ||
            null,

          end_date:
            internshipForm.end_date ||
            null,
        }
      );

      notify(
        'Internship added successfully'
      );

      setInternshipForm({
        company: '',
        role: '',
        description: '',
        start_date: '',
        end_date: '',
      });

      await loadInternships();
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Could not add internship'
      );
    } finally {
      setInternshipLoading(false);
    }
  };

  const deleteInternship =
    async (internshipId) => {
      try {
        await api.delete(
          `/students/internships/${internshipId}`
        );

        setInternships((current) =>
          current.filter(
            (internship) =>
              internship.id !== internshipId
          )
        );

        notify(
          'Internship removed successfully'
        );
      } catch (error) {
        notify(
          error.response?.data?.message ||
            'Could not remove internship'
        );
      }
    };

  /* =========================================================
     HELPERS
  ========================================================= */

  const getTechnologies = (technologies) => {
    if (!technologies) return [];

    return technologies
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="page">

      <div
        style={{
          marginBottom: '28px',
        }}
      >
        <p className="mono">
          PROFILE INTELLIGENCE
        </p>

        <h2>
          Build a profile that gets noticed.
        </h2>

        <p
          style={{
            maxWidth: '720px',
            marginTop: '8px',
            lineHeight: '1.6',
          }}
        >
          Keep your academic details, skills,
          projects, certifications and internship
          experience updated to improve your
          placement profile.
        </p>
      </div>


      {/* =====================================================
          PROFILE + SKILLS
      ===================================================== */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 1.15fr) minmax(0, 0.85fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >

        {/* PROFILE */}

        <Card>

          <div className="profilehead">

            <div className="bigavatar">
              {profile.name
                ?.slice(0, 2)
                .toUpperCase() || 'ME'}
            </div>

            <div>
              <h3>
                {profile.name ||
                  'Your profile'}
              </h3>

              <p>
                {profile.branch ||
                  'Add your branch'}
                {' · '}
                {profile.graduation_year ||
                  'Graduation year'}
              </p>

              <span>
                ● Profile in progress
              </span>
            </div>

          </div>

          <hr />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: '16px',
            }}
          >

            <label>
              Branch

              <input
                value={
                  profile.branch || ''
                }
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    branch:
                      e.target.value,
                  })
                }
              />
            </label>

            <label>
              CGPA

              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={
                  profile.cgpa ?? ''
                }
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    cgpa:
                      e.target.value,
                  })
                }
              />
            </label>

            <label>
              Graduation Year

              <input
                type="number"
                min="2020"
                max="2040"
                value={
                  profile.graduation_year ??
                  ''
                }
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    graduation_year:
                      e.target.value,
                  })
                }
              />
            </label>

            <label>
              Location

              <input
                value={
                  profile.location || ''
                }
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    location:
                      e.target.value,
                  })
                }
              />
            </label>

          </div>


          <label>
            GitHub URL

            <input
              type="url"
              placeholder="https://github.com/username"
              value={
                profile.github_url || ''
              }
              onChange={(e) =>
                setProfile({
                  ...profile,
                  github_url:
                    e.target.value,
                })
              }
            />
          </label>


          <label>
            LinkedIn URL

            <input
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={
                profile.linkedin_url || ''
              }
              onChange={(e) =>
                setProfile({
                  ...profile,
                  linkedin_url:
                    e.target.value,
                })
              }
            />
          </label>


          <label>
            Portfolio URL
            <small> Optional</small>

            <input
              type="url"
              placeholder="https://yourportfolio.com"
              value={
                profile.portfolio_url ||
                ''
              }
              onChange={(e) =>
                setProfile({
                  ...profile,
                  portfolio_url:
                    e.target.value,
                })
              }
            />
          </label>


          <button
            className="primary"
            disabled={loading}
            onClick={saveProfile}
          >
            {loading
              ? 'Saving...'
              : 'Save profile →'}
          </button>

        </Card>


        {/* SKILLS */}

        <Card>

          <p className="mono">
            YOUR SKILL SIGNAL
          </p>

          <h3>
            Skills on your profile
          </h3>

          <p
            style={{
              lineHeight: '1.5',
              marginBottom: '18px',
            }}
          >
            Skills detected from your resume
            are automatically added here.
          </p>

          <div
            className="chips"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {skills.map((skill) => (
              <span key={skill.id}>
                {skill.name}
                {' · '}
                {skill.proficiency_level
                  ?.toLowerCase() ||
                  'beginner'}
              </span>
            ))}
          </div>

        </Card>

      </div>


      {/* =====================================================
          PROJECTS
      ===================================================== */}

      <Card
        style={{
          marginTop: '24px',
        }}
      >

        <p className="mono">
          PROJECT EXPERIENCE
        </p>

        <h3>
          Showcase what you have built.
        </h3>

        <p>
          Add academic, personal, hackathon or
          real-world projects.
        </p>


        {/* PROJECT FORM */}

        <div
          style={{
            background: '#f7f5ef',
            borderRadius: '14px',
            padding: '22px',
            marginTop: '20px',
            marginBottom: '28px',
            border: '1px solid #e6e2d8',
          }}
        >

          <h4>
            Add a new project
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: '16px',
            }}
          >

            <label
              style={{
                gridColumn: '1 / -1',
              }}
            >
              Project Title

              <input
                placeholder="AI-Powered College Placement Portal"
                value={
                  projectForm.title
                }
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    title:
                      e.target.value,
                  })
                }
              />
            </label>


            <label>
              Technologies

              <input
                placeholder="React, Node.js, MySQL, Python"
                value={
                  projectForm.technologies
                }
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    technologies:
                      e.target.value,
                  })
                }
              />
            </label>


            <label>
              GitHub URL
              <small> Optional</small>

              <input
                type="url"
                placeholder="https://github.com/..."
                value={
                  projectForm.github_url
                }
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    github_url:
                      e.target.value,
                  })
                }
              />
            </label>


            <label
              style={{
                gridColumn: '1 / -1',
              }}
            >
              Project Description

              <textarea
                rows="5"
                placeholder="Explain what the project does..."
                value={
                  projectForm.description
                }
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    description:
                      e.target.value,
                  })
                }
              />
            </label>

          </div>


          <button
            className="primary"
            disabled={
              projectLoading
            }
            onClick={
              addProject
            }
          >
            {projectLoading
              ? 'Adding project...'
              : 'Add project →'}
          </button>

        </div>


        {/* PROJECT LIST */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px',
          }}
        >

          {projects.map(
            (project) => {

              const technologies =
                getTechnologies(
                  project.technologies
                );

              return (
                <article
                  key={project.id}
                  style={{
                    border:
                      '1px solid #e4dfd4',
                    borderRadius:
                      '14px',
                    padding:
                      '20px',
                    background:
                      '#fff',
                  }}
                >

                  <h4>
                    {project.title}
                  </h4>

                  {project.description && (
                    <p
                      style={{
                        lineHeight:
                          '1.6',
                      }}
                    >
                      {project.description}
                    </p>
                  )}

                  {technologies.length > 0 && (
                    <div
                      style={{
                        display:
                          'flex',
                        flexWrap:
                          'wrap',
                        gap:
                          '7px',
                        margin:
                          '14px 0',
                      }}
                    >
                      {technologies.map(
                        (technology) => (
                          <span
                            key={
                              technology
                            }
                            style={{
                              padding:
                                '5px 10px',
                              borderRadius:
                                '999px',
                              background:
                                '#eef3ef',
                              fontSize:
                                '12px',
                              fontWeight:
                                '600',
                            }}
                          >
                            {technology}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {project.github_url && (
                    <p>
                      <a
                        href={
                          project.github_url
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        View GitHub →
                      </a>
                    </p>
                  )}

                  <button
                    className="outline"
                    onClick={() =>
                      deleteProject(
                        project.id
                      )
                    }
                  >
                    Remove
                  </button>

                </article>
              );
            }
          )}

        </div>

      </Card>


      {/* =====================================================
          CERTIFICATIONS
      ===================================================== */}

      <Card
        style={{
          marginTop: '24px',
        }}
      >

        <p className="mono">
          CERTIFICATIONS
        </p>

        <h3>
          Highlight your credentials.
        </h3>

        <p>
          Add certifications and courses that
          support your technical profile.
        </p>


        {/* CERTIFICATION FORM */}

        <div
          style={{
            background: '#f7f5ef',
            borderRadius: '14px',
            padding: '22px',
            marginTop: '20px',
            marginBottom: '28px',
            border: '1px solid #e6e2d8',
          }}
        >

          <h4>
            Add a certification
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: '16px',
            }}
          >

            <label>
              Certification Name

              <input
                placeholder="AWS Cloud Practitioner"
                value={
                  certificationForm.name
                }
                onChange={(e) =>
                  setCertificationForm({
                    ...certificationForm,
                    name:
                      e.target.value,
                  })
                }
              />
            </label>


            <label>
              Issuing Organization

              <input
                placeholder="Amazon Web Services"
                value={
                  certificationForm
                    .issuing_organization
                }
                onChange={(e) =>
                  setCertificationForm({
                    ...certificationForm,
                    issuing_organization:
                      e.target.value,
                  })
                }
              />
            </label>


            <label>
              Issue Date

              <input
                type="date"
                value={
                  certificationForm
                    .issue_date
                }
                onChange={(e) =>
                  setCertificationForm({
                    ...certificationForm,
                    issue_date:
                      e.target.value,
                  })
                }
              />
            </label>


            <label>
              Credential URL
              <small> Optional</small>

              <input
                type="url"
                placeholder="https://..."
                value={
                  certificationForm
                    .credential_url
                }
                onChange={(e) =>
                  setCertificationForm({
                    ...certificationForm,
                    credential_url:
                      e.target.value,
                  })
                }
              />
            </label>

          </div>


          <button
            className="primary"
            disabled={
              certificationLoading
            }
            onClick={
              addCertification
            }
          >
            {certificationLoading
              ? 'Adding certification...'
              : 'Add certification →'}
          </button>

        </div>


        {/* CERTIFICATION LIST */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px',
          }}
        >

          {certifications.map(
            (certification) => (
              <article
                key={
                  certification.id
                }
                style={{
                  border:
                    '1px solid #e4dfd4',
                  borderRadius:
                    '14px',
                  padding:
                    '20px',
                  background:
                    '#fff',
                }}
              >

                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#eef3ef',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                    fontWeight: '700',
                  }}
                >
                  ✓
                </div>

                <h4>
                  {
                    certification.name
                  }
                </h4>

                {certification
                  .issuing_organization && (
                  <p>
                    {
                      certification.issuing_organization
                    }
                  </p>
                )}

                {certification
                  .issue_date && (
                  <p
                    style={{
                      fontSize: '13px',
                      opacity: 0.65,
                    }}
                  >
                    Issued:{' '}
                    {new Date(
                      certification.issue_date
                    ).toLocaleDateString()}
                  </p>
                )}

                {certification
                  .credential_url && (
                  <p>
                    <a
                      href={
                        certification.credential_url
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      View credential →
                    </a>
                  </p>
                )}

                <button
                  className="outline"
                  onClick={() =>
                    deleteCertification(
                      certification.id
                    )
                  }
                >
                  Remove
                </button>

              </article>
            )
          )}

        </div>

        {certifications.length === 0 && (
          <div
            style={{
              border:
                '1px dashed #cfc9bc',
              borderRadius:
                '12px',
              padding:
                '28px 20px',
              textAlign:
                'center',
              marginTop:
                '10px',
            }}
          >
            No certifications added yet.
          </div>
        )}

      </Card>


      {/* =====================================================
          INTERNSHIPS
      ===================================================== */}

      <Card
        style={{
          marginTop: '24px',
        }}
      >

        <p className="mono">
          INTERNSHIP EXPERIENCE
        </p>

        <h3>
          Show where you gained experience.
        </h3>

        <p>
          Add internships, training programs
          or professional work experience.
        </p>


        {/* INTERNSHIP FORM */}

        <div
          style={{
            background: '#f7f5ef',
            borderRadius: '14px',
            padding: '22px',
            marginTop: '20px',
            marginBottom: '28px',
            border: '1px solid #e6e2d8',
          }}
        >

          <h4>
            Add an internship
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: '16px',
            }}
          >

            <label>
              Company

              <input
                placeholder="Infosys"
                value={
                  internshipForm.company
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    company:
                      e.target.value,
                  })
                }
              />
            </label>


            <label>
              Role

              <input
                placeholder="AI Intern"
                value={
                  internshipForm.role
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    role:
                      e.target.value,
                  })
                }
              />
            </label>


            <label>
              Start Date

              <input
                type="date"
                value={
                  internshipForm.start_date
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    start_date:
                      e.target.value,
                  })
                }
              />
            </label>


            <label>
              End Date

              <input
                type="date"
                value={
                  internshipForm.end_date
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    end_date:
                      e.target.value,
                  })
                }
              />
            </label>


            <label
              style={{
                gridColumn:
                  '1 / -1',
              }}
            >
              Description

              <textarea
                rows="4"
                placeholder="Describe what you worked on..."
                value={
                  internshipForm.description
                }
                onChange={(e) =>
                  setInternshipForm({
                    ...internshipForm,
                    description:
                      e.target.value,
                  })
                }
              />
            </label>

          </div>


          <button
            className="primary"
            disabled={
              internshipLoading
            }
            onClick={
              addInternship
            }
          >
            {internshipLoading
              ? 'Adding internship...'
              : 'Add internship →'}
          </button>

        </div>


        {/* INTERNSHIP LIST */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px',
          }}
        >

          {internships.map(
            (internship) => (
              <article
                key={
                  internship.id
                }
                style={{
                  border:
                    '1px solid #e4dfd4',
                  borderRadius:
                    '14px',
                  padding:
                    '20px',
                  background:
                    '#fff',
                }}
              >

                <h4>
                  {internship.role}
                </h4>

                <p
                  style={{
                    fontWeight: '600',
                    marginBottom: '8px',
                  }}
                >
                  {internship.company}
                </p>

                {(
                  internship.start_date ||
                  internship.end_date
                ) && (
                  <p
                    style={{
                      fontSize: '13px',
                      opacity: 0.65,
                    }}
                  >
                    {internship.start_date
                      ? new Date(
                          internship.start_date
                        ).toLocaleDateString()
                      : 'Start date not specified'}
                    {' → '}
                    {internship.end_date
                      ? new Date(
                          internship.end_date
                        ).toLocaleDateString()
                      : 'Present'}
                  </p>
                )}

                {internship.description && (
                  <p
                    style={{
                      lineHeight: '1.6',
                    }}
                  >
                    {
                      internship.description
                    }
                  </p>
                )}

                <button
                  className="outline"
                  onClick={() =>
                    deleteInternship(
                      internship.id
                    )
                  }
                >
                  Remove
                </button>

              </article>
            )
          )}

        </div>

        {internships.length === 0 && (
          <div
            style={{
              border:
                '1px dashed #cfc9bc',
              borderRadius:
                '12px',
              padding:
                '28px 20px',
              textAlign:
                'center',
                marginTop:
                '10px',
            }}
          >
            No internships added yet.
          </div>
        )}

      </Card>

    </div>
  );
}
/* =========================================================
   RESUME LAB
========================================================= */

export function Resume({ notify }) {
  const [file, setFile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const response = await api.get('/resumes');
      setResumes(response.data.data || []);
    } catch (error) {
      console.error(
        'Resume loading error:',
        error
      );
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const upload = async () => {
    if (!file) {
      notify('Choose a PDF first');
      return;
    }

    if (file.type !== 'application/pdf') {
      notify('Only PDF files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify('Maximum file size is 5 MB');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append(
        'resume',
        file
      );

      await api.post(
        '/resumes/upload',
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      notify(
        'Resume uploaded successfully'
      );

      setFile(null);

      await refresh();
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Upload failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const analyze = async (id) => {
    try {
      setLoading(true);

      await api.post(
        `/resumes/${id}/analyze`
      );

      notify(
        'Resume analysis completed'
      );

      await refresh();
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Analysis failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <p className="mono">
        RESUME LAB
      </p>

      <h2>
        Make every line count.
      </h2>

      <Card className="upload">

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) =>
            setFile(
              e.target.files?.[0] ||
                null
            )
          }
        />

        <h3>
          {file
            ? file.name
            : 'Choose your PDF resume'}
        </h3>

        <p>
          PDF only · Maximum 5 MB ·
          Your file stays private
        </p>

        <button
          className="primary"
          disabled={loading}
          onClick={upload}
        >
          {loading
            ? 'Working...'
            : 'Upload resume →'}
        </button>
      </Card>

      {resumes.map((resume) => {
        let extractedSkills = [];

        try {
          extractedSkills =
            JSON.parse(
              resume.extracted_skills ||
                '[]'
            );
        } catch {
          extractedSkills = [];
        }

        return (
          <Card
            key={resume.id}
            className="resume-result"
          >
            <div>

              <p className="mono">
                {resume.file_name}
              </p>

              <h3>
                {resume.ats_score ?? '—'}
                <small>
                  {' '}
                  ATS score
                </small>
              </h3>

              <div className="chips">

                {extractedSkills.map(
                  (skill) => (
                    <span key={skill}>
                      {skill}
                    </span>
                  )
                )}

              </div>

            </div>

            <button
              className="outline"
              disabled={loading}
              onClick={() =>
                analyze(resume.id)
              }
            >
              Analyze with AI →
            </button>
          </Card>
        );
      })}
    </div>
  );
}


/* =========================================================
   JOBS
========================================================= */

export function Jobs({
  compact = false,
  notify = () => {},
}) {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);

        const response =
          await api.get('/jobs', {
            params: {
              search,
            },
          });

        const jobList =
          response.data.data || [];

        const jobsWithMatches =
          await Promise.all(
            jobList.map(
              async (job) => {
                try {
                  const matchResponse =
                    await api.post(
                      '/job-match',
                      {
                        job,
                      }
                    );

                  return {
                    ...job,
                    match:
                      matchResponse.data
                        .data?.match_percentage,
                  };
                } catch {
                  return {
                    ...job,
                    match: null,
                  };
                }
              }
            )
          );

        setJobs(
          jobsWithMatches
        );
      } catch (error) {
        console.error(
          'Jobs error:',
          error
        );

        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [search]);

  const apply = async (jobId) => {
    try {
      await api.post(
        '/applications',
        {
          job_id: jobId,
        }
      );

      notify(
        'Application submitted successfully'
      );
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Could not apply'
      );
    }
  };

  return (
    <div
      className={
        compact
          ? ''
          : 'page'
      }
    >

      {!compact && (
        <>
          <p className="mono">
            PERSONALIZED MATCHES
          </p>

          <h2>
            Work that fits how you think.
          </h2>

          <input
            className="search"
            placeholder="Search roles or companies"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />
        </>
      )}

      {loading && (
        <p>
          Loading jobs...
        </p>
      )}

      <div className="job-list">

        {jobs.map(
          (job) => (
            <Card
              className="job"
              key={job.id}
            >

              <div className="companymark">
                {job.company_name?.[0] ||
                  'C'}
              </div>

              <div className="jobmain">

                <p>
                  {job.company_name}
                  {' · '}
                  {job.location}
                </p>

                <h3>
                  {job.title}
                </h3>

                <div className="chips">

                  {(job.required_skills ||
                    [])
                    .slice(0, 4)
                    .map(
                      (skill) => (
                        <span
                          key={skill}
                        >
                          {skill}
                        </span>
                      )
                    )}

                </div>

              </div>

              <div className="match">

                <b>
                  {job.match == null
                    ? '—'
                    : `${Math.round(
                        job.match
                      )}%`}
                </b>

                <span>
                  match
                </span>

              </div>

              <button
                className="outline"
                onClick={() =>
                  apply(job.id)
                }
              >
                Apply →
              </button>

            </Card>
          )
        )}

        {!loading &&
          !jobs.length && (
            <p className="empty">
              No jobs found.
            </p>
          )}

      </div>
    </div>
  );
}


/* =========================================================
   APPLICATIONS
========================================================= */

export function Applications({
  notify = () => {},
}) {
  const [applications, setApplications] =
    useState([]);

  const auth =
    JSON.parse(
      localStorage.getItem(
        'auth'
      ) || '{}'
    );

  const role =
    auth?.user?.role ||
    'STUDENT';

  const isCompany =
    role === 'COMPANY';

  const load = async () => {
    try {
      const response =
        await api.get(
          '/applications'
        );

      setApplications(
        response.data.data || []
      );
    } catch (error) {
      console.error(
        'Applications error:',
        error
      );

      setApplications([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus =
    async (id, status) => {
      try {
        await api.put(
          `/applications/${id}/status`,
          {
            status,
          }
        );

        notify(
          'Application status updated'
        );

        load();
      } catch (error) {
        notify(
          error.response?.data?.message ||
            'Could not update status'
        );
      }
    };

  return (
    <div className="page">

      <p className="mono">
        {isCompany
          ? 'CANDIDATE MANAGEMENT'
          : 'APPLICATION TRACKER'}
      </p>

      <h2>
        {isCompany
          ? 'Review applicants from your live roles.'
          : 'Every application, in one view.'}
      </h2>

      <div className="table">

        <div className="thead">

          <span>
            Role
          </span>

          <span>
            {isCompany
              ? 'Candidate'
              : 'Company'}
          </span>

          <span>
            Applied
          </span>

          <span>
            Status
          </span>

        </div>

        {applications.length ? (

          applications.map(
            (application) => (

              <div
                className="trow"
                key={application.id}
              >

                <b>
                  {application.title}
                </b>

                <span>
                  {isCompany
                    ? application.student_name
                    : application.company_name}
                </span>

                <span>
                  {new Date(
                    application.applied_at
                  ).toLocaleDateString()}
                </span>

                {isCompany ? (

                  <select
                    value={
                      application.status
                    }
                    onChange={(e) =>
                      updateStatus(
                        application.id,
                        e.target.value
                      )
                    }
                  >

                    <option value="APPLIED">
                      APPLIED
                    </option>

                    <option value="SHORTLISTED">
                      SHORTLISTED
                    </option>

                    <option value="INTERVIEW">
                      INTERVIEW
                    </option>

                    <option value="SELECTED">
                      SELECTED
                    </option>

                    <option value="REJECTED">
                      REJECTED
                    </option>

                  </select>

                ) : (

                  <em
                    className={
                      application.status
                    }
                  >
                    {application.status}
                  </em>

                )}

              </div>
            )
          )

        ) : (

          <p className="empty">
            No applications yet.
          </p>

        )}

      </div>
    </div>
  );
}


/* =========================================================
   PLACEMENT PREDICTION
========================================================= */

export function Prediction({
  notify,
}) {
  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const normalizeResult =
    (data) => {
      if (!data) {
        return null;
      }

      let factors = [];

      if (
        Array.isArray(
          data.important_factors
        )
      ) {
        factors =
          data.important_factors;
      } else {
        try {
          factors = JSON.parse(
            data.important_factors ||
              '[]'
          );
        } catch {
          factors = [];
        }
      }

      const probability =
        data.probability !==
        undefined
          ? Number(
              data.probability
            )
          : Number(
              data.percentage || 0
            ) / 100;

      const percentage =
        data.percentage !==
        undefined
          ? Number(
              data.percentage
            )
          : Math.round(
              probability * 100
            );

      return {
        percentage,

        label:
          data.label ||
          (
            data.prediction_label
              ? `${data.prediction_label[0]}${data.prediction_label
                  .slice(1)
                  .toLowerCase()} Probability`
              : 'Placement Probability'
          ),

        important_factors:
          factors,

        disclaimer:
          data.disclaimer ||
          'This is an estimated readiness signal based on your available profile data.',
      };
    };

  useEffect(() => {
    const load = async () => {
      try {
        const response =
          await api.get(
            '/prediction/latest'
          );

        const data =
          response.data.data;

        if (data) {
          setResult(
            normalizeResult(data)
          );
        }
      } catch (error) {
        console.error(
          'Prediction loading error:',
          error
        );
      }
    };

    load();
  }, []);

  const runPrediction =
    async () => {
      try {
        setLoading(true);

        const response =
          await api.post(
            '/prediction',
            {}
          );

        const data =
          response.data.data;

        setResult(
          normalizeResult(data)
        );

        notify(
          'Placement estimate updated'
        );
      } catch (error) {
        console.error(
          'Prediction error:',
          error
        );

        notify(
          error.response?.data?.message ||
            'Complete your profile and resume first'
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="page">

      <p className="mono">
        PLACEMENT SIGNAL
      </p>

      <h2>
        Explained readiness estimate.
      </h2>

      <Card className="prediction">

        <div className="score">

          {result?.percentage ??
            '—'}

          <small>
            %
          </small>

        </div>

        <div>

          <h3>
            {result?.label ||
              'Generate your estimate'}
          </h3>

          <p>
            {result?.disclaimer ||
              'Uses your CGPA, skills, projects, certifications, internship, assessments and resume ATS score.'}
          </p>

          <button
            className="primary"
            disabled={loading}
            onClick={
              runPrediction
            }
          >
            {loading
              ? 'Calculating...'
              : 'Calculate estimate →'}
          </button>

        </div>
      </Card>

      {result && (
        <Card>

          <p className="mono">
            IMPORTANT FACTORS
          </p>

          {result
            .important_factors
            .length > 0 ? (

            <ul>

              {result
                .important_factors
                .map(
                  (
                    factor,
                    index
                  ) => (
                    <li
                      key={index}
                    >
                      {factor}
                    </li>
                  )
                )}

            </ul>

          ) : (

            <p>
              No factors available yet.
            </p>

          )}

        </Card>
      )}
    </div>
  );
}


/* =========================================================
   INTERVIEW LAB
========================================================= */

export function Interview({
  notify,
}) {
  const [plan, setPlan] =
    useState(null);

  const [role, setRole] =
    useState(
      'Software Engineer'
    );

  const [loading, setLoading] =
    useState(false);

  const loadRecommendations =
    async () => {
      try {
        setLoading(true);

        const response =
          await api.post(
            '/interview/recommendations',
            {
              role,
            }
          );

        setPlan(
          response.data.data
        );
      } catch (error) {
        notify(
          error.response?.data?.message ||
            'Could not load interview recommendations'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const questions =
    plan?.questions || [];

  return (
    <div className="page">

      <p className="mono">
        INTERVIEW LAB
      </p>

      <h2>
        Practice with purpose.
      </h2>

      <label>
        Target role

        <input
          value={role}
          onChange={(e) =>
            setRole(
              e.target.value
            )
          }
          onBlur={
            loadRecommendations
          }
        />
      </label>

      <div className="split">

        <Card className="sprint">

          <p className="pill">
            ● PERSONALIZED PLAN
          </p>

          <h3>
            {plan?.role || role}
            {' '}
            interview fundamentals
          </h3>

          <p>
            Focus areas are generated
            from your stored skills
            and selected role.
          </p>

          <div className="chips">

            {(plan?.focus_areas || [])
              .map(
                (area) => (
                  <span
                    key={area}
                  >
                    {area}
                  </span>
                )
              )}

          </div>

          <button
            className="primary"
            disabled={loading}
            onClick={() =>
              notify(
                'Practice session started'
              )
            }
          >
            Start practice →
          </button>

        </Card>

        <Card>

          <p className="mono">
            RECOMMENDED QUESTIONS
          </p>

          {questions.map(
            (
              question,
              index
            ) => (

              <div
                className="plan"
                key={
                  question.category ||
                  index
                }
              >

                <span></span>

                <div>

                  <small>
                    {(
                      question.category ||
                      'GENERAL'
                    ).toUpperCase()}

                    {' · '}

                    {question.difficulty}
                  </small>

                  <h4>
                    {question.question}
                  </h4>

                </div>

              </div>
            )
          )}

          {!questions.length && (
            <p>
              {loading
                ? 'Generating questions...'
                : 'Generate personalized questions after adding skills to your profile.'}
            </p>
          )}

        </Card>

      </div>
    </div>
  );
}


/* =========================================================
   ASSESSMENTS
========================================================= */

export function Assessments({ notify }) {
  const [assessments, setAssessments] = useState([]);
  const [completed, setCompleted] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  const [activeAssessment, setActiveAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  /* =========================================================
     LOAD ASSESSMENTS + COMPLETED RESULTS
  ========================================================= */

  const loadData = async () => {
    try {
      setLoading(true);

      const [assessmentResponse, resultResponse] =
        await Promise.all([
          api.get('/assessments'),
          api.get('/assessments/results'),
        ]);

      setAssessments(
        assessmentResponse.data.data || []
      );

      const resultList =
        resultResponse.data.data || [];

      const completedMap = {};

      resultList.forEach((item) => {
        completedMap[item.assessment_id] = item;
      });

      setCompleted(completedMap);
    } catch (error) {
      console.error(
        'Assessment loading error:',
        error
      );

      notify(
        error.response?.data?.message ||
          'Could not load assessments'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  /* =========================================================
     START ASSESSMENT
  ========================================================= */

  const startAssessment = async (assessment) => {
    if (completed[assessment.id]) {
      notify(
        'You have already completed this assessment.'
      );
      return;
    }

    try {
      setLoadingAssessment(true);
      setResult(null);

      const response = await api.get(
        `/assessments/${assessment.id}`
      );

      const data =
        response.data.data;

      setActiveAssessment(data);
      setQuestions(data.questions || []);
      setAnswers({});
      setCurrentQuestion(0);
    } catch (error) {
      console.error(
        'Assessment start error:',
        error
      );

      notify(
        error.response?.data?.message ||
          'Could not start assessment'
      );
    } finally {
      setLoadingAssessment(false);
    }
  };


  /* =========================================================
     SELECT ANSWER
  ========================================================= */

  const selectAnswer = (
    questionId,
    answer
  ) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: answer,
    }));
  };


  /* =========================================================
     NEXT
  ========================================================= */

  const nextQuestion = () => {
    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        (current) => current + 1
      );
    }
  };


  /* =========================================================
     PREVIOUS
  ========================================================= */

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(
        (current) => current - 1
      );
    }
  };


  /* =========================================================
     SUBMIT
  ========================================================= */

  const submitAssessment = async () => {
    if (!activeAssessment) {
      return;
    }

    const unanswered =
      questions.filter(
        (question) =>
          !answers[question.id]
      );

    if (unanswered.length > 0) {
      notify(
        `Please answer all ${
          unanswered.length
        } remaining question${
          unanswered.length === 1
            ? ''
            : 's'
        }.`
      );

      return;
    }

    try {
      setSubmitting(true);

      const formattedAnswers =
        questions.map(
          (question) => ({
            question_id:
              question.id,

            answer:
              answers[question.id],
          })
        );

      const response =
        await api.post(
          `/assessments/${activeAssessment.id}/submit`,
          {
            answers:
              formattedAnswers,
          }
        );

      const data =
        response.data.data;

      setResult(data);

      /*
       * Update completed state immediately.
       */
      setCompleted((current) => ({
        ...current,
        [activeAssessment.id]: {
          assessment_id:
            activeAssessment.id,
          title:
            activeAssessment.title,
          score:
            data.score,
          percentage:
            data.percentage,
        },
      }));

      notify(
        `Assessment completed: ${data.percentage}%`
      );
    } catch (error) {
      console.error(
        'Assessment submission error:',
        error
      );

      notify(
        error.response?.data?.message ||
          'Could not submit assessment'
      );
    } finally {
      setSubmitting(false);
    }
  };


  /* =========================================================
     EXIT
  ========================================================= */

  const exitAssessment = () => {
    setActiveAssessment(null);
    setQuestions([]);
    setAnswers({});
    setCurrentQuestion(0);
    setResult(null);
  };


  /* =========================================================
     RESULT SCREEN
  ========================================================= */

  if (
    result &&
    activeAssessment
  ) {
    return (
      <div className="page">

        <p className="mono">
          ASSESSMENT RESULT
        </p>

        <h2>
          {activeAssessment.title}
        </h2>


        <Card
          style={{
            marginTop: '24px',
            textAlign: 'center',
            padding: '40px 24px',
          }}
        >

          <div
            style={{
              fontSize: '64px',
              fontWeight: '700',
              marginBottom: '10px',
            }}
          >
            {result.percentage}%
          </div>

          <h3>
            Assessment completed
          </h3>

          <p
            style={{
              fontSize: '16px',
              opacity: 0.75,
            }}
          >
            You answered{' '}
            <strong>
              {result.score}
            </strong>{' '}
            out of{' '}
            <strong>
              {result.total}
            </strong>{' '}
            questions correctly.
          </p>

          <div
            style={{
              maxWidth: '500px',
              margin: '24px auto',
            }}
          >
            <Meter
              value={
                result.percentage
              }
            />
          </div>

          <button
            className="primary"
            onClick={exitAssessment}
          >
            Back to assessments →
          </button>

        </Card>


        <Card
          style={{
            marginTop: '20px',
          }}
        >

          <p className="mono">
            PLACEMENT SIGNAL
          </p>

          <p
            style={{
              lineHeight: '1.6',
              marginBottom: 0,
            }}
          >
            This assessment result has
            been saved and will contribute
            to your overall placement
            readiness score.
          </p>

        </Card>

      </div>
    );
  }


  /* =========================================================
     ACTIVE ASSESSMENT
  ========================================================= */

  if (activeAssessment) {
    const question =
      questions[currentQuestion];

    if (!question) {
      return (
        <div className="page">
          <Card>
            <h3>
              No questions available
            </h3>

            <button
              className="primary"
              onClick={
                exitAssessment
              }
            >
              Back to assessments
            </button>
          </Card>
        </div>
      );
    }

    const selectedAnswer =
      answers[question.id];

    const progress =
      questions.length > 0
        ? ((currentQuestion + 1) /
            questions.length) *
          100
        : 0;

    return (
      <div className="page">

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}
        >

          <div>

            <p className="mono">
              {activeAssessment.category?.toUpperCase()}
            </p>

            <h2
              style={{
                marginBottom: '5px',
              }}
            >
              {activeAssessment.title}
            </h2>

            <p
              style={{
                margin: 0,
                opacity: 0.7,
              }}
            >
              Question{' '}
              {currentQuestion + 1}
              {' '}
              of{' '}
              {questions.length}
            </p>

          </div>


          <button
            className="outline"
            onClick={
              exitAssessment
            }
          >
            Exit
          </button>

        </div>


        <Card
          style={{
            marginBottom: '20px',
            padding:
              '14px 18px',
          }}
        >
          <Meter
            value={progress}
          />
        </Card>


        <Card>

          <span
            style={{
              display:
                'inline-block',
              fontSize:
                '13px',
              fontWeight: '700',
              padding:
                '6px 10px',
              borderRadius:
                '999px',
              background:
                '#eef3ef',
              marginBottom:
                '16px',
            }}
          >
            Question{' '}
            {currentQuestion + 1}
          </span>


          <h3
            style={{
              fontSize:
                '22px',
              lineHeight:
                '1.45',
              marginBottom:
                '26px',
            }}
          >
            {question.question}
          </h3>


          <div
            style={{
              display:
                'grid',
              gap:
                '12px',
            }}
          >

            {[
              {
                key: 'A',
                text:
                  question.option_a,
              },
              {
                key: 'B',
                text:
                  question.option_b,
              },
              {
                key: 'C',
                text:
                  question.option_c,
              },
              {
                key: 'D',
                text:
                  question.option_d,
              },
            ].map(
              (option) => {

                const selected =
                  selectedAnswer ===
                  option.key;

                return (
                  <button
                    key={
                      option.key
                    }
                    type="button"
                    onClick={() =>
                      selectAnswer(
                        question.id,
                        option.key
                      )
                    }
                    style={{
                      width:
                        '100%',
                      textAlign:
                        'left',
                      padding:
                        '16px',
                      borderRadius:
                        '12px',
                      border:
                        selected
                          ? '2px solid #16806f'
                          : '1px solid #ddd8ce',
                      background:
                        selected
                          ? '#eef7f3'
                          : '#fff',
                      cursor:
                        'pointer',
                      fontFamily:
                        'inherit',
                      fontSize:
                        '15px',
                      lineHeight:
                        '1.5',
                    }}
                  >

                    <span
                      style={{
                        display:
                          'inline-flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        width:
                          '32px',
                        height:
                          '32px',
                        borderRadius:
                          '50%',
                        marginRight:
                          '12px',
                        background:
                          selected
                            ? '#16806f'
                            : '#f2f0ea',
                        color:
                          selected
                            ? '#fff'
                            : '#333',
                        fontWeight:
                          '700',
                      }}
                    >
                      {
                        option.key
                      }
                    </span>

                    {
                      option.text
                    }

                  </button>
                );
              }
            )}

          </div>


          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              gap:
                '12px',
              marginTop:
                '28px',
              paddingTop:
                '20px',
              borderTop:
                '1px solid #eeeae2',
            }}
          >

            <button
              className="outline"
              disabled={
                currentQuestion ===
                0
              }
              onClick={
                previousQuestion
              }
            >
              ← Previous
            </button>


            {currentQuestion <
            questions.length - 1 ? (

              <button
                className="primary"
                disabled={
                  !selectedAnswer
                }
                onClick={
                  nextQuestion
                }
              >
                Next question →
              </button>

            ) : (

              <button
                className="primary"
                disabled={
                  submitting ||
                  !selectedAnswer
                }
                onClick={
                  submitAssessment
                }
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit assessment →'}
              </button>

            )}

          </div>

        </Card>

      </div>
    );
  }


  /* =========================================================
     ASSESSMENT LIST
  ========================================================= */

  return (
    <div className="page">

      <p className="mono">
        SKILL ASSESSMENTS
      </p>

      <h2>
        Know what to practice next.
      </h2>

      <p
        style={{
          maxWidth:
            '700px',
          lineHeight:
            '1.6',
          marginBottom:
            '24px',
        }}
      >
        Each assessment can be
        attempted only once.
        Unattempted assessments
        contribute 0% to your
        overall assessment score.
      </p>


      {loading && (
        <p>
          Loading assessments...
        </p>
      )}


      {!loading && (
        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap:
              '20px',
          }}
        >

          {assessments.map(
            (assessment) => {

              const completedResult =
                completed[
                  assessment.id
                ];

              const isCompleted =
                Boolean(
                  completedResult
                );

              return (
                <Card
                  key={
                    assessment.id
                  }
                >

                  <div
                    style={{
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'flex-start',
                      gap:
                        '12px',
                      marginBottom:
                        '14px',
                    }}
                  >

                    <span
                      style={{
                        fontSize:
                          '12px',
                        fontWeight:
                          '700',
                        padding:
                          '6px 10px',
                        borderRadius:
                          '999px',
                        background:
                          isCompleted
                            ? '#e6f5ec'
                            : '#eef3ef',
                      }}
                    >
                      {assessment.category}
                    </span>


                    <span
                      style={{
                        fontSize:
                          '12px',
                        opacity:
                          0.65,
                      }}
                    >
                      {
                        assessment.duration_minutes
                      }{' '}
                      min
                    </span>

                  </div>


                  <h3>
                    {assessment.title}
                  </h3>


                  <p
                    style={{
                      lineHeight:
                        '1.5',
                    }}
                  >
                    {assessment.difficulty}
                    {' difficulty · '}
                    Multiple-choice assessment
                  </p>


                  {isCompleted ? (

                    <div
                      style={{
                        marginTop:
                          '16px',
                        padding:
                          '14px',
                        borderRadius:
                          '10px',
                        background:
                          '#f3faf5',
                        border:
                          '1px solid #d7ecdd',
                      }}
                    >

                      <strong>
                        ✓ Completed
                      </strong>

                      <p
                        style={{
                          margin:
                            '6px 0 0',
                        }}
                      >
                        Score:{' '}
                        <strong>
                          {
                            completedResult.percentage
                          }%
                        </strong>
                      </p>

                    </div>

                  ) : (

                    <button
                      className="primary"
                      disabled={
                        loadingAssessment
                      }
                      onClick={() =>
                        startAssessment(
                          assessment
                        )
                      }
                    >
                      {loadingAssessment
                        ? 'Loading...'
                        : 'Start assessment →'}
                    </button>

                  )}

                </Card>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}


/* =========================================================
   ADMIN STUDENTS
========================================================= */

export function AdminStudents() {
  const [students, setStudents] =
    useState([]);

  useEffect(() => {
    api
      .get('/admin/students')
      .then((response) => {
        setStudents(
          response.data.data || []
        );
      })
      .catch((error) => {
        console.error(
          'Admin students error:',
          error
        );
      });
  }, []);

  return (
    <div className="page">

      <p className="mono">
        STUDENT DIRECTORY
      </p>

      <h2>
        Guide every student forward.
      </h2>

      <div className="table">

        <div className="thead">

          <span>
            Name
          </span>

          <span>
            Branch
          </span>

          <span>
            CGPA
          </span>

          <span>
            Graduating
          </span>

        </div>

        {students.map(
          (student) => (
            <div
              className="trow"
              key={student.id}
            >

              <b>
                {student.name}
              </b>

              <span>
                {student.branch ||
                  '—'}
              </span>

              <span>
                {student.cgpa ||
                  '—'}
              </span>

              <span>
                {student.graduation_year ||
                  '—'}
              </span>

            </div>
          )
        )}

      </div>
    </div>
  );
}


/* =========================================================
   ADMIN ANALYTICS
========================================================= */

export function Analytics() {
  const [data, setData] =
    useState({
      skills: [],
      branches: [],
      status: [],
    });

  useEffect(() => {
    api
      .get('/admin/analytics')
      .then((response) => {
        setData(
          response.data.data || {
            skills: [],
            branches: [],
            status: [],
          }
        );
      })
      .catch((error) => {
        console.error(
          'Analytics error:',
          error
        );
      });
  }, []);

  const top =
    Math.max(
      1,
      ...data.skills.map(
        (skill) =>
          Number(skill.total)
      )
    );

  return (
    <div className="page">

      <p className="mono">
        PLACEMENT ANALYTICS
      </p>

      <h2>
        See the signals behind the outcomes.
      </h2>

      <div className="kpis">

        <Card className="kpi">

          <p>
            Placement branches
          </p>

          <h3>
            {data.branches.length}
          </h3>

        </Card>

        <Card className="kpi">

          <p>
            Application stages
          </p>

          <h3>
            {data.status.length}
          </h3>

        </Card>

        <Card className="kpi">

          <p>
            Top skill
          </p>

          <h3>
            {data.skills[0]
              ?.name || '—'}
          </h3>

        </Card>

      </div>

      <Card>

        <p className="mono">
          SKILL SIGNALS
        </p>

        <h3>
          Most recorded student skills
        </h3>

        {data.skills.map(
          (skill) => (

            <div
              className="row"
              key={skill.name}
            >

              <span>
                {skill.name}
              </span>

              <Meter
                value={
                  Math.round(
                    Number(
                      skill.total
                    ) /
                      top *
                      100
                  )
                }
              />

              <b>
                {skill.total}
              </b>

            </div>
          )
        )}

      </Card>

    </div>
  );
}


/* =========================================================
   COMPANY PROFILE
========================================================= */

export function CompanyProfile({
  notify,
}) {
  const [company, setCompany] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    api
      .get('/companies/me')
      .then((response) => {
        setCompany(
          response.data.data || {}
        );
      })
      .catch((error) => {
        console.error(
          'Company profile error:',
          error
        );
      });
  }, []);

  const save = async () => {
    try {
      setLoading(true);

      await api.put(
        '/companies/me',
        company
      );

      notify(
        'Company profile saved'
      );
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Could not save company profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      <p className="mono">
        COMPANY PROFILE
      </p>

      <h2>
        Keep your hiring profile current.
      </h2>

      <Card>

        <label>
          Company name

          <input
            value={
              company.company_name ||
              ''
            }
            onChange={(e) =>
              setCompany({
                ...company,
                company_name:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Website

          <input
            value={
              company.website ||
              ''
            }
            onChange={(e) =>
              setCompany({
                ...company,
                website:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Location

          <input
            value={
              company.location ||
              ''
            }
            onChange={(e) =>
              setCompany({
                ...company,
                location:
                  e.target.value,
              })
            }
          />
        </label>

        <button
          className="primary"
          disabled={loading}
          onClick={save}
        >
          {loading
            ? 'Saving...'
            : 'Save profile →'}
        </button>

      </Card>

    </div>
  );
}