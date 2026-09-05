import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  Users, 
  Briefcase, 
  Calendar, 
  Layers, 
  FileText, 
  ShieldCheck
} from 'lucide-react';
import { getCurrentUser, logoutUser } from '../api/auth';
import { isAdmin } from '../utils/rbac';

const Navbar = ({ activeModule: explicitActiveModule }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [user, setUser] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then((data) => {
        if (isMounted && data) setUser(data);
      })
      .catch(() => {});

    const fetchAttendanceStatus = () => {
      fetch('/attendance/widget')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data) {
            setIsCheckedIn(data.is_checked_in || false);
          }
        })
        .catch(() => {});
    };

    fetchAttendanceStatus();
    window.addEventListener('attendance-updated', fetchAttendanceStatus);

    return () => {
      isMounted = false;
      window.removeEventListener('attendance-updated', fetchAttendanceStatus);
    };
  }, []);

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
    if (path.startsWith('/admin') || path.startsWith('/users')) {
      return 'admin';
    }
    return 'employees';
  };

  const active = getActiveModule();

  const toggleDropdown = (key) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Proceed with navigation
    } finally {
      navigate('/login');
    }
  };

  const handleQuickAttendance = async () => {
    if (isTogglingAttendance) return;
    setIsTogglingAttendance(true);
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
    } finally {
      setIsTogglingAttendance(false);
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const parts = user.name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return user.name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="navbar-container" ref={navRef}>
      <div className="navbar-inner">
        {/* Left: Brand Identity & Nav Tabs */}
        <div className="navbar-left">
          <NavLink to="/dashboard" className="navbar-brand-badge" title="PeoplePay360">
            <span className="navbar-brand-mark">P</span>
            <span className="navbar-brand-title font-display">PeoplePay360</span>
          </NavLink>

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
                <ChevronDown size={13} className={`dropdown-chevron ${openDropdown === 'employees' ? 'is-rotated' : ''}`} />
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
                <ChevronDown size={13} className={`dropdown-chevron ${openDropdown === 'contracts' ? 'is-rotated' : ''}`} />
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
                <ChevronDown size={13} className={`dropdown-chevron ${openDropdown === 'time-off' ? 'is-rotated' : ''}`} />
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

            {/* 5. Payroll Direct Link */}
            <div className={`navbar-item ${active === 'payroll' ? 'is-active' : ''}`}>
              <NavLink
                to="/dashboard"
                className="navbar-tab-button"
                onClick={() => setOpenDropdown(null)}
              >
                <span>Payroll</span>
              </NavLink>
            </div>

            {/* 6. Admin Only - User Management Link */}
            {isAdmin(user) && (
              <div className={`navbar-item ${active === 'admin' ? 'is-active' : ''}`}>
                <NavLink
                  to="/admin/users"
                  className="navbar-tab-button"
                  onClick={() => setOpenDropdown(null)}
                >
                  <ShieldCheck size={14} style={{ marginRight: '5px', color: 'var(--sky)' }} />
                  <span>Users</span>
                </NavLink>
              </div>
            )}
          </nav>
        </div>

        {/* Right: Attendance Widget + User Avatar */}
        <div className="navbar-right">
          {/* Quick Attendance Pill */}
          <div className="attendance-widget-wrapper">
            <button
              type="button"
              className={`attendance-status-pill ${isCheckedIn ? 'is-in' : 'is-out'}`}
              onClick={() => toggleDropdown('attendance-status')}
              title={isCheckedIn ? "You are Checked In. Click for details." : "You are Checked Out. Click to Check In."}
            >
              <span className={`status-dot ${isCheckedIn ? 'dot-success' : 'dot-danger'}`} />
              <span className="attendance-text">{isCheckedIn ? 'Checked In' : 'Checked Out'}</span>
            </button>

            {openDropdown === 'attendance-status' && (
              <div className="navbar-dropdown-menu navbar-dropdown-right attendance-popover">
                <div className="popover-header">
                  <div className={`status-pill ${isCheckedIn ? 'status-pill-success' : 'status-pill-danger'}`}>
                    <span className="status-dot" />
                    <span>{isCheckedIn ? 'Currently Working' : 'Not Working Today'}</span>
                  </div>
                </div>
                <div className="popover-body">
                  <p className="popover-desc">
                    {isCheckedIn 
                      ? "Your attendance timer is active. Wrap up your shift anytime." 
                      : "Start tracking your worked hours today."}
                  </p>
                  <button
                    type="button"
                    disabled={isTogglingAttendance}
                    onClick={handleQuickAttendance}
                    className={`btn ${isCheckedIn ? 'btn-danger' : 'btn-primary'} w-full`}
                  >
                    {isTogglingAttendance 
                      ? 'Updating...' 
                      : isCheckedIn ? 'Check Out Now' : 'Check In Now'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div className="navbar-user-wrapper">
            <button
              type="button"
              className="navbar-avatar-btn"
              onClick={() => toggleDropdown('user')}
              aria-expanded={openDropdown === 'user'}
              title={user ? `${user.name} (${user.email})` : 'User Profile'}
            >
              <div className="avatar-circle">
                {getUserInitials()}
              </div>
            </button>

            {openDropdown === 'user' && (
              <div className="navbar-dropdown-menu navbar-dropdown-right user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-name font-display">{user?.name || 'User'}</div>
                  <div className="user-dropdown-email">{user?.email || 'user@company.com'}</div>
                  <div style={{ marginTop: '8px' }}>
                    <span className="role-pill">
                      {user?.role ? user.role.replace('_', ' ').toUpperCase() : 'USER'}
                    </span>
                  </div>
                </div>

                <div className="dropdown-divider" />

                {isAdmin(user) && (
                  <NavLink
                    to="/admin/users"
                    className="navbar-dropdown-link"
                    onClick={() => setOpenDropdown(null)}
                  >
                    <ShieldCheck size={14} />
                    <span>User Management</span>
                  </NavLink>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="navbar-dropdown-link text-danger"
                >
                  <LogOut size={14} />
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
