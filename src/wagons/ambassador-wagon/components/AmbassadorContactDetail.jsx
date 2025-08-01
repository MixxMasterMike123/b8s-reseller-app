import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { UserIcon } from '@heroicons/react/24/outline';

const AmbassadorContactDetail = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <UserIcon className="mx-auto h-12 w-12 text-purple-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Ambassador Contact Detail</h3>
          <p className="mt-1 text-sm text-gray-500">Coming soon - this component is under development.</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AmbassadorContactDetail;