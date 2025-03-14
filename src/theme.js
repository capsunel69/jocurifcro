import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'rgba(255, 255, 255, 0.95)',
        minHeight: '100vh',
        fontFamily: '"Russo One", sans-serif',
      }
    }
  },
  colors: {
    brand: {
      100: 'rgba(255, 255, 255, 0.15)',
      500: '#3b82f6',
      600: '#2563eb',
      700: 'rgba(0, 0, 0, 0.6)',
    },
    correct: {
      500: '#22c55e',
    },
    incorrect: {
      500: '#ef4444',
    }
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'xl',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        _hover: {
          transform: 'translateY(-2px)',
        }
      },
      variants: {
        solid: {
          bg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          boxShadow: '0 5px 15px rgba(59, 130, 246, 0.3)',
          _hover: {
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
          },
        },
        outline: {
          bg: 'transparent',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          _hover: {
            bg: 'rgba(255, 255, 255, 0.15)',
          },
        }
      },
    },
    Container: {
      baseStyle: {
        maxW: 'container.lg',
        bg: 'rgba(15, 23, 42, 0.95)',
        borderRadius: '2xl',
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        padding: { base: '4', md: '8', lg: '12' },
      }
    }
  },
  fonts: {
    body: '"Russo One", sans-serif',
    heading: '"Russo One", sans-serif',
  },
})

export default theme

