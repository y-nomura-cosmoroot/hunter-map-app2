import '@testing-library/jest-dom'

// Mock Google Maps API
global.google = {
  maps: {
    Map: vi.fn().mockImplementation(() => ({
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      addListener: vi.fn(),
    })),
    LatLng: vi.fn().mockImplementation((lat, lng) => ({ lat: () => lat, lng: () => lng })),
    LatLngBounds: vi.fn().mockImplementation(() => ({
      extend: vi.fn(),
      getCenter: vi.fn(() => ({ lat: () => 34.7304, lng: () => 136.5085 })),
    })),
    Marker: vi.fn().mockImplementation(() => ({
      setMap: vi.fn(),
      setPosition: vi.fn(),
      addListener: vi.fn(),
    })),
    GroundOverlay: vi.fn().mockImplementation(() => ({
      setMap: vi.fn(),
      setOpacity: vi.fn(),
      getBounds: vi.fn(),
    })),
    event: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    MapTypeId: {
      ROADMAP: 'roadmap',
      SATELLITE: 'satellite',
    },
  },
} as any

// Mock File API
global.File = class MockFile {
  name: string
  size: number
  type: string
  lastModified: number

  constructor(chunks: any[], filename: string, options: any = {}) {
    this.name = filename
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
  }
} as any

// Mock FileReader
global.FileReader = class MockFileReader {
  result: any = null
  error: any = null
  readyState: number = 0
  onload: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null

  readAsArrayBuffer(file: File) {
    setTimeout(() => {
      this.readyState = 2
      this.result = new ArrayBuffer(8)
      if (this.onload) {
        this.onload({ target: this })
      }
    }, 0)
  }

  readAsDataURL(file: File) {
    setTimeout(() => {
      this.readyState = 2
      this.result = 'data:application/pdf;base64,mock-pdf-data'
      if (this.onload) {
        this.onload({ target: this })
      }
    }, 0)
  }
} as any

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  canvas: {
    toDataURL: vi.fn(() => 'data:image/png;base64,mock-image-data'),
  },
})) as any

// Mock PDF.js
vi.mock('react-pdf', () => ({
  Document: vi.fn(({ children, onLoadSuccess }: any) => {
    setTimeout(() => {
      if (onLoadSuccess) {
        onLoadSuccess({ numPages: 1 })
      }
    }, 0)
    return children
  }),
  Page: vi.fn(({ pageNumber, onLoadSuccess }: any) => {
    setTimeout(() => {
      if (onLoadSuccess) {
        onLoadSuccess({
          width: 800,
          height: 600,
          originalWidth: 800,
          originalHeight: 600,
        })
      }
    }, 0)
    return null
  }),
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  },
}))