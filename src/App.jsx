import { Routes, Route } from 'react-router-dom'
import { ChakraProvider, Box } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import HomePage from './pages/HomePage'
import BingoGame from './pages/BingoGame'
import GhicesteJucatorul from './pages/GhicesteJucatorul'
import Subscribe from './pages/Subscribe'
import ConfirmSubscribe from './pages/ConfirmSubscribe'
import NotFoundPage from './pages/NotFound'
import Header from './components/Header'
import Footer from './components/Footer'
import theme from './theme'
import MultiplayerSimpleMathGame from './pages/MultiplayerSimpleMathGame'

function App() {
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
            <Route path="/meth" element={<MultiplayerSimpleMathGame />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
        <Footer />
      </Box>
    </ChakraProvider>
  )
}

export default App