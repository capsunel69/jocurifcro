import { Routes, Route } from 'react-router-dom'
import { ChakraProvider, Box } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BingoGame from './pages/BingoGame'
import GhicesteJucatorul from './pages/GhicesteJucatorul'
import Subscribe from './pages/Subscribe'
import ConfirmSubscribe from './pages/ConfirmSubscribe'
import NotFoundPage from './pages/NotFound'
import Header from './components/Header'
import Footer from './components/Footer'
import theme from './theme'
import MultiplayerBingoGame from './pages/MultiplayerBingoGame'

// Lazy load ReactGA
const ReactGA = lazy(() => import('react-ga4'))

function App() {
  const location = useLocation()

  useEffect(() => {
    // Reset scroll position on route change
    window.scrollTo(0, 0);
    window.history.scrollRestoration = 'manual';
  }, [location]);

  useEffect(() => {
    // Initialize GA4 only after component mounts
    const initGA = async () => {
      const GA = await import('react-ga4')
      GA.default.initialize('G-94Z3TXEH8E')
      GA.default.send({ hitType: "pageview", page: location.pathname })
    }
    initGA()
  }, [])

  return (
    <ChakraProvider theme={theme}>
      <Global
        styles={`
          html, body, #root {
            width: 100%;
            margin: 0;
            padding: 0;
          }
        `}
      />
      <Box minH="100vh" display="flex" flexDirection="column">
        <Header />
        <Box flex="1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bingo" element={<BingoGame />} />
            <Route path="/ghiceste-jucatorul" element={<GhicesteJucatorul />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/confirm-subscribe" element={<ConfirmSubscribe />} />
            <Route path="/multiplayer-bingo" element={<MultiplayerBingoGame />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
        <Footer />
      </Box>
    </ChakraProvider>
  )
}

export default App