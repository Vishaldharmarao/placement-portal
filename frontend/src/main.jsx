import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';

import {
  createRoot
} from 'react-dom/client';

import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useNavigate
} from 'react-router-dom';

import axios from 'axios';

import './styles.css';
import {
  Card,
  Meter,
  Profile,
  Resume,
  Jobs,
  Applications,
  Prediction,
  Interview,
  Assessments,
  AdminStudents,
  Analytics,
  CompanyProfile
} from './pages.jsx';


/* =========================================================
   API
========================================================= */

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api'
});


api.interceptors.request.use((config) => {

  const token =
    localStorage.getItem('token');

  if (token) {
    config.headers.Authorization =
      `Bearer ${token}`;
  }

  return config;

});


/* =========================================================
   AUTH
========================================================= */

const Auth = createContext(null);

const useAuth = () =>
  useContext(Auth);


/* =========================================================
   NAVIGATION
========================================================= */

const nav = {

  STUDENT: [
    ['dashboard', 'Overview'],
    ['profile', 'My Profile'],
    ['resume', 'Resume Lab'],
    ['jobs', 'Opportunities'],
    ['applications', 'Applications'],
    ['prediction', 'Placement Signal'],
    ['interview', 'Interview Lab'],
    ['assessments', 'Assessments']
  ],

  ADMIN: [
    ['dashboard', 'Dashboard'],
    ['students', 'Students'],
    ['jobs', 'Jobs'],
    ['applications', 'Applications'],
    ['analytics', 'Analytics']
  ],

  COMPANY: [
    ['dashboard', 'Dashboard'],
    ['profile', 'Company Profile'],
    ['jobs', 'Posted Jobs'],
    ['applicants', 'Applicants']
  ]

};


/* =========================================================
   LOGIN / REGISTER
========================================================= */

function AuthPage({ register = false }) {

  const [form, setForm] =
    useState({
      name: '',
      email: '',
      password: '',
      role: 'STUDENT'
    });

  const [error, setError] =
    useState('');

  const { login } =
    useAuth();

  const navigate =
    useNavigate();


  const submit = async (event) => {

    event.preventDefault();

    setError('');

    try {

      const endpoint =
        `/auth/${register ? 'register' : 'login'}`;

      const payload = register
        ? form
        : {
            email: form.email,
            password: form.password
          };


      const response =
        await api.post(
          endpoint,
          payload
        );


      const data =
        response.data;


      login(data.data);


      navigate(
        `/${data.data.user.role.toLowerCase()}/dashboard`
      );


    } catch (error) {

      setError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Unable to sign in'
      );

    }

  };


  return (
    <div className="auth">

      <section>

        <div className="mark">
          P
        </div>

        <p className="mono">
          PLACEMENT INTELLIGENCE
        </p>

        <h1>
          Build a career
          <br />
          <i>with direction.</i>
        </h1>

        <p className="sub">
          A focused workspace for students,
          placement teams, and hiring partners.
        </p>

      </section>


      <form
        onSubmit={submit}
        className="auth-card"
      >

        <div className="brand">
          Place<span>Flow</span>
        </div>

        <h2>
          {register
            ? 'Create your account'
            : 'Welcome back'}
        </h2>

        <p>
          {register
            ? 'Start making your next career move count.'
            : 'Sign in to continue your placement journey.'}
        </p>


        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {register && (

          <label>
            Name

            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value
                })
              }
            />

          </label>

        )}


        <label>

          Email

          <input
            required
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value
              })
            }
          />

        </label>


        <label>

          Password

          <input
            required
            type="password"
            minLength={7}
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value
              })
            }
          />

        </label>


        {register && (

          <label>

            I am a

            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value
                })
              }
            >

              <option value="STUDENT">
                Student
              </option>

              <option value="COMPANY">
                Company recruiter
              </option>

            </select>

          </label>

        )}


        <button
          className="primary"
          type="submit"
        >
          {register
            ? 'Create account'
            : 'Sign in'}

          <b>→</b>

        </button>


        <p className="switch">

          {register
            ? 'Already registered?'
            : 'New to PlaceFlow?'}

          {' '}

          <NavLink
            to={
              register
                ? '/login'
                : '/register'
            }
          >

            {register
              ? 'Sign in'
              : 'Create account'}

          </NavLink>

        </p>


        <small>
          Demo: admin@demo.edu / Admin@123
        </small>

      </form>

    </div>
  );
}


