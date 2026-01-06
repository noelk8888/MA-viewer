import ViewerTable from './components/ViewerTable'

function App() {
  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] sm:py-8 sm:px-4">
      <ViewerTable />

      <footer className="py-6 text-center text-xs text-gray-400">
        <p>Inventory Viewer App • {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

export default App
