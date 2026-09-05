import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  User, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Briefcase,
  Calendar,
  Layers,
  FileText,
  DollarSign
} from 'lucide-react';
import { getCurrentUser, logoutUser } from '../api/auth';

const Navbar = ({ activeModule: explicitActiveModule, onCheckInToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [user, setUser] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeAttendanceTime, setActiveAttendanceTime] = useState(null);
  const navRef = useRef(null);

  // Fetch current user details
  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then((data) => {
        if (isMounted && data) setUser(data);
      })
      .catch(() => {
        // Silently handle if unauthenticated
      });

    const fetchWidget = () => {
      fetch('/attendance/widget')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data) {
            setIsCheckedIn(data.is_checked_in || false);
            if (data.check_in_time) {
              setActiveAttendanceTime(data.check_in_time);
            }
          }
        })
        .catch(() => {
          // Fallback gracefully
        });
    };

    fetchWidget();
    window.addEventListener('attendance-updated', fetchWidget);

    return () => {
      isMounted = false;
      window.removeEventListener('attendance-updated', fetchWidget);
    };
  }, []);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Determine current active module from route or explicit prop
  const getActiveModule = () => {
    if (explicitActiveModule) return explicitActiveModule;
    const path = location.pathname;
    if (path.startsWith('/employees') || path.startsWith('/departments') || path.startsWith('/working-schedules')) {
      return 'employees';
    }
    if (path.startsWith('/contracts') || path.startsWith('/salary-structures')) {
      return 'contracts';
    }
    if (path.startsWith('/attendance')) {
      return 'attendance';
    }
    if (path.startsWith('/time-off')) {
      return 'time-off';
    }
    if (path.startsWith('/payroll') || path.startsWith('/dashboard')) {
      return 'payroll';
    }
    return 'employees'; // Default to match wireframe
  };

  const active = getActiveModule();

  const toggleDropdown = (key) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Continue to navigate anyway
    } finally {
      navigate('/');
    }
  };

  const handleQuickAttendance = async () => {
    try {
      const endpoint = isCheckedIn ? '/attendance/check-out' : '/attendance/check-in';
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        setIsCheckedIn(!isCheckedIn);
        setOpenDropdown(null);
        window.dispatchEvent(new Event('attendance-updated'));
      }
    } catch (err) {
      console.error('Attendance toggle error', err);
    }
  };

  return (
    <header className="navbar-container" ref={navRef}>
      <div className="navbar-inner">
        {/* Left Side: Brand HR Badge + Module Tabs */}
        <div className="navbar-left">
          {/* HR Monogram Badge */}
          <NavLink to="/dashboard" className="navbar-brand-badge" title="PeoplePay360 HR">
            <span className="navbar-brand-text">HR</span>
          </NavLink>

          {/* Module Navigation Tabs */}
          <nav className="navbar-menu" aria-label="Main Navigation">
            {/* 1. Employees Dropdown */}
            <div className={`navbar-item ${active === 'employees' ? 'is-active' : ''}`}>
              <button
                type="button"
                className="navbar-tab-button"
                onClick={() => toggleDropdown('employees')}
                aria-expanded={openDropdown === 'employees'}
              >
                <span>Employees</span>
                <ChevronDown size={14} className={`dropdown-chevron ${openDropdown === 'employees' ? 'is-rotated' : ''}`} />
              </button>

              {openDropdown === 'employees' && (
                <div className="navbar-dropdown-menu">
                  <NavLink
                    to="/employees"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <Users size={15} />
                    <span>Employees List</span>
                  </NavLink>
                  <NavLink
                    to="/departments"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <Layers size={15} />
                    <span>Departments</span>
                  </NavLink>
                  <NavLink
                    to="/working-schedules"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <Calendar size={15} />
                    <span>Working Schedules</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 2. Contracts Dropdown */}
            <div className={`navbar-item ${active === 'contracts' ? 'is-active' : ''}`}>
              <button
                type="button"
                className="navbar-tab-button"
                onClick={() => toggleDropdown('contracts')}
                aria-expanded={openDropdown === 'contracts'}
              >
                <span>Contracts</span>
                <ChevronDown size={14} className={`dropdown-chevron ${openDropdown === 'contracts' ? 'is-rotated' : ''}`} />
              </button>

              {openDropdown === 'contracts' && (
                <div className="navbar-dropdown-menu">
                  <NavLink
                    to="/contracts"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <Briefcase size={15} />
                    <span>All Contracts</span>
                  </NavLink>
                  <NavLink
                    to="/salary-structures"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <FileText size={15} />
                    <span>Salary Structures</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 3. Attendance Direct Link */}
            <div className={`navbar-item ${active === 'attendance' ? 'is-active' : ''}`}>
              <NavLink
                to="/attendance"
                className="navbar-tab-button"
                onClick={() => setOpenDropdown(null)}
              >
                <span>Attendance</span>
              </NavLink>
            </div>

            {/* 4. Time Off Dropdown */}
            <div className={`navbar-item ${active === 'time-off' ? 'is-active' : ''}`}>
              <button
                type="button"
                className="navbar-tab-button"
                onClick={() => toggleDropdown('time-off')}
                aria-expanded={openDropdown === 'time-off'}
              >
                <span>Time Off</span>
                <ChevronDown size={14} className={`dropdown-chevron ${openDropdown === 'time-off' ? 'is-rotated' : ''}`} />
              </button>

              {openDropdown === 'time-off' && (
                <div className="navbar-dropdown-menu">
                  <NavLink
                    to="/time-off/requests"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <Clock size={15} />
                    <span>Leave Requests</span>
                  </NavLink>
                  <NavLink
                    to="/time-off/allocations"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <CheckCircle2 size={15} />
                    <span>Allocations</span>
                  </NavLink>
                  <NavLink
                    to="/time-off/types"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <Layers size={15} />
                    <span>Leave Types</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* 5. Payroll Link */}
            <div className={`navbar-item ${active === 'payroll' ? 'is-active' : ''}`}>
              <NavLink
                to="/dashboard"
                className="navbar-tab-button"
                onClick={() => setOpenDropdown(null)}
              >
                <span>Payroll</span>
              </NavLink>
            </div>
          </nav>
        </div>

        {/* Right Side: Red Attendance Indicator + User Profile */}
        <div className="navbar-right">
          {/* Attendance Status Box (Red when checked out as shown in wireframe, Green when checked in) */}
          <div className="attendance-widget-wrapper">
            <button
              type="button"
              className={`attendance-status-box ${isCheckedIn ? 'is-checked-in' : 'is-checked-out'}`}
              onClick={() => toggleDropdown('attendance-status')}
              title={isCheckedIn ? "Checked In (Click for options)" : "Checked Out (Click to Check In)"}
              aria-label="Attendance Status"
            >
              {/* Clean rounded status indicator square matching wireframe */}
              <span className="attendance-indicator-inner" />
            </button>

            {openDropdown === 'attendance-status' && (
              <div className="navbar-dropdown-menu navbar-dropdown-right attendance-popover">
                <div className="popover-header">
                  <div className={`status-pill ${isCheckedIn ? 'status-pill-success' : 'status-pill-danger'}`}>
                    <span className="status-dot" />
                    <span>{isCheckedIn ? 'Currently Checked In' : 'Currently Checked Out'}</span>
                  </div>
                </div>

                <div className="popover-body">
                  <p className="popover-desc">
                    {isCheckedIn 
                      ? "You are logged as present today. Ready to leave?" 
                      : "Start tracking your worked hours for today."}
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickAttendance}
                    className={`btn-attendance-action ${isCheckedIn ? 'btn-checkout' : 'btn-checkin'}`}
                  >
                    {isCheckedIn ? 'Check Out Now' : 'Check In Now'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar / Logout Dropdown */}
          <div className="navbar-user-wrapper">
            <button
              type="button"
              className="navbar-avatar-btn"
              onClick={() => toggleDropdown('user')}
              aria-expanded={openDropdown === 'user'}
              title={user ? `${user.name} (${user.email})` : 'User Profile'}
            >
              <div className="avatar-initials">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'HR'}
              </div>
            </button>

            {openDropdown === 'user' && (
              <div className="navbar-dropdown-menu navbar-dropdown-right user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-name">{user?.name || 'Authorized User'}</div>
                  <div className="user-dropdown-email">{user?.email || 'user@company.com'}</div>
                  <span className="user-role-badge">
                    {user?.role ? user.role.toUpperCase() : 'HR OFFICER'}
                  </span>
                </div>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="navbar-dropdown-link text-danger"
                >
                  <LogOut size={15} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
