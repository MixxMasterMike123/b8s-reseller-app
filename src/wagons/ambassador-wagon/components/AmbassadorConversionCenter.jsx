import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const AmbassadorConversionCenter = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <ArrowRightIcon className="mx-auto h-12 w-12 text-purple-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Ambassador Conversion Center</h3>
          <p className="mt-1 text-sm text-gray-500">Coming soon - convert prospects to active affiliates.</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AmbassadorConversionCenter;