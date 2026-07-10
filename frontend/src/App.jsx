import { Route, Routes } from 'react-router-dom'

import DesignSystemPreview from './design-system/DesignSystemPreview.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<DesignSystemPreview />} />
    </Routes>
  )
}

export default App
