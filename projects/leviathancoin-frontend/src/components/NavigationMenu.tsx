import React from 'react'
import { NavLink } from 'react-router-dom'

const NavigationMenu: React.FC = () => {
  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col items-center justify-center">
        {/* Page content here */}
        <label htmlFor="my-drawer-2" className="btn btn-primary drawer-button lg:hidden">
          Open menu
        </label>
      </div>
      <div className="drawer-side">
        <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label>
        <ul className="menu p-4 w-80 min-h-full bg-base-200 text-base-content">
          {/* Sidebar content here */}
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/hardware-benchmark" className={({ isActive }) => (isActive ? 'active' : '')}>
              Network Telemetry (Hardware Benchmark)
            </NavLink>
          </li>
          <li>
            <NavLink to="/console/ws-qaoa" className={({ isActive }) => (isActive ? 'active' : '')}>
              WS-QAOA Console
            </NavLink>
          </li>
          <li>
            <NavLink to="/bft" className={({ isActive }) => (isActive ? 'active' : '')}>
              BFT Dashboard
            </NavLink>
          </li>
          <li>
            <a href="/staking">Staking</a>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default NavigationMenu
