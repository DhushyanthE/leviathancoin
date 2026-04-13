import React from 'react'

const HardwareBenchmarkDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Hardware Benchmark Dashboard</h1>
      <p className="mb-6">IBM/Google/IonQ comparison matrix for Network Telemetry</p>
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Qubits</th>
              <th>Gate Fidelity</th>
              <th>T1/T2 Time</th>
              <th>Cost per Shot</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>IBM</th>
              <td>127</td>
              <td>99.4%</td>
              <td>100μs / 120μs</td>
              <td>$0.023</td>
            </tr>
            <tr>
              <th>Google</th>
              <td>70</td>
              <td>99.8%</td>
              <td>20μs / 25μs</td>
              <td>$0.030</td>
            </tr>
            <tr>
              <th>IonQ</th>
              <td>32</td>
              <td>99.6%</td>
              <td>1s / 1.2s</td>
              <td>$0.045</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HardwareBenchmarkDashboard
