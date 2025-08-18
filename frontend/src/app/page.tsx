'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            중대성평가, GRI Report 자동화 플랫폼
          </h1>
          <p className="text-lg text-black mb-16">
            사이트 설명
          </p>
          
          <div className="flex gap-6 justify-center">
            <button 
              onClick={() => router.push('/auth/login')}
              className="px-8 py-4 bg-gray-200 border border-gray-400 text-gray-600 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
            >
              login
            </button>
            <button 
              onClick={() => router.push('/auth/signup')}
              className="px-8 py-4 bg-gray-200 border border-gray-400 text-gray-600 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200"
            >
              signup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
