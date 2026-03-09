import { NavLink } from "react-router-dom";
import { useState } from "react";
import logo from "../../assets/logo.jpeg";
import {
  LayoutDashboard,
  Users,
  Zap,
  Calendar,
  Menu,
  X,
  ChevronLeft,
  UserPlus,
  CameraIcon,
  Shield,
  AlertCircle,
  FileText,
  Settings,
  BarChart3,
  Users2,
  Castle,
  Grid3x3,
  ShieldAlert,
  Home,
  FolderOpen,
  History,
  ChevronDown,
} from "lucide-react";

const sidebarItems = [
  {
    section: "MAIN",
    items: [
      {
        name: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
      },
      {
        name: "Overcrowding",
        path: "/overcrowding",
        icon: Users2,
      },
      {
        name: "Rehabilitation",
        path: "/rehabilitation",
        icon: Calendar,
      },
      {
        name: "Home Leave",
        path: "/home-leave",
        icon: Home,
      },
      {
        name: "Wellness Monitoring",
        icon: CameraIcon,
        subItems: [
          { name: "Survey", path: "/survey", icon: CameraIcon },
          { name: "Inmates History", path: "/survey/history", icon: History },
          { name: "Common Docs", path: "/survey/common-docs", icon: FolderOpen },
        ]
      },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      {
        name: "Inmates",
        path: "/inmates",
        icon: Users,
      },
      {
        name: "Cells",
        path: "/cells",
        icon: Grid3x3,
      },
      {
        name: "Staff",
        path: "/staff",
        icon: UserPlus,
      },
      {
        name: "Camera Management",
        path: "/camera/management",
        icon: CameraIcon,
      },
      {
        name: "CCTV Dashboard",
        path: "/camera/cctv",
        icon: Grid3x3,
      },

      {
        name: "Violation Detection",
        path: "/violations",
        icon: ShieldAlert,
      },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      {
        name: "Incidents",
        path: "/incidents",
        icon: AlertCircle,
      },
      {
        name: "Reports",
        path: "/reports",
        icon: FileText,
      },
      {
        name: "Analytics",
        path: "/analytics",
        icon: BarChart3,
      },
    ],
  },
];

export default function Sidebar({ isOpen, onClose, isMobile, currentUser }) {
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (name) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/sign-in";
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed top-0 left-0 h-full bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out
        flex flex-col
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        ${isMobile ? "w-80" : "w-64"}
        lg:translate-x-0 lg:static lg:shadow-none lg:border-r lg:border-gray-200 lg:h-screen
      `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
            <div>
              <h2 className="text-white font-bold text-sm">PMS</h2>
              <p className="text-gray-300 text-xs">Prison Management</p>
            </div>
          </div>

          {/* Close button for mobile */}
          {isMobile && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-600 transition-colors lg:hidden"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4">
          {sidebarItems.map((section, idx) => (
            <div key={idx} className="mb-6">
              {/* Section Label */}
              <div className="px-3 py-2 mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {section.section}
                </p>
              </div>

              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
                  const isExpanded = expandedMenus[item.name];

                  return (
                    <div key={item.name}>
                      {hasSubItems ? (
                        <button
                          onClick={() => toggleSubmenu(item.name)}
                          className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group
                            ${isExpanded ? "bg-slate-100 text-slate-800 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-slate-700"}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${isExpanded ? "text-slate-800" : "text-gray-400 group-hover:text-slate-700"}`} />
                            <span className="font-medium text-sm">{item.name}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      ) : (
                        <NavLink
                          to={item.path}
                          onClick={isMobile ? onClose : undefined}
                          className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                          ${
                            isActive
                              ? "bg-slate-700 text-white shadow-md"
                              : "text-gray-600 hover:bg-gray-100 hover:text-slate-700"
                          }
                        `}
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${
                                  isActive
                                    ? "text-white"
                                    : "text-gray-400 group-hover:text-slate-700"
                                }`}
                              />
                              <span className="font-medium text-sm">{item.name}</span>
                              {isActive && (
                                <div className="ml-auto w-1 h-6 bg-white rounded-full"></div>
                              )}
                            </>
                          )}
                        </NavLink>
                      )}

                      {/* Sub-items rendering */}
                      {hasSubItems && isExpanded && (
                        <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-200 space-y-1">
                          {item.subItems.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <NavLink
                                key={subItem.path}
                                to={subItem.path}
                                end
                                onClick={isMobile ? onClose : undefined}
                                className={({ isActive }) => `
                                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group
                                  ${
                                    isActive
                                      ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm"
                                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                  }
                                `}
                              >
                                {({ isActive }) => (
                                  <>
                                    <SubIcon className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                                    <span className="text-sm">{subItem.name}</span>
                                    {isActive && <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
                                  </>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-semibold text-yellow-700">Security Level</span>
            </div>
            <span className="text-xs font-bold text-yellow-600">HIGH</span>
          </div>
          <button
            className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold text-sm shadow-md"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

