import React from 'react';

const ResponsiveTable = () => {
  const data = [
    { id: 1, name: 'Alice Smith', role: 'Admin', status: 'Active', lastLogin: '2023-10-15' },
    { id: 2, name: 'Bob Johnson', role: 'User', status: 'Inactive', lastLogin: '2023-10-10' },
    { id: 3, name: 'Charlie Davis', role: 'Moderator', status: 'Active', lastLogin: '2023-10-14' },
    { id: 4, name: 'Diana Prince', role: 'Admin', status: 'Active', lastLogin: '2023-10-16' },
  ];

  return (
    <section className="py-12 w-full">
      <div className="mb-8 px-4 md:px-0">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Responsive Data Display</h2>
        <p className="text-gray-600 text-sm md:text-base">
          This table transforms into stacked cards on mobile devices (sm), ensuring data remains readable without horizontal scrolling. On larger screens, it displays as a standard clean table.
        </p>
      </div>

      <div className="md:bg-white md:shadow-sm md:rounded-2xl md:border md:border-gray-100 overflow-hidden px-4 md:px-0">
        <table className="min-w-full block md:table">
          <thead className="hidden md:table-header-group bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User Node</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group space-y-4 md:space-y-0">
            {data.map((row) => (
              <tr key={row.id} className="block md:table-row bg-white border border-gray-100 md:border-none rounded-xl p-5 md:p-0 shadow-sm md:shadow-none hover:bg-gray-50 transition-colors">
                
                <td className="block md:table-cell md:px-6 md:py-4 text-sm md:border-b md:border-gray-50 mb-3 md:mb-0">
                  <span className="md:hidden font-bold text-gray-500 text-xs uppercase mb-1 block tracking-wider">User Node</span>
                  <div className="flex items-center">
                    <div className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-blue-100 text-blue-600 flex justify-center items-center font-bold mr-3">{row.name.charAt(0)}</div>
                    <span className="font-semibold md:font-medium text-gray-900 text-base md:text-sm">{row.name}</span>
                  </div>
                </td>
                
                <td className="block md:table-cell md:px-6 md:py-4 text-sm md:border-b md:border-gray-50 mb-2 md:mb-0">
                  <span className="md:hidden font-bold text-gray-500 text-xs uppercase mb-1 block tracking-wider">Role</span>
                  <span className="text-gray-600 inline-block bg-gray-100 md:bg-transparent px-3 md:px-0 py-1 md:py-0 rounded-md">{row.role}</span>
                </td>

                <td className="block md:table-cell md:px-6 md:py-4 text-sm md:border-b md:border-gray-50 mb-2 md:mb-0">
                  <span className="md:hidden font-bold text-gray-500 text-xs uppercase mb-1 block tracking-wider">Status</span>
                  <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${row.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {row.status}
                  </span>
                </td>

                <td className="block md:table-cell md:px-6 md:py-4 text-sm md:border-b md:border-gray-50">
                  <span className="md:hidden font-bold text-gray-500 text-xs uppercase mb-1 block tracking-wider">Last Login</span>
                  <span className="text-gray-500">{row.lastLogin}</span>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ResponsiveTable;
