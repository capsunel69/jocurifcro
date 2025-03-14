import { Routes, Route } from 'react-router-dom'
import { ChakraProvider, Box } from '@chakra-ui/react'
import { Global } from '@emotion/react'
import HomePage from './pages/HomePage'
import BingoGame from './pages/BingoGame'
import GhicesteJucatorul from './pages/GhicesteJucatorul'
import Header from './components/Header'
import Footer from './components/Footer'
import theme from './theme'

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Global
        styles={`
          html, body, #root {
            width: 100%;
            height: 100%;
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
          </Routes>
        </Box>
        <Footer />
      </Box>
    </ChakraProvider>
  )
}

export default App