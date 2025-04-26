import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import cloudflareLogo from './assets/Cloudflare_Logo.svg'
import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { trpc } from './trpc'

// Create query client
const queryClient = new QueryClient();

// Create tRPC client
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/trpc',
    }),
  ],
});

function AppContent() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('unknown')
  
  // Use tRPC query hooks
  const hello = trpc.hello.useQuery({ name: 'tRPC' });
  const user = trpc.getUser.useQuery();

  return (
    <>
      <div>
        <a href='https://vite.dev' target='_blank'>
          <img src={viteLogo} className='logo' alt='Vite logo' />
        </a>
        <a href='https://react.dev' target='_blank'>
          <img src={reactLogo} className='logo react' alt='React logo' />
        </a>
        <a href='https://workers.cloudflare.com/' target='_blank'>
          <img src={cloudflareLogo} className='logo cloudflare' alt='Cloudflare logo' />
        </a>
      </div>
      <h1>Vite + React + Cloudflare + tRPC</h1>
      <div className='card'>
        <button
          onClick={() => setCount((count) => count + 1)}
          aria-label='increment'
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div className='card'>
        <button
          onClick={() => {
            fetch('/api/')
              .then((res) => res.json() as Promise<{ name: string }>)
              .then((data) => setName(data.name))
          }}
          aria-label='get name'
        >
          Name from API is: {name}
        </button>
        <p>
          Edit <code>worker/index.ts</code> to change the name
        </p>
      </div>
      
      {/* tRPC data display */}
      <div className='card'>
        <h3>tRPC Data:</h3>
        {hello.isLoading ? (
          <p>Loading greeting...</p>
        ) : hello.error ? (
          <p>Error: {hello.error.message}</p>
        ) : (
          <p>{hello.data?.greeting}</p>
        )}
        
        {user.isLoading ? (
          <p>Loading user...</p>
        ) : user.error ? (
          <p>Error: {user.error.message}</p>
        ) : (
          <p>User: {user.data?.name} (ID: {user.data?.id})</p>
        )}
      </div>
      
      <p className='read-the-docs'>
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

// Wrap app with providers
function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export default App