/* =========================================================
   LAYOUT
========================================================= */

function Layout() {

  const {
    user,
    logout
  } = useAuth();

  const [toast, setToast] =
    useState('');


  const notify = (message) => {

    setToast(message);

    setTimeout(() => {
      setToast('');
    }, 2500);

  };


  const role =
    user.role.toLowerCase();


  return (
    <div className="shell">


      {/* SIDEBAR */}

      <aside>

        <NavLink
          to={`/${role}/dashboard`}
          className="logo"
        >

          <i>P</i>
          Place<span>Flow</span>

        </NavLink>


        <p className="navcap">
          WORKSPACE
        </p>


        {nav[user.role]?.map(
          ([path, label]) => (

            <NavLink
              key={path}
              className="nav"
              to={`/${role}/${path}`}
            >

              <b>
                {label[0]}
              </b>

              {label}

            </NavLink>

          )
        )}


        <div className="sidefoot">

          <div className="userdot">
            {user.name
              ?.slice(0, 2)
              .toUpperCase()}
          </div>


          <div>

            <strong>
              {user.name}
            </strong>

            <small>
              {user.role.toLowerCase()}
            </small>

          </div>


          <button onClick={logout}>
            ←
          </button>

        </div>

      </aside>


      {/* MAIN */}

      <main>

        <header>

          <div>

            <p className="mono">
              CAREER COMMAND CENTER
            </p>

            <h1>
              Make the next move{' '}
              <i>your best one.</i>
            </h1>

          </div>


          <div className="header-actions">

            <button className="bell">
              ◉
            </button>

            <div className="avatar">
              {user.name
                ?.slice(0, 2)
                .toUpperCase()}
            </div>

          </div>

        </header>


        <Routes>

          {/* =================================================
             STUDENT ROUTES
          ================================================= */}

          <Route
            path="/student/dashboard"
            element={
              <Dashboard
                notify={notify}
              />
            }
          />

          <Route
            path="/student/profile"
            element={
              <Profile
                notify={notify}
              />
            }
          />

          <Route
            path="/student/resume"
            element={
              <Resume
                notify={notify}
              />
            }
          />

          <Route
            path="/student/jobs"
            element={
              <Jobs
                notify={notify}
              />
            }
          />

          <Route
            path="/student/applications"
            element={
              <Applications
                notify={notify}
              />
            }
          />

          <Route
            path="/student/prediction"
            element={
              <Prediction
                notify={notify}
              />
            }
          />

          <Route
            path="/student/interview"
            element={
              <Interview
                notify={notify}
              />
            }
          />

          <Route
            path="/student/assessments"
            element={
              <Assessments
                notify={notify}
              />
            }
          />


          {/* =================================================
             ADMIN ROUTES
          ================================================= */}

          <Route
            path="/admin/dashboard"
            element={
              <AdminDashboard />
            }
          />

          <Route
            path="/admin/students"
            element={
              <AdminStudents />
            }
          />

          <Route
            path="/admin/jobs"
            element={
              <Jobs
                notify={notify}
              />
            }
          />

          <Route
            path="/admin/applications"
            element={
              <Applications
                notify={notify}
              />
            }
          />

          <Route
            path="/admin/analytics"
            element={
              <Analytics />
            }
          />


          {/* =================================================
             COMPANY ROUTES
          ================================================= */}

          <Route
            path="/company/dashboard"
            element={
              <CompanyDashboard />
            }
          />

          <Route
            path="/company/profile"
            element={
              <CompanyProfile
                notify={notify}
              />
            }
          />

          <Route
            path="/company/jobs"
            element={
              <Jobs
                notify={notify}
              />
            }
          />

          <Route
            path="/company/applicants"
            element={
              <Applications
                notify={notify}
              />
            }
          />


          {/* =================================================
             FALLBACK
          ================================================= */}

          <Route
            path="*"
            element={
              <Dashboard
                notify={notify}
              />
            }
          />

        </Routes>


      </main>


      {toast && (

        <div className="toast">
          ✦ {toast}
        </div>

      )}

    </div>
  );
}


