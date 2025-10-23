import { describe, it, expect } from 'vitest'
import { 
  calculateTransformMatrix, 
  transformPDFToGeo, 
  validateTransformAccuracy,
  transformPDFBoundsToGeoBounds 
} from '../utils/coordinateTransform'
import type { PDFPoint, MapPoint } from '../types'

describe('Coordinate Transform Utils', () => {
  const mockPDFPoints: PDFPoint[] = [
    { x: 100, y: 100, pageNumber: 1 },
    { x: 500, y: 100, pageNumber: 1 },
    { x: 100, y: 400, pageNumber: 1 },
  ]

  const mockMapPoints: MapPoint[] = [
    { lat: 34.7304, lng: 136.5085 },
    { lat: 34.7304, lng: 136.6085 },
    { lat: 34.6304, lng: 136.5085 },
  ]

  describe('calculateTransformMatrix', () => {
    it('should calculate transform matrix from reference points', () => {
      const matrix = calculateTransformMatrix(mockPDFPoints, mockMapPoints)
      
      expect(matrix).toBeDefined()
      expect(typeof matrix.a).toBe('number')
      expect(typeof matrix.b).toBe('number')
      expect(typeof matrix.c).toBe('number')
      expect(typeof matrix.d).toBe('number')
      expect(typeof matrix.e).toBe('number')
      expect(typeof matrix.f).toBe('number')
      expect(!isNaN(matrix.a)).toBe(true)
      expect(!isNaN(matrix.b)).toBe(true)
      expect(!isNaN(matrix.c)).toBe(true)
      expect(!isNaN(matrix.d)).toBe(true)
      expect(!isNaN(matrix.e)).toBe(true)
      expect(!isNaN(matrix.f)).toBe(true)
    })

    it('should handle edge cases with minimal point separation', () => {
      const closePDFPoints: PDFPoint[] = [
        { x: 100, y: 100, pageNumber: 1 },
        { x: 101, y: 100, pageNumber: 1 },
        { x: 100, y: 101, pageNumber: 1 },
      ]

      const closeMapPoints: MapPoint[] = [
        { lat: 34.7304, lng: 136.5085 },
        { lat: 34.7305, lng: 136.5085 },
        { lat: 34.7304, lng: 136.5086 },
      ]

      const matrix = calculateTransformMatrix(closePDFPoints, closeMapPoints)
      expect(matrix).toBeDefined()
      expect(!isNaN(matrix.a)).toBe(true)
      expect(!isNaN(matrix.b)).toBe(true)
      expect(!isNaN(matrix.c)).toBe(true)
      expect(!isNaN(matrix.d)).toBe(true)
      expect(!isNaN(matrix.e)).toBe(true)
      expect(!isNaN(matrix.f)).toBe(true)
    })

    it('should throw error for insufficient points', () => {
      const insufficientPDFPoints = mockPDFPoints.slice(0, 2)
      const insufficientMapPoints = mockMapPoints.slice(0, 2)

      expect(() => {
        calculateTransformMatrix(insufficientPDFPoints, insufficientMapPoints)
      }).toThrow()
    })
  })

  describe('transformPDFToGeo', () => {
    it('should transform PDF coordinates to geographic coordinates', () => {
      const matrix = calculateTransformMatrix(mockPDFPoints, mockMapPoints)
      const pdfPoint = { x: 300, y: 250, pageNumber: 1 }
      
      const geoPoint = transformPDFToGeo(pdfPoint, matrix)
      
      expect(geoPoint).toBeDefined()
      expect(typeof geoPoint.lat).toBe('number')
      expect(typeof geoPoint.lng).toBe('number')
      expect(!isNaN(geoPoint.lat)).toBe(true)
      expect(!isNaN(geoPoint.lng)).toBe(true)
      
      // 三重県の合理的な範囲内であることを確認
      expect(geoPoint.lat).toBeGreaterThan(33.0)
      expect(geoPoint.lat).toBeLessThan(36.0)
      expect(geoPoint.lng).toBeGreaterThan(135.0)
      expect(geoPoint.lng).toBeLessThan(138.0)
    })

    it('should maintain consistency for reference points', () => {
      const matrix = calculateTransformMatrix(mockPDFPoints, mockMapPoints)
      
      // 基準点を変換して元の地理座標と比較
      for (let i = 0; i < mockPDFPoints.length; i++) {
        const transformed = transformPDFToGeo(mockPDFPoints[i], matrix)
        const original = mockMapPoints[i]
        
        // 小数点以下4桁の精度で比較
        expect(Math.abs(transformed.lat - original.lat)).toBeLessThan(0.0001)
        expect(Math.abs(transformed.lng - original.lng)).toBeLessThan(0.0001)
      }
    })

    it('should handle boundary coordinates correctly', () => {
      const matrix = calculateTransformMatrix(mockPDFPoints, mockMapPoints)
      
      // PDF の境界座標をテスト
      const boundaryPoints = [
        { x: 0, y: 0, pageNumber: 1 },
        { x: 1000, y: 0, pageNumber: 1 },
        { x: 0, y: 1000, pageNumber: 1 },
        { x: 1000, y: 1000, pageNumber: 1 },
      ]

      boundaryPoints.forEach(point => {
        const transformed = transformPDFToGeo(point, matrix)
        expect(!isNaN(transformed.lat)).toBe(true)
        expect(!isNaN(transformed.lng)).toBe(true)
      })
    })
  })

  describe('Matrix calculations', () => {
    it('should produce invertible transformation matrix', () => {
      const matrix = calculateTransformMatrix(mockPDFPoints, mockMapPoints)
      
      // 行列式が0でないことを確認（可逆性）
      const det = matrix.a * matrix.d - matrix.b * matrix.c
      expect(Math.abs(det)).toBeGreaterThan(1e-10)
    })

    it('should handle different coordinate scales', () => {
      // 大きなスケールのPDF座標
      const largePDFPoints: PDFPoint[] = [
        { x: 1000, y: 1000, pageNumber: 1 },
        { x: 5000, y: 1000, pageNumber: 1 },
        { x: 1000, y: 4000, pageNumber: 1 },
      ]

      const matrix = calculateTransformMatrix(largePDFPoints, mockMapPoints)
      expect(matrix).toBeDefined()
      expect(!isNaN(matrix.a)).toBe(true)
      expect(!isNaN(matrix.b)).toBe(true)
      expect(!isNaN(matrix.c)).toBe(true)
      expect(!isNaN(matrix.d)).toBe(true)
      expect(!isNaN(matrix.e)).toBe(true)
      expect(!isNaN(matrix.f)).toBe(true)

      // 小さなスケールのPDF座標
      const smallPDFPoints: PDFPoint[] = [
        { x: 10, y: 10, pageNumber: 1 },
        { x: 50, y: 10, pageNumber: 1 },
        { x: 10, y: 40, pageNumber: 1 },
      ]

      const smallMatrix = calculateTransformMatrix(smallPDFPoints, mockMapPoints)
      expect(smallMatrix).toBeDefined()
      expect(!isNaN(smallMatrix.a)).toBe(true)
      expect(!isNaN(smallMatrix.b)).toBe(true)
      expect(!isNaN(smallMatrix.c)).toBe(true)
      expect(!isNaN(smallMatrix.d)).toBe(true)
      expect(!isNaN(smallMatrix.e)).toBe(true)
      expect(!isNaN(smallMatrix.f)).toBe(true)
    })
  })
})