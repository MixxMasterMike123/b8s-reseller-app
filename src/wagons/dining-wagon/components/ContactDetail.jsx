import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';

const ContactDetail = () => {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center">
            <Link 
              to="/admin/dining/contacts" 
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-xl mr-4">
                <UserIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Gästdetaljer</h1>
                <p className="text-gray-600">Detaljerad information om gästen</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-orange-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Kontaktdetaljer kommer snart</h2>
            <p className="text-gray-600 mb-6">
              Den här funktionen utvecklas för närvarande. Här kommer du kunna se och redigera 
              detaljerad information om dina gäster, inklusive kontakthistorik och uppföljningar.
            </p>
            <Link
              to="/admin/dining/contacts"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Tillbaka till gästlistan
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContactDetail; 