/* =========================================================
   STUDENT DASHBOARD
========================================================= */

function Dashboard() {

  const { user } =
    useAuth();

  const [data, setData] =
    useState(null);


  useEffect(() => {

    if (user.role !== 'STUDENT') {
      return;
    }

    api
      .get('/student-dashboard')
      .then((response) => {

        setData(
          response.data.data || {}
        );

      })
      .catch((error) => {

        console.error(
          'Student dashboard error:',
          error
        );

        setData({});

      });

  }, [user.role]);


  const d =
    data || {};


  if (user.role !== 'STUDENT') {
    return null;
  }


  return (
    <div className="page">


      <section className="hero">

        <div>

          <p className="pill">
            ● PERSONALIZED FOR YOU
          </p>

          <h2>
            Your potential has
            <br />
            <i>a direction now.</i>
          </h2>

          <p>
            Use your profile intelligence
            to find stronger roles and
            prepare with purpose.
          </p>


          <NavLink
            className="primary"
            to="/student/interview"
          >
            Continue preparing
            <b>→</b>
          </NavLink>

        </div>


        <div className="hero-art">

          <span>
            {d.readiness ?? '—'}%
          </span>

          <small>
            placement ready
          </small>

          <div className="ring"></div>

        </div>

      </section>


      <section className="kpis">

        <Kpi
          value={
            d.readiness == null
              ? '—'
              : `${d.readiness}%`
          }
          label="Placement readiness"
          delta="Calculated from your profile"
        />


        <Kpi
          value={
            d.ats_score ?? '—'
          }
          label="Resume ATS score"
          delta="Latest analysis"
        />


        <Kpi
          value={
            d.applications ?? 0
          }
          label="Active applications"
          delta={`${d.shortlisted ?? 0} shortlisted/interview`}
        />


        <Kpi
          value={
            d.assessment_score == null
              ? '—'
              : `${Math.round(
                  d.assessment_score
                )}%`
          }
          label="Assessment average"
          delta="Completed assessments"
        />

      </section>


      <section className="split">

        <Card>

          <p className="mono">
            READINESS BREAKDOWN
          </p>

          <h3>
            Profile signals
          </h3>


          <div className="bars">

            {[
              [
                'Profile completion',
                d.profile_completion ?? 0
              ],

              [
                'Resume ATS',
                d.ats_score ?? 0
              ],

              [
                'Assessment score',
                d.assessment_score ?? 0
              ],

              [
                'Placement estimate',
                d.placement_probability ?? 0
              ]

            ].map(
              ([label, value]) => (

                <div key={label}>

                  <span>

                    {label}

                    <b>
                      {Math.round(
                        Number(value) || 0
                      )}%
                    </b>

                  </span>

                  <Meter
                    value={value}
                  />

                </div>

              )
            )}

          </div>

        </Card>


        <Card className="next">

          <p className="mono">
            NEXT BEST STEP
          </p>

          <h3>
            Build your strongest gap.
          </h3>

          <p>
            Use job matching and interview
            preparation to identify the next
            skill with the highest impact.
          </p>

          <NavLink
            to="/student/interview"
            className="outline"
          >
            Open interview lab →
          </NavLink>

        </Card>

      </section>


      <section className="section-title">

        <div>

          <p className="mono">
            CURATED OPPORTUNITIES
          </p>

          <h3>
            Roles worth a closer look
          </h3>

        </div>


        <NavLink to="/student/jobs">
          Explore all →
        </NavLink>

      </section>


      <Jobs compact />

    </div>
  );
}


/* =========================================================
   KPI
========================================================= */

function Kpi({
  value,
  label,
  delta
}) {

  return (

    <Card className="kpi">

      <p>
        {label}
      </p>

      <h3>
        {value}
      </h3>

      <span>
        {delta}
      </span>

    </Card>

  );
}


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

function AdminDashboard() {

  const [data, setData] =
    useState({});


  React.useEffect(() => {

    api
      .get('/admin/dashboard')
      .then((response) => {

        setData(
          response.data.data || {}
        );

      })
      .catch((error) => {

        console.error(
          'Admin dashboard error:',
          error
        );

      });

  }, []);


  return (
    <div className="page">

      <section className="section-title">

        <div>

          <p className="mono">
            ADMIN DASHBOARD
          </p>

          <h2>
            Your placement operation,
            at a glance.
          </h2>

        </div>

      </section>


      <section className="kpis">

        <Kpi
          value={
            data.total_students ?? 0
          }
          label="Total students"
          delta="Database total"
        />

        <Kpi
          value={
            data.total_jobs ?? 0
          }
          label="Live roles"
          delta="Database total"
        />

        <Kpi
          value={
            data.total_companies ?? 0
          }
          label="Companies"
          delta="Database total"
        />

        <Kpi
          value={
            data.total_applications ?? 0
          }
          label="Applications"
          delta="Live data"
        />

      </section>


      <section className="split">

        <Card>

          <p className="mono">
            ACTIVITY
          </p>

          <h3>
            Hiring pipeline
          </h3>

          <p>
            Application and candidate data
            shown on the management pages
            is loaded from the database.
          </p>

        </Card>


        <Card>

          <p className="mono">
            NEXT ACTION
          </p>

          <h3>
            Review candidates.
          </h3>

          <p>
            Open the live application list
            to shortlist, reject, or schedule
            an interview.
          </p>


          <NavLink
            to="/admin/students"
            className="outline"
          >
            Review candidates →
          </NavLink>

        </Card>

      </section>

    </div>
  );
}


/* =========================================================
   COMPANY DASHBOARD
========================================================= */

function CompanyDashboard() {

  const [data, setData] =
    useState({});


  React.useEffect(() => {

    api
      .get('/applications')
      .then((response) => {

        setData({
          total_applications:
            response.data.data?.length || 0
        });

      })
      .catch((error) => {

        console.error(
          'Company dashboard error:',
          error
        );

      });

  }, []);


  return (
    <div className="page">

      <section className="section-title">

        <div>

          <p className="mono">
            COMPANY DASHBOARD
          </p>

          <h2>
            Your hiring operation,
            at a glance.
          </h2>

        </div>

      </section>


      <section className="kpis">

        <Kpi
          value="—"
          label="Posted jobs"
          delta="Manage your roles"
        />

        <Kpi
          value={
            data.total_applications ?? 0
          }
          label="Applications"
          delta="Live applications"
        />

        <Kpi
          value="—"
          label="Shortlisted"
          delta="Candidate pipeline"
        />

        <Kpi
          value="—"
          label="Interviews"
          delta="Interview pipeline"
        />

      </section>


      <section className="split">

        <Card>

          <p className="mono">
            HIRING PIPELINE
          </p>

          <h3>
            Review candidates
          </h3>

          <p>
            Open your applicant list to
            review candidates and update
            application status.
          </p>

          <NavLink
            to="/company/applicants"
            className="outline"
          >
            View applicants →
          </NavLink>

        </Card>


        <Card>

          <p className="mono">
            COMPANY PROFILE
          </p>

          <h3>
            Keep your profile updated
          </h3>

          <p>
            Maintain your company information
            so students can understand your
            organization.
          </p>

          <NavLink
            to="/company/profile"
            className="outline"
          >
            Edit profile →
          </NavLink>

        </Card>

      </section>

    </div>
  );
}


/* =========================================================
   ROOT
========================================================= */

function Root() {

  const [
    state,
    setState
  ] = useState(() => {

    try {

      return JSON.parse(
        localStorage.getItem('auth')
      );

    } catch {

      return null;

    }

  });


  const login = (data) => {

    setState(data);

    localStorage.setItem(
      'auth',
      JSON.stringify(data)
    );

    localStorage.setItem(
      'token',
      data.token
    );

  };


  const logout = () => {

    setState(null);

    localStorage.removeItem('auth');

    localStorage.removeItem('token');

  };


  return (

    <Auth.Provider
      value={{
        user: state?.user,
        login,
        logout
      }}
    >

      {state ? (

        <Layout />

      ) : (

        <Routes>

          <Route
            path="/register"
            element={
              <AuthPage
                register
              />
            }
          />

          <Route
            path="*"
            element={
              <AuthPage />
            }
          />

        </Routes>

      )}

    </Auth.Provider>

  );
}


/* =========================================================
   START APPLICATION
========================================================= */

createRoot(
  document.getElementById('root')
).render(

  <BrowserRouter>

    <Root />

  </BrowserRouter>

);