import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SITE_BRAND } from '@/components/hermes/site';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className='h-screen overflow-auto'>
      <div className="auth-bg-gradient" />
      <div className="container flex justify-center min-h-screen pt-16 pb-8">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link to="/">
              <img src={SITE_BRAND.logo} alt={SITE_BRAND.name} className={`mb-6 ${SITE_BRAND.logoClass} w-auto`} />
            </Link>
            <h1 className="text-3xl font-bold text-white text-left mb-4">{title}</h1>
            {subtitle && (
              <p className="text-[#FFFFFFBF] mt-2 text-left mb-4">
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
      <div
        style={{
          position: 'fixed',
          left: 20,
          bottom: 20,
          color: '#FFFFFF',
          fontSize: '0.95rem',
          zIndex: 10,
        }}
      >
        © {SITE_BRAND.name} {new Date().getFullYear()}
      </div>
    </div>
  );
}; 