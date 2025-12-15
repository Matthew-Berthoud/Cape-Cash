import React, { useState } from 'react';
import { User } from '../types';
import { BLACK_CAPE_LOGO_SVG } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@blackcape.io')) {
      setError('Access restricted to @blackcape.io email addresses.');
      return;
    }

    // Simulate successful Google Auth
    const mockUser: User = {
      email,
      name: email.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' '),
      supervisor: ""
    };
    onLogin(mockUser);
  };

  const logoSrc = `data:image/svg+xml;base64,${btoa(BLACK_CAPE_LOGO_SVG)}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="h-24 w-24">
                <img src={logoSrc} alt="Black Cape" className="h-full w-full object-contain" />
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to Cape Cash
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Black Cape Employee Reimbursement
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-cape-primary">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cape-primary focus:border-cape-primary sm:text-sm"
                  placeholder="you@blackcape.io"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cape-primary hover:bg-cape-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cape-primary transition-colors duration-200"
              >
                <i className="fab fa-google mr-2 mt-0.5"></i> Sign in with Google
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative text-sm" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;