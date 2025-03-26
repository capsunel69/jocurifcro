import { Routes, Route } from 'react-router-dom'
import { ChakraProvider, Box } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import ReactGA from 'react-ga4'
import { useEffect } from 'react'
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

// Initialize GA4 with your measurement ID
ReactGA.initialize('G-94Z3TXEH8E') // Replace with your actual Measurement ID

function App() {
  const location = useLocation()

  useEffect(() => {
    // Reset scroll position on route change
    window.scrollTo(0, 0);
    window.history.scrollRestoration = 'manual';
  }, [location]);

  useEffect(() => {
    // Send pageview with a location
    ReactGA.send({ hitType: "pageview", page: location.pathname });
  }, [location])

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